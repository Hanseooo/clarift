# Implementation Plan

> **Timeline:** 3 weeks (target 2, Week 3 is buffer + polish)  
> **Critical path owner:** Hans (backend, architecture, integration)  
> **Team support:** UI implementation, non-critical frontend tasks  

> See [`architecture.md`](./architecture.md) for system design.  
> See [`master-spec.md`](./master-spec.md) for full stack and schema.  
> See [`features/`](./features/) for per-feature implementation details.

---

## Guiding Principles

1. **Critical path first.** The core loop (Upload → Summary → Quiz → Weak Areas → Practice) ships before auth polish, payments, or chat.
2. **Async from day one.** All heavy operations are ARQ jobs with SSE status. Never build synchronous first and refactor later.
3. **API contract on Day 1.** Share the OpenAPI spec and generate frontend types before any UI work begins. Team builds against typed mocks.
4. **Alembic owns schema.** Write the full production schema in Week 1 migrations. Add columns cheaply now, migrate painfully later.

---

## Week 1 — Backend Foundation

**Goal:** Full async backend running locally. Every endpoint exists. Core loop works end-to-end (even if slowly).

### Days 1–2: Project Skeleton + Infra

**Hans:**
- Monorepo init (`clarift/frontend`, `clarift/backend`)
- FastAPI app: health check, CORS, error handling middleware, Sentry
- Pydantic Settings config (`app/core/config.py`)
- SQLAlchemy async session factory (`app/db/session.py`)
- All Alembic migrations for full production schema (see [`master-spec.md`](./master-spec.md#database-schema))
- Neon DB provisioned, pgvector extension enabled: `CREATE EXTENSION vector`
- R2 bucket created, `app/storage/r2.py` boto3 client
- Upstash Redis connected, ARQ worker skeleton (`app/workers/document_worker.py`)
- Gemini API key verified with a raw test call
- `.env.example` with all required variables documented

**Team:**
- Next.js 15 init with TypeScript, Tailwind 4, shadcn/ui
- Biome configured
- Project folder structure per [`architecture.md`](./architecture.md#directory-structure)
- Design tokens: colors, typography, spacing established in Tailwind config

**Done when:** `GET /health` returns 200, Alembic migrations run clean, pgvector query works.

---

### Days 3–4: Auth + User Sync

**Hans:**
- `POST /api/v1/auth/sync` — upsert user, return internal user_id
- `GET /api/v1/auth/me` — return current user + tier
- JWT verification dependency (`app/core/security.py`, `app/api/v1/deps.py`)
- `get_current_user` FastAPI dependency used on all protected routes

**Team:**
- NextAuth v5 with Google OAuth provider
- `lib/auth.ts` — NextAuth config with sync callback to FastAPI
- Login page UI
- Auth middleware protecting `/app/*` routes
- `lib/api-client.ts` — openapi-fetch client with Authorization header interceptor

**Done when:** Google login works, JWT is verified by FastAPI, user row exists in DB.

---

### Day 5: Document Upload + ARQ Pipeline

**Hans:**
- `POST /api/v1/documents/upload`
  - Validate file type + size
  - Store to R2 via boto3
  - Create document row (status: pending)
  - Enqueue ARQ job
  - Return `{ document_id, job_id }` immediately
- ARQ worker: `process_document` job
  - Extract text (PyMuPDF for PDF, Gemini Vision for images)
  - Chunk with tiktoken (200–300 tokens, SHA-256 dedup)
  - Generate embeddings via Gemini embedding model
  - Store chunks in pgvector
  - Update document status to `ready`
- `GET /api/v1/jobs/{job_id}/stream` — SSE endpoint emitting progress events

**Team:**
- Document upload UI component
- File drag-and-drop with progress indicator
- SSE hook using React Query + EventSource
- Document list page (static/mocked)

**Done when:** Upload a PDF, watch SSE events, see chunks in pgvector.

---

### Days 6–7: Summary Chain + Quota

**Hans:**
- `app/chains/summary_chain.py` — 5-step LangChain chain:
  1. Retrieve top 5 chunks (pgvector cosine similarity, user_id scoped)
  2. Extract key concepts
  3. Cluster into topics
  4. Generate outline
  5. Generate formatted summary (apply output_format preference)
- `app/services/summary_service.py` — enqueues chain as ARQ job
- `POST /api/v1/summaries` — validates, enforces quota, enqueues
- `GET /api/v1/summaries/{document_id}` — returns summary
- `app/services/quota_service.py` — transactional check-and-increment
- Quota enforcement wired to summary route via dependency

**Done when:** Upload PDF → request summary → SSE progress → summary appears. Quota increments correctly.

---

## Week 2 — Core Loop Completion

**Goal:** Complete learning loop working end-to-end. Every AI feature operational.

### Days 8–9: Quiz Generation + Attempts

**Hans:**
- `app/chains/quiz_chain.py`:
  1. Retrieve relevant chunks
  2. Extract factual statements
  3. Generate questions (MCQ, T/F, fill-in) with topic tags
  4. Validate JSON consistency
- `POST /api/v1/quizzes` — quota enforced, enqueued
- `GET /api/v1/quizzes/{id}`
- `POST /api/v1/quizzes/{id}/attempt`
  - Store answers and score
  - Update `user_topic_performance` for each topic in attempt
  - Return score + per-topic breakdown

**Team:**
- Quiz UI: question flow, option selection, submit
- Score reveal screen with per-topic breakdown
- Wire to API endpoints (replace mocks)

---

### Days 10–11: Weak Areas + Targeted Practice

**Hans:**
- `GET /api/v1/practice/weak-areas`
  - Query `user_topic_performance`
  - Return topics where `attempts >= 5 AND accuracy < 70% AND quiz_count >= 2`
- `app/chains/practice_chain.py`:
  1. Select weak topic chunks
  2. Generate focused drills
  3. Progressive difficulty flag in output
- `POST /api/v1/practice` — quota enforced, enqueued
- `GET /api/v1/practice/{id}`

**Team:**
- Weak areas display (visual accuracy meters)
- Practice session UI: drill flow, answer submission
- Wire to API

---

### Day 12: Grounded Chat

**Hans:**
- `POST /api/v1/chat` — SSE streaming response
  - Retrieve max 5 chunks scoped to `user_id + document_ids[]`
  - Gemini Flash Lite with strict system prompt
  - Stream response tokens via SSE
  - If no relevant chunks: return defined fallback string
  - Each response includes cited chunk IDs

**Team:**
- Chat interface: message input, streaming response display
- Document selector (which docs to chat with)
- Citation display

---

### Days 13–14: Integration + End-to-End Testing

**Hans:**
- Full loop smoke test: upload → summary → quiz → attempt → weak areas → practice
- Quota enforcement verified across all features
- Error states verified (quota exceeded, document not ready, generation failed)
- `pytest` suite for all services and chains
- All SSE events emitting correctly

**Team:**
- All pages wired to real API (no more mocks)
- Error state UI for every screen
- Loading/empty states for every screen

---

## Week 3 — Polish + Payments + Deploy

**Goal:** Production-ready. Polished enough to show investors and real users.

### Days 15–17: Payments + Onboarding

**Hans:**
- PayMongo subscription integration
- `POST /api/webhooks/paymongo` in Next.js Route Handler
  - Verify webhook signature
  - Update `users.tier` on payment success
  - Downgrade on cancellation/failure
- Onboarding flow: capture `output_format` on first login
  - `user_preferences` row created via Drizzle Server Action
- `GET /api/v1/usage` endpoint for quota display
- Rate limiting via slowapi + Upstash

**Team:**
- Pricing/upgrade page
- PayMongo checkout flow
- Onboarding UI (format preference selection)
- Usage meters in dashboard (summaries used, quizzes used, etc.)
- Settings page

---

### Days 18–19: Error Handling + Edge Cases

**Hans:**
- All Gemini timeouts return user-facing error messages (not 500s)
- File upload failures: R2 error → clean document row deletion
- ARQ job retry configuration (2 retries with backoff)
- Document status `failed` with readable error message
- Sentry capturing all unhandled exceptions with user context
- Token usage logging per chain call (cost tracking)

**Team:**
- Toast notifications for all error states
- Empty states (no documents yet, no weak areas yet)
- Retry UI for failed document processing

---

### Days 20–21: QA + Deployment

**Hans + Team:**
- Walk every user flow with real PDFs (nursing notes, CPA reviewer, etc.)
- Test quota hitting: free tier reaches limits correctly
- Test Pro upgrade: tier updates, limits increase
- Test with large PDFs (edge case: extraction time, chunk count)
- Mobile responsive verification

**Deployment:**
- Vercel: frontend deploy (zero config)
- Railway: FastAPI `web` service (Dockerfile)
- Railway: ARQ `worker` service (same image, `arq app.workers.WorkerSettings`)
- Alembic migration against Neon production
- All env vars set in Vercel + Railway dashboards
- Smoke test on production with a real account

---

## Post-MVP Upgrade Path

These are the changes needed to activate deferred features. No refactors — only additions:

### Adding Redis Caching

In `summary_service.py`, wrap the chain call:
```python
# Before: calls chain directly
result = await summary_chain.run(...)

# After: check cache first
cache_key = f"summary:{document_id}:{format}"
cached = await redis.get(cache_key)
if cached:
    return cached
result = await summary_chain.run(...)
await redis.setex(cache_key, 86400, result)
```

Routes and chains unchanged.

### Making Upload Fully Async (already is)

Already built this way. The synchronous path was never taken.

### Adding Token-Based Credits

In `quota_service.py`, add `tokens_used` column tracking alongside count. The transactional pattern is already correct — just extend what's being counted.

### Adding Magic Link Auth

Add Resend provider to NextAuth config. No FastAPI changes needed.

---

## Daily Standup Format

Keep it tight. Each session:
1. What did I ship yesterday?
2. What am I building today?
3. Any blockers?

The API contract (`/openapi.json`) is the coordination point between Hans and the team. If Hans adds or changes an endpoint, run `npm run generate:api` in frontend and communicate the change.
