"""Quiz service layer for managing quiz generation and retrieval."""

from __future__ import annotations

import logging
import uuid
from typing import Any

from fastapi import HTTPException, status
from pydantic import BaseModel, model_validator
from sqlalchemy import func, select
from sqlalchemy.dialects.postgresql import insert
from sqlalchemy.ext.asyncio import AsyncSession

from src.db.models import Document, DocumentChunk, Job, Quiz, Summary
from src.worker import get_arq_pool

logger = logging.getLogger(__name__)


class QuizTypeSettings(BaseModel):
    mcq: bool = True
    true_false: bool = True
    identification: bool = True
    multi_select: bool = True
    ordering: bool = True

    @model_validator(mode="after")
    def at_least_one_type(self):
        if not any(
            [self.mcq, self.true_false, self.identification, self.multi_select, self.ordering]
        ):
            raise ValueError("At least one question type must be selected")
        return self


class QuizSettings(BaseModel):
    auto_mode: bool = True
    type_overrides: QuizTypeSettings | None = None


class QuizRequest(BaseModel):
    document_id: uuid.UUID
    settings: QuizSettings | None = None


def resolve_quiz_settings(
    request_settings: QuizSettings | None,
    applicability_flags: dict,
) -> list[str]:
    """
    Returns the list of question types to include in this quiz.

    Resolution order:
    1. Start with all applicable types from content analysis flags
    2. If auto_mode=True (or no settings): use applicable types only
    3. If auto_mode=False: use user-selected types, but still exclude inapplicable ones
    4. Always exclude inapplicable types regardless of user selection
    """
    applicable = {
        type_id for type_id, flag in applicability_flags.items() if flag.get("applicable")
    }

    if not request_settings or request_settings.auto_mode:
        return list(applicable)

    if request_settings.type_overrides:
        user_selected = {
            type_id
            for type_id, enabled in request_settings.type_overrides.model_dump().items()
            if enabled
        }
        return list(user_selected & applicable)

    return list(applicable)


def calculate_question_count(chunk_count: int, type_count: int) -> int:
    """
    Returns total question count for a quiz.
    Scales with content length. Distributes across selected types.
    Minimum: 5 questions. Maximum: 25 questions.
    """
    if chunk_count <= 3:
        base = 5
    elif chunk_count <= 8:
        base = 10
    elif chunk_count <= 15:
        base = 15
    else:
        base = 20

    if type_count >= 4:
        base = min(base + 3, 25)

    return base


def distribute_questions(total: int, types: list[str]) -> dict[str, int]:
    """
    Distributes total question count across selected types.
    MCQ gets the largest share. Other types are distributed evenly.
    """
    if not types:
        return {}

    distribution = {}

    if "mcq" in types and len(types) > 1:
        mcq_count = max(total // 2, 2)
        remaining = total - mcq_count
        other_types = [t for t in types if t != "mcq"]
        per_other = remaining // len(other_types)
        remainder = remaining % len(other_types)

        distribution["mcq"] = mcq_count
        for i, t in enumerate(other_types):
            distribution[t] = per_other + (1 if i < remainder else 0)
    else:
        per_type = total // len(types)
        remainder = total % len(types)
        for i, t in enumerate(types):
            distribution[t] = per_type + (1 if i < remainder else 0)

    return distribution


async def create_quiz_job(
    db: AsyncSession,
    user_id: uuid.UUID,
    request: QuizRequest,
) -> dict[str, Any]:
    """
    Create a quiz job: validate input, resolve settings, calculate counts,
    create Job record, and enqueue ARQ job.

    Returns dict with job_id, quiz_id, and question_distribution.
    """
    document_result = await db.execute(
        select(Document).where(
            Document.id == request.document_id,
            Document.user_id == user_id,
        )
    )
    document = document_result.scalar_one_or_none()
    if not document:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Document not found",
        )

    summary_result = await db.execute(
        select(Summary).where(
            Summary.document_id == request.document_id,
            Summary.user_id == user_id,
        )
    )
    summary = summary_result.scalar_one_or_none()
    if not summary:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Document summary not ready yet. Generate a summary first.",
        )

    applicability_flags = summary.quiz_type_flags or {}
    resolved_types = resolve_quiz_settings(request.settings, applicability_flags)

    if not resolved_types:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No applicable question types for this document.",
        )

    auto_mode = request.settings.auto_mode if request.settings else True

    chunk_count_result = await db.execute(
        select(func.count(DocumentChunk.id)).where(
            DocumentChunk.user_id == user_id,
            DocumentChunk.document_id == request.document_id,
        )
    )
    chunk_count = chunk_count_result.scalar_one()
    total_questions = calculate_question_count(chunk_count, len(resolved_types))
    distribution = distribute_questions(total_questions, resolved_types)

    try:
        quiz_stmt = (
            insert(Quiz)
            .values(
                document_id=request.document_id,
                user_id=user_id,
                questions=[],
                question_types=resolved_types,
                question_count=total_questions,
                auto_mode=auto_mode,
            )
            .returning(Quiz)
        )
        quiz_result = await db.execute(quiz_stmt)
        quiz = quiz_result.scalar_one()

        job_stmt = (
            insert(Job)
            .values(
                user_id=user_id,
                type="quiz",
                status="pending",
            )
            .returning(Job)
        )
        job_result = await db.execute(job_stmt)
        job = job_result.scalar_one()
        await db.commit()
    except Exception:
        await db.rollback()
        raise

    try:
        pool = await get_arq_pool()
        await pool.enqueue_job(
            "run_quiz_job",
            quiz_id=str(quiz.id),
            job_id=str(job.id),
            user_id=str(user_id),
            document_id=str(request.document_id),
            question_count=total_questions,
            auto_mode=auto_mode,
        )
    except Exception:
        logger.exception("ARQ enqueue failed for quiz job %s, cleaning up DB records", job.id)
        try:
            await db.execute(select(Quiz).where(Quiz.id == quiz.id).with_for_update())
            await db.execute(select(Job).where(Job.id == job.id).with_for_update())
            await db.execute(Quiz.__table__.delete().where(Quiz.id == quiz.id))
            await db.execute(Job.__table__.delete().where(Job.id == job.id))
            await db.commit()
        except Exception:
            await db.rollback()
            logger.exception("Compensating delete failed for quiz %s job %s", quiz.id, job.id)
        raise

    return {
        "job_id": str(job.id),
        "quiz_id": str(quiz.id),
        "question_distribution": distribution,
        "question_count": total_questions,
        "question_types": resolved_types,
    }


async def get_quiz_by_id(
    db: AsyncSession,
    user_id: uuid.UUID,
    quiz_id: uuid.UUID,
) -> Quiz:
    """
    Retrieve a quiz by ID with user-ownership check.
    Raises 404 if not found.
    """
    result = await db.execute(
        select(Quiz).where(
            Quiz.id == quiz_id,
            Quiz.user_id == user_id,
        )
    )
    quiz = result.scalar_one_or_none()
    if not quiz:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Quiz not found",
        )
    return quiz
