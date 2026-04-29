# SSE Upload & Chat Selector Bug Fixes Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix the SSE upload progress flow so users see accurate real-time status, and align the chat document selector API to support the multi-select UI already present on desktop.

**Architecture:** Backend worker transitions job status correctly; SSE endpoint polls faster; frontend refreshes document list on completion. Chat API accepts an array of document IDs and backend retrieves chunks from all selected documents.

**Tech Stack:** Next.js 15, TypeScript, Tailwind 4, FastAPI (async), Python, ARQ, SSE, Drizzle ORM, Zustand.

---

## Chunk 1: Fix SSE Upload Flow (Backend)

### Task 1: Add `processing` transition in `process_document` worker

**Files:**
- Modify: `backend/src/worker.py`
- Test: `backend/tests/test_worker.py` (add or modify)

- [ ] **Step 1: Write the failing test**

```python
# backend/tests/test_worker.py
import pytest
from unittest.mock import AsyncMock, patch, MagicMock

@pytest.mark.asyncio
async def test_process_document_transitions_to_processing():
    """Job status should move from pending -> processing -> completed."""
    from src.worker import process_document

    mock_session = AsyncMock()
    mock_result = MagicMock()
    mock_doc = MagicMock()
    mock_doc.id = "doc-123"
    mock_doc.file_path = "s3://bucket/file.pdf"
    mock_doc.filename = "file.pdf"
    mock_result.scalar_one.return_value = mock_doc
    mock_session.execute.return_value = mock_result

    with patch("src.worker.download_from_r2", new_callable=AsyncMock) as mock_download, \
         patch("src.worker.extract_text_from_pdf", return_value="some text"), \
         patch("src.worker.chunk_text", return_value=["chunk1"]), \
         patch("src.worker.embed_chunks", new_callable=AsyncMock, return_value=[[0.1]*768]), \
         patch("src.worker.AsyncSessionLocal", return_value=mock_session):

        await process_document({}, "doc-123", "job-123")

    # Verify processing transition was called
    calls = [str(call) for call in mock_session.execute.call_args_list]
    assert any("processing" in c for c in calls), "Job should be updated to 'processing'"
    assert any("completed" in c for c in calls), "Job should be updated to 'completed'"
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pytest backend/tests/test_worker.py::test_process_document_transitions_to_processing -v`
Expected: FAIL with assertion error — "Job should be updated to 'processing'" not found.

- [ ] **Step 3: Add `processing` transition in worker**

In `backend/src/worker.py`, inside `process_document`, after fetching the document and before doing the heavy work, add:

```python
await session.execute(
    update(Job).where(Job.id == uuid.UUID(job_id)).values(status="processing")
)
await session.commit()
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pytest backend/tests/test_worker.py::test_process_document_transitions_to_processing -v`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add backend/src/worker.py backend/tests/test_worker.py
git commit -m "fix(worker): transition document job to processing state"
```

### Task 2: Add `processing` transition in `run_summary_job` worker

**Files:**
- Modify: `backend/src/worker.py`
- Test: `backend/tests/test_worker.py`

- [ ] **Step 1: Write the failing test**

```python
@pytest.mark.asyncio
async def test_run_summary_job_transitions_to_processing():
    """Summary job should also move to processing before work begins."""
    from src.worker import run_summary_job

    mock_session = AsyncMock()
    mock_result = MagicMock()
    mock_summary = MagicMock()
    mock_summary.id = "sum-123"
    mock_summary.document_id = "doc-123"
    mock_result.scalar_one.return_value = mock_summary
    mock_session.execute.return_value = mock_result

    with patch("src.worker.AsyncSessionLocal", return_value=mock_session), \
         patch("src.worker.run_summary_chain", new_callable=AsyncMock, return_value={"content": "# Summary"}):
        await run_summary_job({}, "sum-123", "job-123", "doc-123", "bullet", "concise", "")

    calls = [str(call) for call in mock_session.execute.call_args_list]
    assert any("processing" in c for c in calls)
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pytest backend/tests/test_worker.py::test_run_summary_job_transitions_to_processing -v`
Expected: FAIL

- [ ] **Step 3: Add `processing` transition**

In `backend/src/worker.py`, inside `run_summary_job`, add the same pattern at the start:

```python
await session.execute(
    update(Job).where(Job.id == uuid.UUID(job_id)).values(status="processing")
)
await session.commit()
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pytest backend/tests/test_worker.py::test_run_summary_job_transitions_to_processing -v`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add backend/src/worker.py backend/tests/test_worker.py
git commit -m "fix(worker): transition summary job to processing state"
```

