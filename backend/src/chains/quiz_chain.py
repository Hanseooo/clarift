"""Quiz chain for generating structured quiz questions from study material.

Implements the 5-step process from docs/dev/quiz.md:
  Step 1: Retrieve (handled by service — chain receives chunks)
  Step 2: Extract Factual Statements
  Step 3: Generate Questions (per-type TYPE_PROMPTS)
  Step 4: Validate (parse JSON, per-type rules, one retry on failure)
  Step 5: Return QuizOutput
"""

from __future__ import annotations

import asyncio
import json
import logging
import uuid
from typing import Any, TypedDict

from langchain_google_genai import ChatGoogleGenerativeAI
from tenacity import retry, retry_if_exception, stop_after_attempt, wait_exponential

from src.chains.retry import is_retryable_error
from src.core.config import settings

logger = logging.getLogger(__name__)

TYPE_PROMPTS = {
    "mcq": (
        "Generate exactly {count} multiple choice questions. "
        "Each question MUST have exactly 4 options labeled A, B, C, D. "
        "Only ONE option is correct. "
        "Base every question and option STRICTLY on the provided source material. "
        "Do NOT use outside knowledge. "
        "Question text max 200 characters. Each option max 100 characters. "
        "Mark the correct answer clearly. "
        "\n\n"
        "Markdown formatting is ALLOWED in question text and options: "
        "Use LaTeX ($...$ or $$...$$) for mathematical expressions, chemical formulas, and equations. "
        "Use code blocks (```lang...```) for programming snippets. "
        "Use tables (| col | col |) for structured data. "
        "Use bold/italic for emphasis. "
        "Use lists for multi-part information."
    ),
    "true_false": (
        "Generate exactly {count} true/false questions. "
        "Each question must be a clear, unambiguous factual claim derived ONLY from the provided source material. "
        "Do NOT use outside knowledge. "
        "Question text max 200 characters. "
        "The correct answer must be either `true` or `false`. "
        "\n\n"
        "Markdown formatting is ALLOWED in question text: "
        "Use LaTeX ($...$ or $$...$$) for mathematical expressions, chemical formulas, and equations. "
        "Use code blocks (```lang...```) for programming snippets. "
        "Use tables (| col | col |) for structured data. "
        "Use bold/italic for emphasis."
    ),
    "identification": (
        "Generate exactly {count} fill-in-the-blank (identification) questions. "
        "Base every question STRICTLY on the provided source material. "
        "Do NOT use outside knowledge. "
        "\n\n"
        "STRICT RULES:\n"
        "1. Each blank replaces a SINGLE specific term, keyword, number, date, or short phrase (max 3 words).\n"
        "2. The correct_answer MUST be 1-3 words only. NEVER a full sentence, NEVER a definition, NEVER a restatement of the question.\n"
        "3. Every question MUST include a format hint in parentheses at the end, such as:\n"
        "   - (1 word)\n"
        "   - (2 words)\n"
        "   - (abbreviation)\n"
        "   - (with unit)\n"
        "   - (with symbol)\n"
        "   - (2 decimal places)\n"
        "   - (year)\n"
        "4. Question text max 200 characters. correct_answer max 30 characters.\n"
        "\n"
        "CORRECT EXAMPLES:\n"
        "- Question: 'The ____ command displays the commit history. (1 word)' -> correct_answer: 'log'\n"
        "- Question: 'The ____ protocol encrypts web traffic. (abbreviation, 5 letters)' -> correct_answer: 'HTTPS'\n"
        "- Question: 'The speed of light is approximately ____ m/s. (9 digits)' -> correct_answer: '299792458'\n"
        "- Question: 'The value of pi to two decimal places is ____. (number)' -> correct_answer: '3.14'\n"
        "\n"
        "WRONG EXAMPLES (never do this):\n"
        "- Question: 'What does git log do?' -> correct_answer: 'Displays a list of all commits' (WRONG: answer is a sentence)\n"
        "- Question: 'The process of cell division is called ____. (1 word)' -> correct_answer: 'The process where a cell divides' (WRONG: answer is a sentence)\n"
        "- Question: '____ discovered penicillin. (2 words)' -> correct_answer: 'Alexander Fleming was a scientist who discovered penicillin in 1928' (WRONG: far too long)"
        "\n\n"
        "Markdown formatting is ALLOWED in question text:\n"
        "Use LaTeX ($...$ or $$...$$) for mathematical expressions, chemical formulas, and equations. "
        "Use code blocks (```lang...```) for programming snippets. "
        "Use tables (| col | col |) for structured data. "
        "Use bold/italic for emphasis. "
        "Use lists for multi-part information.\n\n"
        "STRICT GUARDRAIL for identification questions:\n"
        "The `correct_answer` field MUST be plain text only. "
        "NEVER include markdown syntax (*, _, $, `, #, etc.) in `correct_answer`. "
        "NEVER include LaTeX in `correct_answer`. "
        "If the question asks about a formula, the answer must be the NAME or DESCRIPTION, not the formula itself. "
        "Example: Question: 'The formula $E=mc^2$ represents ____. (2 words)' -> correct_answer: 'mass-energy equivalence' NOT '$E=mc^2$'."
    ),
    "multi_select": (
        "Generate exactly {count} multiple-select questions. "
        "Each question must have 4-6 options. "
        "TWO or MORE options must be correct. "
        "Base every question and option STRICTLY on the provided source material. "
        "Do NOT use outside knowledge. "
        "Question text max 200 characters. Each option max 100 characters. "
        "Mark all correct answers clearly. "
        "\n\n"
        "Markdown formatting is ALLOWED in question text and options: "
        "Use LaTeX ($...$ or $$...$$) for mathematical expressions, chemical formulas, and equations. "
        "Use code blocks (```lang...```) for programming snippets. "
        "Use tables (| col | col |) for structured data. "
        "Use bold/italic for emphasis. "
        "Use lists for multi-part information."
    ),
    "ordering": (
        "Generate exactly {count} sequencing questions. "
        "Each question must provide 4-6 steps, events, or items that the student must arrange in the correct order. "
        "Base every question STRICTLY on the provided source material. "
        "Do NOT use outside knowledge. "
        "Question text max 200 characters. Each step max 100 characters. "
        "Provide the correct order clearly. "
        "\n\n"
        "Markdown formatting is ALLOWED in question text and steps: "
        "Use LaTeX ($...$ or $$...$$) for mathematical expressions, chemical formulas, and equations. "
        "Use code blocks (```lang...```) for programming snippets. "
        "Use tables (| col | col |) for structured data. "
        "Use bold/italic for emphasis. "
        "Use lists for multi-part information."
    ),
}


