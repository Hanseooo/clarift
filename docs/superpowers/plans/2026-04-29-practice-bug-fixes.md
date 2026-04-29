# Practice Feature Bug Fixes — Targeted Fix + Light Refactor

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix all critical and high-severity bugs in the practice feature, remove dead code, unify the dual creation flows, and add defensive validation without over-engineering.

**Architecture:** Fix the Alembic migration schema drift, patch frontend submission logic to handle errors, add minimal UI support for `multi_select` and `ordering` drill types, validate numeric inputs, and consolidate practice session creation into a single reusable flow. Keep changes localized to practice-specific files.

**Tech Stack:** Next.js 15, TypeScript, Tailwind 4, shadcn/ui, FastAPI, SQLAlchemy, Alembic, Drizzle ORM.

---

## Chunk 1: Fix Alembic Migration Schema Drift

### Task 1: Add missing `quiz_count` column to `user_topic_performance`

**Files:**
- Modify: `backend/alembic/versions/d5d65b3a5669_init_models.py`
- Test: `backend/tests/test_migration_schema.py` (create)

- [ ] **Step 1: Inspect the migration file**

Read: `backend/alembic/versions/d5d65b3a5669_init_models.py` lines 105-120.
Confirm `quiz_count` is missing from the `user_topic_performance` table creation.

- [ ] **Step 2: Write the failing test**

```python
# backend/tests/test_migration_schema.py
import pytest
from sqlalchemy import inspect
from src.db.session import engine

@pytest.mark.asyncio
async def test_user_topic_performance_has_quiz_count():
    """Fresh migration must include quiz_count column."""
    async with engine.begin() as conn:
        result = await conn.run_sync(
            lambda sync_conn: inspect(sync_conn).get_columns("user_topic_performance")
        )
    column_names = {c["name"] for c in result}
    assert "quiz_count" in column_names, "quiz_count column missing in user_topic_performance"
```

- [ ] **Step 3: Run test to verify it fails**

Run: `pytest backend/tests/test_migration_schema.py::test_user_topic_performance_has_quiz_count -v`
Expected: FAIL — `quiz_count` not found.

- [ ] **Step 4: Add the missing column**

In `backend/alembic/versions/d5d65b3a5669_init_models.py`, inside the `op.create_table("user_topic_performance", ...)` call, add after the `correct` column:

```python
sa.Column("quiz_count", sa.Integer(), server_default=sa.text("0"), nullable=False),
```

- [ ] **Step 5: Create standalone correction migration (for existing databases)**

Run: `cd backend && alembic revision -m "add_quiz_count_to_user_topic_performance"`

In the generated migration file:

```python
def upgrade() -> None:
    op.add_column(
        "user_topic_performance",
        sa.Column("quiz_count", sa.Integer(), server_default=sa.text("0"), nullable=False)
    )

def downgrade() -> None:
    op.drop_column("user_topic_performance", "quiz_count")
```

- [ ] **Step 6: Run test to verify it passes**

Run: `pytest backend/tests/test_migration_schema.py::test_user_topic_performance_has_quiz_count -v`
Expected: PASS

- [ ] **Step 7: Commit**

```bash
git add backend/alembic/versions/d5d65b3a5669_init_models.py backend/alembic/versions/xxxx_add_quiz_count_to_user_topic_performance.py backend/tests/test_migration_schema.py
git commit -m "fix(migration): add missing quiz_count column to user_topic_performance"
```

---

## Chunk 2: Fix Practice Submission Error Handling

### Task 2: Prevent `onFinish` from firing on submission error

**Files:**
- Modify: `frontend/src/components/features/practice/practice-attempt.tsx`
- Test: `frontend/src/components/features/practice/__tests__/practice-attempt.test.tsx` (create)

- [ ] **Step 1: Read the current handleContinue logic**

Read: `frontend/src/components/features/practice/practice-attempt.tsx` lines 79-94.

