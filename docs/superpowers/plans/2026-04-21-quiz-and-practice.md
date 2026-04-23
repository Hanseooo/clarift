# Quiz Generation & Targeted Practice Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the single-question carousel quiz attempt flow, a results page with a mastery graph, and a targeted practice flow starting with an AI mini-lesson.

**Architecture:** Next.js Client Components for interactive attempt flow. Backend uses async ARQ jobs with SSE streaming for quiz generation (similar to document upload/summary). Route → Service → Chain layer pattern enforced. Content analysis determines quiz‑type applicability flags.

**Tech Stack:** Next.js 15, Recharts (Mastery Graph), FastAPI, LangChain, Gemini 2.5 Flash Lite, ARQ (Redis), PostgreSQL + pgvector.

---

## Chunk 0: Backend Foundation

### Task 0: ARQ Worker & Job Processing

**Files:**
- Modify: `backend/src/worker.py`
- Modify: `backend/src/api/routers/jobs.py` (SSE streaming)

- [ ] **Step 1: Add Quiz Job Function**
Create `run_quiz_job` with tenacity retry (`wait_exponential(min=4, max=30), stop_after_attempt(5)`). Include `asyncio.sleep(2)` between LLM calls. Update job status (pending → processing → completed/failed).

- [ ] **Step 2: Ensure User‑Scoped Vector Retrieval**
Verify all vector queries filter by `user_id` before similarity search (security compliance).

- [ ] **Step 3: Commit**
```bash
git add backend/src/worker.py backend/src/api/routers/jobs.py
git commit -m "feat: add quiz generation ARQ worker with retry and throttling"
```

### Task 1: Service Layer

**Files:**
- Create: `backend/src/services/quiz_service.py`
- Create: `backend/src/services/practice_service.py`
- Modify: `backend/src/services/quota_service.py` (ensure quiz quota)

- [ ] **Step 1: Implement Quiz Service**
Add `resolve_quiz_settings()` (from `docs/dev/quiz‑settings.md`), `calculate_question_count()`, `distribute_questions()`, `create_quiz_job()`, `get_quiz_by_id()`.

- [ ] **Step 2: Implement Practice Service**
Add methods for creating practice sessions, retrieving weak topics, generating mini‑lessons.

- [ ] **Step 3: Update Quota Service**
Ensure `enforce_quota("quiz")` and `enforce_quota("practice")` exist and are wired.

- [ ] **Step 4: Commit**
```bash
git add backend/src/services/
git commit -m "feat: add quiz and practice service layer"
```

### Task 2: Chain Reorganization & Content Analysis

**Files:**
- Move: `backend/src/services/quiz_chain.py` → `backend/src/chains/quiz_chain.py`
- Move: `backend/src/services/practice_chain.py` → `backend/src/chains/practice_chain.py`
- Create: `backend/src/chains/content_analysis_chain.py`
- Create: `backend/src/chains/__init__.py`

- [ ] **Step 1: Move Chains to chains/ Directory**
Update imports throughout codebase. Ensure `quiz_chain.py` implements the 5‑step process from `docs/dev/quiz.md`.

- [ ] **Step 2: Create Content Analysis Chain**
Implement chain that determines quiz‑type applicability flags (true/false, identification, multi‑select, ordering) and stores them in `summaries.quiz_type_flags`. Integrate with summary generation pipeline (run as Step 6b, parallel to MermaidJS diagram).

- [ ] **Step 3: Add Tenacity Retry to All Gemini Calls**
Apply `@retry(wait=wait_exponential(min=1, max=8), stop=stop_after_attempt(3))` to all LLM calls. Add `is_retryable_error()` helper.

- [ ] **Step 4: Commit**
```bash
git add backend/src/chains/ backend/src/services/
git commit -m "feat: reorganize chains, add content analysis, and enforce retry"
```

### Task 3: Route Updates

**Files:**
- Modify: `backend/src/api/routers/quizzes.py`
- Modify: `backend/src/api/routers/practice.py`
- Modify: `backend/src/api/deps.py` (ensure quota dependencies)

