# Hybrid AGENTS Template

## Metadata
- Owner: `Clarift Team (Hans)`
- Last reviewed: `2026-04-15`
- Review cadence: `monthly`

## Repository Signals Checklist
- Run via `glob`/`read` equivalents when operating inside OpenCode to stay within allowed tooling.
- Detect AI rules:
  ```bash
  cat .github/copilot-instructions.md
  cat .cursorrules
  ```
- Inspect TypeScript style:
  ```bash
  cat frontend/tsconfig.json
  cat frontend/biome.json
  ```
- Lockfile audit: Frontend uses `pnpm-lock.yaml` (`pnpm`).
- Python env/tooling evidence: Backend uses `.venv/` and `requirements.txt`.
- Capture other structural signals: `backend/alembic/` (migrations), `frontend/src/db/` (Drizzle schema).

## Scope & Precedence
- Global safety/security rules remain primary. Conflict order: Safety/data integrity > Security > User intent/spec > Workflow/process > Style.
- This file records repo-specific deltas for the Clarift study engine; note any deviations from personal/global config and date them.

## Project Context
- Stack: `Next.js 15 (App Router)`, `TypeScript`, `Tailwind 4`, `shadcn/ui`, `Drizzle ORM`, `Clerk`, `FastAPI (async)`, `Python`, `LangChain`, `Gemini`, `Neon PostgreSQL`.
- Architecture: An AI-powered study engine for Filipino students processing uploaded study material. Frontend talks to a read-only Drizzle DB and Server Actions for writes. Backend handles heavy AI generation via FastAPI, ARQ queue, and LangChain chains.
- Critical paths: `Auth (Clerk)`, `Quota enforcement (FastAPI)`, `AI Chains`, `Vector Similarity Search`. These require extra security review to ensure tenant isolation (user_id filtering).

## Documentation Context Map
- Always read: `mvp-scope.md` (MVP boundaries), `project-context.md`, `architecture.md`, `master-spec.md`.
- Read when: 
  - UI/Component work -> `design.md`, `21st-dev-reference.md`.
  - DB work -> `drizzle-schema.md`
  - Testing -> `testing-strategy.md`
  - Specific feature -> `features/[feature].md`
- If docs are missing or sparse: state `No formal docs detected; use README + CI/workflow files + code as source of truth`.

## Commands (Use Exactly)
- Install (Frontend): `pnpm install` (evidence: `frontend/pnpm-lock.yaml` is canonical lockfile)

- Install (Backend):
  - Recommended: `uv venv` then `source .venv/bin/activate` (or `.venv\\Scripts\\activate` on Windows)
  - Then: `uv pip install -r requirements.txt` (recommended for speed/determinism)
  - Fallback: If `uv` is unavailable, use `python -m venv .venv` and `pip install -r requirements.txt` inside the venv
  **Never install backend Python dependencies globally—always use `.venv`.**
- Lint (Backend): `ruff check .`
- Build/Typecheck (Frontend): `pnpm run generate:api` (Required after any backend openapi changes to sync `src/types/api.ts`).
- Unit tests (Frontend): `pnpm run test:run` (vitest)
- Unit tests (Backend): `pytest`
- Integration/E2E: `pnpm run test` (watch mode)
- Pre-merge verify: `ruff check . && pytest` (backend) / `pnpm run test:run` (frontend).

### Granular Testing
- Single test file (Backend): `pytest tests/test_name.py`
- Single test case (Backend): `pytest -k "test_case_name"`
- Single test file (Frontend): `pnpm run test:run path/to/file.test.ts`
- *Note: Do not run full test suites for small localized checks.*

## Rule Inheritance
- `.cursorrules`: `None detected on 2026-04-15`.
- `.github/copilot-instructions.md`: `None detected on 2026-04-15`.

## Policy Tiers
- **MUST** – blocking requirements; violation halts work.
- **SHOULD** – strong default; deviations must be justified in Validation Notes.
- **MAY** – optional guidance; apply when it fits task constraints.

## Rule Precedence
1. Safety & data integrity
2. Security
3. User intent / specs
4. Workflow & process
5. Style preferences

## Agent Behavior
- Confirm destructive actions with explicit impact before execution.
- Plan first for efforts touching ≥3 files or needing sequencing.
- Include verification strategy in reasoning mode, not just implementation steps.
- No global installs unless user-approved; prefer project-local tooling and interpreter-pinned Python commands (`.venv/bin/python -m pip ...` or `venv\Scripts\python -m pip`).
- Preflight installs/tests by stating working directory and runtime path.
- Stop after 2 failed attempts; send blocked report (attempts, evidence, hypothesis, blocker, next step).
- Ask one focused question when ambiguity affects outcome.
- Avoid TODO comments without linked issues.
- When `tasks/lessons.md` exists, review before editing and add lessons after corrections.

## Subagent Invocation Policy
- Route by capability; default to `build` unless specialist behavior is required.
- Core capabilities: `GitHub Ops`, `Product Discovery`, `Architecture Decision`, `Phased Planning`, `Research`, `Test Validation`, `Test Repair`, `Security Review`, `Peer PR Review`, `Docs Maintenance`, `Prompt Engineering`, `Eval Design`, `RAG Engineering`.
- Optional aliases: `@gh-operator`, `@product-reviewer`, `@architect`, `@planner`, `@researcher`, `@tester`, `@debugger`, `@security-auditor`, `@pr-reviewer`, `@docs-maintainer`, `@prompt-engineer`, `@eval-designer`, `@rag-engineer`.
- If alias missing, execute capability manually (describe commands) instead of blocking.
- Use explicit `@subagent` mentions when specialist scope or strict format is needed.
- Run `pre-commit-gate` for self-review before committing large changes; use `Peer PR Review` capability for teammate PRs.

