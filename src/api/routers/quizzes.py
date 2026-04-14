"""
Quizzes router for generating quizzes and submitting attempts.
"""

import uuid
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.dialects.postgresql import insert

from src.db.session import get_db
from src.db.models import Quiz, QuizAttempt, UserTopicPerformance
from src.api.deps import get_current_user
from src.services.quiz_chain import run_quiz_chain, QuizChainInput

router = APIRouter(prefix="/api/v1/quizzes", tags=["quizzes"])


class CreateQuizRequest(BaseModel):
    """Request body for creating a quiz."""

    document_id: str
    question_count: int = 5
    auto_mode: bool = True


class CreateQuizResponse(BaseModel):
    """Response after creating a quiz."""

    quiz_id: str
    message: str
    weak_topics: list[str]


class SubmitAttemptRequest(BaseModel):
    """Request body for submitting a quiz attempt."""

    quiz_id: str
    answers: dict[str, str]  # question_id -> selected_answer_id


class SubmitAttemptResponse(BaseModel):
    """Response after submitting an attempt."""

    attempt_id: str
    score: float
    weak_topics: list[str]
    message: str


@router.post("", response_model=CreateQuizResponse)
async def create_quiz(
    request: CreateQuizRequest,
    user=Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Request a quiz for a given document.

    Creates a pending Quiz record, then triggers the quiz chain.
    Returns the quiz ID and weak topics.
    """
    # Validate question_count
    if request.question_count < 1 or request.question_count > 20:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="question_count must be between 1 and 20",
        )

    # Create pending Quiz record
    quiz_stmt = (
        insert(Quiz)
        .values(
            document_id=uuid.UUID(request.document_id),
            user_id=user.id,
            questions=[],  # placeholder, will be filled by chain
            question_types=[],
            question_count=request.question_count,
            auto_mode=request.auto_mode,
        )
        .returning(Quiz)
    )
    result = await db.execute(quiz_stmt)
    quiz = result.scalar_one()

    await db.commit()

    # Call quiz chain (stub)
    chain_input = QuizChainInput(
        document_id=request.document_id,
        user_id=str(user.id),
        question_count=request.question_count,
        auto_mode=request.auto_mode,
    )
    chain_output = await run_quiz_chain(chain_input)

    # Update quiz with chain output (stub)
    # In reality, this would happen in the background job.
    import logging

    logger = logging.getLogger(__name__)
    logger.info(
        "Quiz chain completed for quiz %s",
        quiz.id,
    )

    return CreateQuizResponse(
        quiz_id=str(quiz.id),
        message="Quiz generation started.",
        weak_topics=chain_output["weak_topics"],
    )


@router.post("/attempts", response_model=SubmitAttemptResponse)
async def submit_attempt(
    request: SubmitAttemptRequest,
    user=Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Submit a quiz attempt and get results.

    Creates a QuizAttempt record, calculates score, updates topic performance.
    Returns score and weak topics.
    """
    # Validate quiz exists and belongs to user
    from sqlalchemy import select

    result = await db.execute(
        select(Quiz).where(
            Quiz.id == uuid.UUID(request.quiz_id),
            Quiz.user_id == user.id,
        )
    )
    quiz = result.scalar_one_or_none()
    if not quiz:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Quiz not found",
        )

    # Stub scoring logic
    # For now, assume all answers are correct (placeholder)
    score = 100.0
    weak_topics = []  # placeholder

    # Create QuizAttempt record
    attempt_stmt = (
        insert(QuizAttempt)
        .values(
            quiz_id=quiz.id,
            user_id=user.id,
            answers=request.answers,
            score=score,
            topics=weak_topics,
        )
        .returning(QuizAttempt)
    )
    result = await db.execute(attempt_stmt)
    attempt = result.scalar_one()

    # Update UserTopicPerformance (stub)
    # In reality, we would update per-topic performance based on answers
    await db.commit()

    return SubmitAttemptResponse(
        attempt_id=str(attempt.id),
        score=score,
        weak_topics=weak_topics,
        message="Attempt submitted successfully.",
    )
