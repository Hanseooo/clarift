# Codebase Structure

**Analysis Date:** 2026-04-12

## Directory Layout

```
clarift/
├── AGENTS.md                        # Root agent policy and project rules
├── .planning/                       # Planning and codebase analysis docs
│   └── codebase/                    # GSD-generated architecture docs
│
├── backend/                         # FastAPI + Python (AI, jobs, quota)
│   ├── main.py                      # Entry point (currently stub)
│   ├── pyproject.toml               # Python dependencies (uv-managed)
│   ├── uv.lock                      # Dependency lockfile
│   ├── .python-version              # Python version pin (3.12)
│   ├── .venv/                       # Virtual environment
│   ├── .gitignore                   # Git ignores for backend
│   └── README.md                    # Backend documentation
│
├── frontend/                        # Next.js + TypeScript (UI, CRUD, auth)
│   ├── src/
│   │   ├── app/                     # Next.js App Router (routes + pages)
│   │   │   ├── layout.tsx           # Root layout with font setup
│   │   │   ├── page.tsx             # Home page (currently default scaffold)
│   │   │   ├── page.module.css      # Home page styles (scaffold)
│   │   │   ├── globals.css          # Global CSS + Tailwind imports
│   │   │   └── favicon.ico          # Site favicon
│   │   ├── components/
│   │   │   └── ui/                  # shadcn/ui primitives only
│   │   │       └── button.tsx       # Button component (CVA variants)
│   │   └── lib/
│   │       └── utils.ts             # cn() utility (clsx + tailwind-merge)
│   ├── public/                      # Static assets
│   ├── .next/                       # Next.js build output (gitignored)
│   ├── node_modules/                # Dependencies (gitignored)
│   ├── package.json                 # Frontend dependencies + scripts
│   ├── pnpm-lock.yaml               # pnpm lockfile
│   ├── pnpm-workspace.yaml          # Workspace config (single-member)
│   ├── tsconfig.json                # TypeScript config (paths: @/*)
│   ├── next.config.ts               # Next.js configuration
│   ├── eslint.config.mjs            # ESLint configuration
│   ├── postcss.config.mjs           # PostCSS configuration
│   ├── next-env.d.ts                # Next.js type declarations
│   ├── components.json              # shadcn/ui configuration
│   └── AGENTS.md                    # Frontend-specific agent rules
│
└── docs/
    └── dev/                         # Developer documentation
        ├── README.md                # Docs index
        ├── agents.md                # Agent entry point and rules
        ├── architecture.md          # System architecture
        ├── master-spec.md           # Stack, schema, API contract
        ├── decisions.md             # Architectural decisions with rationale
        ├── modularity-guidelines.md # Module design patterns
        ├── drizzle-schema.md        # Drizzle schema reference
        ├── testing-strategy.md      # Test strategy
        ├── stack-setup.md           # Setup instructions
        ├── design.md                # Design system (colors, spacing, etc.)
        ├── auth.md                  # Auth flow details
        ├── quota.md                 # Quota system spec
        ├── chat.md                  # Chat feature spec
        ├── quiz.md                  # Quiz feature spec
        ├── document-upload.md       # Document upload spec
        ├── summary.md               # Summary feature spec
        ├── practice.md              # Practice feature spec
        ├── observability.md         # Monitoring and logging
        ├── onboarding.md            # Onboarding flow spec
        ├── mvp-scope.md             # MVP feature boundaries
        ├── implementation-plan.md   # Implementation roadmap
        ├── project-context.md       # Product context
        └── 21st-dev-reference.md    # 21st.dev component reference
```

## Directory Purposes

**`backend/`:**
- Purpose: FastAPI application for AI pipelines, job processing, file storage, quota enforcement
- Contains: Python source (planned), dependencies, virtual environment
- Key files: `backend/main.py` (entry stub), `backend/pyproject.toml` (dependencies)
- Note: Backend is in early scaffold phase — `main.py` is a stub. Full structure planned per `docs/dev/architecture.md`

**`frontend/src/app/`:**
- Purpose: Next.js App Router — all routes and pages
- Contains: Page components, layouts, API routes
- Planned subdirectories: `(auth)/` for login, `(app)/` for protected pages, `api/` for route handlers
- Key files: `layout.tsx` (root), `page.tsx` (home — currently scaffold)

**`frontend/src/components/`:**
- Purpose: React components
- Contains: `ui/` for shadcn/ui primitives, planned `features/` for feature-specific components
- Key files: `ui/button.tsx` (CVA-based button with variants)

**`frontend/src/lib/`:**
- Purpose: Shared utilities and configuration
- Contains: `utils.ts` (cn helper)
- Planned: `api-client.ts` (openapi-fetch instance), auth helpers tied to Clerk

**`docs/dev/`:**
- Purpose: Comprehensive developer documentation and specifications
- Contains: Architecture docs, feature specs, design system, agent rules
- Key files: `agents.md` (entry point), `architecture.md`, `master-spec.md`, `decisions.md`

## Key File Locations

