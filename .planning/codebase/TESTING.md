# Testing Patterns

**Analysis Date:** 2026-04-12

## Test Framework

**Backend:**
- Runner: pytest with pytest-asyncio
- Config: `backend/pyproject.toml` (per `docs/dev/stack-setup.md` convention)
- Assertion library: built-in pytest assertions
- Key plugins: `pytest-asyncio` (auto mode), `pytest-cov`, `factory-boy`
- Run commands:
```bash
cd backend
uv run pytest                          # Run all tests
uv run pytest tests/path/to/test_file.py  # Single file
uv run pytest tests/path/to/test_file.py -k "case_name"  # Single case
uv run pytest --cov=app --cov-report=term-missing  # Coverage
uv run pytest -m "not integration"     # Unit tests only (CI default)
uv run pytest -m integration           # Integration tests (real Gemini calls)
```
- Source: `docs/dev/testing-strategy.md`, `docs/dev/stack-setup.md`

**Frontend:**
- Runner: Vitest (planned per docs, not yet configured in current codebase)
- Assertion library: Vitest globals + `@testing-library/react`
- Config: `vitest.config.ts` (planned, not yet present)
- Run commands (planned):
```bash
cd frontend
pnpm test                    # Watch mode (vitest)
pnpm test:run                # Single run (vitest run)
pnpm test:coverage           # Coverage (vitest run --coverage)
```
- **Current state:** No test runner is configured in `frontend/package.json`. No test files exist.
- Source: `frontend/package.json` (no test scripts), `docs/dev/testing-strategy.md`

## Test File Organization

**Backend:**
- Location: `backend/tests/` directory (separate from `app/`)
- Naming: `test_[module_name].py` (e.g., `test_quota_service.py`, `test_summary_chain.py`)
- Structure:
```
backend/
├── app/
│   ├── services/
│   ├── chains/
│   └── workers/
└── tests/
    ├── conftest.py          # Shared fixtures
    ├── factories.py         # factory-boy factories
    ├── test_quota_service.py
    ├── test_summary_chain.py
    ├── test_sse.py
    └── test_workers.py
```
- Source: `docs/dev/testing-strategy.md`

**Frontend:**
- Location: `frontend/src/tests/` (co-located under `src/`)
- Naming: `[feature-name].test.tsx` for components, `[feature-name].test.ts` for actions
- Structure (planned):
```
frontend/src/
├── tests/
│   ├── setup.ts             # Vitest setup (server, cleanup)
│   ├── mocks/
│   │   ├── handlers.ts      # MSW request handlers
│   │   └── server.ts        # MSW server setup
│   ├── features/
│   │   └── quiz/
│   │       └── quiz-runner.test.tsx
│   └── actions/
│       └── preferences.test.ts
```
- **Current state:** No test directory or files exist in frontend.
- Source: `docs/dev/testing-strategy.md`

## Test Structure

**Backend Service Tests:**
```python
# tests/test_quota_service.py
import pytest
from app.services.quota_service import enforce_quota
from app.core.exceptions import QuotaExceededException
from tests.factories import UserFactory, UserUsageFactory

async def test_quota_blocks_at_limit(db):
    user = UserFactory.build(tier="free")
    usage = UserUsageFactory.build(user_id=user.id, summaries_used=3)
    db.add(user)
    db.add(usage)
    await db.commit()

    with pytest.raises(QuotaExceededException) as exc_info:
        await enforce_quota("summaries", user, db)

    assert exc_info.value.used == 3
    assert exc_info.value.limit == 3
```
- Pattern: arrange (factory + db) → act (call service) → assert (exception or state)
- Uses in-memory SQLite — no Neon dependency
- Source: `docs/dev/testing-strategy.md`

**Backend Chain Tests:**
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
```
- Pattern: mock LLM → construct chain → call run → assert output structure
- Never assert exact LLM output text — assert structure validity
- Source: `docs/dev/testing-strategy.md`

**Frontend Component Tests (planned):**
```typescript
// src/tests/features/quiz/quiz-runner.test.tsx
import { render, screen, fireEvent } from "@testing-library/react"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { QuizRunner } from "@/components/features/quiz/quiz-runner"

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
```
- Pattern: wrap with QueryClientProvider → render → assert DOM
- Source: `docs/dev/testing-strategy.md`

**Frontend Server Action Tests (planned):**
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

test("saves format preference", async () => {
  await saveOutputFormat("bullet")
  expect(db.insert).toHaveBeenCalled()
})
```
- Pattern: `@vitest-environment node` → vi.mock dependencies → call action → assert mock calls
- Source: `docs/dev/testing-strategy.md`

## Mocking

**Backend:**
- Framework: `unittest.mock` (AsyncMock, patch, MagicMock)
- What to mock:
  - Gemini/LLM calls in chain unit tests (`ChatGoogleGenerativeAI`)
  - External services (R2, Redis, PDF extraction)
  - Dependencies in worker tests
- What NOT to mock:
  - Database (use in-memory SQLite via test fixtures)
  - Service-to-chain calls in integration tests
- Pattern:
```python
with patch("app.workers.document_worker.extract_pdf_text") as mock_extract, \
     patch("app.workers.document_worker.generate_embeddings") as mock_embed:
    mock_extract.return_value = "Study notes content..."
    mock_embed.return_value = [[0.1] * 768]
```
- Source: `docs/dev/testing-strategy.md`

**Frontend:**
- Framework: MSW (Mock Service Worker) for API mocking, `vi.mock` for module mocking
- MSW handlers in `src/tests/mocks/handlers.ts`
- What to mock:
  - Backend API responses (via MSW)
  - Auth session (via vi.mock)
  - Drizzle client (via vi.mock)
  - `next/navigation` (redirect, useRouter)
