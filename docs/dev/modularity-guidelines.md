# Modularity Guidelines

> These guidelines exist to minimize context debt, enable AI-assisted development, and prevent technical debt from accumulating. Every module should be understandable in isolation.

---

## Core Principle

**Each module has one job, one owner, and one interface.**

When an AI agent or developer opens a file, they should know in 10 seconds:
- What this module does
- What it depends on
- What calls it

---

## Backend Modules

### Layer Responsibilities

```
routes/     → HTTP in, HTTP out. Validate, call service, return.
services/   → Business logic. Orchestrate. Call chains, DB, storage.
chains/     → LangChain pipelines. Prompt → LLM → structured output.
workers/    → ARQ job definitions. Call services, emit SSE progress.
db/models   → SQLAlchemy ORM models. Schema only, no logic.
storage/    → R2 client. File operations only.
core/       → Config, security, shared utilities.
```

### The Dependency Rule

Dependencies only flow downward:

```
routes → services → chains
routes → services → db/models
routes → services → storage
workers → services (same as routes)
```

**Never:**
- A chain importing from a service
- A model importing from a service
- A route containing business logic
- A service calling another service (use orchestration in workers instead)

### One File Per Feature

Each feature gets its own service file, chain file, and route file.

```
summary_service.py   ← all summary business logic
summary_chain.py     ← LangChain summary pipeline
routes/summaries.py  ← summary HTTP endpoints
```

Adding a new feature means adding new files, not editing existing ones (Open/Closed principle).

### Service Interface Pattern

Every service method follows this signature pattern:

```python
async def create_summary(
    document_id: UUID,
    user_id: UUID,
    db: AsyncSession,
) -> Job:
    """
    Enqueues a summary generation job.
    Returns the Job record for SSE tracking.
    Raises: QuotaExceededException, DocumentNotReadyException
    """
```

- Input: IDs and db session (never full ORM objects across service boundaries)
- Output: a result type or a Job (for async operations)
- Exceptions: documented and specific, never generic Exception

### Chain Interface Pattern

Every chain follows this pattern:

```python
class SummaryChain:
    def __init__(self, llm: ChatGoogleGenerativeAI):
        self.llm = llm
        self.chain = self._build()

    def _build(self) -> Runnable:
        # Chain construction here

    async def run(
        self,
        chunks: list[str],
        output_format: str,
    ) -> SummaryOutput:
        """
        Runs the summary pipeline on provided chunks.
        Never touches the database.
        Never fetches chunks itself.
        """
```

Chains receive data, they don't fetch it. Services fetch chunks and pass them to chains.

### Quota Dependency

Quota enforcement is a FastAPI dependency, not a service call inside business logic:

```python
# routes/summaries.py
@router.post("/summaries")
async def create_summary(
    body: SummaryRequest,
    current_user: User = Depends(get_current_user),
    _: None = Depends(enforce_quota("summaries")),  # ← quota as dependency
    db: AsyncSession = Depends(get_db),
):
    return await summary_service.create_summary(...)
```

This means quota is applied uniformly at the route level and is never accidentally skipped inside a service.

---

## Frontend Modules

### Layer Responsibilities

```
app/(app)/[page]/page.tsx   → Server Component. Fetch + render. No interactivity.
app/(app)/[page]/           → Co-located components for that route only.
components/features/[feat]/ → Reusable feature components (quiz UI, chat, etc.)
components/ui/              → shadcn primitives only. No business logic.
hooks/                      → React Query hooks. One hook per data concern.
db/                         → Drizzle queries. Called from Server Actions only.
lib/api-client.ts           → openapi-fetch instance. No logic, just the client.
```

### Server Component vs Client Component Rule

**Default to Server Component.** Add `"use client"` only when you need:
- `useState` or `useReducer`
- `useEffect`
- Browser APIs
- Event handlers
- React Query

If a component fetches data and renders it with no interactivity → Server Component.  
If a component has any state or user interaction → Client Component.

### Server Action Pattern

```typescript
// db/actions/preferences.ts
"use server"

import { auth } from "@/lib/auth"
import { db } from "@/db"
import { userPreferences } from "@/db/schema"

export async function saveOutputFormat(format: OutputFormat) {
  const session = await auth()
  if (!session?.user?.id) throw new Error("Unauthorized")

  await db
    .insert(userPreferences)
    .values({ userId: session.user.id, outputFormat: format })
    .onConflictDoUpdate({
      target: userPreferences.userId,
      set: { outputFormat: format },
    })
}
```

