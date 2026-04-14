"""
ARQ worker for background job processing.

Exports:
- `arq_pool`: Redis connection pool for enqueuing jobs.
- `process_document`: ARQ job function for document processing.
"""

import logging
import uuid

from arq import create_pool
from arq.connections import RedisSettings
from sqlalchemy import update
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.sql import func

from src.core.config import settings
from src.db.models import Document, Job
from src.db.session import AsyncSessionLocal

logger = logging.getLogger(__name__)

# Redis connection pool for enqueuing jobs.
# Created lazily on first use.
_arq_pool = None


async def get_arq_pool():
    """Get or create the ARQ Redis connection pool."""
    global _arq_pool
    if _arq_pool is None:
        redis_settings = RedisSettings.from_url(settings.REDIS_URL)
        _arq_pool = await create_pool(redis_settings)
        logger.info("ARQ pool connected to Redis at %s", settings.REDIS_URL)
    return _arq_pool


async def close_arq_pool():
    """Close the ARQ pool (call during shutdown)."""
    global _arq_pool
    if _arq_pool is not None:
        await _arq_pool.close()
        _arq_pool = None
        logger.info("ARQ pool closed")


async def process_document(ctx: dict, document_id: str, job_id: str) -> None:
    """
    ARQ job for document processing pipeline.

    Steps:
    1. Download the file from R2
    2. Extract text (OCR if needed)
    3. Chunk and embed
    4. Update document and job status

    Args:
        ctx: ARQ context (contains job ID, Redis connection, etc.)
        document_id: ID of the document record
        job_id: ID of the associated job record
    """
    logger.info(
        "Processing document %s (job %s)",
        document_id,
        job_id,
    )

    db_session: AsyncSession | None = None
    try:
        # Convert string IDs to UUID
        doc_uuid = uuid.UUID(document_id)
        job_uuid = uuid.UUID(job_id)

        # Create database session
        db_session = AsyncSessionLocal()

        # 1. Update job status to 'processing'
        await db_session.execute(
            update(Job).where(Job.id == job_uuid).values(status="processing", updated_at=func.now())
        )

        # 2. Update document status to 'processing'
        await db_session.execute(
            update(Document).where(Document.id == doc_uuid).values(status="processing")
        )
        await db_session.commit()

        # 3. Download file from R2 (stub)
        # In a real implementation, we would:
        # - Use R2 client with settings.R2_* credentials
        # - Download file bytes
        logger.info("Stub: Would download file from R2 for document %s", document_id)

        # 4. Extract text (stub)
        # For now, assume plain text extraction; OCR would be added later
        extracted_text = "Extracted text placeholder. Real implementation will use OCR for images, PDF parsing, etc."
        logger.info("Stub: Text extraction complete, length %d chars", len(extracted_text))

        # 5. Chunk text (stub)
        # For now, simple split by sentences; later use semantic chunking
        chunks = [extracted_text[i : i + 500] for i in range(0, len(extracted_text), 500)]
        logger.info("Stub: Created %d chunks", len(chunks))

        # 6. Update document status to 'processed'
        await db_session.execute(
            update(Document).where(Document.id == doc_uuid).values(status="processed")
        )

        # 7. Update job status to 'completed'
        await db_session.execute(
            update(Job)
            .where(Job.id == job_uuid)
            .values(status="completed", result={"chunks_count": len(chunks)}, updated_at=func.now())
        )
        await db_session.commit()

        logger.info("Document processing completed successfully")

    except Exception as exc:
        logger.exception("Document processing failed")
        # Update job and document status to 'error' with error message
        if db_session:
            try:
                await db_session.rollback()
                # Update job error
                await db_session.execute(
                    update(Job)
                    .where(Job.id == uuid.UUID(job_id))
                    .values(status="error", error=str(exc)[:500], updated_at=func.now())
                )
                # Update document error
                await db_session.execute(
                    update(Document)
                    .where(Document.id == uuid.UUID(document_id))
                    .values(status="error", error=str(exc)[:500])
                )
                await db_session.commit()
            except Exception as inner_exc:
                logger.error("Failed to update error status: %s", inner_exc)
        raise
    finally:
        if db_session:
            await db_session.close()


# Export for use in routers
__all__ = ["get_arq_pool", "process_document"]