class QuizChainInput(TypedDict):
    document_id: str
    user_id: str
    question_count: int
    auto_mode: bool
    question_distribution: dict[str, int]
    chunks: list[str]


class QuizQuestion(TypedDict, total=False):
    id: str
    type: str
    question: str
    options: list[str]
    correct_answer: str | bool
    correct_answers: list[str]
    steps: list[str]
    correct_order: list[int]
    topic: str
    explanation: str


class QuizChainOutput(TypedDict):
    quiz_id: str
    title: str
    questions: list[QuizQuestion]
    question_types: list[str]
    weak_topics: list[str]
    weak_area_flags: dict[str, bool]


def _fallback_questions(question_count: int) -> tuple[list[QuizQuestion], list[str]]:
    defaults: list[QuizQuestion] = [
        {
            "id": "q1",
            "type": "mcq",
            "question": "Which statement best matches your uploaded notes?",
            "options": ["A", "B", "C", "D"],
            "correct_answer": "A",
            "topic": "General",
            "explanation": "Fallback question.",
        },
        {
            "id": "q2",
            "type": "true_false",
            "question": "True or False: The notes include key definitions and examples.",
            "correct_answer": True,
            "topic": "General",
            "explanation": "Fallback question.",
        },
        {
            "id": "q3",
            "type": "identification",
            "question": "Fill in the blank: The central concept is ____.",
            "correct_answer": "core concept",
            "topic": "General",
            "explanation": "Fallback question.",
        },
    ]

    selected = defaults[: max(1, min(question_count, len(defaults)))]
    question_types = list({q.get("type", "mcq") for q in selected})
    return selected, question_types


