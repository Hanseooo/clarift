"""
Jobs router for streaming job progress via SSE.
"""

import asyncio
import json

from fastapi import APIRouter, Depends, HTTPException, Request, status
from fastapi.responses import StreamingResponse
from jose import JWTError
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from auth import verify_clerk_token
from src.db.models import Job, User
from src.db.session import get_db as get_db_session

router = APIRouter(prefix="/api/v1/jobs", tags=["jobs"])


async def _get_user_from_token(token: str, db: AsyncSession) -> User:
    """Verify a Clerk JWT token and return the user."""
    try:
        payload = verify_clerk_token(token)
    except JWTError as exc:
        # Log specific validation failure to help diagnose config mismatches
        import logging

        logger = logging.getLogger(__name__)
        logger.warning("Clerk JWT validation failed: %s", exc)
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Invalid or expired Clerk token: {exc}",
        )

    sub = payload.get("sub")
    if not sub:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token missing required claim: clerk_user_id/sub",
        )

    result = await db.execute(select(User).where(User.clerk_user_id == sub))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found",
        )

    return user


@router.get("/{job_id}/stream")
async def stream_job_progress(
    job_id: str,
    request: Request,
    token: str | None = None,
    db: AsyncSession = Depends(get_db_session),
):
    """
    Stream Server-Sent Events (SSE) for job status updates.
    Frontend polls this endpoint to show real‑time progress.
    """
    # Resolve user from header or query-param token (EventSource cannot set headers)
    user: User | None = None
    auth_header = request.headers.get("authorization")
    if auth_header and auth_header.startswith("Bearer "):
        user = await _get_user_from_token(auth_header.replace("Bearer ", ""), db)
    elif token:
        user = await _get_user_from_token(token, db)
    else:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing Authorization header or token query param",
        )

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
