# Phase 01: backend-foundation - Discussion Log (Assumptions Mode)

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions captured in CONTEXT.md — this log preserves the analysis.

**Date:** 2026-04-12
**Phase:** 01-backend-foundation
**Mode:** assumptions
**Areas analyzed:** Infrastructure & Schema Management, API Architecture & Logic Layering, Codebase State & Contracts

## Assumptions Presented

### Infrastructure & Schema Management
| Assumption | Confidence | Evidence |
|------------|-----------|----------|
| `arq` and Upstash Redis will be the exclusive combination for handling background async tasks (specifically the document ingestion pipeline). | Confident | docs/dev/stack-setup.md |
| Alembic has absolute, exclusive ownership over database schema migrations, meaning Drizzle is restricted to read/write querying on the frontend. | Confident | docs/dev/AGENTS.md, docs/dev/stack-setup.md |

### API Architecture & Logic Layering
| Assumption | Confidence | Evidence |
|------------|-----------|----------|
| The backend must strictly follow the `Route -> Service -> Chain` layering, keeping FastAPI routes as thin HTTP wrappers. | Confident | docs/dev/stack-setup.md, docs/dev/AGENTS.md |
| Quota limit enforcement is handled globally via FastAPI dependency injection at the route level, not deep inside the services. | Confident | docs/dev/AGENTS.md |

### Codebase State & Contracts
| Assumption | Confidence | Evidence |
|------------|-----------|----------|
| The existing `backend/main.py` is merely a temporary stub and will be completely overwritten by the robust FastAPI setup defined in the documentation. | Likely | backend/main.py, docs/dev/stack-setup.md |
| The frontend relies entirely on OpenAPI-generated types for its API layer, strictly avoiding manual type definitions for backend payloads. | Confident | frontend/package.json, generated API specs |

## Corrections Made

No corrections — all assumptions confirmed.
