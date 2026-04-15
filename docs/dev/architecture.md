# Architecture

> See [`project-context.md`](./project-context.md) for product background.  
> See [`decisions.md`](./decisions.md) for why each technology was chosen.

---

## System Overview

Clarift uses a **split architecture** with two distinct server-side layers:

```
Browser
  │
  ├── Next.js (UI + CRUD + Auth)
  │     ├── Server Components → Drizzle → Neon DB
   │     ├── Server Actions    → Drizzle → Neon DB
   │     ├── Clerk             → Google OAuth/Email → JWT session
   │     └── React Query       → SSE polling for job status
  │
  └── FastAPI (AI + Jobs + Quota Enforcement)
        ├── Routes → Services → LangChain Chains → Gemini API
        ├── ARQ Worker → async job processing
        ├── SQLAlchemy → Neon DB (AI-written rows only)
        └── boto3 → Cloudflare R2
```

**The rule that governs all decisions:**

| Concern | Owner |
|---|---|
| UI rendering | Next.js Server Components |
| CRUD reads and writes | Next.js Server Actions + Drizzle |
| Auth session | Clerk |
| File upload to R2 | FastAPI |
| Job enqueueing | FastAPI |
| All AI/LangChain calls | FastAPI |
| Embeddings + vector search | FastAPI (ARQ worker) |
| Quota enforcement | FastAPI (never Next.js) |
| Quota display | Next.js + Drizzle |

---

## Detailed Architecture

### Next.js Layer

**Server Components** render pages by querying Neon directly via Drizzle. No loading spinners for initial data — HTML arrives pre-rendered.

**Server Actions** handle all user-initiated writes that don't involve AI: saving preferences, updating document titles, submitting quiz answers, reading usage stats.

**Route Handlers** are minimal:
- `/auth/callback` — Clerk authentication callback (handled by Clerk’s infrastructure)
- `/api/webhooks/paymongo` — payment events

**React Query** manages client-side state for:
- Job status polling via SSE (`/api/v1/jobs/{id}/stream`)
- Chat streaming responses
- Any optimistic UI updates

### FastAPI Layer

**Routes** are thin. They validate input, call a service, return output. No business logic in routes.

**Services** contain business logic. They call chains, manage DB writes via SQLAlchemy, and enqueue ARQ jobs.

**Chains** are LangChain multi-step pipelines. One file per feature. They never touch the DB directly.

**ARQ Worker** is a separate Railway process running the same codebase. It processes jobs from the Redis queue: document text extraction, chunking, embedding, and vector storage.

### Database Layer

Both Next.js and FastAPI connect to the same Neon PostgreSQL instance.

**Migration ownership:** Alembic owns all migrations. Drizzle is query-only — never run `drizzle-kit push` or `drizzle-kit generate` in production.

**Schema sync:** When an Alembic migration is written, the Drizzle schema file is updated in the same commit.

**Vector search:** pgvector extension. All vector queries are filtered by `user_id` before similarity search.

---

## Auth Flow

```
1. User clicks “Sign in with Google” or “Sign in with Email”
2. Clerk handles the full OAuth or email magic link/authentication offsite
3. Clerk returns the user to the frontend with a JWT session cookie and user profile
4. Frontend transmits Clerk-issued JWT to the backend on API requests
5. FastAPI verifies JWT using Clerk’s public key and backend secret
6. FastAPI extracts user_id, scopes all queries accordingly
```

No local Google OAuth app secrets are required in project code. Clerk keys and published JWT public keys are all that need to be managed in env files. Never trust the frontend to declare who the user is; always verify using Clerk’s latest backend SDK or JWT validation flow.

---

## Async Job Flow (Document Processing)

```
1. Client POSTs file to FastAPI /api/v1/documents/upload
2. FastAPI stores file to R2 (sync — fast)
3. FastAPI creates document row (status: pending) via SQLAlchemy
4. FastAPI enqueues ARQ job, returns { document_id, job_id } immediately
5. Client opens SSE connection to /api/v1/jobs/{job_id}/stream
6. ARQ worker picks up job:
     a. Extract text (PyMuPDF or Gemini Vision)
     b. Chunk into 200–300 token windows (tiktoken)
     c. Deduplicate chunks (SHA-256 hash)
     d. Generate embeddings (Gemini embedding model)
     e. Store chunks in pgvector with metadata
     f. Update document status to ready
7. SSE emits status updates at each step
8. Client receives final status, unlocks summary/quiz buttons
```

All heavy AI operations (summary chain, quiz chain, practice chain) follow the same enqueue → SSE pattern.

---

## SSE Pattern

FastAPI emits events:

```
event: progress
data: {"step": "extracting", "pct": 10}

event: progress
data: {"step": "chunking", "pct": 40}

event: progress
data: {"step": "embedding", "pct": 80}

event: complete
data: {"document_id": "abc123", "status": "ready"}

event: error
data: {"message": "Failed to extract text from PDF"}
```

Client uses `EventSource` or React Query with SSE adapter. On `complete`, React Query invalidates the documents query to trigger a re-fetch.

---

## Quota Enforcement

