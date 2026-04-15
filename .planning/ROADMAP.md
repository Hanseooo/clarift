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
**Goal:** Complete the AI learning loop by implementing quiz generation with attempts, weak area detection, targeted practice drills, grounded chat, and frontend integration, with full quota enforcement.
**Plans:** 9 plans
- [ ] 02-01-PLAN.md — Expand quota system (add chat_used column, update quota_service.py, create enforce_quota dependency)
- [ ] 02-02-PLAN.md — Integrate quiz chain with real database updates, implement attempt scoring and user_topic_performance updates
- [ ] 02-03-PLAN.md — Create practice chain, implement weak areas detection, integrate with quota enforcement
- [ ] 02-04-PLAN.md — Add quota enforcement to chat route, implement chunk retrieval in chat chain
- [ ] 02-05-PLAN.md — Build frontend UI for quizzes: list, creation, and attempt pages
- [ ] 02-06-PLAN.md — Generate OpenAPI schema and TypeScript API types for new endpoints
- [ ] 02-07-PLAN.md — Build frontend UI for practice: weak areas display, practice creation, and attempt pages
- [ ] 02-08-PLAN.md — Build frontend UI for chat: document selector, chat input, message display
- [ ] 02-09-PLAN.md — Integration tests for core loop flows

### 2.1 Quiz Flow
- **Backend:** Quiz generation with quota, attempt scoring, weak area detection.
- **Frontend:** Quiz list, creation, attempt UI with letter-badge options.

### 2.2 Practice Flow
- **Backend:** Weak areas detection, practice chain, drill generation.
- **Frontend:** Weak areas display, practice creation, attempt UI.

### 2.3 Chat Flow
- **Backend:** Chat quota enforcement, chunk retrieval, citation generation.
- **Frontend:** Document selector, chat input, message display.

### 2.4 Integration & Testing
- **Backend:** OpenAPI schema generation, integration tests.
- **Frontend:** API type generation, integration tests.
