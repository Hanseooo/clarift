"""Retrieval helpers for user-scoped document chunks."""

from __future__ import annotations

import logging
import uuid
from typing import Any

from langchain_google_genai import GoogleGenerativeAIEmbeddings
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from tenacity import retry, stop_after_attempt, wait_exponential

from src.db.models import DocumentChunk

logger = logging.getLogger(__name__)


async def get_user_chunks(
    db: AsyncSession,
    *,
    user_id: uuid.UUID,
    document_id: str | None,
    limit: int = 5,
) -> list[dict[str, Any]]:
    query = select(DocumentChunk).where(DocumentChunk.user_id == user_id)
    if document_id:
        query = query.where(DocumentChunk.document_id == uuid.UUID(document_id))

    query = query.order_by(DocumentChunk.created_at.desc()).limit(limit)
    result = await db.execute(query)
    rows = result.scalars().all()

    return [
        {
            "id": row.id,
            "document_id": row.document_id,
            "chunk_index": row.chunk_index,
            "content": row.content,
        }
        for row in rows
    ]


@retry(
    wait=wait_exponential(multiplier=2, min=4, max=30),
    stop=stop_after_attempt(5),
    reraise=True,
)
async def _embed_query(query: str) -> list[float]:
    embeddings = GoogleGenerativeAIEmbeddings(
        model="models/gemini-embedding-001",
        task_type="retrieval_document",
        output_dimensionality=768,
    )
    return await embeddings.aembed_query(query)


async def get_relevant_chunks(
    db: AsyncSession,
    *,
    user_id: uuid.UUID,
    query: str,
    document_id: uuid.UUID | None = None,
    document_ids: list[uuid.UUID] | None = None,
    limit: int = 5,
) -> list[dict[str, Any]]:
    """Semantic search over the user's document chunks using the given query string."""
    query_embedding = await _embed_query(query)

    stmt = select(DocumentChunk).where(
        DocumentChunk.user_id == user_id,
        DocumentChunk.embedding.is_not(None),
    )

    # Handle both single document_id and list of document_ids for backward compatibility
    ids = []
    if document_id:
        ids.append(document_id)
    if document_ids:
        ids.extend(document_ids)

    if ids:
        stmt = stmt.where(DocumentChunk.document_id.in_(ids))

    stmt = stmt.order_by(DocumentChunk.embedding.cosine_distance(query_embedding)).limit(limit)
    result = await db.execute(stmt)
    rows = result.scalars().all()

    return [
        {
            "id": row.id,
            "document_id": row.document_id,
            "chunk_index": row.chunk_index,
            "content": row.content,
        }
        for row in rows
    ]