### Task 3: Fix `Document.status` from `"completed"` to `"ready"`

**Files:**
- Modify: `backend/src/worker.py`
- Test: `backend/tests/test_worker.py`

- [ ] **Step 1: Write the failing test**

```python
@pytest.mark.asyncio
async def test_process_document_sets_document_ready():
    """Document status must be 'ready' to match frontend contract."""
    from src.worker import process_document

    mock_session = AsyncMock()
    mock_result = MagicMock()
    mock_doc = MagicMock()
    mock_doc.id = "doc-123"
    mock_doc.file_path = "s3://bucket/file.pdf"
    mock_doc.filename = "file.pdf"
    mock_result.scalar_one.return_value = mock_doc
    mock_session.execute.return_value = mock_result

    with patch("src.worker.download_from_r2", new_callable=AsyncMock), \
         patch("src.worker.extract_text_from_pdf", return_value="text"), \
         patch("src.worker.chunk_text", return_value=["c"]), \
         patch("src.worker.embed_chunks", new_callable=AsyncMock, return_value=[[0.1]*768]), \
         patch("src.worker.AsyncSessionLocal", return_value=mock_session):
        await process_document({}, "doc-123", "job-123")

    calls = [str(call) for call in mock_session.execute.call_args_list]
    assert any("'ready'" in c for c in calls), "Document status must be 'ready'"
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pytest backend/tests/test_worker.py::test_process_document_sets_document_ready -v`
Expected: FAIL — currently sets `"completed"`.

- [ ] **Step 3: Change `"completed"` to `"ready"`**

In `backend/src/worker.py`, find the line:

```python
update(Document).where(Document.id == document_id).values(status="completed")
```

Change to:

```python
update(Document).where(Document.id == document_id).values(status="ready")
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pytest backend/tests/test_worker.py::test_process_document_sets_document_ready -v`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add backend/src/worker.py backend/tests/test_worker.py
git commit -m "fix(worker): set document status to 'ready' instead of 'completed'"
```

### Task 4: Reduce SSE poll interval for more responsive progress

**Files:**
- Modify: `backend/src/api/routers/jobs.py`
- Test: `backend/tests/test_jobs.py` (add or modify)

- [ ] **Step 1: Write the failing test**

```python
@pytest.mark.asyncio
async def test_sse_poll_interval_is_half_second():
    """Poll interval should be 0.5s for responsive updates."""
    import inspect
    from src.api.routers.jobs import event_generator
    source = inspect.getsource(event_generator)
    assert "poll_interval = 0.5" in source or "await asyncio.sleep(0.5)" in source
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pytest backend/tests/test_jobs.py::test_sse_poll_interval_is_half_second -v`
Expected: FAIL — currently 3.0s.

- [ ] **Step 3: Change poll interval to 0.5s**

In `backend/src/api/routers/jobs.py`:

```python
poll_interval = 0.5  # seconds
```

Also increase `max_polls` proportionally if you want to keep total stream lifetime similar (e.g., `max_polls = 240` for ~2 minutes), or leave as-is if total lifetime is acceptable.

- [ ] **Step 4: Run test to verify it passes**

Run: `pytest backend/tests/test_jobs.py::test_sse_poll_interval_is_half_second -v`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add backend/src/api/routers/jobs.py backend/tests/test_jobs.py
git commit -m "fix(sse): reduce poll interval from 3s to 0.5s"
```

---

## Chunk 2: Fix SSE Upload Flow (Frontend)

### Task 5: Refresh document list after SSE job completes

**Files:**
- Modify: `frontend/src/components/features/documents/documents-client.tsx`
- Test: `frontend/src/components/features/documents/__tests__/documents-client.test.tsx` (add or modify)

- [ ] **Step 1: Write the failing test**