- What NOT to mock:
  - React component behavior
  - User interactions (use real fireEvent/userEvent)
- Source: `docs/dev/testing-strategy.md`

## Fixtures and Factories

**Backend:**
- Framework: factory-boy
- Location: `backend/tests/factories.py`
- Pattern:
```python
class UserFactory(factory.Factory):
    class Meta:
        model = User

    id = factory.LazyFunction(uuid4)
    email = factory.Sequence(lambda n: f"user{n}@test.com")
    name = factory.Sequence(lambda n: f"User {n}")
    tier = "free"
    created_at = factory.LazyFunction(datetime.utcnow)
```
- Factories defined for: `UserFactory`, `DocumentFactory`, `UserUsageFactory`
- Use `.build()` for in-memory objects (not persisted), `.create()` for DB-persisted
- Source: `docs/dev/testing-strategy.md`

**Backend conftest.py fixtures:**
- `event_loop_policy` — pytest-asyncio policy
- `db` — in-memory SQLite session, creates/drops tables per test
- `client` — AsyncClient with dependency overrides for testing
- `auth_user` — builds user and overrides `get_current_user` dependency
- Source: `docs/dev/testing-strategy.md`

**Frontend:**
- Test data: inline mock objects in test files (e.g., `mockQuiz`)
- No factory framework planned
- Source: `docs/dev/testing-strategy.md`

## Coverage

**Backend:**
- Tool: pytest-cov
- Target: Not explicitly enforced in config
- View coverage:
```bash
cd backend
uv run pytest --cov=app --cov-report=term-missing
```
- Source: `docs/dev/testing-strategy.md`

**Frontend:**
- Tool: Vitest coverage (planned)
- Target: None enforced
- View coverage:
```bash
cd frontend
pnpm test:coverage
```
- **Current state:** Coverage not configured — no test runner present.
- Source: `docs/dev/testing-strategy.md`

## Test Types

**Unit Tests:**
- Backend: Services tested directly (no HTTP), chains with mocked LLM, workers with mocked dependencies
- Frontend: Components with mocked API (MSW), Server Actions with mocked auth/DB
- Default in CI: `pytest -m "not integration"`
- Source: `docs/dev/testing-strategy.md`

**Integration Tests:**
- Backend: Marked with `@pytest.mark.integration`
- Make real Gemini API calls
- Run manually before major releases: `pytest -m integration`
- Source: `docs/dev/testing-strategy.md`

**E2E Tests:**
- Not used. No Playwright, Cypress, or similar framework configured.
- AGENTS.md gap: "Frontend E2E command: none evidenced."
- Source: `AGENTS.md`, `docs/dev/testing-strategy.md`

## Common Patterns

**Async Testing (Backend):**
```python
async def test_quota_increments(db):
    user = UserFactory.build(tier="free")
    usage = UserUsageFactory.build(user_id=user.id, summaries_used=0)
    db.add(user)
    db.add(usage)
    await db.commit()

    await enforce_quota("summaries", user, db)

    await db.refresh(usage)
    assert usage.summaries_used == 1
```
- All test functions are `async def`
- pytest-asyncio in `auto` mode — no `@pytest.mark.asyncio` decorator needed
- Source: `docs/dev/testing-strategy.md`, `docs/dev/stack-setup.md`

**Error Testing (Backend):**
```python
async def test_quota_blocks_at_limit(db):
    # ... arrange ...
    with pytest.raises(QuotaExceededException) as exc_info:
        await enforce_quota("summaries", user, db)

    assert exc_info.value.used == 3
    assert exc_info.value.limit == 3
```
- Pattern: `pytest.raises` with typed exception, assert exception attributes
- Source: `docs/dev/testing-strategy.md`

**Error Testing (Frontend, planned):**
```typescript
test("throws on invalid format", async () => {
  await expect(saveOutputFormat("invalid" as any)).rejects.toThrow()
})
```
- Pattern: `await expect(fn).rejects.toThrow()`
- Source: `docs/dev/testing-strategy.md`

**Race Condition Testing (Backend):**
```python
async def test_quota_race_condition(db):
    import asyncio
    # ... arrange at limit ...
    results = await asyncio.gather(
        enforce_quota("summaries", user, db),
        enforce_quota("summaries", user, db),
        return_exceptions=True
    )
    exceptions = [r for r in results if isinstance(r, QuotaExceededException)]
    assert len(exceptions) == 1
```
- Pattern: `asyncio.gather` with `return_exceptions=True`, count expected outcomes
- Source: `docs/dev/testing-strategy.md`

**SSE Testing (Backend):**
```python
async def test_job_stream_emits_progress(client, auth_user, db):
    events = []
    async with client.stream("GET", f"/api/v1/jobs/{job.id}/stream") as response:
        assert response.headers["content-type"] == "text/event-stream; charset=utf-8"
        async for line in response.aiter_lines():
            if line.startswith("data:"):
                events.append(line[5:].strip())
            if len(events) >= 1:
                break
    assert len(events) >= 1
```
- Pattern: `client.stream()` with `aiter_lines()`, collect `data:` prefixed lines
- Source: `docs/dev/testing-strategy.md`

## What Must Be Tested (per strategy)

- Every service method (happy path + main error cases)
- Every chain (output structure validity, not exact text)
- Quota enforcement (including race condition prevention)
- Auth scoping (user cannot access another user's data)
- SSE event emission sequence

## What Does Not Need Tests (MVP)

- Route handlers (thin — services are tested)
- Drizzle schema (Neon validates at migration time)
- shadcn/ui primitive components
- Source: `docs/dev/testing-strategy.md`

---

*Testing analysis: 2026-04-12*
