"""Service orchestrator for summary generation workflow."""

from __future__ import annotations

import uuid

from langchain_google_genai import GoogleGenerativeAIEmbeddings
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from src.db.models import DocumentChunk
from src.services.summary_chain import SummaryChainInput, SummaryChainOutput, run_summary_chain


async def generate_summary_for_document(
    db: AsyncSession,
    *,
    user_id: uuid.UUID,
    document_id: uuid.UUID,
    format_value: str,
) -> SummaryChainOutput:
    """Fetch secure chunk context and generate summary content with the LLM chain."""
    embeddings = GoogleGenerativeAIEmbeddings(
        model="models/text-embedding-004",
    )
    retrieval_query = (
        "Generate a complete study summary highlighting key concepts, "
        f"relationships, and useful notes in {format_value} format."
    )
    query_embedding = await embeddings.aembed_query(retrieval_query)

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

    if not chunks:
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

    chain_input = SummaryChainInput(format=format_value, chunks=chunks)
    return await run_summary_chain(chain_input)
