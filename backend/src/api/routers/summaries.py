"""
Summaries router for generating structured summaries.
"""

import uuid
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.dialects.postgresql import insert

from src.db.session import get_db
from src.db.models import Summary, Job
from src.api.deps import get_current_user
from src.services.summary_chain import run_summary_chain, SummaryChainInput

router = APIRouter(prefix="/api/v1/summaries", tags=["summaries"])


class CreateSummaryRequest(BaseModel):
    """Request body for creating a summary."""

    document_id: str
    format: str = "bullet"  # bullet, outline, paragraph


@router.post("")
async def create_summary(
    request: CreateSummaryRequest,
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

    # Create pending Summary record
    summary_stmt = (
        insert(Summary)
        .values(
            document_id=uuid.UUID(request.document_id),
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

    # TODO: Dispatch ARQ job that calls run_summary_chain
    # For now, call the chain directly (stub)
    chain_input = SummaryChainInput(
        document_id=request.document_id,
        user_id=str(user.id),
        format=request.format,
    )
    chain_output = await run_summary_chain(chain_input)

    # Update summary with chain output (stub)
    # In reality, this would happen in the background job.
    # We'll just log for now.
    import logging

    logger = logging.getLogger(__name__)
    logger.info(
        "Summary chain completed for summary %s (job %s)",
        summary.id,
        job.id,
    )

    return {
        "summary_id": str(summary.id),
        "job_id": str(job.id),
        "message": "Summary generation started.",
    }