def _normalize_question(raw_question: dict[str, Any], index: int) -> QuizQuestion:
    question_id = str(raw_question.get("id") or f"q{index + 1}")
    question_type = str(raw_question.get("type") or "mcq")
    question_text = str(raw_question.get("question") or "")
    topic = str(raw_question.get("topic") or "General")
    explanation = str(raw_question.get("explanation") or "")

    result: QuizQuestion = {
        "id": question_id,
        "type": question_type,
        "question": question_text,
        "topic": topic,
        "explanation": explanation,
    }

    if question_type == "mcq":
        raw_options = raw_question.get("options")
        options: list[str] = (
            [str(o).strip() for o in raw_options] if isinstance(raw_options, list) else []
        )
        result["options"] = options
        result["correct_answer"] = str(raw_question.get("correct_answer") or "").strip()

    elif question_type == "true_false":
        correct = raw_question.get("correct_answer")
        if isinstance(correct, bool):
            result["correct_answer"] = correct
        elif isinstance(correct, str):
            result["correct_answer"] = correct.lower() in ("true", "t", "1", "yes")
        else:
            result["correct_answer"] = False

    elif question_type == "identification":
        result["correct_answer"] = str(raw_question.get("correct_answer") or "")

    elif question_type == "multi_select":
        raw_options = raw_question.get("options")
        options = [str(o) for o in raw_options] if isinstance(raw_options, list) else []
        result["options"] = options
        raw_correct = raw_question.get("correct_answers")
        result["correct_answers"] = (
            [str(c) for c in raw_correct] if isinstance(raw_correct, list) else []
        )

    elif question_type == "ordering":
        raw_steps = raw_question.get("steps")
        result["steps"] = [str(s) for s in raw_steps] if isinstance(raw_steps, list) else []
        raw_order = raw_question.get("correct_order")
        if isinstance(raw_order, list):
            try:
                result["correct_order"] = [int(i) for i in raw_order]
            except (ValueError, TypeError):
                result["correct_order"] = []
        else:
            result["correct_order"] = []

    return result


def _validate_questions(questions: list[QuizQuestion]) -> list[str]:
    """Return list of validation errors."""
    errors: list[str] = []
    for q in questions:
        qtype = q.get("type", "mcq")
        if qtype == "mcq":
            opts = q.get("options", [])
            if len(opts) != 4:
                errors.append(
                    f"MCQ question {q['id']} must have exactly 4 options, got {len(opts)}"
                )
            answer = str(q.get("correct_answer") or "").strip()
            if answer and answer not in opts:
                opts_lower = [o.strip().lower() for o in opts]
                if answer.lower() not in opts_lower:
                    errors.append(f"MCQ question {q['id']} correct_answer not in options")
        elif qtype == "true_false":
            if not isinstance(q.get("correct_answer"), bool):
                errors.append(f"True/false question {q['id']} correct_answer must be boolean")
        elif qtype == "identification":
            answer = q.get("correct_answer", "")
            if not answer:
                errors.append(f"Identification question {q['id']} has empty correct_answer")
            elif len(str(answer).split()) > 5:
                errors.append(
                    f"Identification question {q['id']} correct_answer too long "
                    f"({len(str(answer).split())} words, max 5)"
                )
            # Check for markdown syntax in answer
            import re

            markdown_patterns = [
                r"\*\*",
                r"\*",
                r"__",
                r"_",
                r"\$",
                r"`",
                r"#",
                r"\[.*?\]\(.*?\)",
                r"!\[.*?\]\(.*?\)",
            ]
            answer_str = str(answer)
            if any(re.search(pattern, answer_str) for pattern in markdown_patterns):
                errors.append(
                    f"Identification question {q['id']} correct_answer contains markdown syntax. "
                    f"It must be plain text only."
                )
        elif qtype == "multi_select":
            correct = q.get("correct_answers", [])
            if len(correct) < 2:
                errors.append(f"Multi-select question {q['id']} must have >= 2 correct answers")
        elif qtype == "ordering":
            steps = q.get("steps", [])
            order = q.get("correct_order", [])
            if len(steps) < 4:
                errors.append(f"Ordering question {q['id']} must have >= 4 steps")
            if sorted(order) != list(range(len(steps))):
                errors.append(
                    f"Ordering question {q['id']} correct_order is not a valid permutation"
                )
    return errors


