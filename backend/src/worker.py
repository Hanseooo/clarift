"""
ARQ worker for background job processing.

Exports:
- `arq_pool`: Redis connection pool for enqueuing jobs.
- `process_document`: ARQ job function for document processing.
"""

import logging
import uuid
import os
import asyncio
from dotenv import load_dotenv

load_dotenv()
logging.getLogger(__name__).info(f"GOOGLE_API_KEY in env: {os.environ.get('GOOGLE_API_KEY')}")

import fitz
from arq import create_pool
from arq.connections import RedisSettings
from langchain_google_genai import GoogleGenerativeAIEmbeddings
from langchain_text_splitters import RecursiveCharacterTextSplitter
from sqlalchemy import delete, select, update
from sqlalchemy.dialects.postgresql import insert
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.sql import func
from tenacity import retry, wait_exponential, stop_after_attempt, retry_if_exception_type

from src.core.config import settings
from src.db.models import Document, DocumentChunk, Job, Summary
from src.db.session import AsyncSessionLocal
from src.services.s3_service import S3Service
from src.services.summary_service import generate_summary_for_document

logger = logging.getLogger(__name__)

# Redis connection pool for enqueuing jobs.
# Created lazily on first use.
_arq_pool = None


async def get_arq_pool():
    """Get or create the ARQ Redis connection pool."""
    global _arq_pool
    if _arq_pool is None:
        redis_settings = RedisSettings.from_dsn(settings.REDIS_URL)
        _arq_pool = await create_pool(redis_settings)
        logger.info("ARQ pool connected to Redis")
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

        document_result = await db_session.execute(select(Document).where(Document.id == doc_uuid))
        document = document_result.scalar_one_or_none()
        if document is None:
            raise ValueError(f"Document not found: {document_id}")

        job_result = await db_session.execute(
            select(Job).where(Job.id == job_uuid, Job.user_id == document.user_id)
        )
        job = job_result.scalar_one_or_none()
        if job is None:
            raise ValueError("Job and document user mismatch")

        s3_service = S3Service()
        file_bytes = await s3_service.download_file(document.r2_key)
        if len(file_bytes) > settings.MAX_DOCUMENT_BYTES:
            raise ValueError("Document exceeds processing size limit")

        if (document.mime_type or "").startswith("application/pdf"):
            with fitz.open(stream=file_bytes, filetype="pdf") as pdf_doc:
                page_count = len(pdf_doc)
                if page_count > settings.MAX_PDF_PAGES:
                    raise ValueError("Document exceeds maximum PDF pages")
                page_texts = [str(page.get_text("text")) for page in pdf_doc]
                extracted_text = "\n".join(page_texts)
        else:
            extracted_text = file_bytes.decode("utf-8", errors="ignore")

        if len(extracted_text) > settings.MAX_EXTRACTED_CHARS:
            extracted_text = extracted_text[: settings.MAX_EXTRACTED_CHARS]

        if not extracted_text.strip():
            raise ValueError("No extractable text found in document")

        splitter = RecursiveCharacterTextSplitter(chunk_size=1000, chunk_overlap=200)
        chunks = [chunk for chunk in splitter.split_text(extracted_text) if chunk.strip()]
        if len(chunks) > settings.MAX_CHUNKS_PER_DOCUMENT:
            chunks = chunks[: settings.MAX_CHUNKS_PER_DOCUMENT]
        if not chunks:
            raise ValueError("No chunks generated from extracted text")

        embeddings_client = GoogleGenerativeAIEmbeddings(
            model="models/gemini-embedding-001",
            task_type="retrieval_document",
        )

        # Batch chunks to respect free tier rate limits (100 requests / minute)
        vectors = []
        batch_size = 5

        for i in range(0, len(chunks), batch_size):
            batch = chunks[i : i + batch_size]

            @retry(
                wait=wait_exponential(multiplier=2, min=4, max=30),
                stop=stop_after_attempt(5),
                reraise=True,
            )
            async def embed_batch(b):
                return await embeddings_client.aembed_documents(b)

            try:
                batch_vectors = await embed_batch(batch)
                vectors.extend(batch_vectors)
                # Small delay between batches to help throttle
                await asyncio.sleep(2)
            except Exception as e:
                logger.error("Failed to embed batch after retries: %s", e)
                raise

        await db_session.execute(delete(DocumentChunk).where(DocumentChunk.document_id == doc_uuid))

        chunk_values = [
            {
                "document_id": doc_uuid,
                "user_id": document.user_id,
                "chunk_index": index,
                "content": chunk,
                "embedding": vectors[index] if index < len(vectors) else None,
            }
            for index, chunk in enumerate(chunks)
        ]
        if chunk_values:
            await db_session.execute(insert(DocumentChunk).values(chunk_values))

        # 6. Update document status to 'completed'
        await db_session.execute(
            update(Document).where(Document.id == doc_uuid).values(status="completed", error=None)
        )

        # 7. Update job status to 'completed'
        await db_session.execute(
            update(Job)
            .where(Job.id == job_uuid)
            .values(
                status="completed",
                result={"chunks_count": len(chunks)},
                error=None,
                updated_at=func.now(),
            )
        )
        await db_session.commit()

        logger.info("Document processing completed successfully")

    except Exception:
        logger.exception("Document processing failed")
        # Update job and document status to 'error' with error message
        if db_session:
            try:
                await db_session.rollback()
                # Update job error
                await db_session.execute(
                    update(Job)
                    .where(Job.id == uuid.UUID(job_id))
                    .values(
                        status="failed", error="Document processing failed", updated_at=func.now()
                    )
                )
                # Update document error
                await db_session.execute(
                    update(Document)
                    .where(Document.id == uuid.UUID(document_id))
                    .values(status="failed", error="Document processing failed")
                )
                await db_session.commit()
            except Exception as inner_exc:
                logger.error("Failed to update error status: %s", inner_exc)
        raise
    finally:
        if db_session:
            await db_session.close()


