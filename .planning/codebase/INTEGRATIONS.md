# External Integrations

**Analysis Date:** 2026-04-12

## APIs & External Services

**AI/LLM:**
- Google Gemini API — Document summarization, quiz generation, practice questions, chat responses, embeddings
  - SDK/Client: `google-generativeai`, `langchain-google-genai`
  - Models: `gemini-2.5-flash` (summary/quiz/practice/vision), `gemini-flash-lite` (chat), `models/embedding-001` (embeddings)
  - Auth: `GEMINI_API_KEY` env var
  - Retry: All Gemini calls use `tenacity` with `stop_after_attempt(3)` and exponential backoff

**Payments:**
- PayMongo — Payment processing (GCash + card support for Philippines market)
  - Auth: `PAYMONGO_SECRET_KEY`, `PAYMONGO_WEBHOOK_SECRET` env vars
  - Webhook: `POST /api/webhooks/paymongo` (Next.js route handler)
  - Public key: `PAYMONGO_PUBLIC_KEY` (frontend env)

**Email:**
- Resend — Transactional email (post-MVP magic link auth)
  - Not yet integrated; planned per `docs/dev/architecture.md`

## Data Storage

**Databases:**
- Neon PostgreSQL — Shared database between frontend and backend
  - Connection: `DATABASE_URL` env var (different format per service)
  - Frontend client: Drizzle ORM + `@neondatabase/serverless` (planned)
  - Backend client: SQLAlchemy async + `asyncpg` (planned)
  - Extension: pgvector (768-dimension embeddings via HNSW index)
  - Migration ownership: Alembic (backend), Drizzle schema kept in sync manually

**File Storage:**
- Cloudflare R2 — Document file storage
  - SDK/Client: `boto3` (S3-compatible)
  - Auth: `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET_NAME` env vars
  - Bucket: `clarift-uploads`
  - CORS: Configured for localhost:3000 and production domain

**Caching:**
- Upstash Redis — ARQ job queue + rate limiting
  - Connection: `REDIS_URL` env var
  - Used by: ARQ worker for async job processing, slowapi + upstash-ratelimit for rate limiting

## Authentication & Identity

**Auth Provider:**
- Google OAuth via NextAuth v5 — Primary authentication method
  - Implementation: NextAuth handles OAuth flow, FastAPI verifies JWT on every request
  - Credentials: `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` (frontend env)
  - Shared secret: `NEXTAUTH_SECRET` (frontend) = `JWT_SECRET` (backend) — must be identical
  - JWT algorithm: HS256

**JWT Flow:**
1. NextAuth signs in via Google OAuth
2. NextAuth callback POSTs to `POST /api/v1/auth/sync` (FastAPI) to upsert user
3. FastAPI returns internal `user_id`
4. NextAuth stores `{ userId, email, name, tier }` in signed JWT (httpOnly cookie)
5. All subsequent requests attach JWT as `Authorization: Bearer <token>`
6. FastAPI verifies JWT using `python-jose`, extracts `user_id`, scopes all queries

## Monitoring & Observability

**Error Tracking:**
- Sentry — Error tracking and performance monitoring
  - Auth: `SENTRY_DSN` env var
  - Integration: `sentry-sdk[fastapi]` for backend, planned for frontend
  - Traces sample rate: 0.1 (per `docs/dev/stack-setup.md`)

**Logs:**
- FastAPI standard logging + ARQ worker logs
- Railway platform logs for production

## CI/CD & Deployment

**Hosting:**
- Vercel — Next.js frontend (zero-config deployment)
- Railway — FastAPI backend (Dockerfile-based, two services: web + worker from same codebase)

**CI Pipeline:**
- None detected — no `.github/workflows/` files present
- Pre-merge verification: `uv run ruff check .`, `uv run pytest`, `pnpm lint`, `pnpm build`

## Environment Configuration

**Required env vars:**

| Variable | Service | Purpose |
|----------|---------|---------|
| `NEXTAUTH_SECRET` | Frontend | JWT signing (must match JWT_SECRET) |
| `JWT_SECRET` | Backend | JWT verification (must match NEXTAUTH_SECRET) |
| `NEXTAUTH_URL` | Frontend | NextAuth base URL |
| `GOOGLE_CLIENT_ID` | Frontend | Google OAuth client ID |
| `GOOGLE_CLIENT_SECRET` | Frontend | Google OAuth client secret |
| `DATABASE_URL` | Both | Neon PostgreSQL connection (asyncpg format for backend, standard for frontend) |
| `NEXT_PUBLIC_API_URL` | Frontend | FastAPI base URL |
| `REDIS_URL` | Backend | Upstash Redis connection |
| `GEMINI_API_KEY` | Backend | Google Gemini API key |
| `R2_ACCOUNT_ID` | Backend | Cloudflare R2 account ID |
| `R2_ACCESS_KEY_ID` | Backend | Cloudflare R2 access key |
| `R2_SECRET_ACCESS_KEY` | Backend | Cloudflare R2 secret key |
| `R2_BUCKET_NAME` | Backend | Cloudflare R2 bucket name |
| `PAYMONGO_SECRET_KEY` | Backend | PayMongo secret key |
| `PAYMONGO_WEBHOOK_SECRET` | Backend | PayMongo webhook signature verification |
| `PAYMONGO_PUBLIC_KEY` | Frontend | PayMongo public key (client-side) |
| `SENTRY_DSN` | Backend | Sentry error tracking DSN |

**Secrets location:**
- `.env` file for backend (not present yet, not committed)
- `.env.local` file for frontend (not present yet, not committed)
- Railway environment variables for production backend
- Vercel environment variables for production frontend

## Webhooks & Callbacks

**Incoming:**
- `POST /api/webhooks/paymongo` (Next.js route handler) — PayMongo payment events (checkout completed, payment succeeded, etc.)
- `POST /api/auth/callback/google` (NextAuth) — Google OAuth callback

**Outgoing:**
- `POST /api/v1/auth/sync` (NextAuth -> FastAPI) — User sync on every Google sign-in
- `GET /api/v1/auth/me` (NextAuth -> FastAPI) — Fetch user details after sync

## SSE (Server-Sent Events)

**Job Status Streaming:**
- `GET /api/v1/jobs/{job_id}/stream` — Real-time job progress updates
- Events: `progress` (step + percentage), `complete` (result), `error` (message + code)
- Client: React Query with SSE adapter or `EventSource`
- Used for: document processing, summary generation, quiz generation, practice sessions

---

*Integration audit: 2026-04-12*
