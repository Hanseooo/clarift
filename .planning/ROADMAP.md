# Roadmap: Clarift MVP

This roadmap is based directly on the 3-week `implementation-plan.md`.

## Phase 1: Backend Foundation
**Goal:** Full async backend running locally. Every endpoint exists. Core loop works end-to-end (even if slowly).

### 1.1 Project Skeleton + Infra
- **Backend:** Monorepo init, FastAPI app setup (health check, CORS, error handling, Sentry, Pydantic config, SQLAlchemy async session, Alembic migrations for full production schema, Neon DB + pgvector, R2 client, Upstash Redis ARQ worker, Gemini API key).
- **Frontend:** Next.js 15 init (TypeScript, Tailwind 4, shadcn/ui, Biome, design tokens).

### 1.2 Auth + User Sync
- **Backend:** `POST /auth/sync`, `GET /auth/me`, JWT verification dependency, `get_current_user`.
- **Frontend:** NextAuth v5 (Google OAuth), login UI, auth middleware, `openapi-fetch` API client setup.

### 1.3 Document Upload + ARQ Pipeline
- **Backend:** `POST /documents/upload` (validate, R2 store, enqueue job, return IDs), ARQ `process_document` job (extract text, chunk, embed, pgvector store), `GET /jobs/{job_id}/stream` (SSE progress).
- **Frontend:** Document upload UI, drag-and-drop, SSE hook, document list page.

### 1.4 Summary Chain + Quota
- **Backend:** `summary_chain.py` (5-step LangChain chain), `summary_service.py` (ARQ job enqueue), `POST /summaries` (validate, quota, enqueue), `GET /summaries/{document_id}`, `quota_service.py` (transactional check-and-increment), quota wired as dependency.
- **Frontend:** Wire upload to request summary to SSE progress.

## Phase 2: Core Loop Completion
**Goal:** Complete learning loop working end-to-end. Every AI feature operational.

### 2.1 Quiz Generation + Attempts
- **Backend:** `quiz_chain.py` (extract facts, generate questions, validate JSON), `POST /quizzes` (quota, enqueue), `GET /quizzes/{id}`, `POST /quizzes/{id}/attempt` (score, update `user_topic_performance`).
- **Frontend:** Quiz UI (questions, options, submit), score reveal screen (topic breakdown), API wiring.

### 2.2 Weak Areas + Targeted Practice
- **Backend:** `GET /practice/weak-areas` (query `user_topic_performance` for attempts >= 5 AND accuracy < 70% AND quiz_count >= 2), `practice_chain.py` (weak topic chunks, focused drills, progressive difficulty), `POST /practice`, `GET /practice/{id}`.
- **Frontend:** Weak areas display (accuracy meters), practice session UI (drill flow, submission), API wiring.

### 2.3 Grounded Chat
- **Backend:** `POST /chat` (SSE streaming, top 5 chunks scoped to user_id + doc_ids, Gemini Flash Lite, strict prompt, citations, fallback string).
- **Frontend:** Chat UI (message input, streaming response, document selector, citations).

### 2.4 Integration + E2E Testing
- **Backend:** Full loop smoke test, quota enforcement verification, error states verification, pytest suite, SSE events verification.
- **Frontend:** All pages wired to API (remove mocks), error state UI, loading/empty states.

## Phase 3: Polish + Payments + Deploy
**Goal:** Production-ready MVP.

### 3.1 Payments + Onboarding
- **Backend:** PayMongo integration, `POST /api/webhooks/paymongo` (verify signature, update `users.tier`), `GET /api/v1/usage` (quota display), rate limiting (slowapi).
- **Frontend:** Pricing/upgrade page, PayMongo checkout, onboarding UI (format preference, Drizzle Server Action to `user_preferences`), usage meters, settings page.

### 3.2 Error Handling + Edge Cases
- **Backend:** Gemini timeout messaging, file upload failures (R2 error cleanup), ARQ job retries (2 with backoff), failed document status messages, Sentry capturing unhandled exceptions, token usage logging.
- **Frontend:** Toast notifications for errors, empty states, retry UI for failed docs.

### 3.3 QA + Deployment
- **Testing:** Real PDFs, quota testing, Pro upgrade testing, large PDFs, mobile responsive verification.
- **Deployment:** Vercel (frontend), Railway (FastAPI web + ARQ worker Dockerfile), Alembic migration against Neon prod, env vars configured, production smoke test.