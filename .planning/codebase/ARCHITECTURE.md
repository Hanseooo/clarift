# Architecture

**Analysis Date:** 2026-04-12

## Pattern Overview

**Overall:** Split architecture with two distinct server-side layers sharing a single Neon PostgreSQL database.

**Key Characteristics:**
- Next.js handles UI, CRUD, and auth via Server Components + Server Actions + Drizzle ORM
- FastAPI handles AI pipelines, job queueing, file storage, and quota enforcement via SQLAlchemy async
- Strict layer separation: Route → Service → Chain (backend), Server Component → Drizzle (frontend)
- Single database, dual ORM access — Alembic owns migrations, Drizzle is query-only
- Async job processing via ARQ worker with SSE progress streaming to clients

## Layers

### Next.js Layer (Frontend)
- Purpose: UI rendering, CRUD operations, auth session management, quota display
- Location: `frontend/src/`
- Contains: Server Components, Server Actions, React Query hooks, shadcn/ui components
- Depends on: Drizzle ORM → Neon PostgreSQL, NextAuth v5, FastAPI API (for AI data)
- Used by: Browser clients

### FastAPI Layer (Backend)
- Purpose: AI/LangChain pipelines, async job processing, file storage, quota enforcement
- Location: `backend/app/` (planned — currently stub at `backend/main.py`)
- Contains: Routes, services, LangChain chains, ARQ workers, SQLAlchemy models
- Depends on: SQLAlchemy async → Neon PostgreSQL, ARQ/Redis, Gemini API, Cloudflare R2
- Used by: Next.js frontend (API calls), ARQ worker process

### Database Layer
- Purpose: Shared data persistence for both services
- Provider: Neon PostgreSQL with pgvector extension
- Migration ownership: Alembic (backend), Drizzle schema stays in sync
- Contains: users, documents, document_chunks, summaries, quizzes, quiz_attempts, user_topic_performance, user_usage, practice_sessions, jobs, user_preferences

## Data Flow

### Auth Flow
1. User clicks "Sign in with Google" in Next.js
2. NextAuth redirects to Google OAuth
3. Google returns to `/api/auth/callback/google`
4. NextAuth callback POSTs to FastAPI `/api/v1/auth/sync` (upsert user)
5. FastAPI returns internal `user_id`
6. NextAuth stores `{ userId, email, name }` in signed JWT (httpOnly cookie)
7. All subsequent requests attach JWT as `Authorization: Bearer <token>`
8. FastAPI verifies JWT using shared `NEXTAUTH_SECRET` / `JWT_SECRET`
9. FastAPI extracts `user_id`, scopes all queries accordingly

### Document Processing Flow (Async Job)
1. Client POSTs file to FastAPI `/api/v1/documents/upload`
2. FastAPI stores file to R2 (sync — fast)
3. FastAPI creates document row (status: pending) via SQLAlchemy
4. FastAPI enqueues ARQ job, returns `{ document_id, job_id }` immediately
5. Client opens SSE connection to `/api/v1/jobs/{job_id}/stream`
6. ARQ worker picks up job: extract text → chunk → deduplicate → embed → store in pgvector
7. SSE emits status updates at each step
8. Client receives final status, unlocks summary/quiz buttons

### CRUD Flow (Next.js Direct)
1. Server Component or Server Action imports Drizzle client from `frontend/src/db/index.ts`
2. Query scoped by `session.user.id` from NextAuth
3. Direct execution against Neon PostgreSQL
4. Results returned to component for rendering

### AI Generation Flow (Summary/Quiz/Practice)
1. Client triggers generation via FastAPI route
2. Quota enforced via FastAPI dependency (`enforce_quota`)
3. Service enqueues ARQ job
4. Worker executes LangChain chain with Gemini
5. Results written to DB via SQLAlchemy
6. SSE notifies client of completion
7. React Query invalidates and re-fetches

**State Management:**
- Server Components for initial page data (no client state needed)
- React Query for job status polling, SSE streaming, and client-side data needs
- Server Actions for user-initiated writes (preferences, quiz attempts, etc.)
- NextAuth JWT cookie for session state

