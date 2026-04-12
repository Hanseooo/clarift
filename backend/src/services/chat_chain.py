"""
Grounded chat chain for answering questions based on uploaded documents.

Steps:
1. Retrieve relevant document chunks (filtered by user_id)
2. Generate grounded answer using retrieved chunks
3. Return answer with citations
"""

import logging
from typing import TypedDict, Optional, List, Dict, Any

logger = logging.getLogger(__name__)


class ChatChainInput(TypedDict):
    """Input for the chat chain."""

    user_id: str
    document_id: Optional[str]  # optional: if None, search across all user docs
    question: str


class ChatChainOutput(TypedDict):
    """Output from the chat chain."""

    answer: str
    citations: List[Dict[str, Any]]
    relevant_chunks: List[str]


async def run_chat_chain(input: ChatChainInput) -> ChatChainOutput:
    """
    Execute the grounded chat chain.

    This is a stub that returns placeholder data.
    A real implementation will:
    1. Retrieve relevant document chunks from vector DB (filtered by user_id)
    2. Run LLM call (Gemini) to generate grounded answer
    3. Return answer with citations
    """
    logger.info(
        "Stub: Running chat chain for user %s (document %s)",
        input["user_id"],
        input["document_id"] or "all",
    )

    # Simulate some processing time
    import asyncio

    await asyncio.sleep(0.05)

    # Return placeholder data
    return {
        "answer": "This is a placeholder answer based on your uploaded documents. The real chain will generate a grounded answer using retrieved chunks.",
        "citations": [
            {
                "chunk_id": "chunk1",
                "document_id": input.get("document_id", "doc-123"),
                "text": "Sample chunk text.",
            }
        ],
        "relevant_chunks": ["Sample chunk text."],
    }
