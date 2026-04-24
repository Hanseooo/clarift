# Practice Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Redesign the practice page with weak areas display (amber cards), topic selection, mini-lesson generation, and practice drill sessions. Weak areas are opportunities, not failures — amber throughout, never red.

**Architecture:** Server Component page fetches weak areas from API. Client component handles topic selection, lesson generation, and drill navigation. Reuses `<Card>`, `<Badge>`, `<Button>`, `<Progress>`, `<RichMarkdown>` from foundation.

**Tech Stack:** Next.js 15 (App Router), TypeScript, Tailwind CSS v4, Lucide React

---

## File Structure

| File | Action | Responsibility |
|---|---|---|
| `frontend/src/app/(app)/practice/page.tsx` | Replace | Practice page (Server Component) |
| `frontend/src/app/(app)/practice/[id]/page.tsx` | Replace | Practice session page |
| `frontend/src/components/features/practice/practice-page-client.tsx` | Replace | Practice orchestration (select → lesson → drill) |
| `frontend/src/components/features/practice/weak-areas-display.tsx` | Replace | Weak areas list with amber cards |
| `frontend/src/components/features/practice/practice-creation.tsx` | Replace | Practice start panel |
| `frontend/src/components/features/practice/mini-lesson.tsx` | Replace | Mini-lesson generation and display |
| `frontend/src/components/features/practice/practice-attempt.tsx` | Replace | Sequential drill viewer |

---

## Chunk 1: Weak Areas Display

### Task 1: Update weak areas display

**Files:**
- Modify: `frontend/src/components/features/practice/weak-areas-display.tsx`

- [ ] **Step 1: Read current weak areas display**

Read the file to understand existing structure.

- [ ] **Step 2: Replace with redesigned display**

```tsx
"use client"

import { Target } from "lucide-react"
import { Progress } from "@/components/ui/progress"
import { cn } from "@/lib/utils"

interface WeakAreaItem {
  topic: string
  accuracy: number
  attempts: number
  quizzes: number
}

interface WeakAreasDisplayProps {
  weakAreas: WeakAreaItem[]
  selectedTopics: string[]
  onToggleTopic: (topic: string) => void
}

export function WeakAreasDisplay({
  weakAreas,
  selectedTopics,
  onToggleTopic,
}: WeakAreasDisplayProps) {
  if (weakAreas.length === 0) {
    return (
      <div className="text-center py-8">
        <div className="size-8 rounded-xl bg-surface-subtle flex items-center justify-center mx-auto mb-3">
          <Target className="size-5 text-text-tertiary" />
        </div>
        <h3 className="text-sm font-medium text-text-primary mb-1">
          No weak areas yet
        </h3>
        <p className="text-xs text-text-tertiary">
          Complete a few quizzes to discover your gaps.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-2">
      {weakAreas.map((area) => {
        const isSelected = selectedTopics.includes(area.topic)
        return (
          <button
            key={area.topic}
            onClick={() => onToggleTopic(area.topic)}
            className={cn(
              "w-full bg-surface-card border border-border-default rounded-xl p-3.5 flex items-center gap-3 text-left transition-colors-fast",
              isSelected && "border-accent-500 bg-accent-500/4"
            )}
          >
            {/* Icon ring */}
            <div
              className={cn(
                "size-9 rounded-xl flex items-center justify-center flex-shrink-0 transition-colors-fast",
                isSelected
                  ? "bg-accent-500/15 border border-accent-500/20"
                  : "bg-accent-500/10 border border-accent-500/10"
              )}
            >
              <Target className="size-[18px] text-accent-500" />
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-text-primary mb-1">
                {area.topic}
              </p>
              <Progress value={area.accuracy} max={100} className="mb-1" />
              <p className="text-[11px] text-text-tertiary">
                {area.attempts} attempts across {area.quizzes} quizzes
              </p>
            </div>

            {/* Percentage */}
            <span className="text-base font-bold text-accent-500 flex-shrink-0">
              {area.accuracy}%
            </span>
          </button>
        )
      })}
    </div>
  )
}
```

- [ ] **Step 3: Commit**

```bash
git add frontend/src/components/features/practice/weak-areas-display.tsx
git commit -m "feat(frontend): redesign weak areas display with amber cards"
```

