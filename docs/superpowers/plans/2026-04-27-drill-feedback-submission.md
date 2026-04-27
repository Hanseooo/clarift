# Drill Feedback & Submission Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add per-question answer checking and explanation display to practice drills, plus a backend endpoint to submit drill results and update `UserTopicPerformance` without incrementing `quiz_count`.

**Architecture:** Reuse the existing `PracticeAttempt` component (used on `/practice/[id]`) for the inline drill flow on `/practice`, enhancing it to validate answers client-side, show inline feedback, and submit results at the end. Add a single `POST /api/v1/practice/{practice_id}/submit` endpoint that computes correctness and upserts topic stats.

**Tech Stack:** Next.js 15, React, TypeScript, Tailwind, shadcn/ui, FastAPI, SQLAlchemy, PostgreSQL.

---

## File Structure

| File | Action | Responsibility |
|---|---|---|
| `frontend/src/components/features/practice/practice-attempt.tsx` | **Modify** | Core drill UI with per-question feedback, answer validation, and finish submission. |
| `frontend/src/components/features/practice/practice-page-client.tsx` | **Modify** | Swap `AttemptWizard` for enhanced `PracticeAttempt`; pass `practiceId`. |
| `frontend/src/hooks/use-practice.ts` | **Modify** | Add `useSubmitPractice` hook for the new endpoint. |
| `backend/src/api/routers/practice.py` | **Modify** | Add `POST /api/v1/practice/{practice_id}/submit` route. |
| `backend/src/services/practice_service.py` | **Modify** | Add `submit_practice_session` service logic. |
| `backend/openapi.json` | **Modify** (regenerated) | Add submit endpoint schema. |
| `frontend/src/lib/api-types.ts` | **Modify** (regenerated) | Sync new endpoint types. |
| `backend/tests/test_practice.py` | **Create** | Tests for submit endpoint correctness and topic stat updates. |

---

## Edge Case Mitigations

| Risk | Mitigation in Plan |
|---|---|
| **Loss of granularity** (drill + quiz attempts blended) | Accepted for MVP. `UserTopicPerformance` is intentionally simple; no new table required. |
| **Drill memorization / gaming** | Weak area flagging still requires `quiz_count >= 2` (existing threshold). Drills alone cannot permanently clear weak areas without formal quiz validation. |
| **Weak area flickering** | Expected adaptive behavior. Accuracy naturally fluctuates as attempts increase. |
| **Accuracy bias from easier drills** | Accepted. The goal of drills is practice; accuracy should reflect all attempts. |
| **Case sensitivity / whitespace** | Answer comparison uses `.strip().lower()` for `identification` and `true_false`, matching existing quiz logic. |
| **Schema drift** | OpenAPI regeneration + frontend type sync is an explicit task. |

> **Note on `quiz_count` threshold:** We are keeping the existing `quiz_count >= 2` requirement in `get_weak_areas` to maintain statistical confidence. This is a non-breaking behavioral choice.

---

## Chunk 1: Backend Submit Endpoint & Service

### Task 1: Write the failing test for drill submission

**Files:**
- Create: `backend/tests/test_practice.py`

```python
import pytest
from uuid import uuid4

from src.db.models import PracticeSession, UserTopicPerformance


@pytest.mark.asyncio
async def test_submit_practice_updates_performance(client, db_session, authenticated_user):
    user_id = authenticated_user.id
    drills = [
        {
            "id": "drill-1",
            "topic": "Git",
            "question": "What does git init do?",
            "type": "identification",
            "correct_answer": "Initialize a repo",
            "explanation": "It creates a new Git repository.",
            "difficulty": 1,
        },
        {
            "id": "drill-2",
            "topic": "Git",
            "question": "Is git fetch safe?",
            "type": "true_false",
            "options": ["True", "False"],
            "correct_answer": "True",
            "explanation": "Fetch is read-only.",
            "difficulty": 1,
        },
    ]
    session = PracticeSession(
        user_id=user_id,
        weak_topics=["Git"],
        drills=drills,
    )
    db_session.add(session)
    await db_session.commit()

    response = await client.post(
        f"/api/v1/practice/{session.id}/submit",
        json={
            "answers": {
                "drill-1": "Initialize a repo",
                "drill-2": "True",
            }
        },
    )
    assert response.status_code == 200
    data = response.json()
    assert data["correct_count"] == 2
    assert data["total_count"] == 2
    assert data["score"] == 100.0

    perf = await db_session.get(UserTopicPerformance, data["performance_entries"][0]["id"])
    assert perf.attempts == 2
    assert perf.correct == 2
    assert perf.quiz_count == 0
```

