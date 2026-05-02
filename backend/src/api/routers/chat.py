"""
Grounded chat router for answering questions based on uploaded documents.
"""

import uuid
from typing import Literal

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

from src.api.deps import enforce_quota, get_current_user
from src.db.session import get_db
from src.services.chat_service import run_chat

router = APIRouter(prefix="/api/v1/chat", tags=["chat"])


class ChatMessage(BaseModel):
    """Individual message in chat history."""

    role: str
    content: str


class ChatRequest(BaseModel):
    """Request body for chat endpoint."""

    document_ids: list[str] | None = None
    document_id: str | None = None  # deprecated, use document_ids
    question: str
    messages: list[ChatMessage] = []
    mode_override: Literal["strict_rag", "tutor", "socratic"] | None = None
    persona_override: Literal["default", "encouraging", "direct", "witty", "patient"] | None = None


class ChatResponse(BaseModel):
    """Response from chat endpoint."""

    answer: str
    citations: list[dict]
    relevant_chunks: list[str]


@router.post("", response_model=ChatResponse)
async def chat(
    request: ChatRequest,
    _quota: None = Depends(enforce_quota("chat")),
    user=Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Ask a question about uploaded documents.

    Uses grounded chat chain to retrieve relevant chunks and generate answer.
    """
    if not request.question.strip():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Question cannot be empty",
        )

    doc_ids = []
    if request.document_ids:
        doc_ids.extend(request.document_ids)
    if request.document_id:
        doc_ids.append(request.document_id)

    doc_id_uuids = [uuid.UUID(did) for did in doc_ids] if doc_ids else None

    chain_output = await run_chat(
        db=db,
        user_id=user.id,
        question=request.question,
        document_ids=doc_id_uuids,
        messages=[m.model_dump() for m in request.messages],
        mode_override=request.mode_override,
        persona_override=request.persona_override,
    )

    return ChatResponse(
        answer=chain_output["answer"],
        citations=chain_output["citations"],
        relevant_chunks=chain_output["relevant_chunks"],
    )