---

## Chunk 2: Practice Creation & Mini-Lesson

### Task 2: Update practice creation component

**Files:**
- Modify: `frontend/src/components/features/practice/practice-creation.tsx`

- [ ] **Step 1: Read current practice creation**

Read the file to understand existing logic.

- [ ] **Step 2: Replace with redesigned creation panel**

```tsx
"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Zap } from "lucide-react"

interface PracticeCreationProps {
  selectedTopics: string[]
  onStartLesson: () => void
}

export function PracticeCreation({
  selectedTopics,
  onStartLesson,
}: PracticeCreationProps) {
  const [drillCount, setDrillCount] = useState(10)

  if (selectedTopics.length === 0) {
    return (
      <div className="text-center py-6">
        <p className="text-sm text-text-tertiary">
          Select weak topics to practice
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold text-text-primary">
        Practice Selected Topics
      </h2>

      {/* Selected topics */}
      <div className="flex flex-wrap gap-1.5">
        {selectedTopics.map((topic) => (
          <span
            key={topic}
            className="px-2.5 py-1 rounded-full text-[11px] font-medium bg-accent-100 text-accent-800"
          >
            {topic}
          </span>
        ))}
      </div>

      {/* Drill count */}
      <div className="flex items-center gap-3">
        <label className="text-sm text-text-secondary">Drills:</label>
        <input
          type="number"
          value={drillCount}
          onChange={(e) => setDrillCount(Number(e.target.value))}
          min={5}
          max={30}
          className="w-20 h-10 px-3 text-sm bg-surface-subtle border border-border-default rounded-lg focus:border-brand-500 focus:ring-2 focus:ring-brand-500/15 transition-colors-fast text-text-primary text-center"
        />
      </div>

      {/* Action buttons */}
      <Button
        variant="default"
        onClick={onStartLesson}
        className="w-full"
      >
        <Zap className="size-4 mr-2" />
        Generate Lesson & Drills
      </Button>
    </div>
  )
}
```

- [ ] **Step 3: Commit**

```bash
git add frontend/src/components/features/practice/practice-creation.tsx
git commit -m "feat(frontend): redesign practice creation panel"
```

### Task 3: Update mini-lesson component

**Files:**
- Modify: `frontend/src/components/features/practice/mini-lesson.tsx`

- [ ] **Step 1: Read current mini-lesson**

Read the file to understand existing generation logic.

- [ ] **Step 2: Replace with redesigned component**

```tsx
"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { SSEProgress } from "@/components/ui/sse-progress"
import { RichMarkdown } from "@/components/ui/rich-markdown"
import { useGenerateLesson } from "@/hooks/use-practice"
import { BookOpen } from "lucide-react"

interface MiniLessonProps {
  topics: string[]
  onStartDrill: () => void
}

export function MiniLesson({ topics, onStartDrill }: MiniLessonProps) {
  const [lesson, setLesson] = useState<string | null>(null)
  const { mutateAsync, isLoading, error } = useGenerateLesson()

  const handleGenerate = async () => {
    const result = await mutateAsync({ topics })
    setLesson(result.lesson)
  }

  if (isLoading) {
    return (
      <div className="space-y-3">
        <SSEProgress stepLabel="Building your study guide..." />
      </div>
    )
  }

  if (error) {
    return (
      <div className="text-center py-4">
        <p className="text-sm text-danger-500 mb-2">Failed to generate lesson</p>
        <Button variant="secondary" size="sm" onClick={handleGenerate}>
          Try Again
        </Button>
      </div>
    )
  }

  if (!lesson) {
    return (
      <Button variant="default" onClick={handleGenerate} className="w-full">
        <BookOpen className="size-4 mr-2" />
        Generate Lesson
      </Button>
    )
  }

  return (
    <div className="space-y-4">
      <div className="bg-surface-card border border-border-default rounded-2xl p-5">
        <div className="flex items-center gap-2 mb-3">
          <BookOpen className="size-4 text-brand-400" />
          <h3 className="text-sm font-semibold text-text-primary">
            Mini-Lesson
          </h3>
        </div>
        <RichMarkdown content={lesson} className="prose-brand" />
      </div>
      <Button variant="default" onClick={onStartDrill} className="w-full">
        Start Drill
      </Button>
    </div>
  )
}
```

