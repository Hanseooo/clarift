"""
ARQ worker for background job processing.

Exports:
- `arq_pool`: Redis connection pool for enqueuing jobs.
- `process_document`: ARQ job function for document processing.
"""

import asyncio
import logging
from typing import Any

from arq import create_pool
from arq.connections import RedisSettings
from arq.jobs import Job

from src.core.config import settings

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

    In a real implementation, this would:
    1. Download the file from R2
    2. Extract text (OCR if needed)
    3. Chunk and embed
    4. Create initial summary
    5. Update job status

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
    await asyncio.sleep(0.1)  # simulate some work
    # In reality we would update job status via DB
    # and call the summary chain


# Export for use in routers
__all__ = ["get_arq_pool", "process_document"]
