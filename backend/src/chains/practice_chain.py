"""Practice chain for generating targeted drills from weak topics."""

from __future__ import annotations

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


async def run_practice_chain(input: PracticeChainInput) -> PracticeChainOutput:
    topics = input["weak_topics"] or ["General"]
    try:
        topics = await _validate_topics_with_llm(topics)
    except Exception:  # noqa: BLE001
        logger.warning("Topic normalization failed, using raw topics")

    drills: list[dict[str, Any]] = []
    difficulties = ["easy", "medium", "hard"]
    for index in range(input["drill_count"]):
        topic = topics[index % len(topics)]
        difficulty = difficulties[index % len(difficulties)]
        drills.append(
            {
                "id": f"drill-{uuid.uuid4()}",
                "topic": topic,
                "question": f"{difficulty.title()} drill on {topic}: explain the key idea.",
                "options": [],
                "correct_answer": f"Core explanation for {topic}",
                "answer": f"Core explanation for {topic}",
                "explanation": f"This drill targets {topic} at {difficulty} level.",
                "difficulty": difficulty,
            }
        )

    return {"drills": drills}
