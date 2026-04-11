# Coding Conventions

**Analysis Date:** 2026-04-12

## Naming Patterns

**Backend (Python):**
- Files: `snake_case.py` (e.g., `quota_service.py`, `summary_chain.py`)
- Classes: `PascalCase` (e.g., `SummaryChain`, `Settings`)
- Functions: `snake_case` (e.g., `enforce_quota`, `create_summary`)
- Constants: `UPPER_SNAKE_CASE` (e.g., `TEST_DATABASE_URL`)
- Pydantic models: `PascalCase` with `Config` inner class
- Test files: `test_[module_name].py` (e.g., `test_quota_service.py`)
- Source: `docs/dev/agents.md`

**Frontend (TypeScript):**
- Component files: `kebab-case.tsx` (e.g., `quiz-runner.tsx`, `quiz-question.tsx`)
- Non-component files: `kebab-case.ts` (e.g., `use-document-status.ts`, `api-client.ts`)
- Components: `PascalCase` function exports (e.g., `QuizRunner`, `Button`)
- Hooks: file `use-kebab-case.ts`, exported as `useHookName` (camelCase) (e.g., `useDocumentStatus`)
- Server Actions: `kebab-case.ts` in `db/actions/` (e.g., `preferences.ts`)
- Utility functions: `camelCase` (e.g., `cn`)
- Source: `docs/dev/agents.md`

**CSS/Tailwind:**
- CSS custom properties: `--kebab-case` (e.g., `--color-primary`, `--font-sans`)
- Tailwind classes: utility-first, composed via `cn()` helper
- Source: `frontend/src/app/globals.css`, `frontend/src/lib/utils.ts`

## Code Style

**Backend (Python):**
- Formatter/Linter: Ruff
- Config location: `backend/pyproject.toml` (per `docs/dev/stack-setup.md` convention)
- Line length: 100
- Rules selected: `["E", "F", "I", "N", "W"]`
- Ignored: `E501` (line length — handled by formatter)
- Import sorting: `I` rule enabled (isort-compatible)
- Command: `uv run ruff check .`
- Source: `docs/dev/stack-setup.md`

**Frontend (TypeScript):**
- Linter: ESLint v9 (flat config) with `eslint-config-next` core-web-vitals + typescript rules
- Config: `frontend/eslint.config.mjs`
- No Biome currently in use despite docs mentioning it — actual config uses ESLint
- No Prettier configured — ESLint handles linting only
- Command: `pnpm lint` (runs `eslint`)
- Source: `frontend/eslint.config.mjs`, `frontend/package.json`

**TypeScript Compiler:**
- Strict mode: enabled (`"strict": true`)
- Target: ES2017
- Module: esnext with bundler resolution
- JSX: react-jsx
- No emit (Next.js handles compilation)
- Path alias: `@/*` → `./src/*`
- Source: `frontend/tsconfig.json`

**CSS:**
- Framework: Tailwind CSS v4 with `@tailwindcss/postcss` plugin
- Design tokens via CSS custom properties in `@theme inline` block
- Color format: OKLCH
- Dark mode: class-based (`.dark` selector)
- Source: `frontend/src/app/globals.css`, `frontend/postcss.config.mjs`

## Import Organization

**Backend (Python):**
1. Standard library imports
2. Third-party imports (FastAPI, SQLAlchemy, Pydantic, etc.)
3. First-party imports (`app.*`)
- Enforced by Ruff `I` rule (isort)
- Source: `docs/dev/stack-setup.md`

**Frontend (TypeScript):**
1. External packages (`next`, `react`, `@tanstack/react-query`, etc.)
2. Internal aliases (`@/lib/utils`, `@/components/ui/button`, etc.)
3. Relative imports (`./page.module.css`)
- No explicit import ordering tool configured
- Source: `frontend/src/app/layout.tsx`, `frontend/src/components/ui/button.tsx`

**Path Aliases (Frontend):**
- `@/*` → `./src/*`
- Component aliases defined in `components.json`:
  - `@/components` → components root
  - `@/components/ui` → shadcn primitives
  - `@/lib` → utilities
  - `@/hooks` → React Query hooks
