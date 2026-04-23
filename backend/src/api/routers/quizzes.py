"""
Quizzes router for generating quizzes and submitting attempts.
"""

import uuid
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy import func, select, update
from sqlalchemy.dialects.postgresql import insert
from sqlalchemy.ext.asyncio import AsyncSession

from src.api.deps import enforce_quota, get_current_user
from src.db.models import Quiz, QuizAttempt, UserTopicPerformance
from src.db.session import get_db
from src.services.quiz_service import QuizRequest, create_quiz_job

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
    result = await db.execute(
        select(Quiz).where(Quiz.user_id == user.id).order_by(Quiz.created_at.desc())
    )
    quizzes = result.scalars().all()
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
    result = await db.execute(
        select(Quiz).where(Quiz.id == uuid.UUID(quiz_id), Quiz.user_id == user.id)
    )
    quiz = result.scalar_one_or_none()
    if quiz is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Quiz not found")

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

    Creates a QuizAttempt record, calculates score, updates topic performance.
    Returns score and weak topics.
    """
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

    questions = quiz.questions if isinstance(quiz.questions, list) else []
    if not questions:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Quiz questions are not ready yet",
        )

    question_by_id = {
        str(question.get("id")): question for question in questions if isinstance(question, dict)
    }
    total_questions = len(question_by_id)
    correct_answers = 0

    topic_stats: dict[str, dict[str, int]] = {}
    for question_id, selected in request.answers.items():
        question = question_by_id.get(question_id)
        if not question:
            continue
        topic = str(question.get("topic") or "General")
        expected = str(question.get("correct_answer") or "")
        is_correct = selected == expected
        if is_correct:
            correct_answers += 1

        if topic not in topic_stats:
            topic_stats[topic] = {"attempts": 0, "correct": 0}
        topic_stats[topic]["attempts"] += 1
        topic_stats[topic]["correct"] += int(is_correct)

    score = 0.0 if total_questions == 0 else round((correct_answers / total_questions) * 100, 2)

    for topic, stats in topic_stats.items():
        performance_result = await db.execute(
            select(UserTopicPerformance).where(
                UserTopicPerformance.user_id == user.id,
                UserTopicPerformance.topic == topic,
            )
        )
        performance = performance_result.scalar_one_or_none()
        if performance is None:
            await db.execute(
                insert(UserTopicPerformance).values(
                    user_id=user.id,
                    topic=topic,
                    attempts=stats["attempts"],
                    correct=stats["correct"],
                    quiz_count=1,
                    last_updated=func.now(),
                )
            )
        else:
            await db.execute(
                update(UserTopicPerformance)
                .where(UserTopicPerformance.id == performance.id)
                .values(
                    attempts=performance.attempts + stats["attempts"],
                    correct=performance.correct + stats["correct"],
                    quiz_count=performance.quiz_count + 1,
                    last_updated=func.now(),
                )
            )

    weak_result = await db.execute(
        select(UserTopicPerformance).where(
            UserTopicPerformance.user_id == user.id,
            UserTopicPerformance.attempts >= 5,
            UserTopicPerformance.quiz_count >= 2,
            (UserTopicPerformance.correct * 1.0 / UserTopicPerformance.attempts) < 0.7,
        )
    )
    weak_topics = [entry.topic for entry in weak_result.scalars().all()]

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

    await db.commit()

    return SubmitAttemptResponse(
        attempt_id=str(attempt.id),
        score=score,
        weak_topics=weak_topics,
        message="Attempt submitted successfully.",
    )
