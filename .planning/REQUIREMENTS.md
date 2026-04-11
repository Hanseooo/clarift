# Requirements: Clarift MVP

## 1. System Overview
Clarift is a Next.js (frontend) and FastAPI (backend) application. The frontend handles UI, Auth, CRUD, and Payments, while the backend handles all AI processing, vector search, queues, and quota enforcement.

## 2. In-Scope MVP Features
*These are the absolute boundaries. Anything outside is Phase 2+.*

### Core Infrastructure & Auth
- **Google OAuth** (NextAuth v5 on frontend, synced to backend).
- **Onboarding** (capture global user settings).
- **Pro Subscription via PayMongo** (upgrade/downgrade logic).
- **Env-Based Pro Override** for testing without real payments.

### Document Processing
- **Document Upload** (PDF, image, text) + async processing via ARQ queue.
- **R2 Storage** for files.
- **Vector Embeddings** stored in Neon pgvector (chunked via tiktoken).
- **SSE Streams** for real-time progress updates to the UI.

### AI Learning Loop
- **Structured Summary** (5-step chain: top 5 chunks → concepts → topics → outline → summary).
- **MermaidJS Diagrams** embedded in summaries when applicable.
- **Quiz Generation + Attempts** (MCQ, T/F, fill-in, topic tagged).
- **Quiz Settings** (auto/manual, type flagging).
- **Weak Area Detection** (topics with attempts >= 5 AND accuracy < 70% AND quiz_count >= 2).
- **Targeted Practice** (focused drills on weak topics).
- **Grounded Chat** (Gemini Flash Lite, SSE streaming, cites chunk IDs, strictly scoped to user material).

### User Settings & Quotas
- **Global Settings** (output format, explanation style, custom instructions).
- **Per-Generation Overrides** (can override global settings for a single request).
- **Quota System** (count-based, daily reset at midnight PH time).

## 3. Out-of-Scope (Phase 2+)
- Spaced repetition, flashcards, study streaks, progress tracking history, topic review history.
- Redis caching of AI outputs (embeddings, summaries, quiz outputs).
- Token-based credits (replacing count system).
- Magic link auth, web search fallback.
- Multi-document synthesis, domain-specific learning modes.

## 4. Technical Constraints
1. **Routes → Services → Chains** layer enforcement on backend.
2. **Quota enforcement** is a FastAPI dependency on the route, never inside a service.
3. **All vector queries** must filter by `user_id` before similarity search.
4. **Never pass full document content** to an LLM. Always use retrieved chunks (max 5).
5. **All Gemini calls** use `tenacity` retry.
6. **Alembic owns all migrations** (no Drizzle migrations).
7. **Chains never touch the database** directly.
8. **Frontend DB queries** only in Server Actions or Server Components.
9. **Never accept `userId`** as a parameter in a Server Action (always from session).
10. **Do not manually edit `src/types/api.ts`** (always generated).