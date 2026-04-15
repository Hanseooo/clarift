# Roadmap: Clarift MVP

This roadmap is based directly on the 3-week `implementation-plan.md`.

## Phase 1: Backend Foundation
**Goal:** Full async backend running locally. Every endpoint exists. Core loop works end-to-end (even if slowly).

**Plans:** 7 plans
- [x] 01-01-PLAN.md — Initialize FastAPI app structure and SQLAlchemy/Alembic config.
- [x] 01-02-PLAN.md — Initialize Next.js frontend, UI tools, and OpenAPI client.
- [x] 01-03-PLAN.md — Implement DB models (SQLAlchemy/Drizzle) and run initial migrations.
- [x] 01-04-PLAN.md — Gap Closure: Implement Auth & Jobs endpoints and wire in main.py.
- [x] 01-05-PLAN.md — Gap Closure: Implement Document processing pipeline & Summary chain.
- [x] 01-06-PLAN.md — Gap Closure: Implement Quizzes, Practice, and Chat routers.
- [x] 01-07-PLAN.md — Gap Closure: Generate OpenAPI schema and update frontend API client.

### 1.1 Project Skeleton + Infra
- **Backend:** Monorepo init, FastAPI app setup.
- **Frontend:** Next.js 15 init.

### 1.2 Auth + User Sync
- **Backend:** `POST /auth/sync`, `GET /auth/me`, JWT verification dependency, `get_current_user`.
- **Frontend:** Clerk authentication (Google OAuth), login UI.

### 1.3 Document Upload + ARQ Pipeline
- **Backend:** `POST /documents/upload`, ARQ `process_document` job, `GET /jobs/{job_id}/stream`.
- **Frontend:** Document upload UI, drag-and-drop.

### 1.4 Summary Chain + Quota
- **Backend:** `summary_chain.py`, `summary_service.py`, `POST /summaries`, `GET /summaries/{document_id}`, `quota_service.py`.
- **Frontend:** Wire upload to request summary.

### Phase 1.5: Auth Migration
**Goal:** Migrate from NextAuth v5 to Clerk authentication. Replace auth system with Clerk and update user sync endpoints.
- **Backend:** Update `get_current_user` dependency to verify Clerk JWTs.
- **Frontend:** Migrate NextAuth to Clerk UI components and middleware.

## Phase 2: Core Loop Completion
... (unchanged)
