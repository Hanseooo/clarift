"""Grounded chat chain with service-layer retrieval and citations."""

from __future__ import annotations

import logging
from typing import Any, TypedDict, cast

from langchain_google_genai import ChatGoogleGenerativeAI
from tenacity import retry, stop_after_attempt, wait_exponential

from src.core.config import settings

logger = logging.getLogger(__name__)


class ChatChainInput(TypedDict):
    user_id: str
    document_id: str | None
    question: str
    chunks: list[dict[str, Any]]


class ChatChainOutput(TypedDict):
    answer: str
    citations: list[dict[str, Any]]
    relevant_chunks: list[str]


@retry(wait=wait_exponential(min=1, max=8), stop=stop_after_attempt(3), reraise=True)
async def _generate_grounded_answer(question: str, context: str) -> str:
    llm = ChatGoogleGenerativeAI(
        model="gemini-2.5-flash",
        google_api_key=settings.GEMINI_API_KEY,
        temperature=0.1,
    )
    prompt = (
        f"{settings.CHAT_SYSTEM_PROMPT}\n\n"
        f"Context:\n{context}\n\n"
        f"Question: {question}\n\n"
        f"If missing answer in context, return exactly: {settings.CHAT_FALLBACK_MESSAGE}"
    )
    response = await llm.ainvoke(prompt)
    raw = response.content
    if isinstance(raw, str):
        text_value = cast(str, raw)
        return text_value.strip()
    return "".join(str(part) for part in raw).strip()


async def run_chat_chain(input: ChatChainInput) -> ChatChainOutput:
    chunks = input["chunks"][:5]
    if not chunks:
        return {
            "answer": settings.CHAT_FALLBACK_MESSAGE,
            "citations": [],
            "relevant_chunks": [],
        }

    context_parts = [str(item.get("content", "")) for item in chunks if item.get("content")]
    context = "\n\n".join(context_parts)
    if not context.strip():
        return {
            "answer": settings.CHAT_FALLBACK_MESSAGE,
            "citations": [],
            "relevant_chunks": [],
        }

    try:
        answer = await _generate_grounded_answer(input["question"], context)
    except Exception as exc:  # noqa: BLE001
        logger.error("Chat chain generation failed: %s", exc)
        answer = settings.CHAT_FALLBACK_MESSAGE

    if answer == settings.CHAT_FALLBACK_MESSAGE:
        return {
            "answer": settings.CHAT_FALLBACK_MESSAGE,
            "citations": [],
            "relevant_chunks": [],
        }

    citations = [
        {
            "chunk_id": str(item.get("id")),
            "document_id": str(item.get("document_id")),
            "chunk_index": item.get("chunk_index"),
        }
        for item in chunks
    ]

    return {
        "answer": answer,
        "citations": citations,
        "relevant_chunks": context_parts,
    }