- [ ] **Step 3: Commit**

```bash
git add frontend/src/components/features/practice/mini-lesson.tsx
git commit -m "feat(frontend): redesign mini-lesson with brand tokens"
```

---

## Chunk 3: Practice Attempt

### Task 4: Update practice attempt component

**Files:**
- Modify: `frontend/src/components/features/practice/practice-attempt.tsx`

- [ ] **Step 1: Read current practice attempt**

Read the file to understand existing drill navigation.

- [ ] **Step 2: Replace with redesigned component**

Similar to quiz attempt but for practice drills:
- Shows one drill at a time
- Progress indicator at top
- "Check Answer" reveals correct answer + explanation
- "Next Drill" or "Done" button
- Uses same question type components from quiz/question-types.tsx

- [ ] **Step 3: Commit**

```bash
git add frontend/src/components/features/practice/practice-attempt.tsx
git commit -m "feat(frontend): redesign practice attempt with brand tokens"
```

---

## Chunk 4: Practice Page Client

### Task 5: Update practice page client

**Files:**
- Modify: `frontend/src/components/features/practice/practice-page-client.tsx`

- [ ] **Step 1: Read current practice page client**

Read the file to understand existing state machine (select → lesson → drill).

- [ ] **Step 2: Replace with redesigned client**

Three states:
1. **Select**: Shows `<WeakAreasDisplay>` + `<PracticeCreation>`
2. **Lesson**: Shows `<MiniLesson>` with generated content
3. **Drill**: Shows `<PracticeAttempt>` with sequential drills

- [ ] **Step 3: Commit**

```bash
git add frontend/src/components/features/practice/practice-page-client.tsx
git commit -m "feat(frontend): redesign practice page client"
```

---

## Chunk 5: Practice Pages

### Task 6: Update practice page

**Files:**
- Modify: `frontend/src/app/(app)/practice/page.tsx`

- [ ] **Step 1: Read current practice page**

Read the file to understand data fetching.

- [ ] **Step 2: Update page**

```tsx
export default async function PracticePage() {
  // Fetch weak areas from API
  return (
    <div>
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-text-primary">
          Targeted Practice
        </h1>
        <p className="text-sm text-text-secondary mt-1">
          Focus on what you need to improve most
        </p>
      </div>
      <PracticePageClient initialWeakAreas={weakAreas} />
    </div>
  )
}
```

- [ ] **Step 3: Commit**

```bash
git add frontend/src/app/\(app\)/practice/page.tsx
git commit -m "feat(frontend): update practice page layout"
```

### Task 7: Update practice session page

**Files:**
- Modify: `frontend/src/app/(app)/practice/[id]/page.tsx`

- [ ] **Step 1: Read current practice session page**

Read the file to understand data fetching.

- [ ] **Step 2: Update page**

Fetch practice session data and render `<PracticeAttempt>` with the drills.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/app/\(app\)/practice/\[id\]/page.tsx
git commit -m "feat(frontend): update practice session page"
```

---

## Chunk 6: Verification

### Task 8: Run tests and lint

- [ ] **Step 1: Run lint**

Run: `pnpm run lint` in `frontend/`
Expected: No errors

### Task 9: Verify dev server

- [ ] **Step 1: Start dev server**

Run: `pnpm run dev` in `frontend/`

- [ ] **Step 2: Verify practice**

Navigate to `/practice` and verify:
- Page title "Targeted Practice"
- Weak areas shown as amber cards with target icon
- Empty state when no weak areas
- Clicking a weak area selects it (amber border + bg)
- Practice creation panel shows selected topics as chips
- "Generate Lesson & Drills" button works
- Mini-lesson renders markdown with prose-brand
- "Start Drill" button navigates to practice session

Verify practice session:
- One drill at a time
- Progress indicator visible
- Check Answer reveals explanation
- Next Drill / Done buttons work

### Task 10: Final commit

- [ ] **Step 1: Commit all remaining changes**

```bash
git add -A
git commit -m "feat(frontend): complete practice redesign"
```

---

**Plan complete.** Ready to execute?
