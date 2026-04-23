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
        "Normalize these topics into concise study labels. Return comma-separated only: "
        + ", ".join(topics)
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
        f"You are a tutor for Filipino nursing students. Generate exactly {count} practice drills "
        f"for these topics: {', '.join(topics)}.\n\n"
        f"Source material:\n{context}\n\n"
        "Difficulty progression:\n"
        "- difficulty 1: basic recall/definition questions\n"
        "- difficulty 2: understanding/application questions\n"
        "- difficulty 3: complex analysis/calculation questions\n"
        "Start with difficulty 1 and progress to 3.\n\n"
        "Return ONLY a JSON array. Each drill must have:\n"
        "{\n"
        '  "question": "string",\n'
        '  "type": "mcq" | "true_false" | "identification",\n'
        '  "options": ["A", "B", "C", "D"] (empty array for identification),\n'
        '  "correct_answer": "string" (the correct option text or answer),\n'
        '  "explanation": "string",\n'
        '  "difficulty": 1 | 2 | 3,\n'
        '  "topic": "string"\n'
        "}\n"
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
