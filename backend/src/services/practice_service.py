"""Practice service layer for targeted practice sessions and weak area detection."""

from __future__ import annotations

import logging
import uuid
from datetime import datetime, timezone
from typing import Any

from fastapi import HTTPException, status
from langchain_google_genai import ChatGoogleGenerativeAI
from sqlalchemy import func, select
from sqlalchemy.dialects.postgresql import insert
from sqlalchemy.ext.asyncio import AsyncSession
from tenacity import retry, retry_if_exception, stop_after_attempt, wait_exponential

from src.chains.practice_chain import PracticeChainInput, run_practice_chain
from src.chains.retry import is_retryable_error
from src.core.config import settings
from src.db.models import PracticeSession, UserTopicPerformance
from src.services.retrieval_service import get_relevant_chunks

logger = logging.getLogger(__name__)


async def get_weak_areas(
    db: AsyncSession,
    user_id: uuid.UUID,
) -> list[dict[str, Any]]:
    """
    Returns topics meeting weak criteria:
    - attempts >= 5
    - accuracy < 70%
    - quiz_count >= 2
    """
    result = await db.execute(
        select(UserTopicPerformance).where(
            UserTopicPerformance.user_id == user_id,
            UserTopicPerformance.attempts >= 5,
            UserTopicPerformance.quiz_count >= 2,
            (UserTopicPerformance.correct * 1.0 / UserTopicPerformance.attempts) < 0.7,
        )
    )
    performances = result.scalars().all()

    return [
        {
            "topic": p.topic,
            "attempts": p.attempts,
            "correct": p.correct,
            "accuracy": round((p.correct / p.attempts) * 100, 2) if p.attempts > 0 else 0,
            "quiz_count": p.quiz_count,
        }
        for p in performances
    ]


async def create_practice_session(
    db: AsyncSession,
    user_id: uuid.UUID,
    weak_topics: list[str] | None = None,
    drill_count: int = 5,
) -> dict[str, Any]:
    """
    Create a practice session for the given user.
    If weak_topics is None, retrieves them automatically.
    """
    if not weak_topics:
        weak_areas = await get_weak_areas(db, user_id)
        weak_topics = [area["topic"] for area in weak_areas]

    if not weak_topics:
        weak_topics = ["General"]
        logger.warning("No weak topics found for user %s, falling back to General", user_id)

    query = f"Generate practice questions testing definitions, concepts, and relationships related to {', '.join(weak_topics)}"
    chunks = await get_relevant_chunks(db, user_id=user_id, query=query, limit=10)

    chain_input = PracticeChainInput(
        weak_topics=weak_topics,
        drill_count=drill_count,
        user_id=str(user_id),
        chunks=chunks,
    )
    chain_output = await run_practice_chain(chain_input)
    drills = chain_output["drills"]

    session_stmt = (
        insert(PracticeSession)
        .values(
            user_id=user_id,
            weak_topics=weak_topics,
            drills=drills,
        )
        .returning(PracticeSession)
    )
    result = await db.execute(session_stmt)
    session = result.scalar_one()
    await db.commit()

    return {
        "session_id": str(session.id),
        "weak_topics": weak_topics,
        "drills": drills,
        "created_at": session.created_at.isoformat(),
    }


@retry(
    wait=wait_exponential(min=1, max=8),
    stop=stop_after_attempt(3),
    retry=retry_if_exception(is_retryable_error),
    reraise=True,
)
async def _generate_lesson_with_llm(topics: list[str], context: str) -> str:
    llm = ChatGoogleGenerativeAI(
        model="gemini-2.5-flash-lite",
        google_api_key=settings.GOOGLE_API_KEY,
        temperature=0.3,
    )
    prompt = (
        f"You are a supportive tutor for Filipino students. Write a concise mini-lesson on the topic(s) below using ONLY the provided source material.\n\n"
        f"## TOPICS\n{', '.join(topics)}\n\n"
        f"## SOURCE MATERIAL\n{context}\n\n"
        "## ABSOLUTE RULES\n"
        "1. Base the ENTIRE lesson strictly on the source material.\n"
        "2. Do NOT add facts, examples, definitions, or context from outside knowledge.\n"
        "3. If the source material does not cover the topics sufficiently, output exactly:\n"
        f'   "The provided material does not cover this topic in enough detail. Please review your notes or upload more content about {", ".join(topics)}."\n'
        "   Do NOT attempt to fill gaps.\n\n"
        "## LESSON STRUCTURE\n"
        "Write exactly 2 paragraphs with a total of no more than 300 words.\n\n"
        "Paragraph 1 — Concept Explanation (max 150 words):\n"
        "- Define the core concept(s) using only what the source material states.\n"
        "- Explain the key components or principles mentioned in the text.\n"
        "- Use **bold** for important terms.\n\n"
        "Paragraph 2 — Example or Application (max 150 words):\n"
        "- Provide ONE concrete example, case, or application directly from the source material.\n"
        "- Explain why the example matters based on the text.\n"
        "- If the source material has no example, use this paragraph to explain the significance or implications as described in the text.\n\n"
        "## FORMATTING\n"
        "- Use standard Markdown only (bold, italics).\n"
        "- Do NOT use Heading 2 (`##`) — the UI handles the lesson title separately.\n"
        "- Keep sentences short and clear.\n"
        "- Maintain an encouraging, supportive tone.\n\n"
        "## OUTPUT\n"
        "Return ONLY the lesson text (2 paragraphs). No JSON, no markdown code fences, no meta-commentary."
    )
    response = await llm.ainvoke(prompt)
    raw = response.content
    if isinstance(raw, str):
        return raw
    return "".join(str(part) for part in raw)


