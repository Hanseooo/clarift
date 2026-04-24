# Quizzes Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Redesign the quiz list, creation, attempt wizard, and results page with brand tokens. Quizzes live under `/dashboard/quizzes` with the attempt wizard showing one question at a time, and results showing animated score ring + topic breakdown.

**Architecture:** Server Component pages fetch quiz data. Client components handle creation, the one-at-a-time attempt wizard with question-type-specific inputs, and the results page with score animation. Reuses `<Card>`, `<Badge>`, `<Button>`, `<Progress>`, `<SSEProgress>` from foundation.

**Tech Stack:** Next.js 15 (App Router), TypeScript, Tailwind CSS v4, Framer Motion, Lucide React, Recharts

---

## File Structure

| File | Action | Responsibility |
|---|---|---|
| `frontend/src/app/(app)/dashboard/quizzes/page.tsx` | Replace | Quizzes list + creation page |
| `frontend/src/app/(app)/dashboard/quizzes/new/page.tsx` | Replace | Quiz generation wizard |
| `frontend/src/app/(app)/dashboard/quizzes/[id]/attempt/page.tsx` | Replace | Quiz attempt wizard |
| `frontend/src/app/(app)/dashboard/quizzes/[id]/results/page.tsx` | Replace | Quiz results with score ring |
| `frontend/src/components/features/quiz/quiz-list.tsx` | Replace | Quiz list component |
| `frontend/src/components/features/quiz/quiz-creation.tsx` | Replace | Quick quiz creation panel |
| `frontend/src/components/features/quiz/quiz-generation-form.tsx` | Replace | Multi-step quiz generation with SSE |
| `frontend/src/components/features/quiz/attempt-wizard.tsx` | Replace | One-question-at-a-time attempt |
| `frontend/src/components/features/quiz/quiz-settings-panel.tsx` | Replace | Quiz type configuration |
| `frontend/src/components/features/quiz/score-reveal.tsx` | Create | Animated score ring with count-up |
| `frontend/src/components/features/quiz/question-types.tsx` | Create | MCQ, T/F, Identification, Multi-Select, Ordering inputs |

---

## Chunk 1: Quiz List & Creation

### Task 1: Update quiz list component

**Files:**
- Modify: `frontend/src/components/features/quiz/quiz-list.tsx`

- [ ] **Step 1: Read current quiz list**

Read the file to understand existing structure.

- [ ] **Step 2: Replace with redesigned list**

```tsx
import Link from "next/link"
import { CheckSquare } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Card } from "@/components/ui/card"

interface Quiz {
  id: string
  documentTitle: string
  questionCount: number
  questionTypes: string[]
  createdAt: string
}

interface QuizListProps {
  quizzes: Quiz[]
}

export function QuizList({ quizzes }: QuizListProps) {
  if (quizzes.length === 0) {
    return (
      <div className="text-center py-8">
        <div className="size-10 rounded-xl bg-surface-subtle flex items-center justify-center mx-auto mb-2">
          <CheckSquare className="size-5 text-text-tertiary" />
        </div>
        <h3 className="text-sm font-medium text-text-primary mb-1">
          No quizzes yet
        </h3>
        <p className="text-xs text-text-tertiary">
          Upload and summarize a document first, then generate a quiz from it.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-2">
      {quizzes.map((quiz) => (
        <Link
          key={quiz.id}
          href={`/dashboard/quizzes/${quiz.id}/attempt`}
          className="block"
        >
          <Card variant="document">
            <div className="flex items-center gap-3">
              <div className="size-9 rounded-lg bg-brand-100 flex items-center justify-center flex-shrink-0">
                <CheckSquare className="size-[18px] text-brand-400" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-text-primary truncate">
                  {quiz.documentTitle}
                </p>
                <p className="text-xs text-text-tertiary mt-0.5">
                  {quiz.questionCount} questions ·{" "}
                  {new Date(quiz.createdAt).toLocaleDateString("en-PH", {
                    month: "short",
                    day: "numeric",
                  })}
                </p>
              </div>
              <div className="flex gap-1">
                {quiz.questionTypes.slice(0, 2).map((type) => (
                  <Badge key={type} variant={type as any}>
                    {type.replace("_", " ")}
                  </Badge>
                ))}
              </div>
            </div>
          </Card>
        </Link>
      ))}
    </div>
  )
}
```

