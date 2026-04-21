# Phase 2: Core Loop Completion - Context

**Gathered:** 2026-04-15
**Status:** Ready for planning
**Source:** Implementation plan Week 2, existing codebase patterns

<domain>
## Phase Boundary

Complete the core learning loop: Quiz generation with attempts, weak area detection, targeted practice drills, grounded chat, and integration testing. All AI features operational with quota enforcement, proper error handling, and frontend integration.

**Goal:** Complete learning loop working end-to-end. Every AI feature operational.

**Scope:**
- Quiz generation chain integration with real database updates
- Quiz attempt scoring and weak area detection (user_topic_performance updates)
- Practice chain implementation for targeted drills
- Weak areas endpoint (`GET /practice/weak-areas`)
- Grounded chat SSE streaming with chunk citations
- Quota enforcement on all routes (quiz, practice, chat)
- Frontend UI integration for quizzes, practice, chat
- End-to-end integration testing

**Out of scope:** Payments, onboarding, document upload (already done), caching, token-based credits, spaced repetition.

</domain>

<decisions>
## Implementation Decisions

### Architecture Patterns
- **D-01:** Maintain strict layer pattern: routes → services → chains. No bypassing layers.
- **D-02:** Quota enforcement is a FastAPI dependency on the route, never inside a service.
- **D-03:** All vector queries must filter by `user_id` before similarity search (security).
- **D-04:** Never pass full document content to an LLM. Use retrieved chunks (max 5).
- **D-05:** All Gemini calls use tenacity retry (already pattern).
- **D-06:** Chains never touch the database directly; services fetch chunks and pass to chains.
- **D-07:** Alembic owns all migrations (no Drizzle migrations in backend).
- **D-08:** Frontend DB queries only in Server Actions (writes) or Server Components (reads).
- **D-09:** Never accept `userId` as a parameter in a Server Action; always read from auth session.
- **D-10:** Do not manually edit `src/types/api.ts`; always run `pnpm run generate:api` after backend changes.

### Backend Implementation
- **D-11:** Quiz chain (`quiz_chain.py`) already exists; integrate with real database updates (store generated questions in Quiz record).
- **D-12:** Quiz attempt scoring: calculate score based on correct answers, update `user_topic_performance` table per topic.
- **D-13:** Weak area detection: implement `GET /practice/weak-areas` endpoint that queries `user_topic_performance` for topics where `attempts >= 5 AND accuracy < 70% AND quiz_count >= 2`.
- **D-14:** Practice chain: implement `practice_chain.py` that takes weak topics and generates focused drills with progressive difficulty flag.
- **D-15:** Practice route quota enforcement: add `Depends(enforce_quota("practice"))` to `POST /practice`.
- **D-16:** Quizzes route quota enforcement: add `Depends(enforce_quota("quiz"))` to `POST /quizzes`.
- **D-17:** Chat route quota enforcement: add `Depends(enforce_quota("chat"))` (need to add "chat" feature to quota service).
- **D-18:** Chat chain (`chat_chain.py`) already exists; implement SSE streaming with cited chunk IDs, strict scope to user material, fallback when no relevant chunks.
- **D-19:** Add quota dependency function `enforce_quota` in `src/api/deps.py` (or separate module) that calls `check_and_increment_quota`.
- **D-20:** Ensure all quota checks happen before chain execution; increment after successful generation.
- **D-21:** Add "chat" feature to `TIER_LIMITS` in `quota_service.py` (free: 5, pro: 20).
- **D-22:** Add "chat" column to `UserUsage` model (via Alembic migration).
- **D-23:** Integration testing: write pytest for full loop (upload → summary → quiz → attempt → weak areas → practice).

