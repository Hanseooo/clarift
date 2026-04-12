"""
Grounded chat chain for answering questions based on uploaded documents.

Steps:
1. Retrieve relevant document chunks (filtered by user_id)
2. Generate grounded answer using retrieved chunks
3. Return answer with citations
"""

import logging
from typing import TypedDict, Optional, List, Dict, Any

from langchain_google_genai import ChatGoogleGenerativeAI
from langchain.schema import HumanMessage, SystemMessage

from src.core.config import settings

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

    This implementation uses Gemini via LangChain to generate grounded answers.
    """
    logger.info(
        "Running chat chain for user %s (document %s)",
        input["user_id"],
        input["document_id"] or "all",
    )

    # Initialize Gemini LLM
    llm = ChatGoogleGenerativeAI(
        model="gemini-pro",
        google_api_key=settings.GEMINI_API_KEY,
        temperature=0.1,
    )

    # In a real implementation, we would retrieve relevant document chunks here.
    # For demonstration, we use a placeholder context.
    placeholder_context = "This is a placeholder for retrieved document chunks. In production, this would be actual text extracted from the user's uploaded files."

    # Build the prompt with system instructions
    system_prompt = settings.CHAT_SYSTEM_PROMPT
    user_question = input["question"]

    chat_prompt = f"""{system_prompt}

Context from uploaded notes:
{placeholder_context}

Question: {user_question}

Answer the question using ONLY the context above. If the context does not contain enough information to answer, respond with the exact fallback message: "{settings.CHAT_FALLBACK_MESSAGE}"

Provide your answer, and include citations referencing the context."""

    try:
        response = await llm.ainvoke(chat_prompt)
        answer = response.content.strip()
        # If answer contains fallback message, treat as no context
        if settings.CHAT_FALLBACK_MESSAGE in answer:
            answer = settings.CHAT_FALLBACK_MESSAGE
            citations = []
            relevant_chunks = []
        else:
            # Simulate citations (in real implementation, we would map to actual chunks)
            citations = [
                {
                    "chunk_id": "chunk1",
                    "document_id": input.get("document_id", "doc-123"),
                    "text": placeholder_context[:100] + "...",
                }
            ]
            relevant_chunks = [placeholder_context]
    except Exception as exc:
        logger.error("Chat chain LLM call failed: %s", exc)
        answer = "Sorry, an error occurred while generating the answer."
        citations = []
        relevant_chunks = []

    return {
        "answer": answer,
        "citations": citations,
        "relevant_chunks": relevant_chunks,
    }
