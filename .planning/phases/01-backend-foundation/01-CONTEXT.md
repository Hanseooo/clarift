# Phase 1: backend-foundation - Context

**Gathered:** 2026-04-12 (assumptions mode)
**Status:** Ready for planning

<domain>
## Phase Boundary

Full async backend running locally. Every endpoint exists. Core loop works end-to-end (even if slowly). Includes monorepo init, FastAPI app setup, Next.js 15 init, NextAuth v5, document upload/ARQ pipeline, and summary chain execution with quota.
</domain>

<decisions>
## Implementation Decisions

### Infrastructure & Schema Management
- **D-01:** `arq` and Upstash Redis will be the exclusive combination for handling background async tasks (specifically the document ingestion pipeline).
- **D-02:** Alembic has absolute, exclusive ownership over database schema migrations, meaning Drizzle is restricted to read/write querying on the frontend.

### API Architecture & Logic Layering
- **D-03:** The backend must strictly follow the `Route -> Service -> Chain` layering, keeping FastAPI routes as thin HTTP wrappers.
- **D-04:** Quota limit enforcement is handled globally via FastAPI dependency injection at the route level, not deep inside the services.

### Codebase State & Contracts
- **D-05:** The existing `backend/main.py` is merely a temporary stub and will be completely overwritten by the robust FastAPI setup defined in the documentation.
- **D-06:** The frontend relies entirely on OpenAPI-generated types for its API layer, strictly avoiding manual type definitions for backend payloads.

### OpenCode's Discretion
None - all assumptions locked as decisions.
</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

- docs/dev/AGENTS.md
- docs/dev/master-spec.md
- docs/dev/architecture.md
- docs/dev/stack-setup.md
- docs/dev/testing-strategy.md
- docs/dev/drizzle-schema.md
</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `backend/main.py` (temporary stub to be replaced)
- Existing configuration in `backend/pyproject.toml` (Ruff setup) and `frontend/eslint.config.mjs`.

### Established Patterns
- strict layered separation: Route -> Service -> Chain.
- Quota enforcement via FastAPI dependency.
- Alembic handles schema migrations, Drizzle ORM query-only in frontend.
- Python 3.12, FastAPI, Ruff for backend. Next.js 15, TypeScript, Tailwind 4, shadcn/ui, ESLint for frontend.

### Integration Points
- Upstash Redis for ARQ worker integration.
- Neon PostgreSQL with pgvector for storage.
- Cloudflare R2 for document upload storage.
- NextAuth v5 to FastAPI auth synchronization (`/api/v1/auth/sync`).
</code_context>

<specifics>
## Specific Ideas

No specific requirements — open to standard approaches.
</specifics>

<deferred>
## Deferred Ideas

None — analysis stayed within phase scope.
</deferred>