- [ ] **Step 2: Write the failing test**

```tsx
// frontend/src/components/features/practice/__tests__/practice-attempt.test.tsx
import { render, screen, fireEvent, waitFor } from "@testing-library/react"
import { describe, it, expect, vi } from "vitest"
import { PracticeAttempt } from "../practice-attempt"

const mockDrills = [
  {
    id: "drill-1",
    question: "What is 2+2?",
    type: "mcq",
    options: ["3", "4", "5"],
    correct_answer: "4",
    explanation: "Basic math",
    difficulty: 1,
    topic: "Math",
  },
]

describe("PracticeAttempt", () => {
  it("does not call onFinish if submitPractice throws", async () => {
    const onFinish = vi.fn()
    const submitPractice = vi.fn().mockRejectedValue(new Error("Network error"))

    render(
      <PracticeAttempt
        drills={mockDrills}
        practiceId="practice-123"
        submitPractice={submitPractice}
        onFinish={onFinish}
      />
    )

    // Select answer and check
    fireEvent.click(screen.getByText("4"))
    fireEvent.click(screen.getByRole("button", { name: /check/i }))
    await waitFor(() => expect(screen.getByText(/explanation/i)).toBeInTheDocument())

    // Click continue (last question)
    fireEvent.click(screen.getByRole("button", { name: /continue/i }))
    await waitFor(() => expect(screen.getByText(/error/i)).toBeInTheDocument())

    expect(onFinish).not.toHaveBeenCalled()
  })
})
```

- [ ] **Step 3: Run test to verify it fails**

Run: `pnpm run test:run frontend/src/components/features/practice/__tests__/practice-attempt.test.tsx`
Expected: FAIL — `onFinish` is called despite the error.

- [ ] **Step 4: Fix the logic**

In `frontend/src/components/features/practice/practice-attempt.tsx`, replace:

```tsx
if (isLast) {
  if (practiceId) {
    setIsSubmitting(true)
    try {
      await submitPractice({ practiceId, answers })
    } finally {
      setIsSubmitting(false)
    }
  }
  onFinish?.()
  return
}
```

With:

```tsx
if (isLast) {
  if (practiceId) {
    setIsSubmitting(true)
    try {
      await submitPractice({ practiceId, answers })
      onFinish?.()
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : "Failed to submit. Please try again.")
    } finally {
      setIsSubmitting(false)
    }
  } else {
    onFinish?.()
  }
  return
}
```

Also add error display UI near the continue button:

```tsx
{submitError && (
  <p className="text-sm text-danger-500 mb-2">{submitError}</p>
)}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `pnpm run test:run frontend/src/components/features/practice/__tests__/practice-attempt.test.tsx`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add frontend/src/components/features/practice/practice-attempt.tsx frontend/src/components/features/practice/__tests__/practice-attempt.test.tsx
git commit -m "fix(practice): prevent onFinish on submission error and show error message"
```

---

## Chunk 3: Add UI Support for multi_select and ordering Drill Types

### Task 3: Add multi_select checkbox UI

**Files:**
- Modify: `frontend/src/components/features/practice/practice-attempt.tsx`
- Test: `frontend/src/components/features/practice/__tests__/practice-attempt.test.tsx`

- [ ] **Step 1: Write the failing test**

```tsx
it("renders checkboxes for multi_select type", () => {
  const multiDrill = {
    ...mockDrills[0],
    type: "multi_select",
    correct_answer: ["4", "5"],
    options: ["3", "4", "5"],
  }

  render(<PracticeAttempt drills={[multiDrill]} practiceId="p1" submitPractice={vi.fn()} />)
  expect(screen.getAllByRole("checkbox")).toHaveLength(3)
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm run test:run frontend/src/components/features/practice/__tests__/practice-attempt.test.tsx`
Expected: FAIL — currently renders text input.

- [ ] **Step 3: Add multi_select UI branch**

