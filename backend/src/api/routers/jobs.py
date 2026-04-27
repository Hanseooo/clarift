"""
Jobs router for streaming job progress via SSE.
"""

import asyncio
import json

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import StreamingResponse
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from src.api.deps import get_current_user
from src.db.models import Job
from src.db.session import get_db

router = APIRouter(prefix="/api/v1/jobs", tags=["jobs"])


@router.get("/{job_id}/stream")
async def stream_job_progress(
    job_id: str,
    user=Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Stream Server-Sent Events (SSE) for job status updates.
    Frontend polls this endpoint to show real‑time progress.
    """
    # Validate job ID format (UUID)
    user_id = user.id

    # Fetch job ensuring it belongs to the authenticated user
    result = await db.execute(select(Job).where(Job.id == job_id, Job.user_id == user_id))
    job = result.scalar_one_or_none()
    if not job:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Job not found",
        )

    async def event_generator():
        """
        Yield SSE events until job is no longer pending/processing,
        or a timeout is reached.
        """
        max_polls = 40  # ~40 secs if polling every second
        poll_interval = 3.0  # seconds

        for _ in range(max_polls):
            # End the current transaction to get fresh data from the database
            await db.rollback()

            # Refresh job from database
            result = await db.execute(select(Job).where(Job.id == job_id, Job.user_id == user_id))
            job = result.scalar_one()

            # Build SSE event
            event_data = {
                "id": str(job.id),
                "type": job.type,
                "status": job.status,
                "progress": _estimate_progress(job),
                "result": job.result,
                "error": job.error,
                "updated_at": job.updated_at.isoformat() if job.updated_at else None,
            }

            yield f"data: {json.dumps(event_data, default=str)}\n\n"

            # If job is done (completed or failed), stop streaming
            if job.status in ("completed", "failed"):
                break

            await asyncio.sleep(poll_interval)
        else:
            # Timeout reached
            yield f"data: {json.dumps({'status': 'timeout', 'message': 'Stream closed after max polls'})}\n\n"

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",  # Disable buffering for nginx
        },
    )


def _estimate_progress(job: Job) -> float:
    """
    Heuristic to map job status to a progress percentage (0‑100).
    Quiz jobs have more granular steps than summary jobs.
    """
    quiz_mapping = {
        "pending": 0.0,
        "processing": 60.0,
        "completed": 100.0,
        "failed": 100.0,
    }

    summary_mapping = {
        "pending": 0.0,
        "processing": 50.0,
        "completed": 100.0,
        "failed": 100.0,
    }

    mapping = {
        "quiz": quiz_mapping,
        "summary": summary_mapping,
    }

    job_mapping = mapping.get(job.type, summary_mapping)
    return job_mapping.get(job.status, 0.0)
