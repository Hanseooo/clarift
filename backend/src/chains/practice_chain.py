"""Practice chain for generating targeted drills from weak topics."""

from __future__ import annotations

import json
import logging
import uuid
from typing import Any, TypedDict

from langchain_google_genai import ChatGoogleGenerativeAI
from tenacity import retry, retry_if_exception, stop_after_attempt, wait_exponential

from src.chains.retry import is_retryable_error
from src.core.config import settings

logger = logging.getLogger(__name__)


class PracticeChainInput(TypedDict):
    weak_topics: list[str]
    drill_count: int
    user_id: str
    chunks: list[dict[str, Any]]


class PracticeChainOutput(TypedDict):
    drills: list[dict[str, Any]]


@retry(
    wait=wait_exponential(min=1, max=8),
    stop=stop_after_attempt(3),
    retry=retry_if_exception(is_retryable_error),
    reraise=True,
)
async def _validate_topics_with_llm(topics: list[str]) -> list[str]:
    llm = ChatGoogleGenerativeAI(
        model="gemini-2.5-flash-lite",
        google_api_key=settings.GOOGLE_API_KEY,
        temperature=0,
    )
    prompt = (
        "You are a study material organizer for Filipino students. Normalize the following raw topics into a clean, comma-separated list of concise study labels.\n\n"
        "## INPUT TOPICS\n" + ", ".join(topics) + "\n\n"
        "## NORMALIZATION RULES\n"
        "1. Output ONLY a comma-separated list. No numbers, no bullets, no extra text.\n"
        '2. Use Title Case for each label (e.g., "Cell Biology", "World War II").\n'
        "3. Each label must be 1-4 words, max 40 characters.\n"
        '4. Remove duplicates and near-duplicates (e.g., "Photosynthesis" and "Photosynthesis Process" → keep only "Photosynthesis").\n'
        "5. Generalize overly specific phrases into study-friendly labels:\n"
        '   - "The process by which plants make food" → "Photosynthesis"\n'
        '   - "Chapter 3 section 2 about mitosis" → "Mitosis"\n'
        '   - "How to solve quadratic equations by factoring" → "Quadratic Equations"\n'
        "6. If a topic is empty, gibberish, or irrelevant, omit it entirely.\n"
        "7. If ALL topics are empty/irrelevant, output exactly: General Study Material\n"
        "8. Do NOT add topics not present in the input. Do NOT use outside knowledge to expand the list.\n\n"
        "## EXAMPLES\n"
        'Input: "cell structure, Cell Structure, the parts of a cell, mitochondria function, , random text"\n'
        "Output: Cell Structure, Mitochondria Function\n\n"
        'Input: "how git works, git branching and merging, solving merge conflicts"\n'
        "Output: Git Basics, Git Branching, Merge Conflicts\n\n"
        "## OUTPUT FORMAT\n"
        "Comma-separated labels only. No quotes, no markdown, no JSON."
    )
    response = await llm.ainvoke(prompt)
    raw = response.content
    if isinstance(raw, str):
        text = raw
    else:
        text = "".join(str(part) for part in raw)

    normalized = [item.strip() for item in text.split(",") if item.strip()]
    return normalized or topics