Quota enforcement lives exclusively in FastAPI. The pattern on every AI feature route:

```python
# Pseudo-code — see quota_service.py for implementation
async def enforce_quota(user_id, feature):
    async with db.begin():
        usage = await db.execute(
            SELECT usage FOR UPDATE WHERE user_id = ?
        )
        if usage[feature] >= limit[tier][feature]:
            raise QuotaExceededException
        await db.execute(
            UPDATE usage SET feature += 1 WHERE user_id = ?
        )
```

The `FOR UPDATE` lock prevents race conditions under concurrent requests. This is non-negotiable — never move quota enforcement to Next.js.

---

## Directory Structure

```
clarift/
├── frontend/                        # Next.js App Router
│   ├── src/
│   │   ├── app/                     # Routes and pages
│   │   │   ├── (auth)/              # Auth pages (login, handled by Clerk)
│   │   │   ├── (app)/               # Protected app pages
│   │   │   │   ├── dashboard/
│   │   │   │   ├── documents/[id]/
│   │   │   │   ├── quiz/[id]/
│   │   │   │   ├── practice/
│   │   │   │   └── chat/
│   │   │   └── api/
│   │   │       └── webhooks/paymongo/
│   │   ├── components/
│   │   │   ├── ui/                  # shadcn/ui primitives
│   │   │   └── features/            # Feature-specific components
│   │   │       ├── documents/
│   │   │       ├── summary/
│   │   │       ├── quiz/
│   │   │       ├── practice/
│   │   │       └── chat/
│   │   ├── db/
│   │   │   ├── schema.ts            # Drizzle schema (read-only, Alembic owns migrations)
│   │   │   └── index.ts             # Drizzle client
│   │   ├── lib/
│   │   │   ├── api-client.ts        # openapi-fetch typed client
│   │   │   ├── auth.ts              # Auth helpers (Clerk-integrated if needed)
│   │   │   └── utils.ts
│   │   ├── types/
│   │   │   └── api.ts               # Generated by openapi-typescript (never edit manually)
│   │   └── hooks/                   # React Query hooks
│   └── drizzle.config.ts
│
└── backend/                         # FastAPI
    ├── app/
    │   ├── api/
    │   │   └── v1/
    │   │       ├── routes/
    │   │       │   ├── auth.py
    │   │       │   ├── documents.py
    │   │       │   ├── summaries.py
    │   │       │   ├── quizzes.py
    │   │       │   ├── practice.py
    │   │       │   ├── chat.py
    │   │       │   └── jobs.py      # SSE job status stream
    │   │       └── deps.py          # Shared: auth, db, quota
    │   ├── core/
    │   │   ├── config.py            # Pydantic Settings
    │   │   └── security.py          # JWT verification
    │   ├── services/                # Business logic
    │   │   ├── document_service.py
    │   │   ├── summary_service.py
    │   │   ├── quiz_service.py
    │   │   ├── practice_service.py
    │   │   ├── chat_service.py
    │   │   └── quota_service.py
    │   ├── chains/                  # LangChain chains only
    │   │   ├── summary_chain.py
    │   │   ├── quiz_chain.py
    │   │   └── practice_chain.py
    │   ├── workers/
    │   │   └── document_worker.py   # ARQ job definitions
    │   ├── db/
    │   │   ├── models.py            # SQLAlchemy models
    │   │   └── session.py           # Async session factory
    │   └── storage/
    │       └── r2.py                # Cloudflare R2 client
    ├── alembic/                     # All migrations live here
    └── tests/
```

---

## Infrastructure

| Service | Role | Notes |
|---|---|---|
| Vercel | Next.js hosting | Zero-config deployment |
| Railway (web) | FastAPI | Dockerfile-based |
| Railway (worker) | ARQ worker | Same codebase, different start command |
| Neon | PostgreSQL + pgvector | Enable pgvector on first migration |
| Cloudflare R2 | File storage | S3-compatible, zero egress cost |
| Upstash Redis | ARQ queue + rate limiting | Serverless, no cold start |
| Resend | Transactional email | Post-MVP magic link auth |
| PayMongo | Payments | GCash + card support |
| Sentry | Error tracking | Add on Day 1 |

---

## Environment Variables

```bash
# Clerk authentication (used by both frontend and backend)
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=    # Clerk dashboard: API Keys → Publishable key
CLERK_SECRET_KEY=                     # Clerk dashboard: API Keys → Secret key

# Frontend (Next.js)
DATABASE_URL=              # Neon/Postgres connection string, if used
NEXT_PUBLIC_API_URL=       # Backend FastAPI base URL

# Backend (FastAPI)
DATABASE_URL=              # Same Neon/Postgres connection string
REDIS_URL=                 # Redis URL (local, Docker, or Upstash)
CLERK_PUBLISHABLE_KEY=     # Usually the same as NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY
CLERK_SECRET_KEY=          # Clerk secret key for backend verification
R2_ACCOUNT_ID=
R2_ACCESS_KEY_ID=
R2_SECRET_ACCESS_KEY=
R2_BUCKET_NAME=
GEMINI_API_KEY=
PAYMONGO_SECRET_KEY=
SENTRY_DSN=
```
