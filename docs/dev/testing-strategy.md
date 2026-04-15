# Testing Strategy

> How to test Clarift's async backend, AI chains, ARQ workers, SSE endpoints, and React components.  
> See [`modularity-guidelines.md`](./modularity-guidelines.md) for what to test per layer.

---

## Philosophy

Test behavior, not implementation. A test should survive a refactor of the internals as long as the behavior is unchanged.

**What must be tested:**
- Every service method (happy path + main error cases)
- Every chain (output structure validity, not exact text)
- Quota enforcement (including race condition prevention)
- Auth scoping (user cannot access another user's data)
- SSE event emission sequence

**What does not need tests in MVP:**
- Route handlers (they're thin — if the service is tested, the route is implicitly tested)
- Drizzle schema (Neon validates at migration time)
- shadcn/ui primitive components

---

## Backend Testing (pytest)

### Setup

`tests/conftest.py`:
```python
import pytest
from httpx import AsyncClient, ASGITransport
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker
from app.main import app
from app.db.session import get_db
from app.db.models import Base
from app.api.v1.deps import get_current_user
from tests.factories import UserFactory, DocumentFactory

# Use in-memory SQLite for tests — no Neon dependency
TEST_DATABASE_URL = "sqlite+aiosqlite:///:memory:"

@pytest.fixture(scope="session")
def event_loop_policy():
    # Required for pytest-asyncio
    import asyncio
    return asyncio.DefaultEventLoopPolicy()

@pytest.fixture
async def db():
    engine = create_async_engine(TEST_DATABASE_URL)
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    session_factory = async_sessionmaker(engine)
    async with session_factory() as session:
        yield session

    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)

@pytest.fixture
async def client(db):
    async def override_db():
        yield db

    app.dependency_overrides[get_db] = override_db
    async with AsyncClient(
        transport=ASGITransport(app=app), base_url="http://test"
    ) as client:
        yield client
    app.dependency_overrides.clear()

@pytest.fixture
def auth_user(db):
    """Returns a user and overrides get_current_user dependency."""
    user = UserFactory.build()

    async def override_user():
        return user

    app.dependency_overrides[get_current_user] = override_user
    return user
```

`tests/factories.py`:
```python
import factory
from uuid import uuid4
from datetime import datetime
from app.db.models import User, Document, Quiz, UserUsage

class UserFactory(factory.Factory):
    class Meta:
        model = User

    id = factory.LazyFunction(uuid4)
    email = factory.Sequence(lambda n: f"user{n}@test.com")
    name = factory.Sequence(lambda n: f"User {n}")
    tier = "free"
    created_at = factory.LazyFunction(datetime.utcnow)

class DocumentFactory(factory.Factory):
    class Meta:
        model = Document

    id = factory.LazyFunction(uuid4)
    user_id = factory.LazyFunction(uuid4)
    title = "Test Document"
    r2_key = factory.LazyAttribute(lambda o: f"{o.user_id}/{o.id}/test.pdf")
    mime_type = "application/pdf"
    status = "ready"

class UserUsageFactory(factory.Factory):
    class Meta:
        model = UserUsage

    user_id = factory.LazyFunction(uuid4)
    summaries_used = 0
    quizzes_used = 0
    practice_used = 0
```

---

### Testing Services

Services are tested directly — no HTTP involved:

```python
# tests/test_quota_service.py
import pytest
from app.services.quota_service import enforce_quota
from app.core.exceptions import QuotaExceededException
from tests.factories import UserFactory, UserUsageFactory

async def test_quota_blocks_at_limit(db):
    user = UserFactory.build(tier="free")
    # Insert user + usage at limit
    usage = UserUsageFactory.build(user_id=user.id, summaries_used=3)
    db.add(user)
    db.add(usage)
    await db.commit()

    with pytest.raises(QuotaExceededException) as exc_info:
        await enforce_quota("summaries", user, db)

    assert exc_info.value.used == 3
    assert exc_info.value.limit == 3

async def test_quota_increments(db):
    user = UserFactory.build(tier="free")
    usage = UserUsageFactory.build(user_id=user.id, summaries_used=0)
    db.add(user)
    db.add(usage)
    await db.commit()

    await enforce_quota("summaries", user, db)

    await db.refresh(usage)
    assert usage.summaries_used == 1

async def test_quota_race_condition(db):
    """Two concurrent requests should not both succeed at the limit."""
    import asyncio
    user = UserFactory.build(tier="free")
    usage = UserUsageFactory.build(user_id=user.id, summaries_used=2)
    db.add(user)
    db.add(usage)
    await db.commit()

    results = await asyncio.gather(
        enforce_quota("summaries", user, db),
        enforce_quota("summaries", user, db),
        return_exceptions=True
    )

    # Exactly one should succeed, one should raise
    exceptions = [r for r in results if isinstance(r, QuotaExceededException)]
    assert len(exceptions) == 1
```

---

### Testing Chains

Chains make real Gemini calls in tests unless mocked. **Mock Gemini in unit tests. Use real calls only in integration tests.**

```python
# tests/test_summary_chain.py
from unittest.mock import AsyncMock, patch
from app.chains.summary_chain import SummaryChain

async def test_summary_chain_returns_markdown(mock_chunks):
    with patch("app.chains.summary_chain.ChatGoogleGenerativeAI") as mock_llm:
        mock_llm.return_value.ainvoke = AsyncMock(
            return_value=type("Response", (), {
                "content": "# Topic\n\n- Key point one\n- Key point two"
            })()
        )

        chain = SummaryChain(llm=mock_llm.return_value)
        result = await chain.run(
            chunks=["Osmosis is the movement of water..."],
            output_format="bullet"
        )

    assert result.content.startswith("#")
    assert "- " in result.content

async def test_quiz_chain_valid_json(mock_chunks):
    """Chain output must parse as valid quiz JSON."""
    with patch("app.chains.quiz_chain.ChatGoogleGenerativeAI") as mock_llm:
        mock_llm.return_value.ainvoke = AsyncMock(
            return_value=type("Response", (), {
                "content": '{"questions": [{"id": "q1", "type": "mcq", ...}]}'
            })()
        )

        chain = QuizChain(llm=mock_llm.return_value)
        result = await chain.run(chunks=mock_chunks)

    assert hasattr(result, "questions")
    assert len(result.questions) >= 5
    for q in result.questions:
        assert q.type in ("mcq", "true_false", "fill_blank")
        assert q.topic is not None
```

---

### Testing SSE Endpoints

```python
# tests/test_sse.py
import pytest
from httpx import AsyncClient

async def test_job_stream_emits_progress(client, auth_user, db):
    # Create a job in the DB
    job = JobFactory.build(user_id=auth_user.id, status="running")
    db.add(job)
    await db.commit()

    # Collect SSE events
    events = []
    async with client.stream("GET", f"/api/v1/jobs/{job.id}/stream") as response:
        assert response.headers["content-type"] == "text/event-stream; charset=utf-8"
        async for line in response.aiter_lines():
            if line.startswith("data:"):
                events.append(line[5:].strip())
            if len(events) >= 1:
                break

    assert len(events) >= 1
    import json
    event_data = json.loads(events[0])
    assert "status" in event_data

async def test_job_stream_requires_auth(client):
    response = await client.get("/api/v1/jobs/some-id/stream")
    assert response.status_code == 401

async def test_job_stream_user_scoped(client, auth_user, db):
    """Cannot stream another user's job."""
    other_user = UserFactory.build()
    job = JobFactory.build(user_id=other_user.id)
    db.add(other_user)
    db.add(job)
    await db.commit()

    response = await client.get(f"/api/v1/jobs/{job.id}/stream")
    assert response.status_code == 404
```

---

### Testing ARQ Workers

Workers are async functions — test them like any async service:

```python
# tests/test_workers.py
from unittest.mock import AsyncMock, patch, MagicMock
from app.workers.document_worker import process_document

async def test_process_document_happy_path(db):
    document = DocumentFactory.build(status="pending", mime_type="application/pdf")
    db.add(document)
    await db.commit()

    with patch("app.workers.document_worker.extract_pdf_text") as mock_extract, \
         patch("app.workers.document_worker.generate_embeddings") as mock_embed, \
         patch("app.workers.document_worker.store_chunks") as mock_store:

        mock_extract.return_value = "Study notes content..."
        mock_embed.return_value = [[0.1] * 768]  # fake embedding vector
        mock_store.return_value = None

        ctx = {"db": db, "redis": AsyncMock()}
        await process_document(ctx, document_id=str(document.id))

    await db.refresh(document)
    assert document.status == "ready"

async def test_process_document_extraction_failure(db):
    document = DocumentFactory.build(status="pending")
    db.add(document)
    await db.commit()

    with patch("app.workers.document_worker.extract_pdf_text") as mock_extract:
        mock_extract.side_effect = Exception("PDF corrupt")

        ctx = {"db": db, "redis": AsyncMock()}
        await process_document(ctx, document_id=str(document.id))

    await db.refresh(document)
    assert document.status == "failed"
    assert "corrupt" in document.error.lower()
```

---

## Frontend Testing (Vitest + Testing Library)

### MSW Mock Setup

`src/tests/mocks/handlers.ts`:
```typescript
import { http, HttpResponse } from "msw"

export const handlers = [
  http.post("/api/v1/summaries", () => {
    return HttpResponse.json({ job_id: "mock-job-id", document_id: "mock-doc-id" })
  }),
  http.get("/api/v1/jobs/:jobId/stream", () => {
    // MSW doesn't support SSE natively — test SSE hooks separately
    return HttpResponse.json({ status: "complete", result_id: "mock-result-id" })
  }),
]
```

`src/tests/mocks/server.ts`:
```typescript
import { setupServer } from "msw/node"
import { handlers } from "./handlers"

export const server = setupServer(...handlers)
```

### Testing Components

```typescript
// src/tests/features/quiz/quiz-runner.test.tsx
import { render, screen, fireEvent } from "@testing-library/react"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { QuizRunner } from "@/components/features/quiz/quiz-runner"

const mockQuiz = {
  id: "quiz-1",
  questions: [
    {
      id: "q1",
      type: "mcq",
      question: "What is osmosis?",
      options: ["A", "B", "C", "D"],
      correct_answer: "A",
      topic: "Biology",
    }
  ]
}

function wrapper({ children }: { children: React.ReactNode }) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } }
  })
  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
}

test("renders first question", () => {
  render(<QuizRunner quiz={mockQuiz} />, { wrapper })
  expect(screen.getByText("What is osmosis?")).toBeInTheDocument()
})

test("shows options for MCQ", () => {
  render(<QuizRunner quiz={mockQuiz} />, { wrapper })
  expect(screen.getByText("A")).toBeInTheDocument()
  expect(screen.getByText("B")).toBeInTheDocument()
})

test("submit button disabled until answer selected", () => {
  render(<QuizRunner quiz={mockQuiz} />, { wrapper })
  const submitButton = screen.getByRole("button", { name: /submit/i })
  expect(submitButton).toBeDisabled()

  fireEvent.click(screen.getByText("A"))
  expect(submitButton).not.toBeDisabled()
})
```

### Testing Server Actions

Server Actions run in Node.js context — test with Vitest (not jsdom):

```typescript
// src/tests/actions/preferences.test.ts
// @vitest-environment node
import { saveOutputFormat } from "@/db/actions/preferences"

vi.mock("@/lib/auth", () => ({
  auth: vi.fn().mockResolvedValue({ user: { id: "user-1" } })
}))

vi.mock("@/db", () => ({
  db: {
    insert: vi.fn().mockReturnThis(),
    values: vi.fn().mockReturnThis(),
    onConflictDoUpdate: vi.fn().mockResolvedValue(undefined),
  }
}))

vi.mock("next/navigation", () => ({
  redirect: vi.fn()
}))

test("saves format preference", async () => {
  await saveOutputFormat("bullet")
  // Verify db.insert was called with correct values
  expect(db.insert).toHaveBeenCalled()
})

test("throws on invalid format", async () => {
  await expect(saveOutputFormat("invalid" as any)).rejects.toThrow()
})
```

---

## Running Tests

```bash
# Backend — all tests
cd backend && pytest

# Backend — specific file
pytest tests/test_quota_service.py

# Backend — with coverage
pytest --cov=app --cov-report=term-missing

# Backend — only integration tests (real Gemini calls)
pytest -m integration

# Frontend — watch mode
cd frontend && npm run test

# Frontend — single run with coverage
npm run test:coverage
```

## Marking Integration Tests

```python
# Mark tests that make real Gemini API calls
@pytest.mark.integration
async def test_summary_chain_real_gemini():
    ...
```

Run only unit tests (default in CI):
```bash
pytest -m "not integration"
```

Run integration tests manually before major releases:
```bash
pytest -m integration
```
