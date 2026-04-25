"""
Grounded chat router for answering questions based on uploaded documents.
"""

import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from src.api.deps import enforce_quota, get_current_user
from src.db.models import Document
from src.db.session import get_db
from src.services.chat_chain import ChatChainInput, run_chat_chain
from src.services.retrieval_service import get_relevant_chunks

router = APIRouter(prefix="/api/v1/chat", tags=["chat"])


class ChatMessage(BaseModel):
    """Individual message in chat history."""

    role: str
    content: str


class ChatRequest(BaseModel):
    """Request body for chat endpoint."""

    document_id: str | None = None
    question: str
    messages: list[ChatMessage] = []


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
    # Validate question not empty
    if not request.question.strip():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Question cannot be empty",
        )

    doc_id = uuid.UUID(request.document_id) if request.document_id else None
    chunks = await get_relevant_chunks(
        db,
        user_id=user.id,
        query=request.question,
        document_id=doc_id,
        limit=5,
    )

    if chunks:
        document_ids = {chunk["document_id"] for chunk in chunks}
        doc_stmt = select(Document.id, Document.title).where(Document.id.in_(document_ids))
        doc_result = await db.execute(doc_stmt)
        doc_map = {row.id: row.title for row in doc_result.all()}
        for chunk in chunks:
            chunk["document_title"] = doc_map.get(chunk["document_id"], "Unknown")

    chain_input = ChatChainInput(
        user_id=str(user.id),
        document_id=request.document_id,
        question=request.question,
        chunks=chunks,
        messages=[m.model_dump() for m in request.messages],
    )
    chain_output = await run_chat_chain(chain_input)

    return ChatResponse(
        answer=chain_output["answer"],
        citations=chain_output["citations"],
        relevant_chunks=chain_output["relevant_chunks"],
    )
