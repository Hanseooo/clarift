"""
Practice router for generating targeted drills based on weak areas.
"""

import uuid
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.dialects.postgresql import insert
from sqlalchemy.ext.asyncio import AsyncSession

from src.api.deps import enforce_quota, get_current_user
from src.chains.practice_chain import PracticeChainInput, run_practice_chain
from src.db.models import PracticeSession, UserTopicPerformance
from src.db.session import get_db

router = APIRouter(prefix="/api/v1/practice", tags=["practice"])


class CreatePracticeRequest(BaseModel):
    """Request body for creating a practice session."""

    weak_topics: list[str]
    drill_count: int = 5


class CreatePracticeResponse(BaseModel):
    """Response after creating a practice session."""

    practice_id: str
    drills: list[dict]
    message: str


class PracticeDetailResponse(BaseModel):
    id: str
    weak_topics: list[str]
    drills: list[dict]
    created_at: str


@router.post("", response_model=CreatePracticeResponse)
async def create_practice(
    request: CreatePracticeRequest,
    _quota: None = Depends(enforce_quota("practice")),
    user=Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Request targeted practice drills for weak topics.

    Creates a PracticeSession record and returns generated drills.
    """
    # Validate drill_count
    if request.drill_count < 1 or request.drill_count > 20:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="drill_count must be between 1 and 20",
        )

    chain_input = PracticeChainInput(
        weak_topics=request.weak_topics,
        drill_count=request.drill_count,
        user_id=str(user.id),
    )
    chain_output = await run_practice_chain(chain_input)
    drills = chain_output["drills"]

    # Create PracticeSession record
    practice_stmt = (
        insert(PracticeSession)
        .values(
            user_id=user.id,
            weak_topics=request.weak_topics,
            drills=drills,
        )
        .returning(PracticeSession)
    )
    result = await db.execute(practice_stmt)
    practice = result.scalar_one()

    await db.commit()

    return CreatePracticeResponse(
        practice_id=str(practice.id),
        drills=drills,
        message="Practice session created.",
    )


@router.get("/weak-areas")
async def get_weak_areas(
    user=Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(UserTopicPerformance).where(
            UserTopicPerformance.user_id == user.id,
            UserTopicPerformance.attempts >= 5,
            UserTopicPerformance.quiz_count >= 2,
            (UserTopicPerformance.correct * 1.0 / UserTopicPerformance.attempts) < 0.7,
        )
    )
    rows = result.scalars().all()

    weak_topics = [
        {
            "topic": row.topic,
            "attempts": row.attempts,
            "accuracy": 0 if row.attempts == 0 else round((row.correct / row.attempts) * 100, 2),
            "quiz_count": row.quiz_count,
        }
        for row in rows
    ]
    return {"weak_topics": weak_topics}


@router.get("/{practice_id}", response_model=PracticeDetailResponse)
async def get_practice_session(
    practice_id: str,
    user=Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(PracticeSession).where(
            PracticeSession.id == uuid.UUID(practice_id),
            PracticeSession.user_id == user.id,
        )
    )
    session = result.scalar_one_or_none()
    if session is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Practice session not found"
        )

    return PracticeDetailResponse(
        id=str(session.id),
        weak_topics=session.weak_topics,
        drills=session.drills if isinstance(session.drills, list) else [],
        created_at=datetime.fromisoformat(str(session.created_at)).isoformat(),
    )