@retry(
    wait=wait_exponential(min=1, max=8),
    stop=stop_after_attempt(3),
    retry=retry_if_exception(is_retryable_error),
    reraise=True,
)
async def _generate_drills_with_llm(
    topics: list[str],
    chunks: list[dict[str, Any]],
    count: int,
) -> list[dict[str, Any]]:
    llm = ChatGoogleGenerativeAI(
        model="gemini-2.5-flash-lite",
        google_api_key=settings.GOOGLE_API_KEY,
        temperature=0.5,
    )

    context = "\n\n".join(chunk.get("content", "") for chunk in chunks[:5])

    prompt = (
        f"You are an encouraging tutor for Filipino students. Generate exactly {count} practice drills using ONLY the source material below.\n\n"
        "## ABSOLUTE RULES\n"
        "1. Every drill MUST be based strictly on the provided source material.\n"
        "2. Do NOT use outside knowledge, common sense, or invented scenarios.\n"
        "3. If the source material cannot support the requested number of drills, generate only as many as the text allows. Never invent questions.\n\n"
        f"## SOURCE MATERIAL\n{context}\n\n"
        f"## TOPICS TO COVER\n{', '.join(topics)}\n\n"
        "## DIFFICULTY PROGRESSION\n"
        "Distribute difficulties as evenly as possible across the drills:\n"
        "- Difficulty 1 (basic recall/definition): ~30-40% of drills\n"
        "- Difficulty 2 (understanding/application): ~30-40% of drills\n"
        "- Difficulty 3 (complex analysis/calculation): ~20-40% of drills\n"
        "Start with difficulty 1 and increase progressively.\n\n"
        "## DRILL CONSTRAINTS\n"
        "- `question`: max 200 characters.\n"
        "- `options`: Exactly 4 strings for mcq/true_false; empty array `[]` for identification.\n"
        "- `correct_answer`: The exact text of the correct option (for mcq) or the correct term (for identification/true_false). Max 100 characters.\n"
        "- `explanation`: Why the answer is correct, citing the source material. Max 250 characters.\n"
        "- `difficulty`: integer 1, 2, or 3.\n"
        "- `topic`: 1-3 word label matching one of the provided topics.\n\n"
        "## OUTPUT FORMAT\n"
        "Return ONLY a valid JSON array. No markdown code fences, no extra text.\n"
        "\n"
        "[\n"
        "  {\n"
        '    "question": "string (max 200 chars)",\n'
        '    "type": "mcq | true_false | identification",\n'
        '    "options": ["string"] or [],\n'
        '    "correct_answer": "string (max 100 chars)",\n'
        '    "explanation": "string (max 250 chars)",\n'
        '    "difficulty": 1 | 2 | 3,\n'
        '    "topic": "string (1-3 words)"\n'
        "  }\n"
        "]\n\n"
        "## SELF-CHECK (perform before outputting)\n"
        "- [ ] Is every drill derived solely from the source material?\n"
        "- [ ] Are there exactly the requested number of drills, or fewer only if the text is insufficient?\n"
        "- [ ] Are difficulties distributed across 1, 2, and 3?\n"
        "- [ ] Do identification drills have an empty `options` array?\n"
        "- [ ] Is the output a valid JSON array with no trailing commas?"
    )

    response = await llm.ainvoke(prompt)
    raw = response.content
    if isinstance(raw, str):
        text = raw
    else:
        text = "".join(str(part) for part in raw)

    text = text.strip()
    if text.startswith("```"):
        text = text.split("```", 2)[1]
        if text.startswith("json"):
            text = text[4:]
        text = text.strip()

    drills = json.loads(text)
    if not isinstance(drills, list):
        raise ValueError("LLM did not return a JSON array")

    result = []
    for index, drill in enumerate(drills[:count]):
        difficulty = drill.get("difficulty", (index % 3) + 1)
        result.append(
            {
                "id": f"drill-{uuid.uuid4()}",
                "topic": drill.get("topic", topics[index % len(topics)]),
                "question": drill["question"],
                "options": drill.get("options", []),
                "correct_answer": drill["correct_answer"],
                "answer": drill["correct_answer"],
                "explanation": drill.get("explanation", ""),
                "difficulty": difficulty,
                "type": drill.get("type", "mcq"),
            }
        )

    result.sort(key=lambda d: d.get("difficulty", 1))
    return result


async def run_practice_chain(input: PracticeChainInput) -> PracticeChainOutput:
    topics = input["weak_topics"] or ["General"]
    try:
        topics = await _validate_topics_with_llm(topics)
    except Exception:  # noqa: BLE001
        logger.warning("Topic normalization failed, using raw topics")

    chunks = input.get("chunks", [])

    try:
        drills = await _generate_drills_with_llm(topics, chunks, input["drill_count"])
    except Exception:  # noqa: BLE001
        logger.warning("LLM drill generation failed, using fallback drills")
        drills = _fallback_drills(topics, input["drill_count"])

    return {"drills": drills}


def _fallback_drills(topics: list[str], count: int) -> list[dict[str, Any]]:
    drills: list[dict[str, Any]] = []
    for index in range(count):
        topic = topics[index % len(topics)]
        difficulty = (index % 3) + 1
        drills.append(
            {
                "id": f"drill-{uuid.uuid4()}",
                "topic": topic,
                "question": f"Explain the key concept of {topic}.",
                "options": [],
                "correct_answer": f"Core explanation for {topic}",
                "answer": f"Core explanation for {topic}",
                "explanation": f"This drill targets {topic} at difficulty level {difficulty}.",
                "difficulty": difficulty,
                "type": "identification",
            }
        )
    return drills
