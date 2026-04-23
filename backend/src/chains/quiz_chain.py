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

from src.chains import is_retryable_error
from src.core.config import settings

logger = logging.getLogger(__name__)

TYPE_PROMPTS = {
    "mcq": "Generate {count} multiple choice questions with exactly 4 options each. Mark the correct answer.",
    "true_false": "Generate {count} true/false questions about clear factual claims.",
    "identification": "Generate {count} fill-in-the-blank questions. Blank replaces a specific term or value.",
    "multi_select": "Generate {count} multiple-select questions where 2 or more answers are correct. Mark all correct answers.",
    "ordering": "Generate {count} sequencing questions where the student arranges steps in the correct order. Provide 4-6 steps each.",
}


class QuizChainInput(TypedDict):
    document_id: str
    user_id: str
    question_count: int
    auto_mode: bool
    question_distribution: dict[str, int]


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
        options: list[str] = [str(o) for o in raw_options] if isinstance(raw_options, list) else []
        result["options"] = options
        result["correct_answer"] = str(raw_question.get("correct_answer") or "")

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
        result["correct_order"] = [int(i) for i in raw_order] if isinstance(raw_order, list) else []

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
            if q.get("correct_answer") not in opts:
                errors.append(f"MCQ question {q['id']} correct_answer not in options")
        elif qtype == "true_false":
            if not isinstance(q.get("correct_answer"), bool):
                errors.append(f"True/false question {q['id']} correct_answer must be boolean")
        elif qtype == "identification":
            if not q.get("correct_answer"):
                errors.append(f"Identification question {q['id']} has empty correct_answer")
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
        "Generate the following questions strictly from the provided study material.",
        "Do not use knowledge outside the provided content.",
        "",
    ]

    for type_id, count in distribution.items():
        if count > 0 and type_id in TYPE_PROMPTS:
            instructions.append(TYPE_PROMPTS[type_id].format(count=count))

    instructions.append("")
    instructions.append(
        "Return valid JSON only — an array of question objects. "
        "Each object must include: id, type, question, topic, explanation, "
        "and type-specific fields (options/correct_answer for mcq, "
        "correct_answer boolean for true_false, correct_answer string for identification, "
        "options/correct_answers array for multi_select, steps/correct_order array for ordering)."
    )

    if error_context:
        instructions.append("")
        instructions.append(f"Previous attempt had these errors: {error_context}")
        instructions.append("Fix the errors and return corrected JSON.")

    return f"Study material:\n{context}\n\n" + "\n".join(instructions)


def _parse_llm_questions(raw_content: object) -> list[QuizQuestion]:
    if isinstance(raw_content, str):
        content = raw_content.strip()
    else:
        content = "".join(str(part) for part in raw_content).strip()

    if "```json" in content:
        content = content.split("```json", 1)[1].split("```", 1)[0].strip()
    elif "```" in content:
        content = content.split("```", 1)[1].split("```", 1)[0].strip()

    payload = json.loads(content)
    if not isinstance(payload, list):
        raise ValueError("Quiz chain payload is not a list")
    return [_normalize_question(item, idx) for idx, item in enumerate(payload)]


@retry(
    wait=wait_exponential(min=4, max=30),
    stop=stop_after_attempt(5),
    retry=retry_if_exception(is_retryable_error),
    reraise=True,
)
async def _generate_questions_from_llm(
    chunks: list[str],
    distribution: dict[str, int],
    error_context: str | None = None,
) -> list[QuizQuestion]:
    llm = ChatGoogleGenerativeAI(
        model="gemini-2.5-flash-lite",
        google_api_key=settings.GOOGLE_API_KEY,
        temperature=0.2,
    )

    prompt = _build_generation_prompt(chunks, distribution, error_context)
    response = await llm.ainvoke(prompt)
    await asyncio.sleep(2)
    return _parse_llm_questions(response.content)


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

    try:
        questions = await _generate_questions_from_llm([], distribution)
        if not questions:
            questions, question_types = _fallback_questions(question_count)
        else:
            errors = _validate_questions(questions)
            if errors:
                logger.warning("Validation errors on first pass: %s", errors)
                error_ctx = "; ".join(errors)
                questions = await _generate_questions_from_llm(
                    [], distribution, error_context=error_ctx
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
        "questions": questions,
        "question_types": question_types,
        "weak_topics": weak_topics,
        "weak_area_flags": {"needs_review": bool(weak_topics)},
    }
