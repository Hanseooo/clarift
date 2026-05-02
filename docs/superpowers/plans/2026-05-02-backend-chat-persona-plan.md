# Chat Persona System — Backend Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement modular prompt composition, extract chat chain to proper layer, add persona/mode support, fix grading logic, and inject user preferences into all AI chains.

**Architecture:** Create reusable prompt "skill" modules in `src/chains/prompts/`. Move chat LLM logic from `services/chat_chain.py` to `chains/chat_chain.py`, creating a service wrapper. Update quiz and practice chains to use shared preference builder. Fix multi-select and identification grading in `quiz_service.py`.

**Tech Stack:** FastAPI, SQLAlchemy async, LangChain + Gemini, Pydantic, pytest

---

## File Structure

| File | Action | Responsibility |
|---|---|---|
| `backend/src/chains/prompts/__init__.py` | Create | Package exports for prompt modules |
| `backend/src/chains/prompts/persona.py` | Create | Clarift persona definitions |
| `backend/src/chains/prompts/fidelity.py` | Create | Source fidelity rules (shared) |
| `backend/src/chains/prompts/output_rules.py` | Create | JSON/XML output formatting rules |
| `backend/src/chains/prompts/self_check.py` | Create | Self-check templates |
| `backend/src/chains/prompts/preferences.py` | Create | `build_preference_context()` utility |
| `backend/src/chains/prompts/fallback.py` | Create | Fallback behavior instructions |
| `backend/src/chains/prompts/chat_modes.py` | Create | Mode-specific behavior rules |
| `backend/src/chains/chat_chain.py` | Create | Pure LLM chat chain (moved from services) |
| `backend/src/services/chat_service.py` | Create | Service wrapper: retrieval + preference fetch + chain call |
| `backend/src/api/routers/chat.py` | Modify | Call `chat_service` instead of `chat_chain` directly |
| `backend/src/services/chat_chain.py` | Delete | Logic moved to `chains/chat_chain.py` |
| `backend/src/chains/quiz_chain.py` | Modify | Add `acceptable_answers`, double-word fix, preference injection |
| `backend/src/chains/practice_chain.py` | Modify | Inject `build_preference_context()` |
| `backend/src/services/quiz_service.py` | Modify | Fix multi-select grading, add `grade_question()` utility |
| `backend/src/core/config.py` | Modify | Remove `CHAT_SYSTEM_PROMPT` constant (moved to prompt module) |
| `backend/tests/chains/test_prompts.py` | Create | Tests for preference builder and prompt modules |
| `backend/tests/services/test_quiz_grading.py` | Create | Tests for `grade_question()` |

---

## Task 1: Create Prompt Modules

**Files:**
- Create: `backend/src/chains/prompts/__init__.py`
- Create: `backend/src/chains/prompts/persona.py`
- Create: `backend/src/chains/prompts/fidelity.py`
- Create: `backend/src/chains/prompts/output_rules.py`
- Create: `backend/src/chains/prompts/self_check.py`
- Create: `backend/src/chains/prompts/preferences.py`
- Create: `backend/src/chains/prompts/fallback.py`
- Create: `backend/src/chains/prompts/chat_modes.py`

---

- [ ] **Step 1: Create `__init__.py`**

```python
"""Reusable prompt composition modules ("skills") for Clarift chains."""

from src.chains.prompts.persona import get_persona_description
from src.chains.prompts.fidelity import strict_source_only
from src.chains.prompts.output_rules import json_schema_rules
from src.chains.prompts.self_check import standard_self_check
from src.chains.prompts.preferences import build_preference_context
from src.chains.prompts.fallback import fallback_behavior
from src.chains.prompts.chat_modes import get_mode_rules

__all__ = [
    "get_persona_description",
    "strict_source_only",
    "json_schema_rules",
    "standard_self_check",
    "build_preference_context",
    "fallback_behavior",
    "get_mode_rules",
]
```

- [ ] **Step 2: Create `persona.py`**

