# Design Doc: Quiz Creation UX Fix

**Date:** 2026-05-05  
**Scope:** Frontend quiz creation flows + backend API honesty  
**Status:** Approved by user

## Problem

1. **Crash:** Quick Quiz sidebar redirects to `/quizzes/{id}/attempt` before background job finishes, causing `TypeError` on `currentQuestion.type`.
2. **Broken slider:** Quick Quiz shows a question-count slider (5–30) but the backend ignores `question_count` entirely, calculating its own count from document chunk count.
3. **Broken manual types:** The full Generate Quiz form (`/quizzes/new`) lets users toggle question types, but `type_overrides` is silently dropped by FastAPI because it's not in the `CreateQuizRequest` schema.
4. **Layout:** The Generate Quiz form is not centered on the page.
5. **Missing shortcut:** There's no quick way to jump from `/quizzes` to `/quizzes/new` with a document pre-selected.

## Proposed Solution (Option C)

### Frontend — Quick Quiz Sidebar (`quiz-creation.tsx`)
- **Strip down** to a true "quick" action:
  - Document `<Select>` only
  - Large primary **"Generate Quiz"** button (full width)
  - Small secondary **"Customize settings →"** link that navigates to `/quizzes/new?document_id={id}`
  - Remove the misleading question-count slider entirely
- **Center the card** with `mx-auto` on mobile (already centered in the grid, but verify)
- **Keep SSE progress** flow: after clicking "Generate Quiz", show progress bar, then "Start Quiz" button
- **Redirect to `/quizzes/{id}`** (quiz detail page, not attempt page) after generation. The user can then click "Start Quiz" from there.

### Frontend — Generate Quiz Form (`quiz-generation-form.tsx`)
- **Add `mx-auto`** to the container so it centers within the page
- **Wire `type_overrides`** into the API call payload (once backend supports it)
- **Fix `question_count`** — stop hardcoding `5`; either read from a field or remove it and let backend decide
- **Keep existing wizard flow** (select → settings → generating → complete)

### Frontend — Quiz Detail Page (`/quizzes/[id]/page.tsx`)
- Ensure it has a clear **"Start Quiz"** CTA when the quiz is ready and questions are populated

### Backend — `POST /api/v1/quizzes` (`routers/quizzes.py`)
- **Extend `CreateQuizRequest`** schema to include:
  - `question_count: int = 5` (already present but unused)
  - `type_overrides: list[str] | None = None`
- **Pass `question_count`** through to `QuizRequest`
- **Pass `type_overrides`** through to `QuizSettings`

### Backend — `create_quiz_job` (`services/quiz_service.py`)
- **Respect `question_count`** from request when provided (override chunk-based heuristic)
- **Respect `type_overrides`** when `auto_mode=False`
- **Enforce max 20** questions (current validation)

## Files to Modify

| File | Change |
|------|--------|
| `frontend/src/components/features/quiz/quiz-creation.tsx` | Strip down UI, add customize link, remove slider |
| `frontend/src/components/features/quiz/quiz-generation-form.tsx` | Add `mx-auto`, wire `type_overrides`, fix `question_count` |
| `frontend/src/app/(app)/quizzes/[id]/page.tsx` | Verify "Start Quiz" CTA exists |
| `backend/src/api/routers/quizzes.py` | Extend schema, pass new fields to service |
| `backend/src/services/quiz_service.py` | Respect `question_count` and `type_overrides` |

## Out of Scope
- Redesigning the quiz detail page beyond ensuring a clear "Start Quiz" button
- Changing the backend chunking heuristic when `question_count` is not provided
- Adding a new question-count input to the full form (backend will respect it if sent; frontend may omit it for now)

## Verification
- Quick Quiz generates a quiz and redirects to quiz detail page without crash
- "Customize settings" link opens `/quizzes/new?document_id={id}` with document pre-selected
- Full form respects manual type selections and generates the requested types
- Frontend build passes (`pnpm run build`)
- Frontend tests pass (`pnpm run test:run`)
- Backend tests pass (`pytest`)