- [ ] **Step 1: Write the failing test**

- [ ] **Step 2: Run test to verify it fails**

Run: `pytest backend/tests/test_practice.py::test_submit_practice_updates_performance -v`

Expected: FAIL with `404` or `AttributeError` because route doesn't exist yet.

---

### Task 2: Add submit service logic

**Files:**
- Modify: `backend/src/services/practice_service.py`

Add after `generate_mini_lesson`:

```python
from fastapi import HTTPException, status
from sqlalchemy import update


async def submit_practice_session(
    db: AsyncSession,
    user_id: uuid.UUID,
    practice_id: str,
    answers: dict[str, str],
) -> dict[str, Any]:
    """
    Validate drill answers, compute score, and upsert UserTopicPerformance.
    Does NOT increment quiz_count.
    """
    from src.db.models import PracticeSession

    result = await db.execute(
        select(PracticeSession).where(
            PracticeSession.id == uuid.UUID(practice_id),
            PracticeSession.user_id == user_id,
        )
    )
    session = result.scalar_one_or_none()
    if not session:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Practice session not found",
        )

    drills = session.drills if isinstance(session.drills, list) else []
    drill_by_id = {str(d.get("id")): d for d in drills if isinstance(d, dict)}

    topic_stats: dict[str, dict[str, int]] = {}
    results: list[dict[str, Any]] = []
    correct_count = 0

    for drill_id, selected in answers.items():
        drill = drill_by_id.get(drill_id)
        if not drill:
            continue

        topic = str(drill.get("topic") or "General")
        expected = str(drill.get("correct_answer") or "")
        is_correct = selected.strip().lower() == expected.strip().lower()

        if is_correct:
            correct_count += 1

        if topic not in topic_stats:
            topic_stats[topic] = {"attempts": 0, "correct": 0}
        topic_stats[topic]["attempts"] += 1
        topic_stats[topic]["correct"] += int(is_correct)

        results.append({
            "drill_id": drill_id,
            "is_correct": is_correct,
            "correct_answer": expected,
            "explanation": str(drill.get("explanation", "")),
        })

    total_count = len(results)
    score = 0.0 if total_count == 0 else round((correct_count / total_count) * 100, 2)

    performance_entries = []
    for topic, stats in topic_stats.items():
        perf_result = await db.execute(
            select(UserTopicPerformance).where(
                UserTopicPerformance.user_id == user_id,
                UserTopicPerformance.topic == topic,
            )
        )
        perf = perf_result.scalar_one_or_none()
        if perf is None:
            insert_stmt = (
                insert(UserTopicPerformance)
                .values(
                    user_id=user_id,
                    topic=topic,
                    attempts=stats["attempts"],
                    correct=stats["correct"],
                    quiz_count=0,
                    last_updated=func.now(),
                )
                .returning(UserTopicPerformance)
            )
            new_perf = await db.execute(insert_stmt)
            perf = new_perf.scalar_one()
        else:
            await db.execute(
                update(UserTopicPerformance)
                .where(UserTopicPerformance.id == perf.id)
                .values(
                    attempts=UserTopicPerformance.attempts + stats["attempts"],
                    correct=UserTopicPerformance.correct + stats["correct"],
                    last_updated=func.now(),
                )
            )
            # Re-fetch to get updated values for response
            perf = await db.get(UserTopicPerformance, perf.id)
        performance_entries.append({
            "id": str(perf.id),
            "topic": perf.topic,
            "attempts": perf.attempts,
            "correct": perf.correct,
            "accuracy": round((perf.correct / perf.attempts) * 100, 2) if perf.attempts > 0 else 0,
        })

    await db.commit()

    return {
        "score": score,
        "correct_count": correct_count,
        "total_count": total_count,
        "results": results,
        "performance_entries": performance_entries,
    }
```

- [ ] **Step 3: Write minimal service implementation**

- [ ] **Step 4: Run backend lint**

Run: `ruff check backend/src/services/practice_service.py`

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add backend/src/services/practice_service.py
git commit -m "feat(practice): add submit_practice_session service"
```

---

### Task 3: Add submit route

**Files:**
- Modify: `backend/src/api/routers/practice.py`

Add request/response models above the route:

```python
class SubmitPracticeRequest(BaseModel):
    answers: dict[str, str]


class DrillResultItem(BaseModel):
    drill_id: str
    is_correct: bool
    correct_answer: str
    explanation: str


class PerformanceEntry(BaseModel):
    id: str
    topic: str
    attempts: int
    correct: int
    accuracy: float


