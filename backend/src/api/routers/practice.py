"""
Practice router for generating targeted drills based on weak areas.
"""

import uuid
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.dialects.postgresql import insert

from src.db.session import get_db
from src.db.models import PracticeSession
from src.api.deps import get_current_user

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


@router.post("", response_model=CreatePracticeResponse)
async def create_practice(
    request: CreatePracticeRequest,
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

    # Create placeholder drills
    drills = []
    for i in range(request.drill_count):
        drills.append(
            {
                "id": f"d{i + 1}",
                "topic": request.weak_topics[i % len(request.weak_topics)]
                if request.weak_topics
                else "General",
                "question": f"Practice question {i + 1} about {request.weak_topics[i % len(request.weak_topics)] if request.weak_topics else 'general topic'}?",
                "answer": f"Placeholder answer {i + 1}",
                "explanation": "This is a placeholder explanation.",
            }
        )

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