In `practice-attempt.tsx`, add a new conditional branch before the fallback input:

```tsx
{current.type === "multi_select" ? (
  <div className="space-y-2">
    {current.options?.map((option: string) => (
      <label
        key={option}
        className={cn(
          "flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors",
          checked && isCorrectMulti(option)
            ? "border-success-500 bg-success-100"
            : checked && isSelectedMulti(option)
            ? "border-danger-500 bg-danger-100"
            : "border-border-default hover:bg-surface-subtle"
        )}
      >
        <input
          type="checkbox"
          disabled={checked}
          checked={isSelectedMulti(option)}
          onChange={() => toggleMultiSelect(option)}
          className="size-4 accent-brand-500"
        />
        <span className="text-sm">{option}</span>
      </label>
    ))}
  </div>
) : current.type === "ordering" ? (
  /* handled in next task */
) : (
  /* existing fallback input */
)}
```

Add helper state and functions:

```tsx
const isSelectedMulti = (option: string) =>
  (answers[current.id] ?? "").split(",").includes(option)

const isCorrectMulti = (option: string) =>
  (current.correct_answer as string[]).includes(option)

const toggleMultiSelect = (option: string) => {
  const currentAnswers = (answers[current.id] ?? "").split(",").filter(Boolean)
  const next = currentAnswers.includes(option)
    ? currentAnswers.filter((a) => a !== option)
    : [...currentAnswers, option]
  handleSelect(next.join(","))
}
```

Update correctness check for multi_select:

```tsx
const isCorrect = () => {
  if (current.type === "multi_select") {
    const selected = (answers[current.id] ?? "").split(",").filter(Boolean).sort()
    const correct = (current.correct_answer as string[]).sort()
    return JSON.stringify(selected) === JSON.stringify(correct)
  }
  return normalizeAnswer(answers[current.id]) === normalizeAnswer(String(current.correct_answer ?? ""))
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm run test:run frontend/src/components/features/practice/__tests__/practice-attempt.test.tsx`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add frontend/src/components/features/practice/practice-attempt.tsx
git commit -m "feat(practice): add multi_select checkbox support"
```

### Task 4: Add ordering drag-and-drop UI

**Files:**
- Modify: `frontend/src/components/features/practice/practice-attempt.tsx`
- Test: `frontend/src/components/features/practice/__tests__/practice-attempt.test.tsx`

- [ ] **Step 1: Check if @dnd-kit/core is already installed**

Run: `cd frontend && cat package.json | grep dnd-kit`
Expected: `@dnd-kit/core`, `@dnd-kit/sortable`, `@dnd-kit/utilities` should be present (used in quiz ordering per design.md).

- [ ] **Step 2: Write the failing test**

```tsx
it("renders sortable list for ordering type", () => {
  const orderDrill = {
    ...mockDrills[0],
    type: "ordering",
    correct_answer: ["A", "B", "C"],
    options: ["A", "B", "C"],
  }

  render(<PracticeAttempt drills={[orderDrill]} practiceId="p1" submitPractice={vi.fn()} />)
  expect(screen.getAllByRole("button", { name: /drag/i })).toHaveLength(3)
})
```

- [ ] **Step 3: Run test to verify it fails**

Run: `pnpm run test:run frontend/src/components/features/practice/__tests__/practice-attempt.test.tsx`
Expected: FAIL

- [ ] **Step 4: Implement ordering UI**

Create a small inline sortable list component (or import from quiz if shared). For simplicity in practice, use `@dnd-kit/sortable`:

```tsx
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core"
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable"
import { GripVertical } from "lucide-react"

