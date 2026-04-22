"""Service orchestrator for summary generation workflow."""

from __future__ import annotations

import asyncio
import uuid

from langchain_google_genai import GoogleGenerativeAIEmbeddings
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from tenacity import retry, stop_after_attempt, wait_exponential

from src.db.models import DocumentChunk, User
from src.services.summary_chain import SummaryChainInput, SummaryChainOutput, run_summary_chain


async def generate_summary_for_document(
    db: AsyncSession,
    *,
    user_id: uuid.UUID,
    document_id: uuid.UUID,
    format_value: str,
) -> SummaryChainOutput:
    """Fetch secure chunk context and generate summary content with the LLM chain."""
    import logging

    logger = logging.getLogger(__name__)
    logger.info(
        f"Starting generate_summary_for_document for user {user_id}, document {document_id}"
    )

    embeddings = GoogleGenerativeAIEmbeddings(
        model="models/gemini-embedding-001",
        task_type="retrieval_document",
        output_dimensionality=768,  # Explicit for Matryoshka (prevents 3072-dim default)
    )
    retrieval_query = (
        "Generate a complete study summary highlighting key concepts, "
        f"relationships, and useful notes in {format_value} format."
    )

    @retry(
        wait=wait_exponential(multiplier=2, min=4, max=30), stop=stop_after_attempt(5), reraise=True
    )
    async def embed_with_retry(query):
        logger.info("Calling embeddings.aembed_query for retrieval query")
        result = await embeddings.aembed_query(query)
        logger.info("Successfully generated embeddings")
        return result

    logger.info("Generating embeddings for retrieval query")
    query_embedding = await embed_with_retry(retrieval_query)
    logger.info("Successfully generated query embedding")

    # Throttle between embedding and LLM calls to avoid rate limits
    await asyncio.sleep(1)

    logger.info(f"Querying document chunks for user {user_id}, document {document_id}")
    chunks_result = await db.execute(
        select(DocumentChunk.content)
        .where(
            DocumentChunk.user_id == user_id,
            DocumentChunk.document_id == document_id,
            DocumentChunk.embedding.is_not(None),
        )
        .order_by(DocumentChunk.embedding.cosine_distance(query_embedding))
        .limit(5)
    )
    chunks = [row[0] for row in chunks_result.all() if row[0]]
    logger.info(f"Found {len(chunks)} chunks with embeddings")

    if not chunks:
        logger.info("No chunks with embeddings found, trying fallback query")
        fallback_result = await db.execute(
            select(DocumentChunk.content)
            .where(
                DocumentChunk.user_id == user_id,
                DocumentChunk.document_id == document_id,
            )
            .order_by(DocumentChunk.chunk_index.asc())
            .limit(5)
        )
        chunks = [row[0] for row in fallback_result.all() if row[0]]
        logger.info(f"Found {len(chunks)} chunks via fallback")

    logger.info(f"Querying user preferences for user {user_id}")
    user_result = await db.execute(select(User.user_preferences).where(User.id == user_id))
    user_prefs = user_result.scalar_one_or_none()
    logger.info(f"User preferences: {user_prefs}")

    chain_input = SummaryChainInput(format=format_value, chunks=chunks, user_preferences=user_prefs)
    logger.info(f"Calling run_summary_chain with {len(chunks)} chunks")
    result = await run_summary_chain(chain_input)
    logger.info("Successfully completed run_summary_chain")
    return result
