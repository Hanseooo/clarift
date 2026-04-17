"""
Documents router for file upload and processing.
"""

import uuid
from datetime import datetime

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile, status
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.dialects.postgresql import insert
from sqlalchemy.ext.asyncio import AsyncSession

from src.api.deps import get_current_user
from src.db.models import Document, Job
from src.db.session import get_db
from src.worker import get_arq_pool

router = APIRouter(prefix="/api/v1/documents", tags=["documents"])


class DocumentListItem(BaseModel):
    id: str
    title: str
    status: str
    created_at: str


@router.get("", response_model=list[DocumentListItem])
async def list_documents(
    user=Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Document).where(Document.user_id == user.id).order_by(Document.created_at.desc())
    )
    documents = result.scalars().all()
    return [
        DocumentListItem(
            id=str(document.id),
            title=document.title,
            status=document.status,
            created_at=datetime.fromisoformat(str(document.created_at)).isoformat(),
        )
        for document in documents
    ]


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

    # Dispatch ARQ job
    pool = await get_arq_pool()
    await pool.enqueue_job("process_document", str(document.id), str(job.id))

    return {
        "document_id": str(document.id),
        "job_id": str(job.id),
        "message": "Document uploaded and queued for processing.",
    }