### Frontend Implementation
- **D-24:** Quiz UI: question flow, option selection, submit button, score reveal with per-topic breakdown.
- **D-25:** Practice UI: drill flow, answer submission, explanation display.
- **D-26:** Chat UI: message input, streaming response display, document selector (which docs to chat with), citation display.
- **D-27:** Weak areas display: visual accuracy meters (amber only, not red).
- **D-28:** Use letter-badge variant (A/B/C/D box + text) for quiz multiple choice options (no plain text buttons).
- **D-29:** Chat waiting state: three-dot pulse animation with "Searching your notes..." label (not blank or "...").
- **D-30:** All UI components follow design tokens from `design.md`; replace hardcoded 21st.dev colors with brand tokens.
- **D-31:** Feature-specific components go in `components/features/[feature]/`, not `components/ui/`.
- **D-32:** Default to Server Components; add `"use client"` only for state, effects, event handlers.
- **D-33:** Wire frontend pages to real API endpoints (remove mocks).
- **D-34:** Error state UI for every screen (quota exceeded, document not ready, generation failed).
- **D-35:** Loading/empty states for every screen.

### OpenCode's Discretion
- Exact implementation details of quiz scoring algorithm (weighting, partial credit).
- Specific prompt engineering for practice chain progressive difficulty.
- UI layout details (grid vs flex) as long as they follow design tokens.
- Test coverage thresholds beyond happy path and main error case.
- Naming of new database columns (consistent with existing).
- Choice of SSE library on frontend (native EventSource or custom hook).

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Architecture & Patterns
- `docs/dev/architecture.md` — System design, directory structure, layer enforcement
- `docs/dev/master-spec.md` — Stack, schema, API contract
- `docs/dev/decisions.md` — Architectural choices
- `docs/dev/modularity-guidelines.md` — Code organization

### Backend Implementation
- `backend/src/services/summary_chain.py` — Example chain pattern (tenacity retry, input/output types)
- `backend/src/api/routers/summaries.py` — Example route with quota dependency (if exists)
- `backend/src/services/quota_service.py` — Quota enforcement logic, feature definitions
- `backend/src/db/models.py` — Current database models (Quiz, QuizAttempt, UserTopicPerformance, PracticeSession, etc.)
- `backend/alembic/versions/` — Existing migration patterns

### Frontend Implementation
- `frontend/src/app/(app)/documents/page.tsx` — Example Server Component with data fetching
- `frontend/src/components/features/summary/` — Example feature component structure
- `docs/dev/design.md` — Colors, typography, spacing, component specs
- `docs/dev/21st-dev-reference.md` — How to adapt 21st.dev components

### Testing
- `docs/dev/testing-strategy.md` — Testing approach, coverage expectations
- `backend/tests/` — Existing pytest patterns
- `frontend/src/tests/` — Vitest patterns

### Phase Context
- `docs/dev/implementation-plan.md` — Week 2 details
- `.planning/REQUIREMENTS.md` — MVP boundaries
- `.planning/STATE.md` — Current progress (Phase 1.5 auth migration)
</canonical_refs>

<specifics>
## Specific Ideas

- Quiz generation: Use Gemini to generate MCQ, T/F, fill-in questions with topic tags. Validate JSON consistency.
- Weak area detection: Query `user_topic_performance` table; algorithm: topics with attempts >= 5 AND accuracy < 70% AND quiz_count >= 2.
- Practice drills: Generate focused questions on weak topics, include progressive difficulty flag (easy/medium/hard).
- Chat: Use Gemini Flash Lite with strict system prompt, stream tokens via SSE, include cited chunk IDs in response. Fallback string: "I couldn't find relevant information in your notes. Try uploading more material or ask a different question."
- Quota enforcement: Add `enforce_quota` dependency that calls `check_and_increment_quota`. Must be applied before chain execution.
- Frontend: Use shadcn/ui components where possible; adapt 21st.dev components with brand tokens.

</specifics>

<deferred>
## Deferred Ideas

- Redis caching of AI outputs (Phase 2+)
- Token-based credits (Phase 2+)
- Magic link auth (Phase 2+)
- Web search fallback (Phase 2+)
- Multi-document synthesis (Phase 2+)
- Domain-specific learning modes (Phase 2+)
- Spaced repetition, flashcards, study streaks (Phase 2+)
- Progress tracking history (Phase 2+)
- Topic review history (Phase 2+)

</deferred>

---

*Phase: 02-core-loop-completion*
*Context gathered: 2026-04-15 via implementation plan and codebase analysis*