```python
"""Persona definitions for Clarift AI assistant."""

from typing import Literal

ChatPersona = Literal["default", "encouraging", "direct", "witty", "patient"]

_PERSONAS: dict[ChatPersona, str] = {
    "default": (
        "You are Clarift, a helpful AI study assistant for Filipino students. "
        "You adapt your tone to the student's needs. You are clear, accurate, and supportive."
    ),
    "encouraging": (
        "You are Clarift, a warm and supportive study partner for Filipino students. "
        "You celebrate effort, break complex ideas into small steps, and gently guide students toward understanding. "
        "Use phrases like 'Great question!' and 'You're on the right track.'"
    ),
    "direct": (
        "You are Clarift, a concise and efficient study assistant for Filipino students. "
        "You get straight to the point. Use bullet points, facts, and minimal fluff. "
        "No filler sentences. Every word should add value."
    ),
    "witty": (
        "You are Clarift, a clever and engaging study assistant for Filipino students. "
        "You use light humor and memorable analogies to make dry topics stick. "
        "Be playful but never at the expense of accuracy."
    ),
    "patient": (
        "You are Clarift, a gentle and patient tutor for Filipino students. "
        "You never rush. You ask guiding questions before giving answers. "
        "You rephrase explanations in multiple ways until the student gets it."
    ),
}


def get_persona_description(persona: ChatPersona) -> str:
    """Return the full persona description for the given persona key."""
    return _PERSONAS.get(persona, _PERSONAS["default"])
```

- [ ] **Step 3: Create `fidelity.py`**

```python
"""Shared source fidelity rules for all chains."""


def strict_source_only() -> str:
    return (
        "## SOURCE FIDELITY (ABSOLUTE)\n"
        "1. Base EVERY question, answer, explanation, and fact ONLY on the provided source material.\n"
        "2. Do NOT use outside knowledge, common sense, or general facts not present in the text.\n"
        "3. Do NOT add, infer, or embellish any information not present in the chunks.\n"
        "4. Rephrase only when necessary for clarity.\n"
        "5. NEVER contradict the source material.\n"
        "6. If a preference or instruction conflicts with the source material, ignore the preference.\n"
    )
```

- [ ] **Step 4: Create `output_rules.py`**

```python
"""Shared output formatting rules for chains."""


def json_schema_rules(schema_description: str) -> str:
    return (
        "## OUTPUT FORMAT\n"
        "Return ONLY a single valid JSON object. No markdown code fences, no extra text.\n\n"
        f"JSON schema:\n{schema_description}\n\n"
        "Note on nullable fields: Use `null` (not empty arrays) for fields not applicable to a question type."
    )


def xml_output_rules() -> str:
    return (
        "## OUTPUT FORMAT\n"
        "Respond using exactly these XML tags. Do not include any text outside the tags.\n\n"
        "<answer>\n"
        "[Your markdown-formatted answer...]\n"
        "</answer>\n\n"
        "<used_citations>\n"
        "[Comma-separated list of citation numbers actually used... If no chunks were used, write NONE.]\n"
        "</used_citations>\n\n"
        "Self-check before outputting:\n"
        "- Every citation number in <used_citations> appears as [N] in <answer>.\n"
        "- Every [N] in <answer> is listed in <used_citations>.\n"
        "- If no chunks were used, <used_citations> is NONE."
    )
```

- [ ] **Step 5: Create `self_check.py`**

```python
"""Shared self-check templates for chains."""


def standard_self_check(items: list[str] | None = None) -> str:
    defaults = [
        "Is every question/answer derived solely from the source material?",
        "Are all character and word limits respected?",
        "Is the JSON valid and well-formed?",
    ]
    checks = items or defaults
    lines = "\n".join(f"- [ ] {item}" for item in checks)
    return f"## SELF-CHECK (perform before outputting)\n{lines}"
```

- [ ] **Step 6: Create `preferences.py`**

