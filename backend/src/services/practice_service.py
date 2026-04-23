"""Practice service layer for targeted practice sessions and weak area detection."""

from __future__ import annotations

import uuid
from typing import Any

from sqlalchemy import select
from sqlalchemy.dialects.postgresql import insert
from sqlalchemy.ext.asyncio import AsyncSession

from src.db.models import PracticeSession, UserTopicPerformance
from src.services.practice_chain import PracticeChainInput, run_practice_chain
from src.services.retrieval_service import get_user_chunks


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

    chain_input = PracticeChainInput(
        weak_topics=weak_topics,
        drill_count=drill_count,
        user_id=str(user_id),
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


async def generate_mini_lesson(
    db: AsyncSession,
    user_id: uuid.UUID,
    topics: list[str],
) -> dict[str, Any]:
    """
    Generate a mini-lesson for the given topics.
    Retrieves relevant chunks and generates lesson content.
    """
    chunks = await get_user_chunks(db, user_id=user_id, document_id=None, limit=10)

    topic_context = []
    for chunk in chunks:
        topic_context.append(chunk["content"])

    lesson_content = "\n\n".join(topic_context) if topic_context else "No relevant content found."

    return {
        "topics": topics,
        "lesson": lesson_content,
        "chunk_count": len(chunks),
    }