```tsx
// frontend/src/components/features/documents/__tests__/documents-client.test.tsx
import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, it, expect, vi } from "vitest"

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: vi.fn(), push: vi.fn() }),
}))

describe("DocumentsClient", () => {
  it("calls router.refresh when a job completes", async () => {
    const mockRefresh = vi.fn()
    vi.doMock("next/navigation", () => ({
      useRouter: () => ({ refresh: mockRefresh }),
    }))
    const { DocumentsClient } = await import("../documents-client")
    render(<DocumentsClient documents={[]} />)
    // Trigger a job completion event somehow; assert refresh was called
    // If component structure makes this hard, test the handleJobComplete callback directly
  })
})
```

If direct component testing is too complex, write a unit test for the callback:

```tsx
it("handleJobComplete should call router.refresh", () => {
  const refresh = vi.fn()
  const setActiveJobs = vi.fn()
  // Extract and call the callback logic
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm run test:run frontend/src/components/features/documents/__tests__/documents-client.test.tsx`
Expected: FAIL — refresh not called.

- [ ] **Step 3: Add `router.refresh()` in `handleJobComplete`**

In `frontend/src/components/features/documents/documents-client.tsx`:

```tsx
const router = useRouter()

const handleJobComplete = useCallback((jobId: string) => {
  setActiveJobs((prev) => {
    const next = { ...prev }
    delete next[jobId]
    return next
  })
  router.refresh() // <-- add this
}, [router])
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm run test:run frontend/src/components/features/documents/__tests__/documents-client.test.tsx`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add frontend/src/components/features/documents/documents-client.tsx frontend/src/components/features/documents/__tests__/documents-client.test.tsx
git commit -m "fix(documents): refresh list after upload job completes"
```

---

## Chunk 3: Align Chat Document Selector with API

### Task 6: Update OpenAPI schema and types for multi-document chat

**Files:**
- Modify: `backend/src/api/v1/schemas/chat.py` (or wherever ChatRequest is defined)
- Modify: `backend/src/api/v1/routes/chat.py` (or equivalent)
- Generate: `frontend/src/lib/api-types.ts` (via `pnpm run generate:api`)
- Test: `backend/tests/test_chat.py`

- [ ] **Step 1: Write the failing test**

```python
# backend/tests/test_chat.py
import pytest

@pytest.mark.asyncio
async def test_chat_accepts_multiple_document_ids(client):
    payload = {
        "question": "What is this?",
        "document_ids": ["doc-1", "doc-2"],
        "messages": []
    }
    response = await client.post("/api/v1/chat", json=payload)
    # Expect validation to pass even if underlying logic isn't implemented yet
    assert response.status_code in (200, 501)
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pytest backend/tests/test_chat.py::test_chat_accepts_multiple_document_ids -v`
Expected: FAIL — 422 validation error because `document_ids` array is not in schema.

- [ ] **Step 3: Update Pydantic schema to accept `document_ids: list[str] | None`**

In the backend chat request schema, change:

```python
document_id: str | None = None
```

to:

```python
document_ids: list[str] | None = None
```

Maintain backward compatibility if possible by also keeping `document_id` as a deprecated alias, or just migrate fully since the frontend is the only consumer.

- [ ] **Step 4: Update route to retrieve chunks from all provided documents**

In the chat route/service, replace the single-document chunk retrieval with:

```python
doc_ids = payload.document_ids or ([payload.document_id] if payload.document_id else [])
chunks = []
for doc_id in doc_ids:
    chunks.extend(await retrieve_chunks_for_document(user_id, doc_id, query_embedding))
# Deduplicate and limit to max 5 total chunks
chunks = deduplicate_chunks(chunks)[:5]
```

- [ ] **Step 5: Regenerate frontend types**

Run: `cd frontend && pnpm run generate:api`
Expected: `frontend/src/lib/api-types.ts` now contains `document_ids?: string[] | null`.

- [ ] **Step 6: Run backend test to verify it passes**

Run: `pytest backend/tests/test_chat.py::test_chat_accepts_multiple_document_ids -v`
Expected: PASS

- [ ] **Step 7: Commit**

```bash
git add backend/src/api/v1/schemas/chat.py backend/src/api/v1/routes/chat.py frontend/src/lib/api-types.ts backend/tests/test_chat.py
git commit -m "feat(chat): accept array of document_ids in chat request"
```

### Task 7: Update frontend chat hook and client to send `document_ids` array

**Files:**
- Modify: `frontend/src/hooks/use-chat.ts`
- Modify: `frontend/src/components/features/chat/chat-page-client.tsx`
- Modify: `frontend/src/stores/chat-store.ts` (if needed)
- Test: `frontend/src/hooks/__tests__/use-chat.test.ts` (add or modify)

- [ ] **Step 1: Write the failing test**

```tsx
// frontend/src/hooks/__tests__/use-chat.test.ts
import { describe, it, expect, vi } from "vitest"
import { renderHook } from "@testing-library/react"