```python
"""Build preference context strings for chain prompts."""


def build_preference_context(prefs: dict[str, object] | None) -> str:
    """Build a preference context string from user preferences dict.

    Rules:
    - Apply preferences ONLY if they fit the material naturally.
    - NEVER force a preference if the text does not support it.
    - Sanitize custom_instructions to prevent prompt injection.
    """
    if not prefs:
        return ""

    parts: list[str] = []
    if level := prefs.get("education_level"):
        parts.append(f"Adapt complexity to {level} level when the material allows.")
    if styles := prefs.get("explanation_styles"):
        if isinstance(styles, list):
            parts.append(f"Use these explanation styles when natural: {', '.join(str(s) for s in styles)}.")
    if custom := prefs.get("custom_instructions"):
        safe = _sanitize_custom_instructions(str(custom))
        if safe:
            parts.append(
                f"<user_preferences>\n<custom_instructions>\n{safe}\n</custom_instructions>\n</user_preferences>"
            )

    if not parts:
        return ""

    return (
        "## USER PREFERENCES (apply ONLY if they fit the material naturally)\n"
        "NEVER contradict the source material. NEVER invent facts. "
        "If a preference cannot be applied naturally, ignore it.\n\n"
        + "\n".join(parts)
    )


def _sanitize_custom_instructions(text: str) -> str:
    """Strip common prompt injection tokens and truncate."""
    safe = text[:500]
    for token in ["---", "###", "<|", "[/INST]", "<script", "<?xml", "[[", "]]"]:
        safe = safe.replace(token, "")
    return safe.strip()
```

- [ ] **Step 7: Create `fallback.py`**

```python
"""Shared fallback behavior instructions."""


def fallback_behavior(fallback_message: str) -> str:
    return (
        "## INSUFFICIENT MATERIAL\n"
        f"If the source material does not contain enough information, output the fallback message exactly: {fallback_message}\n"
        "Do not add any introductory text, apology, or explanation.\n"
        "Do not invent content to fill gaps."
    )
```

- [ ] **Step 8: Create `chat_modes.py`**

```python
"""Chat mode behavior definitions."""

from typing import Literal

ChatMode = Literal["strict_rag", "tutor", "socratic"]

_MODE_RULES: dict[ChatMode, str] = {
    "strict_rag": (
        "## MODE: STRICT RAG\n"
        "1. Answer ONLY based on the provided context chunks.\n"
        "2. NEVER use outside knowledge, general facts, or inference.\n"
        "3. If the answer is not in the chunks, output the fallback message exactly.\n"
        "4. Always cite chunks with [N] markers when stating facts."
    ),
    "tutor": (
        "## MODE: TUTOR\n"
        "1. Source-first: Always check the provided context first. Cite chunks with [N].\n"
        "2. Elaborate if helpful: If the student asks 'why?' or 'can you explain more?', you MAY provide general knowledge ONLY if you clearly label it with '[AI Knowledge]:'.\n"
        "3. Never contradict the source material. If general knowledge conflicts with the chunks, trust the chunks.\n"
        "4. Be conversational. Greet naturally, ask clarifying questions when ambiguous, and offer follow-up suggestions.\n"
        "5. If the answer is not in the chunks and you genuinely don't know, say 'I don't have enough information in your notes to answer that.'"
    ),
    "socratic": (
        "## MODE: SOCRATIC\n"
        "1. Guide the student to the answer using questions, not direct answers.\n"
        "2. Use the provided context as the source of truth. Cite with [N].\n"
        "3. Ask 1-3 guiding questions that lead the student toward the correct understanding.\n"
        "4. Only provide the direct answer if the student is clearly stuck after 2-3 exchanges.\n"
        "5. Never use outside knowledge unless explicitly labeled '[AI Knowledge]:'."
    ),
}


def get_mode_rules(mode: ChatMode) -> str:
    return _MODE_RULES.get(mode, _MODE_RULES["tutor"])
```

- [ ] **Step 9: Run backend linter**

Run: `cd backend && ruff check src/chains/prompts/`
Expected: PASS (no errors)

- [ ] **Step 10: Commit**

```bash
git add backend/src/chains/prompts/
git commit -m "feat(chains): add reusable prompt composition modules"
```

---

## Task 2: Extract Chat Chain to Proper Layer

**Files:**
- Create: `backend/src/chains/chat_chain.py`
- Create: `backend/src/services/chat_service.py`
- Modify: `backend/src/api/routers/chat.py`
- Delete: `backend/src/services/chat_chain.py`

---

- [ ] **Step 1: Create `backend/src/chains/chat_chain.py`**

Move the pure LLM logic from `services/chat_chain.py` into `chains/chat_chain.py`, updating it to accept mode, persona, and user preferences.