- [ ] **Step 3: Commit**

```bash
git add frontend/src/components/features/quiz/quiz-list.tsx
git commit -m "feat(frontend): redesign quiz list with brand tokens"
```

### Task 2: Update quiz creation component

**Files:**
- Modify: `frontend/src/components/features/quiz/quiz-creation.tsx`

- [ ] **Step 1: Read current quiz creation**

Read the file to understand existing logic.

- [ ] **Step 2: Replace with redesigned creation panel**

```tsx
"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { useCreateQuiz } from "@/hooks/use-quiz"

interface QuizCreationProps {
  documents: { id: string; title: string }[]
}

export function QuizCreation({ documents }: QuizCreationProps) {
  const router = useRouter()
  const [selectedDoc, setSelectedDoc] = useState("")
  const [questionCount, setQuestionCount] = useState(10)
  const { mutateAsync, isLoading } = useCreateQuiz()

  const handleCreate = async () => {
    if (!selectedDoc) return
    const result = await mutateAsync({
      document_id: selectedDoc,
      question_count: questionCount,
      auto_mode: true,
    })
    router.push(`/dashboard/quizzes/${result.id}/attempt`)
  }

  if (documents.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-sm text-text-tertiary">
          Upload a document first to generate a quiz
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold text-text-primary">
        Quick Quiz
      </h2>

      {/* Document select */}
      <select
        value={selectedDoc}
        onChange={(e) => setSelectedDoc(e.target.value)}
        className="w-full h-10 px-3 text-sm bg-surface-subtle border border-border-default rounded-lg focus:border-brand-500 focus:ring-2 focus:ring-brand-500/15 transition-colors-fast text-text-primary"
      >
        <option value="">Select a document</option>
        {documents.map((doc) => (
          <option key={doc.id} value={doc.id}>
            {doc.title}
          </option>
        ))}
      </select>

      {/* Question count */}
      <div className="flex items-center gap-3">
        <label className="text-sm text-text-secondary">Questions:</label>
        <input
          type="number"
          value={questionCount}
          onChange={(e) => setQuestionCount(Number(e.target.value))}
          min={5}
          max={30}
          className="w-20 h-10 px-3 text-sm bg-surface-subtle border border-border-default rounded-lg focus:border-brand-500 focus:ring-2 focus:ring-brand-500/15 transition-colors-fast text-text-primary text-center"
        />
      </div>

      {/* Create button */}
      <Button
        variant="default"
        disabled={!selectedDoc || isLoading}
        onClick={handleCreate}
        className="w-full"
      >
        {isLoading ? "Creating..." : "Create Quiz"}
      </Button>
    </div>
  )
}
```

- [ ] **Step 3: Commit**

```bash
git add frontend/src/components/features/quiz/quiz-creation.tsx
git commit -m "feat(frontend): redesign quick quiz creation panel"
```

---

## Chunk 2: Quiz Generation Form

### Task 3: Update quiz generation form

**Files:**
- Modify: `frontend/src/components/features/quiz/quiz-generation-form.tsx`

- [ ] **Step 1: Read current quiz generation form**

Read the file to understand multi-step flow and SSE integration.

- [ ] **Step 2: Replace with redesigned form**

Keep the multi-step flow (select document → configure settings → generating → complete/error) but apply brand tokens:
- Step indicator uses dot-and-pill progress
- Settings panel uses `<QuizSettingsPanel>`
- Generating state uses `<SSEProgress>`
- Complete state shows success card with "Start Quiz" CTA
- Error state shows error card with "Try Again" button

- [ ] **Step 3: Commit**

```bash
git add frontend/src/components/features/quiz/quiz-generation-form.tsx
git commit -m "feat(frontend): redesign quiz generation form with brand tokens"
```

---

## Chunk 3: Question Types

### Task 4: Create question type components

**Files:**
- Create: `frontend/src/components/features/quiz/question-types.tsx`

