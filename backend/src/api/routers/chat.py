"""
Grounded chat router for answering questions based on uploaded documents.
"""

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

from src.db.session import get_db
from src.api.deps import get_current_user
from src.services.chat_chain import run_chat_chain, ChatChainInput

router = APIRouter(prefix="/api/v1/chat", tags=["chat"])


class ChatRequest(BaseModel):
    """Request body for chat endpoint."""

    document_id: str | None = None
    question: str


class ChatResponse(BaseModel):
    """Response from chat endpoint."""

    answer: str
    citations: list[dict]
    relevant_chunks: list[str]


@router.post("", response_model=ChatResponse)
async def chat(
    request: ChatRequest,
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

    # Call chat chain (stub)
    chain_input = ChatChainInput(
        user_id=str(user.id),
        document_id=request.document_id,
        question=request.question,
    )
    chain_output = await run_chat_chain(chain_input)

    # Log usage (placeholder)
    import logging

    logger = logging.getLogger(__name__)
    logger.info(
        "Chat chain completed for user %s (document %s)",
        user.id,
        request.document_id or "all",
    )

    return ChatResponse(
        answer=chain_output["answer"],
        citations=chain_output["citations"],
        relevant_chunks=chain_output["relevant_chunks"],
    )