```python
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
```

- [ ] **Step 2: Create `backend/src/services/chat_service.py`**

```python
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
        limit=5,
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

    chain_input = ChatChainInput(
        question=question,
        chunks=chunks,
        messages=messages,
        mode=str(mode),
        persona=str(persona),
        user_preferences=user_prefs,
    )
    return await run_chat_chain(chain_input)
```

- [ ] **Step 3: Modify `backend/src/api/routers/chat.py`**

Replace the direct `chat_chain` import and call with the service. Add `mode_override` and `persona_override` to `ChatRequest`.

```python
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
```

- [ ] **Step 4: Delete `backend/src/services/chat_chain.py`**

```bash
rm backend/src/services/chat_chain.py
```

- [ ] **Step 5: Run linter**

Run: `cd backend && ruff check src/chains/chat_chain.py src/services/chat_service.py src/api/routers/chat.py`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add backend/src/chains/chat_chain.py backend/src/services/chat_service.py backend/src/api/routers/chat.py
git rm backend/src/services/chat_chain.py
git commit -m "refactor(chat): extract chain to proper layer, add persona/mode support"
```

---

## Task 3: Fix Quiz Grading Logic

**Files:**
- Modify: `backend/src/services/quiz_service.py`

---

- [ ] **Step 1: Add grading utility at top of `quiz_service.py`**

Insert after imports, before class definitions:

```python
from difflib import SequenceMatcher

_IDENTIFICATION_SIMILARITY_THRESHOLD = 0.85


def _normalize_answer(s: str) -> str:
    return s.strip().lower().rstrip(".")


def _is_similar(a: str, b: str) -> bool:
    return SequenceMatcher(None, a, b).ratio() >= _IDENTIFICATION_SIMILARITY_THRESHOLD


def grade_question(question: dict[str, Any], user_answer: object) -> bool:
    """Grade a single question answer. Supports all question types."""
    qtype = str(question.get("type", "mcq"))

    if qtype == "multi_select":
        expected = set(_normalize_answer(a) for a in question.get("correct_answers") or [])
        selected_raw = user_answer if isinstance(user_answer, list) else [user_answer]
        selected = set(_normalize_answer(str(a)) for a in selected_raw if a is not None)
        return selected == expected

    if qtype == "identification":
        user = _normalize_answer(str(user_answer))
        canonical = _normalize_answer(str(question.get("correct_answer", "")))
        if user == canonical or _is_similar(user, canonical):
            return True
        for alias in question.get("acceptable_answers") or []:
            norm = _normalize_answer(str(alias))
            if user == norm or _is_similar(user, norm):
                return True
        return False

    if qtype == "true_false":
        expected = question.get("correct_answer")
        if isinstance(expected, bool):
            return bool(user_answer) == expected
        return str(user_answer).strip().lower() == str(expected).strip().lower()

    # mcq, ordering, and fallback
    expected = str(question.get("correct_answer") or "").strip().lower()
    return str(user_answer).strip().lower() == expected
```

- [ ] **Step 2: Replace grading in `submit_quiz_attempt`**

Find this block (~line 364-370):
```python
        topic = str(question.get("topic") or "General")
        expected = str(question.get("correct_answer") or "")
        is_correct = selected.strip().lower() == expected.strip().lower()
```

Replace with:
```python
        topic = str(question.get("topic") or "General")
        is_correct = grade_question(question, selected)
```

- [ ] **Step 3: Replace grading in `get_attempt_by_id`**

Find this block (~line 509-511):
```python
        topic = str(question.get("topic") or "General")
        expected = str(question.get("correct_answer") or "")
        is_correct = selected.strip().lower() == expected.strip().lower()
```

Replace with:
```python
        topic = str(question.get("topic") or "General")
        is_correct = grade_question(question, selected)
```

- [ ] **Step 4: Update `question_results` to include `acceptable_answers`**

In `get_attempt_by_id`, find the `question_results.append()` block (~line 518-529) and add `acceptable_answers`:

```python
        question_results.append(
            {
                "id": str(question.get("id", question_id)),
                "question": str(question.get("question", "")),
                "user_answer": selected,
                "correct_answer": question.get("correct_answer", ""),
                "acceptable_answers": question.get("acceptable_answers") or [],
                "is_correct": is_correct,
                "topic": topic,
                "explanation": str(question.get("explanation", "")),
                "type": str(question.get("type", "mcq")),
            }
        )