Rules:
- Always verify session at the top
- Always scope writes by `session.user.id`
- Never accept `userId` as a parameter from the client
- One file per domain (preferences, documents, quiz-attempts, etc.)

### React Query Hook Pattern

```typescript
// hooks/use-document-status.ts
export function useDocumentStatus(jobId: string) {
  return useQuery({
    queryKey: ["job", jobId],
    queryFn: () => fetchJobStatus(jobId),
    refetchInterval: (query) =>
      query.state.data?.status === "complete" ? false : 2000,
    enabled: !!jobId,
  })
}
```

One hook per data concern. Hooks don't contain JSX. Components don't contain fetch logic.

### Feature Component Structure

Each feature directory is self-contained:

```
components/features/quiz/
├── quiz-question.tsx      ← single question display
├── quiz-runner.tsx        ← orchestrates question flow
├── quiz-results.tsx       ← score + breakdown display
├── quiz-skeleton.tsx      ← loading state
└── index.ts               ← re-exports only
```

Import from the index, not from individual files:
```typescript
import { QuizRunner, QuizResults } from "@/components/features/quiz"
```

---

## Cross-Cutting Concerns

### Error Handling

**Backend:** All domain errors are typed exceptions. Routes catch them and return structured error responses (see [`master-spec.md`](./master-spec.md#error-response-schema)).

```python
# core/exceptions.py — all custom exceptions defined here
class QuotaExceededException(Exception): ...
class DocumentNotReadyException(Exception): ...
class GenerationFailedException(Exception): ...

# main.py — exception handlers registered once
@app.exception_handler(QuotaExceededException)
async def quota_handler(request, exc):
    return JSONResponse(status_code=429, content={...})
```

**Frontend:** Error boundaries wrap feature sections. React Query error states are handled per-hook. Never let an unhandled promise rejection reach the user silently.

### Logging

**Backend:** Every service method logs at entry and exit with `user_id` and relevant IDs. Every chain logs token usage. Every ARQ job logs duration.

```python
logger.info("summary.start", user_id=str(user_id), document_id=str(document_id))
# ... work ...
logger.info("summary.complete", user_id=str(user_id), tokens_used=usage.total_tokens, duration_ms=elapsed)
```

**Frontend:** Sentry captures unhandled errors with user context. No `console.log` in production.

### Type Safety

- Backend: Pydantic v2 models for all request/response shapes. No `dict` passing between layers.
- Frontend: `src/types/api.ts` is the generated contract. Never type API responses manually.
- Drizzle schema file is the source of types for all CRUD operations.

---

## Adding a New Feature

Follow this checklist to add any new AI-powered feature to Clarift:

1. **Write the Alembic migration** if new tables or columns are needed. Update Drizzle schema in the same commit.
2. **Define the Pydantic request/response models** in a new file `app/api/v1/schemas/[feature].py`
3. **Write the chain** in `app/chains/[feature]_chain.py`. It receives data, doesn't fetch it.
4. **Write the service** in `app/services/[feature]_service.py`. It fetches chunks, calls chain, enqueues job, writes results.
5. **Write the ARQ job** in `app/workers/[feature]_worker.py` if the feature is async.
6. **Write the route** in `app/api/v1/routes/[feature].py`. Attach quota dependency if it's a metered feature.
7. **Run `pnpm run generate:api`** in frontend to update the type contract.
8. **Write the React Query hook** in `frontend/src/hooks/use-[feature].ts`.
9. **Write the Server Action** if there are any CRUD writes (Drizzle).
10. **Build the UI components** in `components/features/[feature]/`.
11. **Write tests**: `pytest` for service and chain, `vitest` for components.

This sequence is deliberately ordered. Types and contracts before UI. Logic before presentation.

---

## What AI Agents Must Never Do

These patterns introduce technical debt that is hard to undo:

- ❌ Add business logic to a route handler
- ❌ Call a chain directly from a route (must go through service)
- ❌ Write a DB query in a component or hook (must use Server Action or API)
- ❌ Accept `userId` as a body/query parameter from the client in any Server Action
- ❌ Move quota enforcement to Next.js
- ❌ Run `drizzle-kit push` or `drizzle-kit generate` in production
- ❌ Edit `src/types/api.ts` manually
- ❌ Pass the full document content to an LLM (always use retrieved chunks)
- ❌ Perform vector search without `user_id` filter
- ❌ Add a Gemini call without tenacity retry wrapper
- Never hardcode colors — always use CSS variables from design.md or Tailwind brand tokens
- Never design desktop-first — always start at 390px mobile width
- Never use red for weak areas — amber only. Red is for errors.