- Source: `frontend/tsconfig.json`, `frontend/components.json`

## Error Handling

**Backend:**
- Pattern: Typed custom exceptions in `app/core/exceptions.py`
- Exception types observed:
  - `QuotaExceededException` — includes feature, used, limit, reset_at
  - `DocumentNotReadyException` — includes document_id
  - `GenerationFailedException` — includes message
  - `ChatQuotaExceededException` — includes reset_in_seconds
- Exception handlers registered centrally in `app/main.py` via `@app.exception_handler()`
- Services raise typed exceptions; routes do not catch — handlers return structured JSON
- Response format: `{ "error": { "code": "...", "message": "...", "details": {...} } }`
- HTTP status codes: 429 (quota), 409 (document not ready)
- Source: `docs/dev/stack-setup.md`, `docs/dev/architecture.md`

**Frontend:**
- Server Actions: throw `Error` with descriptive message on auth failure or invalid input
- React Query: error states handled per-hook with `retry: false` in test wrappers
- Error boundaries wrap feature sections
- No `console.log` in production — Sentry captures unhandled errors
- Source: `docs/dev/modularity-guidelines.md`, `docs/dev/testing-strategy.md`

## Logging

**Backend:**
- Structured logging with context keys: `user_id`, `document_id`, `tokens_used`, `duration_ms`
- Every service method logs at entry and exit
- Every chain logs token usage
- Every ARQ job logs duration
- Pattern: `logger.info("feature.action", key=value, ...)`
- Source: `docs/dev/modularity-guidelines.md`

**Frontend:**
- Sentry for error tracking with user context
- No `console.log` in production code paths
- Source: `docs/dev/modularity-guidelines.md`, `AGENTS.md`

## Comments

**When to Comment:**
- Backend: Docstrings on service methods with Args, Returns, Raises documented
- Frontend: JSDoc not consistently used; comments explain non-obvious patterns
- Source: `docs/dev/modularity-guidelines.md` (service interface pattern shows docstrings)

**JSDoc/TSDoc:**
- Not enforced by tooling
- Used for public API documentation in hooks and Server Actions
- Source: observed patterns in `docs/dev/testing-strategy.md` examples

## Function Design

**Backend (Python):**
- All service methods are `async def`
- Input: IDs and db session (never full ORM objects across service boundaries)
- Output: result type or Job record (for async operations)
- Exceptions: documented and specific, never generic `Exception`
- Docstring required with description, returns, and raises
- Source: `docs/dev/modularity-guidelines.md`

**Frontend (TypeScript):**
- Server Actions: `"use server"` directive, always verify session at top
- Components: default to Server Components, `"use client"` only for state/effects/handlers
- Hooks: one hook per data concern, no JSX in hooks
- Source: `docs/dev/modularity-guidelines.md`

## Module Design

**Backend Layering (strict):**
- `routes/` → HTTP in/out, validate, call service, return
- `services/` → business logic, orchestrate, call chains/DB/storage
- `chains/` → LangChain pipelines, prompt → LLM → structured output
- `workers/` → ARQ job definitions, call services, emit SSE
- `db/models` → SQLAlchemy ORM, schema only, no logic
- `storage/` → R2 client, file operations only
- `core/` → config, security, shared utilities
- Dependency flow: routes → services → chains (never skip layers)
- One file per feature (Open/Closed principle)
- Source: `docs/dev/modularity-guidelines.md`, `docs/dev/architecture.md`

**Frontend Layering:**
- `app/(app)/[page]/page.tsx` → Server Component, fetch + render
- `components/features/[feat]/` → reusable feature components with `index.ts` barrel
- `components/ui/` → shadcn primitives only, no business logic
- `hooks/` → React Query hooks, one per data concern
- `db/` → Drizzle queries, called from Server Actions only
- `lib/api-client.ts` → openapi-fetch instance, no logic
- Source: `docs/dev/modularity-guidelines.md`

**Barrel Files:**
- Frontend feature directories use `index.ts` for re-exports
- Import from barrel, not individual files: `import { QuizRunner } from "@/components/features/quiz"`
- Source: `docs/dev/modularity-guidelines.md`

---

*Convention analysis: 2026-04-12*
