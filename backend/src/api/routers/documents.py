"""
Documents router for file upload and processing.
"""

import uuid
from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.dialects.postgresql import insert

from src.db.session import get_db
from src.db.models import Document, Job
from src.api.deps import get_current_user

router = APIRouter(prefix="/api/v1/documents", tags=["documents"])


@router.post("/upload")
async def upload_document(
    file: UploadFile = File(...),
    user=Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Upload a study document (PDF, image, text) for processing.

    Creates a Document record, a Job record, and dispatches an ARQ job.
    Returns IDs for polling.
    """
    # Validate file type (basic check)
    allowed_mime_types = {
        "application/pdf",
        "image/jpeg",
        "image/png",
        "text/plain",
        "text/markdown",
    }
    if file.content_type not in allowed_mime_types:
        raise HTTPException(
            status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE,
            detail=f"Unsupported file type: {file.content_type}. "
            f"Allowed: {', '.join(allowed_mime_types)}",
        )

    # In a real implementation, we would:
    # 1. Upload to R2 storage
    # 2. Generate a unique R2 key
    # For now, stub the R2 key.
    r2_key = f"documents/{user.id}/{uuid.uuid4()}-{file.filename}"

    # Create Document record
    doc_stmt = (
        insert(Document)
        .values(
            user_id=user.id,
            title=file.filename or "Untitled",
            r2_key=r2_key,
            mime_type=file.content_type or "application/octet-stream",
            status="pending",
        )
        .returning(Document)
    )
    result = await db.execute(doc_stmt)
    document = result.scalar_one()

    # Create Job record
    job_stmt = (
        insert(Job)
        .values(
            user_id=user.id,
            type="document_upload",
            status="pending",
        )
        .returning(Job)
    )
    result = await db.execute(job_stmt)
    job = result.scalar_one()

    # Commit both records
    await db.commit()

    # TODO: Dispatch ARQ job (stub)
    # from src.worker import process_document_upload
    # await process_document_upload(str(job.id), str(document.id))

    return {
        "document_id": str(document.id),
        "job_id": str(job.id),
        "message": "Document uploaded and queued for processing.",
    }
