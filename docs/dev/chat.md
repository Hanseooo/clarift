# Feature: Grounded Chat

> A RAG-based chat interface scoped strictly to the user's uploaded documents.  
> Uses Gemini Flash Lite for cost efficiency.

---

## What This Feature Does

Allows users to ask questions about their uploaded notes. Responses are grounded exclusively in retrieved chunks from selected documents. The model cannot draw on external knowledge.

---

## Rules (Non-Negotiable)

1. Context is limited to `max 5 chunks` per response
2. Chunks are scoped by `WHERE user_id = :user_id AND document_id IN (:selected_ids)`
3. Every response must cite which chunks were used (by chunk ID or document title)
4. If the answer is not in the retrieved chunks: respond with the exact fallback string
5. No external knowledge. The system prompt explicitly forbids it.
6. Rolling window quota: resets every 5 hours via Redis TTL

---

## Fallback String

```
"I cannot find this in your uploaded notes. Try asking about a different topic, 
or check if you've uploaded the relevant material."
```

This string is defined in `app/core/config.py` as `CHAT_FALLBACK_MESSAGE`. Never hardcode it elsewhere.

---

## Backend

### Route: `POST /api/v1/chat`

```python
# Input: { message: str, document_ids: list[UUID] }
# Output: text/event-stream (SSE)
# Auth: JWT required
# Quota: rolling window (Redis TTL)
```

### Chat Service

Location: `app/services/chat_service.py`

```python
async def chat(
    message: str,
    document_ids: list[UUID],
    user_id: UUID,
    db: AsyncSession,
) -> AsyncGenerator[str, None]:
    # 1. Retrieve top 5 chunks scoped to user + selected docs
    chunks = await retrieve_chunks(
        query=message,
        user_id=user_id,
        document_ids=document_ids,
        limit=5,
        db=db,
    )

    # 2. If no relevant chunks found, yield fallback
    if not chunks:
        yield CHAT_FALLBACK_MESSAGE
        return

    # 3. Build context string with chunk citations
    context = build_context_with_citations(chunks)

    # 4. Stream Gemini Flash Lite response
    async for token in gemini_flash_lite.stream(
        system=CHAT_SYSTEM_PROMPT,
        human=f"Context:\n{context}\n\nQuestion: {message}"
    ):
        yield token
```

### System Prompt

```
You are a study assistant. You must answer questions ONLY using the provided context 
from the student's uploaded notes. 

Rules:
- Never use knowledge outside the provided context
- Always cite which part of the notes your answer comes from
- If the context does not contain the answer, respond with the exact fallback message
- Be concise and clear — this student is studying for an exam
- Do not add information that is not in the context
```

This prompt is stored in `app/core/config.py` as `CHAT_SYSTEM_PROMPT`.

---

## Rolling Window Quota

Chat uses a Redis TTL rolling window quota (no weekly count system).

```python
# Each user gets N chat messages per 5-hour window
# Key: chat_usage:{user_id}
# TTL: 18000 seconds (5 hours)
# On each message: INCR key, set TTL if not set, check against limit
```

Free tier: limit defined in `QUOTA_LIMITS["free"]["chat_per_window"]`  
Pro tier: higher limit defined in `QUOTA_LIMITS["pro"]["chat_per_window"]`

---

## Frontend

### Chat Interface

Location: `components/features/chat/chat-interface.tsx`

- Message input at bottom
- Messages displayed in thread (user + assistant)
- Streaming response rendered token by token
- Citation chips below each assistant message (document title + chunk excerpt)
- Document selector: checkboxes for which uploaded docs to include

### SSE Streaming in Frontend

```typescript
// Chat uses EventSource for streaming
// Each token arrives as a "token" event
// "complete" event signals end of response
// "citation" event provides source references
```

---

## Tests

- `test_chat_grounded_response` — response cites correct chunks
- `test_chat_fallback_no_chunks` — fallback message returned when no relevant chunks
- `test_chat_user_scope` — cannot access another user's document chunks
- `test_chat_rolling_window_quota` — rate limiting works correctly
- `test_chat_system_prompt_enforced` — model does not use external knowledge