- [ ] **Step 1: Update Quiz Router**
Change to use `quiz_service.create_quiz_job()` instead of direct chain call. Keep `enforce_quota("quiz")` dependency. Return job ID for SSE streaming.

- [ ] **Step 2: Update Practice Router**
Change to use `practice_service` methods. Add `enforce_quota("practice")` dependency.

- [ ] **Step 3: Test SSE Streaming**
Verify `/api/v1/jobs/{job_id}/stream` works for quiz generation progress.

- [ ] **Step 4: Commit**
```bash
git add backend/src/api/routers/
git commit -m "feat: update quiz and practice routes to use service layer and SSE"
```

### Task 4: Database Migration & Schema Updates

**Files:**
- Create Alembic migration: `backend/alembic/versions/xxxx_add_quiz_type_flags.py`
- Update: `frontend/src/db/schema.ts`

- [ ] **Step 1: Add quiz_type_flags Column to Summaries Table**
Create migration adding `quiz_type_flags JSONB` column to `summaries` table (nullable). Update SQLAlchemy model.

- [ ] **Step 2: Update Drizzle Schema**
Add `quizTypeFlags` field to `summaries` table schema in frontend.

- [ ] **Step 3: Run Migrations**
Apply migration: `alembic upgrade head`. Verify column exists.

- [ ] **Step 4: Commit**
```bash
git add backend/alembic/versions/ frontend/src/db/schema.ts
git commit -m "feat: add quiz_type_flags column to summaries table"
```

---

## Chunk 1: Frontend SSE Integration & Quiz Attempt UX

### Task 4: SSE Streaming for Quiz Generation

**Files:**
- Modify: `frontend/src/hooks/use-job-status.ts`
- Modify: `frontend/src/app/documents/[id]/page.tsx` (reference pattern)
- Create: `frontend/src/app/quizzes/new/page.tsx`

- [ ] **Step 1: Extend useJobStatus Hook**
Add support for quiz job type. Poll job status via SSE, show progress steps (retrieving chunks, generating questions, validating).

- [ ] **Step 2: Create Quiz Generation Page**
Page that shows quiz settings panel, starts job, displays progress via SSE, redirects to attempt page when complete.

- [ ] **Step 3: Commit**
```bash
git add frontend/src/hooks/ frontend/src/app/quizzes/
git commit -m "feat: add SSE streaming for quiz generation"
```

### Task 5: Quiz Settings Panel Component

**Files:**
- Create: `frontend/src/components/features/quiz/quiz-settings-panel.tsx`
- Modify: `frontend/src/app/quizzes/new/page.tsx` (integrate panel)

- [ ] **Step 1: Build Settings Panel**
Implement component that displays quiz type applicability flags (from `summary.quizTypeFlags`). Show auto toggle, checkboxes for applicable types (disabled when auto on). Follow UI spec from `docs/dev/quiz‑settings.md`.

- [ ] **Step 2: Integrate with Quiz Generation Page**
Connect panel to quiz generation page, pass selected settings to backend via `QuizSettings` schema.

- [ ] **Step 3: Commit**
```bash
git add frontend/src/components/features/quiz/ frontend/src/app/quizzes/
git commit -m "feat: add quiz settings panel with applicability flags"
```

### Task 6: Wizard / Carousel Component

**Files:**
- Create: `frontend/src/components/features/quiz/attempt-wizard.tsx`
- Create: `frontend/src/app/quizzes/[id]/attempt/page.tsx`

- [ ] **Step 1: Build Carousel Layout**
Manage `currentQuestionIndex` state. Display `questions[currentQuestionIndex]`. Add "Previous" and "Next" buttons, updating index. Disable "Next" if no answer selected (unless optional). Change "Next" to "Submit" on the last index.

- [ ] **Step 2: Question Type Mappers**
Render specific shadcn components based on `question.type`: `RadioGroup` for MCQ, `Input` for Identification, `Checkbox` for Multi‑select, draggable list for Ordering.

- [ ] **Step 3: Commit**
```bash
git add frontend/src/components/features/quiz/ frontend/src/app/quizzes/
git commit -m "feat: implement quiz attempt carousel wizard"
```