```

- [ ] **Step 5: Run tests**

Run: `cd backend && pytest tests/services/test_quiz_grading.py -v`
Expected: PASS (tests written in Task 6)

- [ ] **Step 6: Commit**

```bash
git add backend/src/services/quiz_service.py
git commit -m "fix(quiz): fix multi-select and identification grading with fuzzy matching"
```

---

## Task 4: Update Quiz Chain

**Files:**
- Modify: `backend/src/chains/quiz_chain.py`

---

- [ ] **Step 1: Add preference import**

At the top of `quiz_chain.py`, add:
```python
from src.chains.prompts import build_preference_context, strict_source_only
```

- [ ] **Step 2: Update `QuizChainInput`**

Add `user_preferences` field:
```python
class QuizChainInput(TypedDict):
    document_id: str
    user_id: str
    question_count: int
    auto_mode: bool
    question_distribution: dict[str, int]
    chunks: list[str]
    user_preferences: dict[str, object] | None  # NEW
```

- [ ] **Step 3: Update identification TYPE_PROMPT**

Find the `identification` entry in `TYPE_PROMPTS` (around line 57-98). Add these lines after the WRONG EXAMPLES section and before the markdown formatting rules:

```python
        "\n"
        "MULTI-WORD BLANK RULE:\n"
        "When creating a fill-in-the-blank for multi-word answers, replace ONLY the first word of the answer phrase with the blank. "
        "Ensure the sentence reads naturally when the correct answer is inserted.\n"
        "WRONG: 'The study of ___ behavior (2 words)' -> 'human behavior' -> 'The study of human behavior behavior'\n"
        "CORRECT: 'The study of ___ (2 words)' -> 'human behavior' -> 'The study of human behavior'\n"
        "\n"
        "ACCEPTABLE ANSWERS:\n"
        "- If the answer has common abbreviations, synonyms, or alternate spellings, include them in `acceptable_answers`.\n"
        "- Example: 'correct_answer': 'HTTPS', 'acceptable_answers': ['HTTPS', 'Hypertext Transfer Protocol']\n"
        "- If there are no valid alternatives, omit `acceptable_answers` or set it to [].\n"
```

- [ ] **Step 4: Update `_build_generation_prompt`**

Find the `_build_generation_prompt` function. After the ABSOLUTE RULES section and before SOURCE MATERIAL, add preference injection:

```python
    pref_context = build_preference_context(
        # user_preferences would need to be threaded through; we'll pass it as an argument
    )
```

Actually, modify the function signature to accept `user_preferences`:

Find:
```python
def _build_generation_prompt(
    chunks: list[str],
    distribution: dict[str, int],
    error_context: str | None = None,
) -> str:
```

Replace with:
```python
def _build_generation_prompt(
    chunks: list[str],
    distribution: dict[str, int],
    user_preferences: dict[str, object] | None = None,
    error_context: str | None = None,
) -> str:
```

Then after the `instructions.append("## ABSOLUTE RULES")` block, add:
```python
    pref_context = build_preference_context(user_preferences)
    if pref_context:
        instructions.append("")
        instructions.append(pref_context)
```

- [ ] **Step 5: Update JSON schema in prompt to include `acceptable_answers`**

Find the schema block (~line 374-390) and add `acceptable_answers`:

```python
        '      "correct_answer": "string or bool",\n'
        '      "acceptable_answers": ["string"] | null,\n'  # NEW
        '      "correct_answers": ["string"] | null,\n'
```

- [ ] **Step 6: Thread `user_preferences` through the chain**

Find the `_generate_questions_from_llm` function call site and the `run_quiz_chain` function. Pass `input.get("user_preferences")` into `_build_generation_prompt`.

- [ ] **Step 7: Update `_normalize_question` to preserve `acceptable_answers`**

Find `_normalize_question` (around line 220-255). In the `identification` branch, add:
```python
    if qtype == "identification":
        result["acceptable_answers"] = raw.get("acceptable_answers") or []
