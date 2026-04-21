# Quiz Generation & Targeted Practice Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the single-question carousel quiz attempt flow, a results page with a mastery graph, and a targeted practice flow starting with an AI mini-lesson.

**Architecture:** Next.js Client Components for the interactive attempt flow. Backend `/api/quizzes/generate` returns structured JSON. A new `/api/practice/lesson` endpoint for remedial lessons.

**Tech Stack:** Next.js 15, Recharts (for Mastery Graph), FastAPI, LangChain.

---

## Chunk 1: Quiz Attempt UX

### Task 1: Wizard / Carousel Component

**Files:**
- Create: `frontend/src/components/features/quiz/attempt-wizard.tsx`
- Create: `frontend/src/app/quizzes/[id]/attempt/page.tsx`

- [ ] **Step 1: Build Carousel Layout**
Manage `currentQuestionIndex` state. Display `questions[currentQuestionIndex]`. Add "Previous" and "Next" buttons, updating index. Disable "Next" if no answer selected (unless optional). Change "Next" to "Submit" on the last index.

- [ ] **Step 2: Question Type Mappers**
Render specific shadcn components based on `question.type`: `RadioGroup` for MCQ, `Input` for Identification, `Checkbox` for Multi-select.

- [ ] **Step 3: Commit**
```bash
git add frontend/src/components/features/quiz/ frontend/src/app/quizzes/
git commit -m "feat: implement quiz attempt carousel wizard"
```

## Chunk 2: Results & Mastery Graph

### Task 2: Mastery Radar Chart

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

### Task 3: Graded Results View

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

## Chunk 3: Targeted Practice Flow

### Task 4: Backend Mini-Lesson Generation

**Files:**
- Modify: `backend/app/chains/practice_chain.py`
- Modify: `backend/app/routes/practice.py`

- [ ] **Step 1: Create Lesson Endpoint**
Create `POST /api/practice/lesson` that accepts `topics: list[str]`. Retrieve top 3 relevant chunks per topic. Generate a concise, 2-paragraph explanation of the concepts.

- [ ] **Step 2: Add Drill Difficulty Logic**
Modify the existing `generate_drills` chain to enforce difficulty progression (Level 1 to 3) in the prompt.

- [ ] **Step 3: Commit**
```bash
git add backend/app/chains/ backend/app/routes/
git commit -m "feat: add practice mini-lesson endpoint and difficulty scaling"
```

### Task 5: Practice Frontend UI

**Files:**
- Create: `frontend/src/app/practice/page.tsx`
- Create: `frontend/src/components/features/practice/mini-lesson.tsx`

- [ ] **Step 1: Display Lesson Before Quiz**
Fetch the mini-lesson text. Display it using the enhanced `react-markdown` renderer. Add a primary button: "Start Drill".

- [ ] **Step 2: Connect to Wizard**
Clicking "Start Drill" transitions state to render the exact same `AttemptWizard` component used for regular quizzes, passing the generated 5 practice questions.

- [ ] **Step 3: Commit**
```bash
git add frontend/src/app/practice/ frontend/src/components/features/practice/
git commit -m "feat: implement targeted practice mini-lesson flow"
```