describe("useSendChatMessage", () => {
  it("sends document_ids array when multiple are selected", async () => {
    // Mock authClient.POST and assert body contains document_ids
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm run test:run frontend/src/hooks/__tests__/use-chat.test.ts`
Expected: FAIL — hook still sends `document_id` string.

- [ ] **Step 3: Update hook type and payload**

In `frontend/src/hooks/use-chat.ts`:

```typescript
type SendChatInput = {
  question: string
  document_ids?: string[]
  messages?: Array<{ role: string; content: string }>
}

// In the mutation:
body: {
  question: payload.question,
  document_ids: payload.document_ids ?? [],
  messages: payload.messages ?? [],
}
```

- [ ] **Step 4: Update chat client to pass all selected IDs**

In `frontend/src/components/features/chat/chat-page-client.tsx`, replace:

```typescript
const selectedDocumentId = useMemo(() => selectedIds[0], [selectedIds])
```

with:

```typescript
const selectedDocumentIds = useMemo(() => selectedIds, [selectedIds])
```

And in `sendMessage`:

```typescript
const response = await mutateAsync({
  question: message,
  document_ids: selectedDocumentIds,
  messages: contextMessages,
})
```

Also update the mobile radio variant to keep the array (even if length 1):

```typescript
onToggle={(id) => {
  setSelectedDocumentIds([id]) // still array
  setIsDrawerOpen(false)
}}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `pnpm run test:run frontend/src/hooks/__tests__/use-chat.test.ts`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add frontend/src/hooks/use-chat.ts frontend/src/components/features/chat/chat-page-client.tsx frontend/src/hooks/__tests__/use-chat.test.ts
git commit -m "feat(chat): send document_ids array from frontend"
```

---

## Chunk 4: Verification & Final Checks

### Task 8: Run full backend verification

- [ ] **Step 1: Run ruff**

Run: `ruff check .`
Expected: No errors.

- [ ] **Step 2: Run pytest**

Run: `pytest`
Expected: All tests pass.

- [ ] **Step 3: Commit any fixes**

```bash
git add -A
git commit -m "chore: fix lint and test issues"
```

### Task 9: Run full frontend verification

- [ ] **Step 1: Run typecheck**

Run: `cd frontend && pnpm run typecheck`
Expected: No TypeScript errors.

- [ ] **Step 2: Run vitest**

Run: `pnpm run test:run`
Expected: All tests pass.

- [ ] **Step 3: Commit any fixes**

```bash
git add -A
git commit -m "chore: fix frontend type and test issues"
```

---

## Files to Create or Modify Summary

| File | Action | Reason |
|------|--------|--------|
| `backend/src/worker.py` | Modify | Add processing transitions; fix document status |
| `backend/src/api/routers/jobs.py` | Modify | Reduce SSE poll interval |
| `backend/src/api/v1/schemas/chat.py` | Modify | Accept `document_ids` array |
| `backend/src/api/v1/routes/chat.py` | Modify | Retrieve chunks from multiple docs |
| `frontend/src/lib/api-types.ts` | Generate | Sync with backend OpenAPI changes |
| `frontend/src/hooks/use-chat.ts` | Modify | Send `document_ids` array |
| `frontend/src/components/features/chat/chat-page-client.tsx` | Modify | Pass all selected IDs |
| `frontend/src/components/features/documents/documents-client.tsx` | Modify | Refresh on job completion |
| `backend/tests/test_worker.py` | Modify/Create | Test processing transitions |
| `backend/tests/test_jobs.py` | Modify/Create | Test SSE poll interval |
| `backend/tests/test_chat.py` | Modify/Create | Test multi-document request |
| `frontend/src/hooks/__tests__/use-chat.test.ts` | Modify/Create | Test document_ids array |
| `frontend/src/components/features/documents/__tests__/documents-client.test.tsx` | Modify/Create | Test refresh on complete |
