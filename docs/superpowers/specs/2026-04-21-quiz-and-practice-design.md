# Quiz Generation & Targeted Practice Design Spec

## Overview
This feature implements the core interactive learning tools of the MVP: generating quizzes from documents, providing an engaging one-question-per-page attempt flow, detailed grading with AI explanations and mastery graphs, and a targeted practice loop that includes remedial lessons for weak areas.

## Backend Architecture

### ARQ Worker & Job Processing
- **Async Job Pattern:** Quiz generation runs as an async ARQ job with SSE streaming, following the same pattern as document upload and summary generation.
- **Worker Function:** `run_quiz_job` in `backend/src/worker.py` with tenacity retry (exponential backoff, stop after 5 attempts).
- **Throttling:** `asyncio.sleep(2)` between LLM calls to avoid Gemini rate limits.
- **Job Records:** Creates `Job` record with status updates (pending → processing → completed/failed) for real‑time progress tracking via SSE.
- **Security:** All vector queries filter by `user_id` before similarity search.

### Service Layer
- **Quiz Service:** `backend/src/services/quiz_service.py` mediates between route and chain:
  - `resolve_quiz_settings()`: Implements logic from `docs/dev/quiz‑settings.md` for auto/manual mode and question type distribution.
  - `calculate_question_count()`: Scales total questions with chunk count (5–25 questions).
  - `distribute_questions()`: Allocates questions across selected types (MCQ gets ~50%).
  - `create_quiz_job()`: Validates input, creates Job record, enqueues ARQ job, returns job ID.
  - `get_quiz_by_id()`: Retrieves quiz with user‑ownership check.
- **Practice Service:** `backend/src/services/practice_service.py` for practice session management.

### Chain Layer
- **Chain Directory:** All AI chains moved to `backend/src/chains/` (per architecture docs).
- **Quiz Chain:** `backend/src/chains/quiz_chain.py` implements the 5‑step process from `docs/dev/quiz.md`:
  1. Retrieve top 5 document chunks (user‑scoped vector search).
  2. Extract key factual statements using LLM.
  3. Generate questions based on facts and resolved question distribution.
  4. Validate questions for correctness and diversity (retry on failure).
  5. Output structured `QuizChainOutput` (validated Pydantic model).
- **Content Analysis Chain:** `backend/src/chains/content_analysis_chain.py` determines quiz‑type applicability flags (true/false, identification, multi‑select, ordering) and stores them in the `summaries` table.
- **Practice Chain:** `backend/src/chains/practice_chain.py` generates remedial mini‑lessons and practice drills for weak topics.

### Error Handling & Retry
- **Tenacity Retry:** All Gemini calls use `@retry(wait=wait_exponential(min=1, max=8), stop=stop_after_attempt(3))`.
- **Retryable Errors:** `is_retryable_error()` helper excludes quota/RESOURCE_EXHAUSTED errors.
- **Comprehensive Logging:** Job status updates on failure, detailed error context for debugging.

### Route Updates
- **Quiz Router:** `backend/src/api/routers/quizzes.py` updated to:
  - Use `quiz_service.create_quiz_job()` instead of direct chain call.
  - Maintain quota enforcement via `enforce_quota("quiz")` dependency.
  - Return job ID for SSE streaming (`/api/v1/jobs/{job_id}/stream`).
- **Practice Router:** `backend/src/api/routers/practice.py` updated to use service layer.

## Quiz Attempt Flow (The "Taking" Experience)
- **UI Layout:** A "One Question Per Page" carousel wizard. 
- **Navigation:** Users click "Next" or "Previous" to navigate between questions. A progress bar (e.g., "Question 3 of 10") sits at the top.
- **Component Mapping:**
  - Multiple Choice: A list of options with A/B/C/D letter badges.
  - True/False: Two large, equally sized buttons.
  - Identification: A text input field.
  - Multi-select: A list of checkboxes.
  - Ordering: A draggable, sortable list component.
- **Submission:** On the final question, the "Next" button becomes a primary "Submit Quiz" button.

## Graded Results Page
- **Overview Header:** Displays the overall percentage score prominently.
- **Mastery Graph:** A visual representation (e.g., a Bar or Radar chart) breaking down the user's accuracy by subtopic for that specific quiz.
- **Detailed Review List:** A vertically scrolling list showing every question.
  - Displays the user's answer (styled green if correct, red if incorrect).
  - Displays the correct answer.
  - **AI Explanation:** A short, AI-generated explanation clarifying *why* the correct answer is right and the others are wrong.
- **Weak Area Trigger:** If any subtopic scores below 70%, an amber-colored "Targeted Practice" CTA appears.

## Targeted Practice Flow
- **Remedial Lesson (The "Before"):** Before diving straight into questions, the flow starts with a short "Mini-Lesson" screen. The AI generates a concise, targeted explanation of the weak topic to help the user actually *understand* the concept, not just memorize answers.
- **Drill Generation:** The backend retrieves the top 3 document chunks associated with the user's weakest topics and generates 5 practice drill questions.
- **Difficulty Progression:** The drills logically progress in difficulty from Level 1 (basic recall) to Level 3 (application/calculation).
- **Drill UI:** Uses the exact same "One Question Per Page" Carousel UI as the main quiz to maintain familiarity, followed by a similar Results page.
