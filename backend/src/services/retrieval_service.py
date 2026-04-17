"""Retrieval helpers for user-scoped document chunks."""

from __future__ import annotations

import uuid
from typing import Any

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from src.db.models import DocumentChunk


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