---

## Chunk 2: Results & Mastery Graph

### Task 7: Mastery Radar Chart

**Files:**
- Modify: `frontend/package.json`
- Create: `frontend/src/components/features/quiz/mastery-chart.tsx`

- [ ] **Step 1: Install Recharts**
```bash
pnpm add recharts
```

- [ ] **Step 2: Build Chart Component**
Use a `<RadarChart>` from recharts to plot accuracy percentages by subtopic based on the graded quiz results payload.

- [ ] **Step 3: Commit**
```bash
git add frontend/package.json frontend/src/components/features/quiz/mastery-chart.tsx
git commit -m "feat: add mastery radar chart component"
```

### Task 8: Graded Results View

**Files:**
- Create: `frontend/src/app/quizzes/[id]/results/page.tsx`

- [ ] **Step 1: Detailed List View**
Render the overall score and the Mastery Chart. Below it, map through each question: show user answer (red/green bg), correct answer, and `ai_explanation`.

- [ ] **Step 2: Weak Area Trigger**
Calculate if any subtopic scored `< 70%`. If true, render an amber "Start Targeted Practice" button linking to `/practice?topics=...`.

- [ ] **Step 3: Commit**
```bash
git add frontend/src/app/quizzes/
git commit -m "feat: implement graded results page with explanations"
```

---

## Chunk 3: Targeted Practice Flow

### Task 9: Backend Mini‑Lesson & Drill Generation

**Files:**
- Modify: `backend/src/chains/practice_chain.py`
- Modify: `backend/src/api/routers/practice.py`

- [ ] **Step 1: Create Lesson Endpoint**
Create `POST /api/v1/practice/lesson` that accepts `topics: list[str]`. Retrieve top 3 relevant chunks per topic. Generate a concise, 2‑paragraph explanation of the concepts.

- [ ] **Step 2: Add Drill Difficulty Logic**
Modify the existing `generate_drills` chain to enforce difficulty progression (Level 1 to 3) in the prompt.

- [ ] **Step 3: Commit**
```bash
git add backend/src/chains/ backend/src/api/routers/
git commit -m "feat: add practice mini‑lesson endpoint and difficulty scaling"
```

### Task 10: Practice Frontend UI

**Files:**
- Create: `frontend/src/app/practice/page.tsx`
- Create: `frontend/src/components/features/practice/mini‑lesson.tsx`

- [ ] **Step 1: Display Lesson Before Quiz**
Fetch the mini‑lesson text. Display it using the enhanced `react‑markdown` renderer. Add a primary button: "Start Drill".

- [ ] **Step 2: Connect to Wizard**
Clicking "Start Drill" transitions state to render the exact same `AttemptWizard` component used for regular quizzes, passing the generated 5 practice questions.

- [ ] **Step 3: Commit**
```bash
git add frontend/src/app/practice/ frontend/src/components/features/practice/
git commit -m "feat: implement targeted practice mini‑lesson flow"
```

---

## Verification & Testing

### Task 11: Comprehensive Testing

**Files:**
- Create: `backend/tests/test_quiz_chain.py`
- Create: `backend/tests/test_quiz_service.py`
- Create: `backend/tests/test_content_analysis_chain.py`
- Create: `frontend/src/app/quizzes/[id]/attempt/page.test.tsx`
- Create: `frontend/src/app/quizzes/[id]/results/page.test.tsx`

- [ ] **Step 1: Backend Unit Tests**
Test quiz chain 5‑step process, content analysis chain, quiz service settings resolution, quota enforcement, and error retry logic.

- [ ] **Step 2: Frontend Component Tests**
Test carousel navigation, question type rendering, mastery chart, and SSE integration.

- [ ] **Step 3: Integration Tests**
Test full flow: quiz generation → attempt → grading → weak area detection → practice.

- [ ] **Step 4: Generate API Types**
Run `pnpm run generate:api` after all backend changes to sync frontend types.

- [ ] **Step 5: Commit**
```bash
git add backend/tests/ frontend/src/**/*.test.tsx
git commit -m "test: comprehensive quiz and practice tests"
```