function SortableItem({ id, label }: { id: string; label: string }) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id })
  const style = { transform: CSS.Transform.toString(transform), transition }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex items-center gap-2 p-3 border border-border-default rounded-lg bg-surface-card"
    >
      <button {...attributes} {...listeners} className="text-text-tertiary">
        <GripVertical className="size-4" />
      </button>
      <span className="text-sm">{label}</span>
    </div>
  )
}
```

In `practice-attempt.tsx`, add the ordering branch:

```tsx
{current.type === "ordering" ? (
  <DndContext
    sensors={sensors}
    collisionDetection={closestCenter}
    onDragEnd={(event) => {
      const { active, over } = event
      if (over && active.id !== over.id) {
        const currentOrder = (answers[current.id] ?? "").split(",").filter(Boolean)
        const oldIndex = currentOrder.indexOf(String(active.id))
        const newIndex = currentOrder.indexOf(String(over.id))
        const next = arrayMove(currentOrder, oldIndex, newIndex)
        handleSelect(next.join(","))
      }
    }}
  >
    <SortableContext
      items={(answers[current.id] ?? current.options?.join(",") ?? "").split(",").filter(Boolean)}
      strategy={verticalListSortingStrategy}
    >
      <div className="space-y-2">
        {(answers[current.id] ?? current.options?.join(",") ?? "").split(",").filter(Boolean).map((opt) => (
          <SortableItem key={opt} id={opt} label={opt} />
        ))}
      </div>
    </SortableContext>
  </DndContext>
) : (
  /* other branches */
)}
```

Add sensors at the component top level:

```tsx
const sensors = useSensors(
  useSensor(PointerSensor),
  useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
)
```

- [ ] **Step 5: Run test to verify it passes**

Run: `pnpm run test:run frontend/src/components/features/practice/__tests__/practice-attempt.test.tsx`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add frontend/src/components/features/practice/practice-attempt.tsx
git commit -m "feat(practice): add ordering drag-and-drop support"
```

---

## Chunk 4: Validate drillCount and Remove Dead Code

### Task 5: Add drillCount validation and NaN guard

**Files:**
- Modify: `frontend/src/components/features/practice/practice-creation.tsx`
- Test: `frontend/src/components/features/practice/__tests__/practice-creation.test.tsx` (create)

- [ ] **Step 1: Write the failing test**

```tsx
// frontend/src/components/features/practice/__tests__/practice-creation.test.tsx
import { render, screen, fireEvent } from "@testing-library/react"
import { describe, it, expect, vi } from "vitest"
import { PracticeCreation } from "../practice-creation"

describe("PracticeCreation", () => {
  it("shows validation error when drillCount is 0", async () => {
    const onCreate = vi.fn()
    render(<PracticeCreation selectedTopics={["Math"]} onCreate={onCreate} />)

    const input = screen.getByRole("spinbutton")
    fireEvent.change(input, { target: { value: "0" } })
    fireEvent.click(screen.getByRole("button", { name: /start/i }))

    expect(screen.getByText(/must be between 1 and 20/i)).toBeInTheDocument()
    expect(onCreate).not.toHaveBeenCalled()
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm run test:run frontend/src/components/features/practice/__tests__/practice-creation.test.tsx`
Expected: FAIL

- [ ] **Step 3: Add validation**

In `frontend/src/components/features/practice/practice-creation.tsx`:

```tsx
const [drillCount, setDrillCount] = useState(5)
const [countError, setCountError] = useState<string | null>(null)

const handleCountChange = (value: string) => {
  const num = parseInt(value, 10)
  if (Number.isNaN(num) || num < 1 || num > 20) {
    setCountError("Please enter a number between 1 and 20")
  } else {
    setCountError(null)
  }
  setDrillCount(Number.isNaN(num) ? 0 : num)
}

const handleCreate = async () => {
  if (drillCount < 1 || drillCount > 20) {
    setCountError("Please enter a number between 1 and 20")
    return
  }
  // ... existing create logic
}
```

Update the input:

```tsx
<input
  type="number"
  min={1}
  max={20}
  value={drillCount}
  onChange={(e) => handleCountChange(e.target.value)}
  className={cn("...", countError && "border-danger-500")}
/>
{countError && <p className="text-xs text-danger-500 mt-1">{countError}</p>}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm run test:run frontend/src/components/features/practice/__tests__/practice-creation.test.tsx`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add frontend/src/components/features/practice/practice-creation.tsx frontend/src/components/features/practice/__tests__/practice-creation.test.tsx
git commit -m "fix(practice): validate drill count and prevent NaN/0 values"
```

### Task 6: Remove dead `useSubmitPracticeAnswer` hook

**Files:**
- Modify: `frontend/src/hooks/use-practice.ts`

- [ ] **Step 1: Find and remove the stub**

In `frontend/src/hooks/use-practice.ts`, delete lines 89-95:

```tsx
export function useSubmitPracticeAnswer() {
  return {
    mutateAsync: async (_payload: unknown) => ({ ok: true }),
    isLoading: false,
    error: null as string | null,
  };
}
```

- [ ] **Step 2: Verify no imports reference it**

Run: `cd frontend && grep -r "useSubmitPracticeAnswer" src/`
Expected: No results.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/hooks/use-practice.ts
git commit -m "chore(practice): remove dead useSubmitPracticeAnswer stub hook"
```

---

## Chunk 5: Unify Dual Creation Flows

### Task 7: Extract shared `usePracticeCreation` hook

**Files:**
- Create: `frontend/src/hooks/use-practice-creation.ts`
- Modify: `frontend/src/components/features/practice/practice-page-client.tsx`
- Modify: `frontend/src/components/features/practice/practice-creation.tsx`

- [ ] **Step 1: Create the shared hook**

```typescript
// frontend/src/hooks/use-practice-creation.ts
"use client"

import { useState, useCallback } from "react"
import { useCreatePractice } from "./use-practice"

export function usePracticeCreation() {
  const { mutateAsync, isLoading, error } = useCreatePractice()
  const [practiceId, setPracticeId] = useState<string | null>(null)
  const [drills, setDrills] = useState<unknown[] | null>(null)

  const create = useCallback(
    async (topics: string[], drillCount: number) => {
      const response = await mutateAsync({ weak_topics: topics, drill_count: drillCount })
      setPracticeId(response.practice_id)
      setDrills(response.drills)
      return response
    },
    [mutateAsync]
  )

  const reset = useCallback(() => {
    setPracticeId(null)
    setDrills(null)
  }, [])

  return { create, reset, practiceId, drills, isLoading, error }
}
```

- [ ] **Step 2: Update `practice-page-client.tsx` to use shared hook**

Replace the direct `useCreatePractice` call with `usePracticeCreation`:

```tsx
import { usePracticeCreation } from "@/hooks/use-practice-creation"

// In component:
const { create, practiceId, drills, isLoading, error } = usePracticeCreation()

const handleStartDrill = async () => {
  await create(selectedTopics, selectedTopics.length * 3) // or whatever count logic
  setState("drill")
}
```

- [ ] **Step 3: Update `practice-creation.tsx` to use shared hook**

Replace direct `useCreatePractice` with `usePracticeCreation` and use `create()` instead of inline mutation:

```tsx
const { create, isLoading } = usePracticeCreation()

const onCreate = async () => {
  const response = await create(selectedTopics, drillCount)
  router.push(`/practice/${response.practice_id}`)
}
```

- [ ] **Step 4: Verify both paths still work**

Run: `pnpm run typecheck`
Expected: No TypeScript errors.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/hooks/use-practice-creation.ts frontend/src/components/features/practice/practice-page-client.tsx frontend/src/components/features/practice/practice-creation.tsx
git commit -m "refactor(practice): unify practice creation flows into shared hook"
```

---

## Chunk 6: Add Timeout Error Handling for Synchronous Generation

### Task 8: Add timeout guard and user-friendly error in practice router

**Files:**
- Modify: `backend/src/api/routers/practice.py`
- Modify: `backend/src/services/practice_service.py`
- Test: `backend/tests/test_practice.py`

- [ ] **Step 1: Add timeout handling in router**

In `backend/src/api/routers/practice.py`, wrap the synchronous call with a timeout:

```python
import asyncio
from fastapi import HTTPException