def _build_generation_prompt(
    chunks: list[str],
    distribution: dict[str, int],
    error_context: str | None = None,
) -> str:
    context = "\n\n".join(chunks) if chunks else "No document context provided."

    instructions: list[str] = [
        "You are a precise quiz generator for Filipino students. Generate quiz questions strictly from the source material provided below.",
        "",
        "## ABSOLUTE RULES",
        "1. Base EVERY question, option, step, and explanation ONLY on the source material.",
        "2. Do NOT use outside knowledge, common sense, or general facts not present in the text.",
        "3. If the source material does not support enough questions for a requested type, generate as many as possible based on the text and omit the rest. Do NOT invent questions.",
        "4. Generate exactly the requested count per type whenever the text supports it.",
        "",
        "## SOURCE MATERIAL",
        context,
        "",
        "## QUESTION TYPES TO GENERATE",
    ]

    for type_id, count in distribution.items():
        if count > 0 and type_id in TYPE_PROMPTS:
            instructions.append(TYPE_PROMPTS[type_id].format(count=count))

    instructions.append("")
    instructions.append(
        "## UNIVERSAL CONSTRAINTS\n"
        "- `title`: Concise quiz title based on the topics covered (max 32 characters).\n"
        "- `question` text: max 200 characters.\n"
        "- `options`: max 4-6 items, each max 100 characters.\n"
        "- `explanation`: Brief explanation of why the answer is correct, max 250 characters. MUST cite evidence from the source material.\n"
        '- `topic`: A 1-3 word label describing what the question covers (e.g., "Photosynthesis", "Git Commands").\n'
        '- `id`: A unique string for each question (e.g., "q1", "q2").'
    )

    instructions.append("")
    instructions.append(
        "## TYPE-SPECIFIC CONSTRAINTS\n"
        "- mcq: Exactly 4 options (A, B, C, D). One correct answer.\n"
        "- true_false: Correct answer is boolean `true` or `false` (not a string).\n"
        "- identification: `correct_answer` is 1-3 words, max 30 characters. MUST include a format hint in parentheses in the question text. NEVER a sentence.\n"
        "- multi_select: 2 or more correct answers. `correct_answers` is an array of strings.\n"
        "- ordering: 4-6 steps. `steps` is an array of strings. `correct_order` is an array of step strings in the correct sequence."
    )

    instructions.append("")
    instructions.append(
        "## OUTPUT FORMAT\n"
        "Return ONLY a single valid JSON object. No markdown code fences, no extra text.\n"
        "\n"
        "JSON schema:\n"
        "{\n"
        '  "title": "string (max 32 chars)",\n'
        '  "questions": [\n'
        "    {\n"
        '      "id": "string",\n'
        '      "type": "mcq | true_false | identification | multi_select | ordering",\n'
        '      "question": "string (max 200 chars)",\n'
        '      "topic": "string (1-3 words)",\n'
        '      "explanation": "string (max 250 chars)",\n'
        '      "options": ["string"] | null,\n'
        '      "correct_answer": "string or bool",\n'
        '      "correct_answers": ["string"] | null,\n'
        '      "steps": ["string"] | null,\n'
        '      "correct_order": ["string"] | null\n'
        "    }\n"
        "  ]\n"
        "}\n"
        "\n"
        "Note on nullable fields: Use `null` (not empty arrays) for fields not applicable to a question type."
    )

    instructions.append("")
    instructions.append(
        "## SELF-CHECK (perform before outputting)\n"
        "- [ ] Is every question derived solely from the source material?\n"
        "- [ ] Are identification `correct_answer` values 1-3 words only (never sentences)?\n"
        "- [ ] Are true_false `correct_answer` values raw booleans?\n"
        "- [ ] Does the total number of questions match the requested counts (or the maximum supported by the text)?\n"
        "- [ ] Is the output valid JSON with no trailing commas and no markdown wrappers?"
    )

    if error_context:
        instructions.append("")
        instructions.append(f"## PREVIOUS ERRORS TO FIX\n{error_context}")
        instructions.append("Fix the errors and return corrected JSON.")

    return "\n".join(instructions)