- [ ] **Step 1: Create question type components**

```tsx
"use client"

import { useState } from "react"
import { GripVertical } from "lucide-react"
import { cn } from "@/lib/utils"

// MCQ Question
interface MCQQuestionProps {
  question: string
  options: string[]
  selectedAnswer: string | null
  onSelect: (answer: string) => void
  showResult: boolean
  correctAnswer: string
}

export function MCQQuestion({
  question,
  options,
  selectedAnswer,
  onSelect,
  showResult,
  correctAnswer,
}: MCQQuestionProps) {
  return (
    <div className="space-y-3">
      <p className="text-sm font-medium text-text-primary leading-relaxed">
        {question}
      </p>
      <div className="space-y-[7px]">
        {options.map((option, i) => {
          const letter = String.fromCharCode(65 + i)
          const isSelected = selectedAnswer === option
          const isCorrect = option === correctAnswer
          const showCorrect = showResult && isCorrect
          const showWrong = showResult && isSelected && !isCorrect

          return (
            <button
              key={i}
              onClick={() => !showResult && onSelect(option)}
              className={cn(
                "w-full flex items-center gap-2.5 p-3 rounded-lg border text-left transition-all duration-150",
                showCorrect && "border-success-500 bg-success-500/5",
                showWrong && "border-danger-500 bg-danger-500/5 shake-wrong",
                !showResult && isSelected && "border-brand-500 bg-brand-500/5",
                !showResult && !isSelected && "border-border-default bg-surface-card hover:border-border-strong hover:bg-surface-overlay"
              )}
            >
              <span
                className={cn(
                  "size-[22px] rounded-md flex items-center justify-center text-[11px] font-semibold transition-colors-fast",
                  showCorrect && "bg-success-500 text-white",
                  showWrong && "bg-danger-500 text-white",
                  !showResult && isSelected && "bg-brand-500 text-white",
                  !showResult && !isSelected && "bg-surface-subtle text-text-secondary"
                )}
              >
                {letter}
              </span>
              <span className="text-sm text-text-primary">{option}</span>
            </button>
          )
        })}
      </div>
    </div>
  )
}

// True/False Question
interface TrueFalseQuestionProps {
  question: string
  selectedAnswer: string | null
  onSelect: (answer: string) => void
  showResult: boolean
  correctAnswer: string
}

export function TrueFalseQuestion({
  question,
  selectedAnswer,
  onSelect,
  showResult,
  correctAnswer,
}: TrueFalseQuestionProps) {
  return (
    <div className="space-y-3">
      <p className="text-sm font-medium text-text-primary leading-relaxed">
        {question}
      </p>
      <div className="flex gap-2">
        {["True", "False"].map((option) => {
          const isSelected = selectedAnswer === option
          const isCorrect = option === correctAnswer
          const showCorrect = showResult && isCorrect
          const showWrong = showResult && isSelected && !isCorrect

          return (
            <button
              key={option}
              onClick={() => !showResult && onSelect(option)}
              className={cn(
                "flex-1 h-11 text-sm font-medium rounded-lg border transition-all duration-150",
                showCorrect && "border-success-500 bg-success-500/5 text-success-800",
                showWrong && "border-danger-500 bg-danger-500/5 text-danger-800 shake-wrong",
                !showResult && isSelected && "border-brand-500 bg-brand-500/5 text-brand-500",
                !showResult && !isSelected && "border-border-default bg-surface-subtle text-text-secondary hover:border-border-strong"
              )}
            >
              {option}
            </button>
          )
        })}
      </div>
    </div>
  )
}

// Identification Question
interface IdentificationQuestionProps {
  question: string
  selectedAnswer: string | null
  onSelect: (answer: string) => void
  showResult: boolean
  correctAnswer: string
}

export function IdentificationQuestion({
  question,
  selectedAnswer,
  onSelect,
  showResult,
  correctAnswer,
}: IdentificationQuestionProps) {
  return (
    <div className="space-y-3">
      <p className="text-sm font-medium text-text-primary leading-relaxed">
        {question}
      </p>
      <input
        type="text"
        value={selectedAnswer || ""}
        onChange={(e) => !showResult && onSelect(e.target.value)}
        placeholder="Type your answer..."
        className="w-full h-11 px-3 text-sm bg-surface-subtle border border-border-default rounded-lg focus:border-brand-500 focus:ring-2 focus:ring-brand-500/15 transition-colors-fast text-text-primary placeholder:text-text-tertiary"
      />
    </div>
  )
}

// Multi-Select Question
interface MultiSelectQuestionProps {
  question: string
  options: string[]
  selectedAnswers: string[]
  onSelect: (answers: string[]) => void
  showResult: boolean
  correctAnswers: string[]
}

export function MultiSelectQuestion({
  question,
  options,
  selectedAnswers,
  onSelect,
  showResult,
  correctAnswers,
}: MultiSelectQuestionProps) {
  const toggle = (option: string) => {
    if (showResult) return
    onSelect(
      selectedAnswers.includes(option)
        ? selectedAnswers.filter((a) => a !== option)
        : [...selectedAnswers, option]
    )
  }

  return (
    <div className="space-y-3">
      <p className="text-sm font-medium text-text-primary leading-relaxed">
        {question}
      </p>
      <p className="text-xs text-text-tertiary">Select all that apply</p>
      <div className="space-y-[7px]">
        {options.map((option, i) => {
          const letter = String.fromCharCode(65 + i)
          const isSelected = selectedAnswers.includes(option)
          const isCorrect = correctAnswers.includes(option)
          const showCorrect = showResult && isCorrect
          const showWrong = showResult && isSelected && !isCorrect

          return (
            <button
              key={i}
              onClick={() => toggle(option)}
              className={cn(
                "w-full flex items-center gap-2.5 p-3 rounded-lg border text-left transition-all duration-150",
                showCorrect && "border-success-500 bg-success-500/5",
                showWrong && "border-danger-500 bg-danger-500/5",
                !showResult && isSelected && "border-brand-500 bg-brand-500/5",
                !showResult && !isSelected && "border-border-default bg-surface-card hover:border-border-strong"
              )}
            >
              <span
                className={cn(
                  "size-[22px] rounded-md flex items-center justify-center text-[11px] font-semibold transition-colors-fast",
                  showCorrect && "bg-success-500 text-white",
                  showWrong && "bg-danger-500 text-white",
                  !showResult && isSelected && "bg-brand-500 text-white",
                  !showResult && !isSelected && "bg-surface-subtle text-text-secondary"
                )}
              >
                {letter}
              </span>
              <span className="text-sm text-text-primary">{option}</span>
            </button>
          )
        })}
      </div>
    </div>
  )
}

// Ordering Question (with drag handle)
interface OrderingQuestionProps {
  question: string
  items: string[]
  selectedOrder: string[]
  onSelect: (order: string[]) => void
  showResult: boolean
  correctOrder: string[]
}

export function OrderingQuestion({
  question,
  items,
  selectedOrder,
  onSelect,
  showResult,
  correctOrder,
}: OrderingQuestionProps) {
  // Simple reorder via up/down buttons (no dnd-kit for MVP)
  const moveItem = (index: number, direction: "up" | "down") => {
    if (showResult) return
    const newOrder = [...selectedOrder]
    const targetIndex = direction === "up" ? index - 1 : index + 1
    if (targetIndex < 0 || targetIndex >= newOrder.length) return
    ;[newOrder[index], newOrder[targetIndex]] = [newOrder[targetIndex], newOrder[index]]
    onSelect(newOrder)
  }

  return (
    <div className="space-y-3">
      <p className="text-sm font-medium text-text-primary leading-relaxed">
        {question}
      </p>
      <p className="text-xs text-text-tertiary">Arrange in the correct order</p>
      <div className="space-y-2">
        {selectedOrder.map((item, i) => {
          const isCorrect = showResult && item === correctOrder[i]

          return (
            <div
              key={item}
              className={cn(
                "flex items-center gap-2.5 p-3 rounded-lg border transition-colors-fast",
                isCorrect && "border-success-500 bg-success-500/5",
                !showResult && "border-border-default bg-surface-card"
              )}
            >
              <GripVertical className="size-4 text-text-tertiary flex-shrink-0" />
              <span className="size-[22px] rounded-md bg-surface-subtle flex items-center justify-center text-[11px] font-semibold text-text-secondary flex-shrink-0">
                {i + 1}
              </span>
              <span className="text-sm text-text-primary flex-1">{item}</span>
              {!showResult && (
                <div className="flex gap-1">
                  <button
                    onClick={() => moveItem(i, "up")}
                    disabled={i === 0}
                    className="size-6 rounded-md bg-surface-subtle text-text-tertiary hover:text-text-primary disabled:opacity-30"
                  >
                    ↑
                  </button>
                  <button
                    onClick={() => moveItem(i, "down")}
                    disabled={i === selectedOrder.length - 1}
                    className="size-6 rounded-md bg-surface-subtle text-text-tertiary hover:text-text-primary disabled:opacity-30"
                  >
                    ↓
                  </button>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/components/features/quiz/question-types.tsx
git commit -m "feat(frontend): create question type components with letter badges"
```