@router.post("", response_model=CreatePracticeResponse)
async def create_practice(...):
    try:
        result = await asyncio.wait_for(
            create_practice_session(db, user.id, weak_topics=request.weak_topics, drill_count=request.drill_count),
            timeout=25.0  # seconds, keep under typical 30s gateway timeout
        )
    except asyncio.TimeoutError:
        raise HTTPException(status_code=504, detail="Practice generation is taking too long. Please try again in a moment.")
    return CreatePracticeResponse(...)
```

- [ ] **Step 2: Add timeout handling for lesson generation**

Apply the same pattern to the `/lesson` endpoint.

- [ ] **Step 3: Write test for timeout**

```python
@pytest.mark.asyncio
async def test_create_practice_timeout(client, monkeypatch):
    async def slow_create(*args, **kwargs):
        await asyncio.sleep(30)

    monkeypatch.setattr("src.api.routers.practice.create_practice_session", slow_create)
    response = await client.post("/api/v1/practice", json={"weak_topics": ["A"], "drill_count": 5})
    assert response.status_code == 504
    assert "too long" in response.json()["detail"]
```

- [ ] **Step 4: Run test to verify**

Run: `pytest backend/tests/test_practice.py::test_create_practice_timeout -v`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add backend/src/api/routers/practice.py backend/tests/test_practice.py
git commit -m "fix(practice): add 25s timeout guard for synchronous generation"
```

---

## Chunk 7: Verification

### Task 9: Run full backend verification

- [ ] **Step 1: Run ruff**

Run: `ruff check .`
Expected: No errors.

- [ ] **Step 2: Run pytest**

Run: `pytest`
Expected: All tests pass.

- [ ] **Step 3: Commit any fixes**

```bash
git add -A
git commit -m "chore: fix backend lint and test issues"
```

### Task 10: Run full frontend verification

- [ ] **Step 1: Run typecheck**

Run: `cd frontend && pnpm run typecheck`
Expected: No TypeScript errors.

- [ ] **Step 2: Run vitest**

Run: `pnpm run test:run`
Expected: All tests pass.

- [ ] **Step 3: Commit any fixes**

```bash
git add -A
git commit -m "chore: fix frontend type and test issues"
```

---

## Files to Create or Modify Summary

| File | Action | Reason |
|------|--------|--------|
| `backend/alembic/versions/d5d65b3a5669_init_models.py` | Modify | Add missing `quiz_count` column |
| `backend/alembic/versions/xxxx_add_quiz_count_to_user_topic_performance.py` | Create | Standalone migration for existing DBs |
| `backend/src/api/routers/practice.py` | Modify | Add 25s timeout guard to endpoints |
| `backend/tests/test_migration_schema.py` | Create | Verify migration includes quiz_count |
| `backend/tests/test_practice.py` | Modify | Test submit error handling and timeout |
| `frontend/src/components/features/practice/practice-attempt.tsx` | Modify | Fix onFinish error handling; add multi_select/ordering UI |
| `frontend/src/components/features/practice/practice-creation.tsx` | Modify | Validate drillCount, prevent NaN |
| `frontend/src/components/features/practice/practice-page-client.tsx` | Modify | Use unified creation hook |
| `frontend/src/hooks/use-practice.ts` | Modify | Remove dead `useSubmitPracticeAnswer` |
| `frontend/src/hooks/use-practice-creation.ts` | Create | Shared creation logic |
| `frontend/src/components/features/practice/__tests__/practice-attempt.test.tsx` | Create | Test error handling and multi_select/ordering |
| `frontend/src/components/features/practice/__tests__/practice-creation.test.tsx` | Create | Test drillCount validation |
