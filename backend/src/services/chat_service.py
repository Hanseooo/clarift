"""Chat service: retrieval, preference fetch, chain orchestration."""

from __future__ import annotations

import uuid
from typing import Any

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from src.chains.chat_chain import ChatChainInput, run_chat_chain
from src.db.models import Document, User
from src.services.retrieval_service import get_relevant_chunks


async def fetch_chat_preferences(
    db: AsyncSession,
    user_id: uuid.UUID,
) -> dict[str, object] | None:
    """Fetch user preferences for chat personalization."""
    result = await db.execute(select(User.user_preferences).where(User.id == user_id))
    prefs = result.scalar_one_or_none()
    if isinstance(prefs, dict):
        return prefs
    return None


async def run_chat(
    db: AsyncSession,
    user_id: uuid.UUID,
    question: str,
    document_ids: list[uuid.UUID] | None,
    messages: list[dict[str, Any]] | None,
    mode_override: str | None,
    persona_override: str | None,
) -> dict[str, Any]:
    """End-to-end chat: retrieve chunks, fetch preferences, run chain."""
    chunks = await get_relevant_chunks(
        db,
        user_id=user_id,
        query=question,
        document_ids=document_ids,
        limit=10,
    )

    if chunks:
        doc_ids = {chunk["document_id"] for chunk in chunks}
        doc_stmt = select(Document.id, Document.title).where(Document.id.in_(doc_ids))
        doc_result = await db.execute(doc_stmt)
        doc_map = {row.id: row.title for row in doc_result.all()}
        for chunk in chunks:
            chunk["document_title"] = doc_map.get(chunk["document_id"], "Unknown")

    user_prefs = await fetch_chat_preferences(db, user_id)
    chat_settings = {}
    if isinstance(user_prefs, dict) and isinstance(user_prefs.get("chat_settings"), dict):
        chat_settings = user_prefs["chat_settings"]  # type: ignore[assignment]

    mode = mode_override or chat_settings.get("mode", "tutor")  # type: ignore[union-attr]
    persona = persona_override or chat_settings.get("persona", "default")  # type: ignore[union-attr]

    document_title = "your notes"
    if chunks:
        first_doc_id = chunks[0]["document_id"]
        document_title = doc_map.get(first_doc_id, "your notes")

    chain_input = ChatChainInput(
        question=question,
        chunks=chunks,
        messages=messages,
        mode=str(mode),
        persona=str(persona),
        user_preferences=user_prefs,
        document_title=document_title,
        total_chunks=len(chunks),
    )
    return await run_chat_chain(chain_input)