---

## Chunk 4: Attempt Wizard

### Task 5: Update attempt wizard

**Files:**
- Modify: `frontend/src/components/features/quiz/attempt-wizard.tsx`

- [ ] **Step 1: Read current attempt wizard**

Read the file to understand existing navigation and state management.

- [ ] **Step 2: Replace with redesigned wizard**

Key changes:
- Progress indicator at top: "Question 3 of 10" with dot-and-pill progress
- Question type badge (color-coded pill) at top-left
- Uses `<MCQQuestion>`, `<TrueFalseQuestion>`, etc. from question-types.tsx
- Submit button only appears after answer selected
- No back button (intentional — exam conditions)
- On submit: navigates to results page

- [ ] **Step 3: Commit**

```bash
git add frontend/src/components/features/quiz/attempt-wizard.tsx
git commit -m "feat(frontend): redesign attempt wizard with brand tokens"
```

---

## Chunk 5: Score Reveal & Results

### Task 6: Create score reveal component

**Files:**
- Create: `frontend/src/components/features/quiz/score-reveal.tsx`

- [ ] **Step 1: Create score reveal**

```tsx
"use client"

import { useState, useEffect, useRef } from "react"
import { cn } from "@/lib/utils"

interface ScoreRevealProps {
  score: number
  total: number
  documentTitle: string
}

export function ScoreReveal({ score, total, documentTitle }: ScoreRevealProps) {
  const [displayedScore, setDisplayedScore] = useState(0)
  const [animationComplete, setAnimationComplete] = useState(false)
  const startTime = useRef<number | null>(null)

  const percentage = Math.round((score / total) * 100)

  const getTier = (pct: number) => {
    if (pct >= 70) return { color: "text-success-500", bg: "rgba(16,185,129,0.1)", border: "rgba(16,185,129,0.3)", title: "Great work — keep it up" }
    if (pct >= 40) return { color: "text-accent-500", bg: "rgba(245,158,11,0.1)", border: "rgba(245,158,11,0.3)", title: "Good progress — review weak areas" }
    return { color: "text-danger-500", bg: "rgba(239,68,68,0.1)", border: "rgba(239,68,68,0.3)", title: "Keep going — practice makes perfect" }
  }

  const tier = getTier(percentage)

  useEffect(() => {
    const animate = (timestamp: number) => {
      if (!startTime.current) startTime.current = timestamp
      const elapsed = timestamp - startTime.current
      const progress = Math.min(elapsed / 800, 1)

      // easeOutQuart
      const eased = 1 - Math.pow(1 - progress, 4)
      setDisplayedScore(Math.round(eased * percentage))

      if (progress < 1) {
        requestAnimationFrame(animate)
      } else {
        setAnimationComplete(true)
      }
    }

    const timer = setTimeout(() => {
      requestAnimationFrame(animate)
    }, 200)

    return () => clearTimeout(timer)
  }, [percentage])

  return (
    <div className="bg-gradient-to-br from-success-500/6 to-brand-500/4 rounded-t-2xl border-b border-border-default px-5 py-6 text-center">
      {/* Score ring */}
      <div
        className={cn(
          "size-20 rounded-full mx-auto mb-2.5 flex flex-col items-center justify-center",
          animationComplete && "score-ring-glow"
        )}
        style={{
          background: tier.bg,
          border: `2px solid ${tier.border}`,
        }}
      >
        <span className={cn("text-[28px] font-bold", tier.color, !animationComplete && "text-text-primary")}>
          {displayedScore}%
        </span>
        <span className={cn("text-[10px] font-medium", tier.color)} style={{ opacity: 0.8 }}>
          score
        </span>
      </div>

      {/* Title */}
      <h2 className="text-sm font-semibold text-text-primary mb-1">
        {tier.title}
      </h2>
      <p className="text-xs text-text-tertiary">
        {score} of {total} correct · {documentTitle}
      </p>
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/components/features/quiz/score-reveal.tsx
git commit -m "feat(frontend): create animated score reveal component"
```

