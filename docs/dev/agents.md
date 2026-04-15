# Agents

> This document is the entry point for AI coding agents (OpenCode, Claude, etc.) working on Clarift.  
> Read this first. Then read the referenced documents before writing any code.

---

## What is Clarift?

An AI-powered study engine for Filipino students. It processes uploaded study material (PDFs, images, text) and generates structured summaries, quizzes, and targeted practice through a multi-step AI pipeline.

**The core learning loop:** Ingest → Structure → Evaluate → Diagnose → Remediate

Full context: [`project-context.md`](./project-context.md)

---

## Document Map

Read these in order before starting any task:

| Document | Read When |
|---|---|
| [`mvp-scope.md`](./mvp-scope.md) | **Always first** — defines exact MVP boundary, settings, quota limits |
| [`project-context.md`](./project-context.md) | Always — understand the product |
| [`architecture.md`](./architecture.md) | Always — understand the system |
| [`master-spec.md`](./master-spec.md) | Always — stack, schema, API contract |
| [`decisions.md`](./decisions.md) | Before making any architectural choice |
| [`modularity-guidelines.md`](./modularity-guidelines.md) | Before writing any code |
| [`implementation-plan.md`](./implementation-plan.md) | To understand current progress and priorities |
| [`stack-setup.md`](./stack-setup.md) | Setting up the project from scratch |
| [`drizzle-schema.md`](./drizzle-schema.md) | Before writing any Drizzle query or Server Action |
| [`testing-strategy.md`](./testing-strategy.md) | Before writing any test |
| [`design.md`](./design.md) | Before building any UI component — colors, typography, spacing, all component specs |
| [`21st-dev-reference.md`](./21st-dev-reference.md) | When sourcing components from 21st.dev — which to use, how to adapt, quality bar |
| [`roadmap.md`](./roadmap.md) | Before building anything — check it's in MVP scope |
| `features/[feature].md` | When working on a specific feature |

---

## Stack at a Glance

**Frontend:** Next.js 15 (App Router) + TypeScript + Tailwind 4 + shadcn/ui  
**Frontend DB:** Drizzle ORM → Neon PostgreSQL (CRUD only, no AI logic)  
**Frontend Auth:** NextAuth v5 (Google OAuth)  
**Backend:** FastAPI (async) + Python  
**Backend DB:** SQLAlchemy async + Alembic → Neon PostgreSQL (AI writes)  
**AI:** LangChain + Gemini 2.5 Flash (chains), Gemini Flash Lite (chat)  
**Queue:** ARQ (async Redis queue via Upstash)  
**Jobs:** SSE for real-time progress  
**Storage:** Cloudflare R2 (S3-compatible)  
**Type Contract:** openapi-typescript generates `src/types/api.ts` from FastAPI's `/openapi.json`

---

## Absolute Rules

These are non-negotiable. Violating them introduces bugs or technical debt that is expensive to fix.

### Backend Rules

1. **Routes call services. Services call chains. Never skip a layer.**
   - Route → Service → Chain. No exceptions.
   - Business logic in routes = bug waiting to happen.

2. **Quota enforcement is a FastAPI dependency on the route, never inside a service.**
   ```python
   @router.post("/summaries")
   async def create_summary(
       _: None = Depends(enforce_quota("summaries")),  # ← here
       ...
   ```

3. **All vector queries must filter by user_id before similarity search.**
   ```python
   # CORRECT
   WHERE user_id = :user_id ORDER BY embedding <=> :vec LIMIT 5
   # WRONG — security issue
   ORDER BY embedding <=> :vec LIMIT 5
   ```

4. **Never pass full document content to an LLM.** Always use retrieved chunks (max 5).

5. **All Gemini calls use tenacity retry.**
   ```python
   @retry(stop=stop_after_attempt(3), wait=wait_exponential(min=2, max=10))
   async def call_gemini(...):
   ```

6. **Alembic owns all migrations.** Never use `drizzle-kit push` or `drizzle-kit generate` in production.

7. **Chains never touch the database.** Services fetch chunks and pass them to chains.

### Frontend Rules

8. **Never write a database query in a component.** Queries go in Server Actions (writes) or Server Component page files (reads).

9. **Never accept userId as a parameter in a Server Action.** Always read it from the session.
   ```typescript
   // WRONG
   export async function savePreference(userId: string, format: string) {}
   // CORRECT
   export async function savePreference(format: string) {
     const session = await auth()
     const userId = session.user.id // from session, always
   ```

10. **Never manually edit `src/types/api.ts`.** It is generated. Run `npm run generate:api` after backend changes.

11. **Default to Server Components.** Add `"use client"` only when you need state, effects, or event handlers.

12. **Quota display only in Next.js.** Quota enforcement only in FastAPI.

### Design Rules

13. **Read `design.md` before building any UI component.** Colors, spacing, component specs, and animation rules are all defined there. Do not invent UI patterns.

14. **Never use a 21st.dev component without replacing its hardcoded colors.** Always swap to brand tokens. See [`21st-dev-reference.md`](./21st-dev-reference.md) for the full adaptation checklist.