```

- [ ] **Step 8: Add double-word warning in validation**

In `_validate_questions`, in the `identification` branch, add after the markdown check:

```python
            # Warn if question text contains the answer after the blank (double-word risk)
            question_text = str(q.get("question", ""))
            if answer_str and answer_str.lower() in question_text.lower().replace("___", ""):
                logger.info(
                    "Identification question %s may have double-word issue: question contains '%s'",
                    q["id"],
                    answer_str,
                )
```

- [ ] **Step 9: Run linter**

Run: `cd backend && ruff check src/chains/quiz_chain.py`
Expected: PASS

- [ ] **Step 10: Commit**

```bash
git add backend/src/chains/quiz_chain.py
git commit -m "feat(quiz): add acceptable_answers, double-word fix, preference injection"
```

---

## Task 5: Update Practice Chain

**Files:**
- Modify: `backend/src/chains/practice_chain.py`

---

- [ ] **Step 1: Add import**

```python
from src.chains.prompts import build_preference_context, strict_source_only
```

- [ ] **Step 2: Update `PracticeChainInput`**

```python
class PracticeChainInput(TypedDict):
    weak_topics: list[str]
    drill_count: int
    user_id: str
    chunks: list[dict[str, Any]]
    user_preferences: dict[str, object] | None  # NEW
```

- [ ] **Step 3: Inject preferences into drill generation prompt**

Find where the prompt is constructed (around the DRILL_GENERATION_PROMPT usage). Before inserting the prompt, build preference context and prepend it:

```python
    pref_context = build_preference_context(input.get("user_preferences"))
    prompt = DRILL_GENERATION_PROMPT.format(count=input["drill_count"], context=context, topics=topics_str)
    if pref_context:
        prompt = strict_source_only() + "\n\n" + pref_context + "\n\n" + prompt
```

- [ ] **Step 4: Run linter**

Run: `cd backend && ruff check src/chains/practice_chain.py`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add backend/src/chains/practice_chain.py
git commit -m "feat(practice): inject user preferences into drill generation"
```

---

## Task 6: Write Tests

**Files:**
- Create: `backend/tests/chains/test_prompts.py`
- Create: `backend/tests/services/test_quiz_grading.py`

---

- [ ] **Step 1: Create `backend/tests/chains/test_prompts.py`**

```python
import pytest

from src.chains.prompts import build_preference_context, get_persona_description, get_mode_rules


class TestBuildPreferenceContext:
    def test_empty_prefs_returns_empty(self):
        assert build_preference_context(None) == ""
        assert build_preference_context({}) == ""

    def test_education_level(self):
        result = build_preference_context({"education_level": "High School"})
        assert "High School" in result
        assert "Adapt complexity" in result

    def test_explanation_styles(self):
        result = build_preference_context({"explanation_styles": ["simple_direct", "analogy_based"]})
        assert "simple_direct" in result
        assert "analogy_based" in result

    def test_custom_instructions_sanitized(self):
        result = build_preference_context({"custom_instructions": "Focus on --- nursing ### cases"})
        assert "---" not in result
        assert "###" not in result
        assert "nursing" in result
        assert "cases" in result

    def test_custom_instructions_truncated(self):
        long_text = "x" * 600
        result = build_preference_context({"custom_instructions": long_text})
        assert len(result) < 700  # rough bound

    def test_all_prefs_combined(self):
        prefs = {
            "education_level": "College",
            "explanation_styles": ["detailed_academic"],
            "custom_instructions": "Use medical examples",
        }
        result = build_preference_context(prefs)
        assert "College" in result
        assert "detailed_academic" in result
        assert "medical examples" in result


class TestGetPersonaDescription:
    def test_default_persona(self):
        desc = get_persona_description("default")
        assert "Clarift" in desc

    def test_encouraging_persona(self):
        desc = get_persona_description("encouraging")
        assert "warm" in desc.lower()

    def test_invalid_persona_falls_back(self):
        desc = get_persona_description("nonexistent")  # type: ignore[arg-type]
        assert "Clarift" in desc


class TestGetModeRules:
    def test_strict_rag_mode(self):
        rules = get_mode_rules("strict_rag")
        assert "ONLY based on the provided context" in rules

    def test_tutor_mode(self):
        rules = get_mode_rules("tutor")
        assert "[AI Knowledge]:" in rules

    def test_socratic_mode(self):
        rules = get_mode_rules("socratic")
        assert "guiding questions" in rules
```