### Task 7: Update quiz results page

**Files:**
- Modify: `frontend/src/app/(app)/dashboard/quizzes/[id]/results/page.tsx`

- [ ] **Step 1: Read current results page**

Read the file to understand data fetching.

- [ ] **Step 2: Replace with redesigned results page**

Structure:
1. `<ScoreReveal>` at top (animated score ring)
2. Per-topic breakdown bars (accuracy per topic, amber for weak, green for strong)
3. Weak areas warning with "Practice All Weak Topics" CTA
4. Expandable question review (correct/incorrect highlighting)

- [ ] **Step 3: Commit**

```bash
git add frontend/src/app/\(app\)/dashboard/quizzes/\[id\]/results/page.tsx
git commit -m "feat(frontend): redesign quiz results with score reveal"
```

---

## Chunk 6: Quizzes List Page

### Task 8: Update quizzes list page

**Files:**
- Modify: `frontend/src/app/(app)/dashboard/quizzes/page.tsx`

- [ ] **Step 1: Read current quizzes page**

Read the file to understand data fetching.

- [ ] **Step 2: Update page layout**

Two-column grid on desktop (list left, creation right), stacked on mobile:

```tsx
export default async function QuizzesPage() {
  // Fetch quizzes, documents
  return (
    <div>
      <h1 className="text-xl font-semibold text-text-primary mb-6">
        Quizzes
      </h1>
      <div className="grid grid-cols-1 md:grid-cols-[1fr_320px] gap-6">
        <QuizList quizzes={quizzes} />
        <QuizCreation documents={documents} />
      </div>
    </div>
  )
}
```