## Key Abstractions

### Route → Service → Chain (Backend)
- Purpose: Strict separation of concerns for AI features
- Examples: `backend/app/api/v1/routes/summaries.py` → `backend/app/services/summary_service.py` → `backend/app/chains/summary_chain.py`
- Pattern: Routes validate and call services; services orchestrate and call chains; chains are pure LLM pipelines that never touch DB

### Server Component + Server Action (Frontend)
- Purpose: Eliminate API layer for simple CRUD operations
- Examples: `frontend/src/app/(app)/dashboard/page.tsx` (reads via Drizzle), Server Actions in `frontend/src/db/actions/` (writes via Drizzle)
- Pattern: Server Components fetch and render; Server Actions handle writes with session-scoped userId

### SSE Job Tracking
- Purpose: Real-time progress updates for async operations
- Examples: FastAPI `/api/v1/jobs/{job_id}/stream` emitting `progress`, `complete`, `error` events
- Pattern: `StreamingResponse` with `text/event-stream`; client uses React Query to invalidate on `complete`

### Quota Enforcement
- Purpose: Prevent abuse of AI features
- Location: FastAPI dependency (`enforce_quota`)
- Pattern: `SELECT FOR UPDATE` lock on `user_usage` table, check against tier limits, increment atomically
- Non-negotiable: Never moved to Next.js

## Entry Points

**Next.js App Router:**
- Location: `frontend/src/app/layout.tsx` (root layout with Geist/Inter fonts), `frontend/src/app/page.tsx` (home — currently scaffold)
- Triggers: HTTP requests to Next.js server (Vercel hosting)
- Responsibilities: Render pages, handle auth, serve static assets

**FastAPI Application:**
- Location: `backend/main.py` (currently a 6-line stub — planned: `backend/app/` with full layer structure)
- Triggers: HTTP requests from Next.js frontend (Railway hosting)
- Responsibilities: AI pipelines, job queueing, file storage, quota enforcement

**ARQ Worker:**
- Location: `backend/app/workers/document_worker.py` (planned)
- Triggers: Jobs enqueued by FastAPI services via Upstash Redis
- Responsibilities: Document processing, AI chain execution, embedding generation (separate Railway process)

**NextAuth:**
- Location: `frontend/src/app/api/auth/[...nextauth]/route.ts` (planned)
- Triggers: Auth callbacks from Google OAuth
- Responsibilities: Session management, JWT creation, user sync with FastAPI

**PayMongo Webhook:**
- Location: `frontend/src/app/api/webhooks/paymongo/route.ts` (planned)
- Triggers: PayMongo payment events
- Responsibilities: Update user tier on payment success/failure

## Error Handling

**Strategy:** Typed exceptions in backend, error boundaries + React Query error states in frontend

**Patterns:**
- Backend: Custom exception classes (`QuotaExceededException`, `DocumentNotReadyException`, etc.) registered as FastAPI exception handlers returning structured JSON per `master-spec.md` error schema
- Backend: Tenacity retry wrappers on all Gemini calls with exponential backoff
- Frontend: React Query error states per hook; error boundaries wrapping feature sections
- Frontend: Sentry for unhandled error capture with user context

## Cross-Cutting Concerns

**Logging:** Backend logs entry/exit of every service method with `user_id` and relevant IDs; chains log token usage; ARQ jobs log duration. Frontend uses Sentry, no `console.log` in production.

**Validation:** Backend uses Pydantic v2 models for all request/response shapes. Frontend uses Zod for form validation. Generated API types (`src/types/api.ts`) ensure contract compliance.

**Authentication:** NextAuth v5 with Google OAuth. JWT shared between Next.js and FastAPI via aligned secrets. All FastAPI endpoints (except auth) require `Authorization: Bearer <token>`.

**Type Safety:** Backend uses Pydantic models between layers. Frontend uses generated types from OpenAPI spec. Drizzle schema provides TypeScript types for all CRUD operations.

**Security:** All vector queries scoped by `user_id` before similarity search. Full documents never passed to LLM. Quota enforcement in single authoritative service (FastAPI).

---

*Architecture analysis: 2026-04-12*