- [ ] **Step 2: Create `backend/tests/services/test_quiz_grading.py`**

```python
import pytest

from src.services.quiz_service import grade_question


class TestGradeQuestion:
    # --- Multi-select ---
    def test_multi_select_all_correct(self):
        q = {"type": "multi_select", "correct_answers": ["A", "B"]}
        assert grade_question(q, ["A", "B"]) is True

    def test_multi_select_wrong_set(self):
        q = {"type": "multi_select", "correct_answers": ["A", "B"]}
        assert grade_question(q, ["A", "C"]) is False

    def test_multi_select_missing_one(self):
        q = {"type": "multi_select", "correct_answers": ["A", "B"]}
        assert grade_question(q, ["A"]) is False

    def test_multi_select_case_insensitive(self):
        q = {"type": "multi_select", "correct_answers": ["Flexible interaction"]}
        assert grade_question(q, ["flexible interaction"]) is True

    # --- Identification ---
    def test_identification_exact_match(self):
        q = {"type": "identification", "correct_answer": "HTTPS"}
        assert grade_question(q, "HTTPS") is True

    def test_identification_case_insensitive(self):
        q = {"type": "identification", "correct_answer": "HTTPS"}
        assert grade_question(q, "https") is True

    def test_identification_alias_match(self):
        q = {
            "type": "identification",
            "correct_answer": "HTTPS",
            "acceptable_answers": ["Hypertext Transfer Protocol"],
        }
        assert grade_question(q, "Hypertext Transfer Protocol") is True

    def test_identification_fuzzy_typo(self):
        q = {"type": "identification", "correct_answer": "photosynthesis"}
        assert grade_question(q, "photosynthesys") is True  # fuzzy match

    def test_identification_wrong_answer(self):
        q = {"type": "identification", "correct_answer": "HTTPS"}
        assert grade_question(q, "FTP") is False

    # --- True/False ---
    def test_true_false_boolean(self):
        q = {"type": "true_false", "correct_answer": True}
        assert grade_question(q, True) is True
        assert grade_question(q, False) is False

    def test_true_false_string(self):
        q = {"type": "true_false", "correct_answer": "true"}
        assert grade_question(q, "true") is True

    # --- MCQ ---
    def test_mcq_match(self):
        q = {"type": "mcq", "correct_answer": "A"}
        assert grade_question(q, "A") is True
        assert grade_question(q, "B") is False
```

- [ ] **Step 3: Run tests**

Run: `cd backend && pytest tests/chains/test_prompts.py tests/services/test_quiz_grading.py -v`
Expected: All 20+ tests PASS

- [ ] **Step 4: Commit**

```bash
git add backend/tests/
git commit -m "test(backend): add prompt module and quiz grading tests"
```

---

## Self-Review Checklist

- [ ] **Spec coverage:** Every section of the spec (§1-§8) has at least one task implementing it.
  - Prompt modules → Task 1
  - Chat persona/mode → Task 2
  - Grading fixes → Task 3
  - Quiz chain updates → Task 4
  - Practice chain updates → Task 5
  - Tests → Task 6
- [ ] **Placeholder scan:** No "TBD", "TODO", or "implement later" found.
- [ ] **Type consistency:** `grade_question` signature matches usage in both `submit_quiz_attempt` and `get_attempt_by_id`. `ChatChainInput` has `mode`, `persona`, `user_preferences`.
- [ ] **Import paths:** All imports use `src.` prefix consistently.
- [ ] **Layer enforcement:** Router → Service (`chat_service.py`) → Chain (`chat_chain.py`). No layer skipping.
- [ ] **Security:** `persona_override` and `mode_override` are `Literal` enums. `custom_instructions` is sanitized.
- [ ] **Backward compatibility:** `acceptable_answers` is optional. Existing quizzes without it still work. Chat defaults to `tutor`/`default`.
