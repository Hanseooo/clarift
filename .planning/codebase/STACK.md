# Technology Stack

**Analysis Date:** 2026-04-12

## Languages

**Primary:**
- TypeScript 5.x — Frontend application code (`frontend/src/`)
- Python 3.12 — Backend application code (`backend/`)

**Secondary:**
- SQL — Database migrations and queries (Neon PostgreSQL)

## Runtime

**Environment:**
- Node.js >= 20 — Frontend runtime
- Python 3.12 — Backend runtime (`.python-version` specifies `3.12`)

**Package Manager:**
- Frontend: `pnpm` — Lockfile: `frontend/pnpm-lock.yaml` present, workspace config at `frontend/pnpm-workspace.yaml`
- Backend: `uv` — Lockfile: `backend/uv.lock` present, managed via `pyproject.toml`

## Frameworks

**Core:**
- Next.js 16.2.3 (`next` in `frontend/package.json`) — App Router, React Server Components, Server Actions. Note: `frontend/AGENTS.md` warns this version has breaking changes from Next.js 15 — consult `node_modules/next/dist/docs/` before writing code.
- FastAPI 0.135.3+ (`fastapi[standard]` in `backend/pyproject.toml`) — Async API framework with Route -> Service -> Chain layering

**Frontend UI:**
- React 19.2.4 — UI rendering
- Tailwind CSS 4.2.2 — Styling with PostCSS plugin (`@tailwindcss/postcss`)
- shadcn/ui (radix-luma style) — Component library via `components.json` config, primitives in `frontend/src/components/ui/`
- Radix UI 1.4.3 — Headless UI primitives
- Lucide React 1.8.0 — Icon library
- class-variance-authority 0.7.1 — Component variant management

**Backend AI/ML:**
- LangChain + LangChain Google GenAI — Multi-step AI chains (per `docs/dev/master-spec.md`)
- Google Generative AI SDK — Direct Gemini API access
- PyMuPDF — PDF text extraction
- tiktoken — Token counting for chunking
- pgvector — Vector similarity search (Neon PostgreSQL extension)

**Backend Async/Queue:**
- ARQ — Async Redis job queue for document processing
- Redis (hiredis) — ARQ dependency, Upstash Redis in production

**Testing:**
- pytest + pytest-asyncio + pytest-cov — Backend testing (per `docs/dev/testing-strategy.md`, no tests present yet)
- vitest + @testing-library/react + msw — Frontend testing (planned per `docs/dev/stack-setup.md`, not configured in current `package.json`)

**Build/Dev:**
- ESLint 9 + eslint-config-next 16.2.3 — Frontend linting (`frontend/eslint.config.mjs`)
- Ruff — Backend linting and formatting (per `docs/dev/stack-setup.md`, not yet configured in `pyproject.toml`)
- TypeScript 5.x — Type checking (`frontend/tsconfig.json` with strict mode, `@/*` path alias)

## Key Dependencies

**Critical:**
- `@neondatabase/serverless` — Neon PostgreSQL driver for frontend Drizzle queries (planned per `docs/dev/master-spec.md`, not yet installed)
- `drizzle-orm` — Frontend ORM for CRUD operations (planned, not yet installed)
- `next-auth` v5 — Google OAuth authentication (planned per `docs/dev/auth.md`, not yet installed)
- `@tanstack/react-query` v5 — Server state management and SSE polling (planned, not yet installed)
- `sqlalchemy[asyncio]` — Backend async ORM (planned per `docs/dev/master-spec.md`, not yet in `pyproject.toml`)
- `asyncpg` — Async PostgreSQL driver for backend (planned, not yet in `pyproject.toml`)
- `alembic` — Database migrations (source of truth, Drizzle is query-only)
- `boto3` — Cloudflare R2 S3-compatible storage client
- `python-jose[cryptography]` — JWT verification in FastAPI
- `tenacity` — Retry logic for Gemini API calls
- `openapi-typescript` / `openapi-fetch` — Type-safe API contract between frontend and backend

**Infrastructure:**
- `arq` — Async job queue for document processing pipeline
- `slowapi` — Rate limiting middleware
- `upstash-ratelimit` — Upstash Redis rate limiting
- `sentry-sdk[fastapi]` — Error tracking

## Configuration

**Environment:**
- Frontend: `.env.local` (not present yet) — `NEXTAUTH_SECRET`, `NEXTAUTH_URL`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `DATABASE_URL`, `NEXT_PUBLIC_API_URL`
- Backend: `.env` (not present yet) — `JWT_SECRET` (must match `NEXTAUTH_SECRET`), `DATABASE_URL` (asyncpg format), `REDIS_URL`, `GEMINI_API_KEY`, R2 credentials, `PAYMONGO_SECRET_KEY`, `SENTRY_DSN`

**Build:**
- Frontend: `next.config.ts` (default config), `postcss.config.mjs` (Tailwind plugin), `tsconfig.json` (ES2017 target, strict mode, `@/*` path alias)
- Backend: `pyproject.toml` (minimal, only `fastapi[standard]>=0.135.3` dependency)

**Frontend shadcn config:** `frontend/components.json` — radix-luma style, RSC enabled, TSX enabled, Lucide icons, neutral base color, CSS variables enabled

## Platform Requirements

**Development:**
- Node.js >= 20, pnpm
- Python 3.12, uv
- Running Neon PostgreSQL instance with pgvector extension enabled
- Upstash Redis instance (for ARQ)
- Google OAuth credentials (for NextAuth)
- Gemini API key

**Production:**
- Vercel — Next.js hosting (per `docs/dev/architecture.md`)
- Railway (web) — FastAPI Dockerfile-based deployment
- Railway (worker) — ARQ worker (same codebase, different start command)
- Neon PostgreSQL — Shared database with pgvector
- Cloudflare R2 — File storage (S3-compatible, zero egress cost)
- Upstash Redis — ARQ queue + rate limiting

---

*Stack analysis: 2026-04-12*
