"""
Summaries router for generating structured summaries.
"""

import uuid
from datetime import datetime
from typing import Any

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.dialects.postgresql import insert
from sqlalchemy.ext.asyncio import AsyncSession

from src.api.deps import enforce_quota, get_current_user
from src.db.models import Document, Job, Summary
from src.db.session import get_db
from src.worker import get_arq_pool

router = APIRouter(prefix="/api/v1/summaries", tags=["summaries"])


class CreateSummaryRequest(BaseModel):
    """Request body for creating a summary."""

    document_id: str
    format: str = "bullet"  # bullet, outline, paragraph


class CreateSummaryResponse(BaseModel):
    summary_id: str
    job_id: str
    message: str


class SummaryResponse(BaseModel):
    id: str
    document_id: str
    format: str
    content: str
    diagram_syntax: str | None
    diagram_type: str | None
    quiz_type_flags: dict[str, Any] | None
    created_at: str


def _to_summary_response(summary: Summary) -> SummaryResponse:
    return SummaryResponse(
        id=str(summary.id),
        document_id=str(summary.document_id),
        format=summary.format,
        content=summary.content,
        diagram_syntax=summary.diagram_syntax,
        diagram_type=summary.diagram_type,
        quiz_type_flags=summary.quiz_type_flags,
        created_at=datetime.fromisoformat(str(summary.created_at)).isoformat(),
    )


@router.get("", response_model=list[SummaryResponse])
async def list_summaries(
    user=Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Summary).where(Summary.user_id == user.id).order_by(Summary.created_at.desc())
    )
    summaries = result.scalars().all()
    return [_to_summary_response(summary) for summary in summaries]


@router.get("/{summary_id}", response_model=SummaryResponse)
async def get_summary(
    summary_id: uuid.UUID,
    user=Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Summary).where(Summary.id == summary_id, Summary.user_id == user.id)
    )
    summary = result.scalar_one_or_none()
    if summary is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Summary not found",
        )
    return _to_summary_response(summary)


@router.post("", response_model=CreateSummaryResponse)
async def create_summary(
    request: CreateSummaryRequest,
    _quota: None = Depends(enforce_quota("summary")),
    user=Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Request a summary for a given document.

    Creates a pending Summary record and a Job, then triggers the summary chain.
    Returns the summary ID and job ID for polling.
    """
    # Validate format
    allowed_formats = {"bullet", "outline", "paragraph"}
    if request.format not in allowed_formats:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid format: {request.format}. Allowed: {', '.join(allowed_formats)}",
        )

    try:
        document_uuid = uuid.UUID(request.document_id)
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid document_id",
        ) from exc

    document_result = await db.execute(
        select(Document).where(Document.id == document_uuid, Document.user_id == user.id)
    )
    document = document_result.scalar_one_or_none()
    if document is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Document not found",
        )

    # Create pending Summary record
    summary_stmt = (
        insert(Summary)
        .values(
            document_id=document.id,
            user_id=user.id,
            format=request.format,
            content="",  # placeholder, will be filled by chain
        )
        .returning(Summary)
    )
    result = await db.execute(summary_stmt)
    summary = result.scalar_one()

    # Create Job record
    job_stmt = (
        insert(Job)
        .values(
            user_id=user.id,
            type="summary_generation",
            status="pending",
        )
        .returning(Job)
    )
    result = await db.execute(job_stmt)
    job = result.scalar_one()

    await db.commit()

    pool = await get_arq_pool()
    await pool.enqueue_job(
        "run_summary_job",
        str(summary.id),
        str(job.id),
        str(user.id),
        str(document.id),
        request.format,
    )

    return {
        "summary_id": str(summary.id),
        "job_id": str(job.id),
        "message": "Summary generation started.",
    }