async def run_summary_job(
    ctx: dict,
    summary_id: str,
    job_id: str,
    user_id: str,
    document_id: str,
    format_value: str,
) -> None:
    """ARQ job for async summary generation and persistence."""
    logger.info(
        "Processing summary %s (job %s, document %s)",
        summary_id,
        job_id,
        document_id,
    )

    db_session: AsyncSession | None = None
    try:
        summary_uuid = uuid.UUID(summary_id)
        job_uuid = uuid.UUID(job_id)
        user_uuid = uuid.UUID(user_id)
        document_uuid = uuid.UUID(document_id)

        db_session = AsyncSessionLocal()
        await db_session.execute(
            update(Job).where(Job.id == job_uuid).values(status="processing", updated_at=func.now())
        )
        await db_session.commit()

        summary_result = await db_session.execute(
            select(Summary).where(
                Summary.id == summary_uuid,
                Summary.user_id == user_uuid,
                Summary.document_id == document_uuid,
            )
        )
        summary = summary_result.scalar_one_or_none()
        if summary is None:
            raise ValueError("Summary ownership validation failed")

        job_result = await db_session.execute(
            select(Job).where(Job.id == job_uuid, Job.user_id == user_uuid)
        )
        job = job_result.scalar_one_or_none()
        if job is None:
            raise ValueError("Summary job ownership validation failed")

        chain_output = await generate_summary_for_document(
            db_session,
            user_id=user_uuid,
            document_id=document_uuid,
            format_value=format_value,
        )

        await db_session.execute(
            update(Summary)
            .where(
                Summary.id == summary_uuid,
                Summary.user_id == user_uuid,
                Summary.document_id == document_uuid,
            )
            .values(
                content=chain_output["content"],
                diagram_syntax=chain_output.get("diagram_syntax"),
                diagram_type=chain_output.get("diagram_type"),
                quiz_type_flags=chain_output.get("quiz_type_flags"),
            )
        )
        await db_session.execute(
            update(Job)
            .where(Job.id == job_uuid)
            .values(
                status="completed",
                result={"summary_id": summary_id},
                error=None,
                updated_at=func.now(),
            )
        )
        await db_session.commit()
    except Exception:
        logger.exception("Summary processing failed")
        if db_session:
            try:
                await db_session.rollback()
                await db_session.execute(
                    update(Job)
                    .where(Job.id == uuid.UUID(job_id))
                    .values(
                        status="failed", error="Summary generation failed", updated_at=func.now()
                    )
                )
                await db_session.commit()
            except Exception as inner_exc:  # noqa: BLE001
                logger.error("Failed to update summary job error status: %s", inner_exc)
        raise
    finally:
        if db_session:
            await db_session.close()


# Export for use in routers
__all__ = ["get_arq_pool", "process_document", "WorkerSettings"]


class WorkerSettings:
    """
    Settings for the ARQ worker.
    Run with: arq src.worker.WorkerSettings
    """

    functions = [process_document, run_summary_job]

    # Needs to be a property or computed because settings.REDIS_URL is evaluated at runtime
    redis_settings = RedisSettings.from_dsn(settings.REDIS_URL)

    async def on_startup(self):
        logger.info("ARQ Worker starting up...")

    async def on_shutdown(self):
        logger.info("ARQ Worker shutting down...")
