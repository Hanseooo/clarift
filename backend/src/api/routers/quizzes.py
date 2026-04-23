"""
Quizzes router for generating quizzes and submitting attempts.
"""

import uuid
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

from src.api.deps import enforce_quota, get_current_user
from src.db.session import get_db
from src.services.quiz_service import (
    QuizRequest,
    create_quiz_job,
    get_quiz_by_id,
    list_quizzes_by_user,
    submit_quiz_attempt,
)

router = APIRouter(prefix="/api/v1/quizzes", tags=["quizzes"])


class CreateQuizRequest(BaseModel):
    """Request body for creating a quiz."""

    document_id: str
    question_count: int = 5
    auto_mode: bool = True


class CreateQuizResponse(BaseModel):
    """Response after creating a quiz job."""

    job_id: str
    quiz_id: str
    message: str


class QuizItemResponse(BaseModel):
    id: str
    document_id: str
    question_count: int
    question_types: list[str]
    created_at: str


class QuizDetailResponse(BaseModel):
    id: str
    document_id: str
    questions: list[dict]
    question_types: list[str]
    question_count: int
    auto_mode: bool
    created_at: str


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


@router.get("", response_model=list[QuizItemResponse])
async def list_quizzes(
    user=Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    quizzes = await list_quizzes_by_user(db, user.id)
    return [
        QuizItemResponse(
            id=str(quiz.id),
            document_id=str(quiz.document_id),
            question_count=quiz.question_count,
            question_types=quiz.question_types,
            created_at=datetime.fromisoformat(str(quiz.created_at)).isoformat(),
        )
        for quiz in quizzes
    ]


@router.get("/{quiz_id}", response_model=QuizDetailResponse)
async def get_quiz(
    quiz_id: str,
    user=Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    quiz = await get_quiz_by_id(db, user.id, uuid.UUID(quiz_id))

    return QuizDetailResponse(
        id=str(quiz.id),
        document_id=str(quiz.document_id),
        questions=quiz.questions if isinstance(quiz.questions, list) else [],
        question_types=quiz.question_types,
        question_count=quiz.question_count,
        auto_mode=quiz.auto_mode,
        created_at=datetime.fromisoformat(str(quiz.created_at)).isoformat(),
    )


@router.post("", response_model=CreateQuizResponse)
async def create_quiz(
    request: CreateQuizRequest,
    _quota: None = Depends(enforce_quota("quiz")),
    user=Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Request a quiz for a given document.

    Delegates to the quiz service layer which handles validation,
    record creation, and ARQ job enqueueing. Returns a job_id for SSE streaming.
    """
    # Validate question_count
    if request.question_count < 1 or request.question_count > 20:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="question_count must be between 1 and 20",
        )

    service_request = QuizRequest(
        document_id=uuid.UUID(request.document_id),
    )

    result = await create_quiz_job(db, user.id, service_request)

    return CreateQuizResponse(
        job_id=result["job_id"],
        quiz_id=result["quiz_id"],
        message="Quiz generation started. Stream progress via /api/v1/jobs/{job_id}/stream.",
    )


@router.post("/attempts", response_model=SubmitAttemptResponse)
async def submit_attempt(
    request: SubmitAttemptRequest,
    user=Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Submit a quiz attempt and get results.

    Delegates to the quiz service layer which handles validation,
    score calculation, topic performance updates, and weak topic detection.
    """
    result = await submit_quiz_attempt(db, user.id, request.quiz_id, request.answers)

    return SubmitAttemptResponse(
        attempt_id=result["attempt_id"],
        score=result["score"],
        weak_topics=result["weak_topics"],
        message="Attempt submitted successfully.",
    )
