"""
Jobs router for streaming job progress via SSE.
"""

import asyncio
import json
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from src.db.session import get_db
from src.db.models import Job
from src.api.deps import get_current_user

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
    # Fetch job ensuring it belongs to the authenticated user
    result = await db.execute(select(Job).where(Job.id == job_id, Job.user_id == user.id))
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
        max_polls = 60  # ~1 minute if polling every second
        poll_interval = 1.0  # seconds

        for _ in range(max_polls):
            # Refresh job from database
            result = await db.execute(select(Job).where(Job.id == job_id, Job.user_id == user.id))
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

            # If job is done (success or failed), stop streaming
            if job.status in ("success", "failed"):
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


def _estimate_progress(job: Job) -> float | None:
    """
    Heuristic to map job status to a progress percentage (0‑100).
    Can be enhanced later with actual progress tracking.
    """
    mapping = {
        "pending": 0.0,
        "processing": 50.0,
        "success": 100.0,
        "failed": 100.0,
    }
    return mapping.get(job.status)