**Entry Points:**
- `frontend/src/app/layout.tsx`: Root Next.js layout with font configuration
- `frontend/src/app/page.tsx`: Home page (currently Next.js default scaffold)
- `backend/main.py`: Python entry point (currently stub — `print("Hello from backend!")`)

**Configuration:**
- `frontend/tsconfig.json`: TypeScript with `@/*` path alias to `src/`
- `frontend/next.config.ts`: Next.js config (currently empty/default)
- `frontend/eslint.config.mjs`: ESLint configuration
- `frontend/postcss.config.mjs`: PostCSS with Tailwind 4
- `frontend/components.json`: shadcn/ui configuration
- `backend/pyproject.toml`: Python dependencies (FastAPI 0.135.3+)
- `backend/.python-version`: Python 3.12

**Core Logic:**
- `frontend/src/lib/utils.ts`: `cn()` utility combining clsx + tailwind-merge
- `frontend/src/components/ui/button.tsx`: shadcn/ui Button with CVA variants (default, outline, secondary, ghost, destructive, link)

**Documentation:**
- `docs/dev/agents.md`: Agent entry point — read first before any work
- `docs/dev/architecture.md`: System architecture with data flows
- `docs/dev/master-spec.md`: Complete stack, schema, and API contract
- `docs/dev/decisions.md`: Why each technology/pattern was chosen

**Testing:**
- Not yet configured — no test files or test scripts present
- Planned: `backend/tests/` (pytest), frontend vitest (per `docs/dev/testing-strategy.md`)

## Naming Conventions

**Files:**
- Backend Python: `snake_case.py` (e.g., `summary_service.py`, `document_worker.py`)
- Frontend components: `kebab-case.tsx` (e.g., `quiz-question.tsx`)
- Frontend non-components: `kebab-case.ts` (e.g., `use-document-status.ts`)
- Frontend hooks: `use-kebab-case.ts`, exported as `useHookName` (camelCase function)
- Server Actions: `kebab-case.ts` in `db/actions/`

**Directories:**
- Backend: `snake_case/` (e.g., `api/v1/routes/`, `services/`, `chains/`)
- Frontend routes: kebab-case or PascalCase for route groups (e.g., `(auth)/`, `(app)/`)
- Frontend features: `features/[feature-name]/` with self-contained components

**Code:**
- Backend classes: `PascalCase` (e.g., `SummaryChain`, `QuotaExceededException`)
- Backend functions: `snake_case` (e.g., `create_summary`, `enforce_quota`)
- Backend constants: `UPPER_SNAKE_CASE` (e.g., `QUOTA_LIMITS`)
- Frontend components: `PascalCase` (e.g., `QuizRunner`, `QuizResults`)

## Where to Add New Code

**New Backend Feature (AI-powered):**
- Pydantic schemas: `backend/app/api/v1/schemas/[feature].py`
- Routes: `backend/app/api/v1/routes/[feature].py`
- Service: `backend/app/services/[feature]_service.py`
- Chain: `backend/app/chains/[feature]_chain.py`
- Worker (if async): `backend/app/workers/[feature]_worker.py`
- Tests: `backend/tests/test_[feature].py`

**New Frontend Page:**
- Page: `frontend/src/app/(app)/[route]/page.tsx` (Server Component)
- Co-located components: `frontend/src/app/(app)/[route]/` (same directory)
- Client components: Separate file with `"use client"` directive

**New Frontend Feature Component:**
- Components: `frontend/src/components/features/[feature]/` (self-contained directory)
- Barrel export: `frontend/src/components/features/[feature]/index.ts`
- Tests: Co-located or `frontend/src/__tests__/`

**New React Query Hook:**
- Location: `frontend/src/hooks/use-[feature].ts`
- Pattern: One hook per data concern, no JSX

**New Server Action:**
- Location: `frontend/src/db/actions/[domain].ts`
- Pattern: `"use server"` directive, session verification, userId from session

**New Database Table:**
- Alembic migration: `backend/alembic/versions/` (source of truth)
- Drizzle schema update: `frontend/src/db/schema.ts` (same commit)

**New Utility:**
- Shared helpers: `frontend/src/lib/[name].ts`
- Backend utilities: `backend/app/core/[name].py`

## Special Directories

**`.next/`:**
- Purpose: Next.js build output and type generation
- Generated: Yes (by `next build` and `next dev`)
- Committed: No (gitignored)

**`node_modules/`:**
- Purpose: Frontend npm dependencies via pnpm
- Generated: Yes (by `pnpm install`)
- Committed: No (gitignored)

**`backend/.venv/`:**
- Purpose: Python virtual environment via uv
- Generated: Yes (by `uv sync`)
- Committed: No (gitignored)

**`.planning/`:**
- Purpose: GSD-generated planning and codebase analysis documents
- Generated: Yes (by `/gsd-map-codebase` and related commands)
- Committed: Yes (part of project planning artifacts)

**`docs/dev/`:**
- Purpose: Canonical developer documentation — specs, decisions, architecture
- Generated: No (hand-written)
- Committed: Yes (source of truth for project decisions)

---

*Structure analysis: 2026-04-12*
