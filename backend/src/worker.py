"""
ARQ worker for background job processing.
Currently a stub; will be implemented in a later phase.
"""

import asyncio
import logging
from typing import Any

logger = logging.getLogger(__name__)


async def process_document_upload(job_id: str, document_id: str) -> None:
    """
    Stub for document processing pipeline.

    In a real implementation, this would:
    1. Download the file from R2
    2. Extract text (OCR if needed)
    3. Chunk and embed
    4. Create initial summary
    5. Update job status

    Args:
        job_id: ID of the associated job record
        document_id: ID of the document record
    """
    logger.info(
        "Stub: Would process document %s (job %s)",
        document_id,
        job_id,
    )
    await asyncio.sleep(0.1)  # simulate some work
    # In reality we would update job status via DB
    # and call the summary chain
