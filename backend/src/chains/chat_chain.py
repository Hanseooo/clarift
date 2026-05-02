"""Chat chain for generating conversational, persona-aware answers."""

from __future__ import annotations

import logging
import re
from typing import Any, TypedDict, cast

from langchain_google_genai import ChatGoogleGenerativeAI
from tenacity import retry, stop_after_attempt, wait_exponential

from src.chains.prompts import (
    build_preference_context,
    fallback_behavior,
    get_mode_rules,
    get_persona_description,
    xml_output_rules,
)
from src.core.config import settings

logger = logging.getLogger(__name__)


class ChatChainInput(TypedDict):
    question: str
    chunks: list[dict[str, Any]]
    messages: list[dict[str, Any]] | None
    mode: str
    persona: str
    user_preferences: dict[str, object] | None


class ChatChainOutput(TypedDict):
    answer: str
    citations: list[dict[str, Any]]
    relevant_chunks: list[str]


def _parse_structured_output(text: str) -> tuple[str, list[int]]:
    """Extract <answer> and <used_citations> from structured LLM output."""
    answer_match = re.search(r"<answer>(.*?)</answer>", text, re.DOTALL)
    used_match = re.search(r"<used_citations>(.*?)</used_citations>", text, re.DOTALL)

    if answer_match:
        answer = answer_match.group(1).strip()
    else:
        answer = text.strip()

    used_indices: list[int] = []
    if used_match:
        raw = used_match.group(1).strip()
        if raw.upper() != "NONE":
            for part in raw.split(","):
                part = part.strip()
                if part.isdigit():
                    used_indices.append(int(part))

    return answer, used_indices


@retry(wait=wait_exponential(min=1, max=8), stop=stop_after_attempt(3), reraise=True)
async def _generate_answer(
    question: str,
    numbered_context: str,
    messages: list[dict[str, Any]] | None,
    mode: str,
    persona: str,
    user_preferences: dict[str, object] | None,
) -> str:
    llm = ChatGoogleGenerativeAI(
        model="gemini-2.5-flash-lite",
        google_api_key=settings.GOOGLE_API_KEY,
        temperature=0.2 if mode == "tutor" else 0.1,
    )

    history = ""
    if messages:
        history = "\n".join(f"{m['role'].capitalize()}: {m['content']}" for m in messages[-8:])
        history = f"Previous conversation:\n{history}\n\n"

    persona_desc = get_persona_description(persona)  # type: ignore[arg-type]
    mode_rules = get_mode_rules(mode)  # type: ignore[arg-type]
    pref_context = build_preference_context(user_preferences)

    prompt = (
        f"{persona_desc}\n\n"
        f"{mode_rules}\n\n"
        f"{xml_output_rules()}\n\n"
        f"{fallback_behavior(settings.CHAT_FALLBACK_MESSAGE)}\n\n"
    )

    if pref_context:
        prompt += f"{pref_context}\n\n"

    prompt += (
        f"{history}"
        f"Context:\n{numbered_context}\n\n"
        f"Question: {question}\n\n"
        f"Fallback message (use exactly if answer not in context): {settings.CHAT_FALLBACK_MESSAGE}"
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
    if not context_parts:
        return {
            "answer": settings.CHAT_FALLBACK_MESSAGE,
            "citations": [],
            "relevant_chunks": [],
        }

    numbered_context = "\n\n".join(
        f"[{i + 1}] {content}" for i, content in enumerate(context_parts)
    )

    try:
        raw_output = await _generate_answer(
            input["question"],
            numbered_context,
            input.get("messages"),
            input.get("mode", "tutor"),
            input.get("persona", "default"),
            input.get("user_preferences"),
        )
    except Exception as exc:  # noqa: BLE001
        logger.error("Chat chain generation failed: %s", exc)
        raw_output = settings.CHAT_FALLBACK_MESSAGE

    answer, used_indices = _parse_structured_output(raw_output)

    if answer == settings.CHAT_FALLBACK_MESSAGE or not used_indices:
        return {
            "answer": answer if answer else settings.CHAT_FALLBACK_MESSAGE,
            "citations": [],
            "relevant_chunks": context_parts,
        }

    used_indices_set = set(used_indices)
    citations = []
    for idx in used_indices_set:
        if 1 <= idx <= len(chunks):
            item = chunks[idx - 1]
            citations.append(
                {
                    "chunk_id": str(item.get("id")),
                    "document_id": str(item.get("document_id")),
                    "document_name": item.get("document_title") or "Unknown",
                    "chunk_index": item.get("chunk_index"),
                }
            )

    return {
        "answer": answer,
        "citations": citations,
        "relevant_chunks": context_parts,
    }