15. **Never place a 21st.dev component in `components/ui/`.** That directory is for shadcn primitives only. Feature-specific components go in `components/features/[feature]/`.

16. **Never use plain text option buttons for quiz questions.** Always use the letter-badge variant (A/B/C/D box + text) as specified in `design.md`.

17. **Never show chat waiting state as blank or "...".** Always render the three-dot pulse animation with "Searching your notes..." label.

18. **Never use red for weak area display.** Amber only. Red is for wrong answers and errors only.

---

## Common Tasks

### Adding a New API Endpoint

1. Define Pydantic request/response models in `app/api/v1/schemas/`
2. Write route in `app/api/v1/routes/[feature].py`
3. Write service method in `app/services/[feature]_service.py`
4. Write chain in `app/chains/[feature]_chain.py` if AI is involved
5. Add quota dependency if metered: `Depends(enforce_quota("feature_name"))`
6. Run `npm run generate:api` in frontend
7. Update the Drizzle schema if new tables were added via Alembic migration

### Adding a New Page

1. Create `app/(app)/[route]/page.tsx` as a Server Component
2. Fetch data via Drizzle directly in the page (or via FastAPI API client for AI data)
3. Extract interactive parts into Client Components in the same directory
4. Create React Query hooks in `hooks/` for any client-side data needs

### Adding a New Database Table

1. Write Alembic migration: `alembic revision --autogenerate -m "add_table_name"`
2. Review the generated migration — never trust autogenerate blindly
3. Update `frontend/src/db/schema.ts` to match the new table
4. Never use `drizzle-kit generate` or `drizzle-kit push` — only Alembic runs migrations

### Debugging a Failing AI Chain

1. Check Sentry for the exact exception and stack trace
2. Check logs for `tokens_used` and `duration_ms` — is it timing out?
3. Check if tenacity is retrying — look for retry log entries
4. Isolate the failing step by running the chain with `verbose=True` in LangChain
5. Check if the pgvector query is returning relevant chunks (log chunk content)

---

## File Naming Conventions

### Backend (Python)
- Files: `snake_case.py`
- Classes: `PascalCase`
- Functions: `snake_case`
- Constants: `UPPER_SNAKE_CASE`
- Test files: `test_[module_name].py`

### Frontend (TypeScript)
- Component files: `kebab-case.tsx`
- Non-component files: `kebab-case.ts`
- Components: `PascalCase`
- Hooks: `use-kebab-case.ts`, exported as `useHookName`
- Server Actions: `kebab-case.ts` in `db/actions/`

---

## Environment Setup

```bash
# Backend
cd backend
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
# Fill in .env values
alembic upgrade head
uvicorn app.main:app --reload

# ARQ Worker (separate terminal)
arq app.workers.WorkerSettings

# Frontend
cd frontend
npm install
cp .env.example .env.local
# Fill in .env.local values
npm run generate:api  # generate types from running backend
npm run dev
```

---

## Testing

```bash
# Backend
pytest                          # all tests
pytest tests/test_summary.py    # specific test file
pytest -k "test_quota"          # tests matching pattern
pytest --cov=app --cov-report=term-missing

# Frontend
npm run test                    # vitest watch mode
npm run test:run                # single run
npm run test:coverage
```

---

## What "Done" Means for Any Task

A task is done when:
- [ ] Code is written and follows the layer pattern (route → service → chain)
- [ ] All Gemini calls have tenacity retry
- [ ] All vector queries are user-scoped
- [ ] A pytest or vitest test covers the happy path
- [ ] A test covers the main error case (quota exceeded, not found, etc.)
- [ ] If a new endpoint was added: `npm run generate:api` was run
- [ ] If a new table was added: both Alembic migration and Drizzle schema are updated
- [ ] No `console.log` or `print()` left in production code paths
- [ ] Ruff and Biome pass with no errors

---

## Current Phase

**MVP — Phase 1**

The exact MVP feature list is in [`mvp-scope.md`](./mvp-scope.md). Read it before building anything.

Priority order for implementation:
1. Auth + user sync
2. Onboarding (all three settings)
3. Document upload + async processing pipeline
4. Global settings + per-generation override resolution
5. Structured summary + MermaidJS diagram (Step 6)
6. Quiz generation + attempts
7. Weak area detection + targeted practice
8. Grounded chat
9. Quota system (daily reset)
10. Payments (PayMongo)

Do not build Phase 2+ features (spaced repetition, flashcards, caching, multi-document synthesis) until Phase 1 is complete and validated with real users.

---

## Asking for Clarification

When a task is ambiguous, check this priority order before asking:

1. Is the answer in [`decisions.md`](./decisions.md)?
2. Is the answer in the relevant `features/[feature].md`?
3. Is the answer in [`master-spec.md`](./master-spec.md)?
4. Is the answer in [`modularity-guidelines.md`](./modularity-guidelines.md)?

If none of the above answer the question, then ask Hans.