def _parse_llm_output(raw_content: object) -> tuple[str, list[QuizQuestion]]:
    if isinstance(raw_content, str):
        content = raw_content.strip()
    else:
        content = "".join(str(part) for part in raw_content).strip()

    if "```json" in content:
        content = content.split("```json", 1)[1].split("```", 1)[0].strip()
    elif "```" in content:
        content = content.split("```", 1)[1].split("```", 1)[0].strip()

    payload = json.loads(content)
    title = "Untitled quiz"
    questions_data: list[Any]

    if isinstance(payload, dict):
        title = str(payload.get("title", title))[:32]
        questions_data = payload.get("questions", [])
    elif isinstance(payload, list):
        questions_data = payload
    else:
        raise ValueError("Quiz chain payload is not a list or object")

    if not isinstance(questions_data, list):
        raise ValueError("Quiz chain questions is not a list")
    return title, [_normalize_question(item, idx) for idx, item in enumerate(questions_data)]


@retry(
    wait=wait_exponential(min=1, max=8),
    stop=stop_after_attempt(3),
    retry=retry_if_exception(is_retryable_error),
    reraise=True,
)
async def _generate_questions_from_llm(
    chunks: list[str],
    distribution: dict[str, int],
    error_context: str | None = None,
) -> tuple[str, list[QuizQuestion]]:
    llm = ChatGoogleGenerativeAI(
        model="gemini-2.5-flash-lite",
        google_api_key=settings.GOOGLE_API_KEY,
        temperature=0.2,
    )

    prompt = _build_generation_prompt(chunks, distribution, error_context)
    response = await llm.ainvoke(prompt)
    await asyncio.sleep(2)
    return _parse_llm_output(response.content)


async def run_quiz_chain(input: QuizChainInput) -> QuizChainOutput:
    """
    Execute the quiz generation chain.

    Step 1: Retrieve — handled by service (chunks passed in via distribution context)
    Step 2: Extract Factual Statements — implicit in generation prompt
    Step 3: Generate Questions — per-type via TYPE_PROMPTS
    Step 4: Validate — parse + per-type rules, one retry on failure
    Step 5: Return QuizOutput
    """
    logger.info(
        "Running quiz chain for document %s (user %s)",
        input["document_id"],
        input["user_id"],
    )

    distribution = input.get("question_distribution", {"mcq": input["question_count"]})
    question_count = input["question_count"]
    chunks = input.get("chunks", [])

    title = "Untitled quiz"
    try:
        title, questions = await _generate_questions_from_llm(chunks, distribution)
        if not questions:
            questions, question_types = _fallback_questions(question_count)
        else:
            errors = _validate_questions(questions)
            if errors:
                logger.warning("Validation errors on first pass: %s", errors)
                error_ctx = "; ".join(errors)
                title, questions = await _generate_questions_from_llm(
                    chunks, distribution, error_context=error_ctx
                )
                errors = _validate_questions(questions)
                if errors:
                    logger.warning("Validation errors after retry, using fallback: %s", errors)
                    questions, question_types = _fallback_questions(question_count)

            question_types = list({q.get("type", "mcq") for q in questions})

    except Exception as exc:  # noqa: BLE001
        logger.warning("Quiz generation failed, using fallback questions: %s", exc)
        questions, question_types = _fallback_questions(question_count)

    weak_topics = sorted({q.get("topic", "General") for q in questions})[:3]

    return {
        "quiz_id": str(uuid.uuid4()),
        "title": title,
        "questions": questions,
        "question_types": question_types,
        "weak_topics": weak_topics,
        "weak_area_flags": {"needs_review": bool(weak_topics)},
    }