- [ ] **Step 3: Commit**

```bash
git add frontend/src/app/\(app\)/dashboard/quizzes/page.tsx
git commit -m "feat(frontend): update quizzes list page layout"
```

---

## Chunk 7: Verification

### Task 9: Run tests and lint

- [ ] **Step 1: Run lint**

Run: `pnpm run lint` in `frontend/`
Expected: No errors

### Task 10: Verify dev server

- [ ] **Step 1: Start dev server**

Run: `pnpm run dev` in `frontend/`

- [ ] **Step 2: Verify quizzes**

Navigate to `/dashboard/quizzes` and verify:
- Page title "Quizzes"
- Two-column layout on desktop, stacked on mobile
- Quiz list shows cards with question count, date, type badges
- Quick quiz creation panel works
- Clicking quiz starts attempt wizard

Verify attempt wizard:
- One question at a time
- Progress indicator with dot-and-pill
- Question type badge visible
- MCQ shows letter badges (A/B/C/D)
- Submit button appears after answer selected
- No back button

Verify results page:
- Score ring animates count-up (800ms, easeOutQuart)
- Score color matches tier (green/amber/red)
- Per-topic breakdown bars shown
- Weak areas in amber (not red)
- Question review expandable

### Task 11: Final commit

- [ ] **Step 1: Commit all remaining changes**

```bash
git add -A
git commit -m "feat(frontend): complete quizzes redesign"
```

---

**Plan complete.** Ready to execute?
