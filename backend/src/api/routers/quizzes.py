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
    QuizSettings,
    create_quiz_job,
    get_attempt_by_id,
    get_quiz_by_id,
    list_quiz_attempts,
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
    title: str | None
    question_count: int
    question_types: list[str]
    created_at: str
    attempt_count: int
    latest_score: float | None


class QuizDetailResponse(BaseModel):
    id: str
    document_id: str
    title: str | None
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


class AttemptQuestionResponse(BaseModel):
    id: str
    question: str
    user_answer: str | bool | list[str]
    correct_answer: str | bool | list[str]
    is_correct: bool
    topic: str
    explanation: str
    type: str


class AttemptDetailResponse(BaseModel):
    score: float
    per_topic: dict[str, dict[str, int]]
    questions: list[AttemptQuestionResponse]


class AttemptListItem(BaseModel):
    attempt_id: str
    score: float
    topics: list[str]
    created_at: str


class AttemptListResponse(BaseModel):
    attempts: list[AttemptListItem]
    total: int


@router.get("", response_model=list[QuizItemResponse])
async def list_quizzes(
    user=Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    rows = await list_quizzes_by_user(db, user.id)
    return [
        QuizItemResponse(
            id=str(row["quiz"].id),
            document_id=str(row["quiz"].document_id),
            title=row["quiz"].title,
            question_count=row["quiz"].question_count,
            question_types=row["quiz"].question_types,
            created_at=datetime.fromisoformat(str(row["quiz"].created_at)).isoformat(),
            attempt_count=row["attempt_count"],
            latest_score=row["latest_score"],
        )
        for row in rows
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
        title=quiz.title,
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
        settings=QuizSettings(auto_mode=request.auto_mode),
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


@router.get("/attempts/{attempt_id}", response_model=AttemptDetailResponse)
async def get_attempt(
    attempt_id: str,
    user=Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Retrieve detailed results for a quiz attempt.
    """
    result = await get_attempt_by_id(db, user.id, attempt_id)

    return AttemptDetailResponse(
        score=result["score"],
        per_topic=result["per_topic"],
        questions=[AttemptQuestionResponse(**q) for q in result["questions"]],
    )


@router.get("/{quiz_id}/attempts", response_model=AttemptListResponse)
async def get_quiz_attempts(
    quiz_id: str,
    limit: int = 10,
    user=Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    List attempts for a specific quiz.
    """
    attempts = await list_quiz_attempts(db, user.id, uuid.UUID(quiz_id), limit=limit)

    return AttemptListResponse(
        attempts=[
            AttemptListItem(
                attempt_id=str(attempt.id),
                score=float(attempt.score),
                topics=attempt.topics or [],
                created_at=datetime.fromisoformat(str(attempt.created_at)).isoformat(),
            )
            for attempt in attempts
        ],
        total=len(attempts),
    )