async def generate_mini_lesson(
    db: AsyncSession,
    user_id: uuid.UUID,
    topics: list[str],
) -> dict[str, Any]:
    """
    Generate a mini-lesson for the given topics.
    Retrieves relevant chunks scoped to the topics and generates lesson content via LLM.
    """
    query = f"Explain the concepts of {', '.join(topics)}"
    chunks = await get_relevant_chunks(db, user_id=user_id, query=query, limit=10)

    topic_context = [chunk["content"] for chunk in chunks]

    if not topic_context:
        lesson_content = "No relevant content found for the specified topics."
    else:
        combined_context = "\n\n".join(topic_context)
        try:
            lesson_content = await _generate_lesson_with_llm(topics, combined_context)
        except Exception:  # noqa: BLE001
            logger.warning("LLM lesson generation failed, falling back to raw context")
            lesson_content = combined_context

    return {
        "topics": topics,
        "lesson": lesson_content,
        "chunk_count": len(topic_context),
    }


async def submit_practice_session(
    db: AsyncSession,
    user_id: uuid.UUID,
    practice_id: str,
    answers: dict[str, str],
) -> dict[str, Any]:
    result = await db.execute(
        select(PracticeSession).where(
            PracticeSession.id == uuid.UUID(practice_id),
            PracticeSession.user_id == user_id,
        )
    )
    session = result.scalar_one_or_none()
    if not session:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Practice session not found"
        )

    drills = session.drills if isinstance(session.drills, list) else []
    drill_by_id = {str(d.get("id")): d for d in drills if isinstance(d, dict)}

    topic_stats: dict[str, dict[str, int]] = {}
    results: list[dict[str, Any]] = []
    correct_count = 0

    for drill_id, selected in answers.items():
        drill = drill_by_id.get(drill_id)
        if not drill:
            continue
        topic = str(drill.get("topic") or "General")
        expected = str(drill.get("correct_answer") or "")
        is_correct = selected.strip().lower() == expected.strip().lower()
        if is_correct:
            correct_count += 1
        if topic not in topic_stats:
            topic_stats[topic] = {"attempts": 0, "correct": 0}
        topic_stats[topic]["attempts"] += 1
        topic_stats[topic]["correct"] += int(is_correct)
        results.append(
            {
                "drill_id": drill_id,
                "is_correct": is_correct,
                "correct_answer": expected,
                "explanation": str(drill.get("explanation", "")),
            }
        )

    total_count = len(results)
    score = 0.0 if total_count == 0 else round((correct_count / total_count) * 100, 2)

    performance_entries = []
    for topic, stats in topic_stats.items():
        perf_result = await db.execute(
            select(UserTopicPerformance).where(
                UserTopicPerformance.user_id == user_id,
                UserTopicPerformance.topic == topic,
            )
        )
        perf = perf_result.scalar_one_or_none()
        if perf is None:
            insert_stmt = (
                insert(UserTopicPerformance)
                .values(
                    user_id=user_id,
                    topic=topic,
                    attempts=stats["attempts"],
                    correct=stats["correct"],
                    quiz_count=0,
                    last_updated=func.now(),
                )
                .returning(UserTopicPerformance)
            )
            new_perf = await db.execute(insert_stmt)
            perf = new_perf.scalar_one()
        else:
            perf.attempts += stats["attempts"]
            perf.correct += stats["correct"]
            perf.last_updated = datetime.now(timezone.utc)
        performance_entries.append(
            {
                "id": str(perf.id),
                "topic": perf.topic,
                "attempts": perf.attempts,
                "correct": perf.correct,
                "accuracy": round((perf.correct / perf.attempts) * 100, 2)
                if perf.attempts > 0
                else 0,
            }
        )

    await db.commit()

    return {
        "score": score,
        "correct_count": correct_count,
        "total_count": total_count,
        "results": results,
        "performance_entries": performance_entries,
    }