## Capability Model & Optional Aliases
- `Product Discovery` (`@product-reviewer`): validate nebulous ideas.
- `Architecture Decision` (`@architect`): ADR-style choices.
- `Phased Planning` (`@planner`): multi-step change breakdown.
- `Research` (`@researcher`): external/live docs.
- `Test Validation` (`@tester`): run targeted suites after changes.
- `Test Repair` (`@debugger`): diagnose failing tests.
- `Security Review` (`@security-auditor`): read-only review for auth/PII/payments.
- `Docs Maintenance` (`@docs-maintainer`): align README/changelog.
- `Prompt Engineering` (`@prompt-engineer`), `Eval Design` (`@eval-designer`), `RAG Engineering` (`@rag-engineer`).

## Capability Routing Matrix
| Scenario | Capability | Notes |
| --- | --- | --- |
| Ambiguous product direction | Product Discovery | Produces decision-ready brief |
| Feature touching >3 files | Phased Planning | Plan before coding |
| New architecture decision | Architecture Decision | ADR output |
| Tests failing already | Test Repair | Loop until green |
| Sensitive surface touched | Security Review | Run before merge |
| Need PR/CI updates | GitHub Ops | Use `gh` CLI |

## Capability Fallbacks
- If specialist agent unavailable, describe manual fallback (e.g., run tests via CLI, summarize results) and record assumption.
- Switch to command-driven workflow when auto-routing fails once.

## Execution Quality
- Choose the smallest correct change; avoid drive-by refactors.
- Fix root causes, not symptoms, unless user explicitly requests workaround.
- Perform elegance check for non-trivial work; prefer maintainable solutions.

## Definition of Done Contract
- Completion report MUST list: commands run, key results, what was verified vs not, residual risks, runtime/interpreter info, assumptions.
- Include before/after behavior notes for user-visible changes.
- **Clarift Check:**
  - Code follows the layer pattern (route → service → chain).
  - All Gemini calls have tenacity retry.
  - All vector queries are user-scoped.
  - Test covers happy path and main error case.
  - `pnpm run generate:api` run if endpoint added.

## Verification Protocol
- Provide proof (logs, screenshots, Read-tool output). If no automated test exists, create a temporary script or manual verification note.
- **Never read `.env` files or secrets.** Request sanitized inputs from user instead.
- Document verification gaps and propose next steps.

## Security Non-negotiables
- Do not commit secrets (`.env`, keys, tokens, credential JSON).
- Run secret scans before committing.
- Avoid `eval`/`exec` with untrusted input; no ad-hoc SQL concatenation.
- Sanitize prompt/PII examples before sharing.
- **Clarift Rule:** All vector queries MUST filter by `user_id`. (Security Issue otherwise).
- **Clarift Rule:** Never accept `userId` as a parameter in a Server Action. Always read it from the `auth()` session.

## Git and PR Standards
- Use feature branches; no direct pushes to `main`/`master`.
- Commit format: `type(scope): description` under 72 chars.
- PRs close an issue via `closes #N` and cover a single concern; split when touching >3 unrelated areas.

## Scope-Control Rules
- No unrelated refactors inside focused PRs.
- Stop and re-plan when new evidence appears.
- Capture follow-ups as tasks/issues instead of expanding scope mid-PR.

## Critical Paths & Extra Review Triggers
- Authentication & Sessions: Any changes to Clerk webhooks or Server Action auth checks.
- Billing/Quotas: Changes to `Depends(enforce_quota(...))` in FastAPI.
- Vector Searches: pgvector queries must be audited to ensure tenant isolation.

## Team Review Policy
- Recommended merge checklist: `/review`, `security-auditor` (when applicable), `/test`, `pre-commit-gate`, `/commit`, `/prcheck <#>`.

## Delta from Global Baseline
- Integrates global rules with explicit constraints for the Clarift monorepo (Next.js + FastAPI strict boundaries).
- Imposes layer enforcement (route -> service -> chain) inherited from `architecture.md`.

## Tooling Lock
- Frontend: `pnpm` MUST be used. `frontend/pnpm-lock.yaml` is the source of truth.
- Backend: `pip` and `.venv` MUST be used.
- Database: Alembic owns all migrations. **NEVER** use `drizzle-kit push` or `drizzle-kit generate` in production.

## Architecture Boundaries
- **Backend Rules:**
  - Routes call services. Services call chains. Never skip a layer.
  - Quota enforcement is a FastAPI dependency on the route, never inside a service.
  - Chains never touch the database. Services fetch chunks and pass them to chains.
  - Never pass full document content to an LLM. Always use retrieved chunks (max 5).
- **Frontend Rules:**
  - Never write a database query in a component. Queries go in Server Actions (writes) or Server Components (reads).
  - Default to Server Components. Add `"use client"` only for state, effects, or event handlers.
  - Quota display only in Next.js. Quota enforcement only in FastAPI.
- **Design Rules:**
  - Never place a 21st.dev component in `components/ui/` (shadcn only). Use `components/features/[feature]/`.
  - Swap hardcoded 21st.dev colors to brand tokens as per `design.md`.

## Validation Notes
- Assumed standard `.venv` paths based on existing instructions.
- Await further clarification if deployment/infra CI tools change.