class SubmitPracticeResponse(BaseModel):
    score: float
    correct_count: int
    total_count: int
    results: list[DrillResultItem]
    performance_entries: list[PerformanceEntry]
```

Add the route after `get_practice_session`:

```python
@router.post("/{practice_id}/submit", response_model=SubmitPracticeResponse)
async def submit_practice(
    practice_id: str,
    request: SubmitPracticeRequest,
    user=Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Submit answers for a practice session.
    Computes correctness and updates UserTopicPerformance (attempts/correct only).
    """
    from src.services.practice_service import submit_practice_session

    return await submit_practice_session(
        db,
        user_id=user.id,
        practice_id=practice_id,
        answers=request.answers,
    )
```

- [ ] **Step 6: Write route code**

- [ ] **Step 7: Run backend tests**

Run: `pytest backend/tests/test_practice.py::test_submit_practice_updates_performance -v`

Expected: PASS

- [ ] **Step 8: Commit**

```bash
git add backend/src/api/routers/practice.py backend/tests/test_practice.py
git commit -m "feat(practice): add drill submission endpoint"
```

---

### Task 4: Regenerate OpenAPI and sync frontend types

**Files:**
- Modify: `backend/openapi.json` (auto-generated)
- Modify: `frontend/src/lib/api-types.ts` (auto-generated)

- [ ] **Step 9: Regenerate OpenAPI**

Run: `cd frontend && pnpm run generate:openapi`

Expected: `openapi.json` updated with `/api/v1/practice/{practice_id}/submit` path. `api-types.ts` regenerated.

- [ ] **Step 10: Verify new types exist**

Grep: `grep -n "submit" frontend/src/lib/api-types.ts`

Expected: Contains `post_api_v1_practice__practice_id__submit` or similar operation.

- [ ] **Step 11: Commit**

```bash
git add backend/openapi.json frontend/src/lib/api-types.ts
git commit -m "chore(api): regenerate openapi for practice submit"
```

---

## Chunk 2: Frontend Drill Feedback Flow

### Task 5: Enhance `PracticeAttempt` component

**Files:**
- Modify: `frontend/src/components/features/practice/practice-attempt.tsx`

Replace the entire file content with an enhanced version that:
1. Accepts `practiceId?: string` and `onFinish?: () => void`.
2. Tracks user answers with full `PracticeDrill` type (including `type`, `difficulty`, `correct_answer` as `string | boolean`).
3. Shows a "Check Answer" button after answering.
4. Compares answer to `correct_answer` (case-insensitive strip for identification/true_false).
5. Shows green "Correct!" + explanation if right.
6. Shows red "Incorrect" + correct answer + explanation if wrong.
7. On last drill, "Continue" becomes "Finish"; clicking it calls the submission API if `practiceId` is provided, then calls `onFinish`.

```tsx
"use client";

import { useMemo, useState } from "react";
import { CheckCircle2, XCircle } from "lucide-react";

import { Button } from "@/components/ui/button";
import { RichMarkdown } from "@/components/ui/rich-markdown";
import { useSubmitPractice } from "@/hooks/use-practice";

type DrillType = "mcq" | "true_false" | "identification";

type PracticeDrill = {
  id: string;
  topic: string;
  type: DrillType;
  question: string;
  options?: string[];
  correct_answer?: string | boolean;
  explanation?: string;
  difficulty?: number;
};

type PracticeAttemptProps = {
  drills: PracticeDrill[];
  practiceId?: string;
  onFinish?: () => void;
};

const questionTypeLabel: Record<DrillType, string> = {
  mcq: "Multiple Choice",
  true_false: "True or False",
  identification: "Identification",
};

function normalizeAnswer(value: string): string {
  return value.trim().toLowerCase();
}

export function PracticeAttempt({ drills, practiceId, onFinish }: PracticeAttemptProps) {
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [checked, setChecked] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { mutateAsync: submitPractice } = useSubmitPractice();

  const current = drills[index];
  const isLast = index >= drills.length - 1;
  const answer = answers[current?.id] ?? "";

  const progress = useMemo(() => {
    if (!drills.length) return 0;
    return Math.round(((index + 1) / drills.length) * 100);
  }, [drills.length, index]);

  if (!current) {
    return (
      <section className="rounded-2xl border border-border bg-card p-5">
        <p className="text-sm text-muted-foreground">No drills available.</p>
      </section>
    );
  }

  const expected = String(current.correct_answer ?? "");
  const isCorrect = checked && normalizeAnswer(answer) === normalizeAnswer(expected);
  const isWrong = checked && !isCorrect;

  const handleSelect = (value: string) => {
    if (checked) return;
    setAnswers((prev) => ({ ...prev, [current.id]: value }));
  };

  const handleCheck = () => {
    if (!answer) return;
    setChecked(true);
  };

  const handleContinue = async () => {
    if (isLast) {
      if (practiceId) {
        setIsSubmitting(true);
        try {
          await submitPractice({ practiceId, answers });
        } finally {
          setIsSubmitting(false);
        }
      }
      onFinish?.();
      return;
    }
    setIndex((prev) => prev + 1);
    setChecked(false);
  };

  return (
    <section className="rounded-2xl border border-border bg-card p-5 space-y-4">
      <header className="space-y-1">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-semibold text-foreground">Practice Session</h2>
          <span className="text-xs font-medium text-muted-foreground">{progress}%</span>
        </div>
        <div className="h-1 w-full rounded-full bg-border">
          <div
            className="h-1 rounded-full bg-brand-500 transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
      </header>

      <article className="rounded-xl border border-border p-4 space-y-4">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            {questionTypeLabel[current.type]}
          </span>
          <span className="text-xs text-muted-foreground">Topic: {current.topic}</span>
        </div>

        <div className="prose-compact max-w-none">
          <RichMarkdown content={current.question} />
        </div>

        {current.type === "mcq" && current.options?.length ? (
          <div className="grid gap-2">
            {current.options.map((option) => (
              <button
                key={option}
                disabled={checked}
                className={`w-full flex items-center gap-3 rounded-lg border px-3 py-2.5 text-left text-sm transition-all ${
                  answer === option
                    ? "border-brand-500 bg-brand-50/50 dark:bg-brand-950/20"
                    : "border-border bg-background hover:border-border-strong hover:bg-surface-overlay"
                } ${checked ? "opacity-70 cursor-not-allowed" : ""}`}
                type="button"
                onClick={() => handleSelect(option)}
              >
                <span
                  className={`flex h-5.5 w-5.5 shrink-0 items-center justify-center rounded text-[11px] font-semibold transition-all ${
                    answer === option
                      ? "border-brand-500 bg-brand-500 text-white"
                      : "border-border bg-surface-subtle text-muted-foreground"
                  }`}
                  style={{ width: 22, height: 22 }}
                >
                  {String.fromCharCode(65 + (current.options?.indexOf(option) ?? 0))}
                </span>
                <RichMarkdown
                  content={option}
                  className="prose-compact prose-p:inline prose-p:m-0 prose-p:text-sm"
                />
              </button>
            ))}
          </div>
        ) : current.type === "true_false" ? (
          <div className="grid grid-cols-2 gap-3">
            {["True", "False"].map((option) => {
              const selected = answer === option;
              return (
                <button
                  key={option}
                  disabled={checked}
                  className={`flex h-14 items-center justify-center rounded-lg border text-sm font-medium transition-all ${
                    selected
                      ? "border-brand-500 bg-brand-500 text-white"
                      : "border-border bg-background text-foreground hover:border-border-strong hover:bg-surface-overlay"
                  } ${checked ? "opacity-70 cursor-not-allowed" : ""}`}
                  type="button"
                  onClick={() => handleSelect(option)}
                >
                  {option}
                </button>
              );
            })}
          </div>
        ) : (
          <input
            disabled={checked}
            className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20 disabled:opacity-70 disabled:cursor-not-allowed"
            placeholder="Type your answer..."
            value={answer}
            onChange={(e) => handleSelect(e.target.value)}
          />
        )}

        {!checked ? (
          <Button disabled={!answer} onClick={handleCheck} className="w-full">
            Check Answer
          </Button>
        ) : (
          <div className="space-y-3">
            {isCorrect && (
              <div className="flex items-center gap-2 rounded-lg bg-[#F0FDF4] px-3 py-2 text-[#166534] dark:bg-[#052E16] dark:text-[#4ADE80]">
                <CheckCircle2 className="h-4 w-4" />
                <span className="text-sm font-medium">Correct!</span>
              </div>
            )}
            {isWrong && (
              <div className="space-y-2">
                <div className="flex items-center gap-2 rounded-lg bg-red-50 px-3 py-2 text-red-700 dark:bg-red-950/30 dark:text-red-300">
                  <XCircle className="h-4 w-4" />
                  <span className="text-sm font-medium">Incorrect</span>
                </div>
                <div className="rounded-lg border border-border bg-surface-subtle p-3 text-sm">
                  <span className="font-medium">Correct answer: </span>
                  {expected}
                </div>
              </div>
            )}
            <div className="rounded-lg border border-border bg-surface-subtle p-3">
              <span className="text-sm font-medium">Explanation: </span>
              <RichMarkdown
                content={current.explanation ?? "No explanation provided."}
                className="prose-compact prose-p:inline prose-p:m-0 prose-p:text-sm"
              />
            </div>
            <Button
              onClick={handleContinue}
              disabled={isSubmitting}
              className="w-full"
            >
              {isSubmitting
                ? "Submitting..."
                : isLast
                ? "Finish"
                : "Continue"}
            </Button>
          </div>
        )}
      </article>
    </section>
  );
}
```

- [ ] **Step 12: Replace PracticeAttempt component**

- [ ] **Step 13: Commit**

```bash
git add frontend/src/components/features/practice/practice-attempt.tsx
git commit -m "feat(practice): add per-question feedback to PracticeAttempt"
```

---

### Task 6: Add `useSubmitPractice` hook

**Files:**
- Modify: `frontend/src/hooks/use-practice.ts`

Add after existing hooks:

```typescript
import { useMutation } from "@tanstack/react-query";
import { authClient } from "@/lib/api";

export function useSubmitPractice() {
  return useMutation({
    mutationFn: async ({
      practiceId,
      answers,
    }: {
      practiceId: string;
      answers: Record<string, string>;
    }) => {
      const { data, error } = await authClient.POST(
        "/api/v1/practice/{practice_id}/submit",
        {
          params: { path: { practice_id: practiceId } },
          body: { answers },
        }
      );
      if (error) throw error;
      return data;
    },
  });
}
```

- [ ] **Step 14: Add hook**

- [ ] **Step 15: Commit**

```bash
git add frontend/src/hooks/use-practice.ts
git commit -m "feat(practice): add useSubmitPractice hook"
```

---

### Task 7: Swap AttemptWizard for PracticeAttempt in page client

**Files:**
- Modify: `frontend/src/components/features/practice/practice-page-client.tsx`

Changes:
1. Remove `AttemptWizard` import.
2. Import `PracticeAttempt`.
3. Update `PracticeDrill` type to include `correct_answer?: string | boolean` (it may already).
4. In the `state === "drill"` block, replace `<AttemptWizard ... />` with:

```tsx
<PracticeAttempt
  drills={drills}
  practiceId={practiceId}
  onFinish={handleBackToSelect}
/>
```

5. Remove the `handlePracticeSubmit` function entirely.

- [ ] **Step 16: Update practice-page-client.tsx**

- [ ] **Step 17: Commit**

```bash
git add frontend/src/components/features/practice/practice-page-client.tsx
git commit -m "feat(practice): use PracticeAttempt for inline drill flow"
```

---

## Chunk 3: Verification & Integration Testing

### Task 8: Run backend lint and tests

**Files:** N/A (verification only)

- [ ] **Step 18: Run backend lint**

Run: `ruff check backend/src/services/practice_service.py backend/src/api/routers/practice.py backend/tests/test_practice.py`

Expected: PASS

- [ ] **Step 19: Run backend tests**

Run: `pytest backend/tests/test_practice.py -v`

Expected: PASS

---

### Task 9: Run frontend typecheck and tests

**Files:** N/A (verification only)

- [ ] **Step 20: Run frontend typecheck**

Run: `cd frontend && pnpm run test:run`

Expected: PASS (or no new failures related to changed files)

- [ ] **Step 21: Manual verification checklist**

1. Generate practice drills on `/practice`.
2. Answer a drill correctly -> green "Correct!" badge + explanation -> Continue.
3. Answer a drill incorrectly -> red "Incorrect" badge + correct answer + explanation -> Continue.
4. Finish last drill -> "Finish" button -> backend submission fires -> weak area accuracy updates.
5. Check dashboard weak areas reflect updated accuracy.

---

## Completion Report Template

When done, fill this in:

- **Commands run:** `ruff check .`, `pytest backend/tests/test_practice.py`, `pnpm run generate:openapi`, `pnpm run test:run`
- **Key results:** [score/correct_count from test, typecheck status]
- **Verified:** Backend submission endpoint, client-side feedback, topic stat updates, non-breaking schema changes.
- **Not verified:** [list any skipped manual checks]
- **Residual risks:** Granularity loss (drill + quiz stats blended). Mitigated by keeping `quiz_count >= 2` flag threshold.
- **Assumptions:** `PracticeAttempt` styling matches app design system; `normalizeAnswer` logic sufficient for all drill types.
