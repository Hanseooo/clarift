# Quiz Results & UX Enhancement Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Create an enhanced quiz results page with score reveal, weak topics, mastery graph, and gated answer review. Standardize quiz attempts on carousel pattern. Add markdown rendering to quiz questions with backend guardrails.

**Architecture:** New reusable components for results display. Modify existing attempt wizard to redirect to results. Update quiz chain prompts for markdown generation and answer key validation.

**Tech Stack:** Next.js 15, TypeScript, Tailwind CSS 4, shadcn/ui, recharts, react-markdown, FastAPI, LangChain

---

## Chunk 1: ScoreReveal Component

**Files:**
- Create: `frontend/src/components/features/quiz/score-reveal.tsx`

- [ ] **Step 1: Create ScoreReveal component**

Create `frontend/src/components/features/quiz/score-reveal.tsx`:

```tsx
"use client";

import { useEffect, useState, useRef } from "react";
import { cn } from "@/lib/utils";

interface ScoreRevealProps {
  score: number;
  correctCount: number;
  totalCount: number;
}

function easeOutQuart(t: number): number {
  return 1 - Math.pow(1 - t, 4);
}

export function ScoreReveal({ score, correctCount, totalCount }: ScoreRevealProps) {
  const [displayScore, setDisplayScore] = useState(0);
  const [isComplete, setIsComplete] = useState(false);
  const animationRef = useRef<number>();
  const startTimeRef = useRef<number>();
  const duration = 800;

  const tier = score >= 70 ? "success" : score >= 40 ? "warning" : "danger";
  const tierConfig = {
    success: {
      color: "#10B981",
      bg: "rgba(16,185,129,0.1)",
      border: "rgba(16,185,129,0.3)",
      message: "Great work — keep it up",
    },
    warning: {
      color: "#F59E0B",
      bg: "rgba(245,158,11,0.1)",
      border: "rgba(245,158,11,0.3)",
      message: "Good progress — review weak areas",
    },
    danger: {
      color: "#EF4444",
      bg: "rgba(239,68,68,0.1)",
      border: "rgba(239,68,68,0.3)",
      message: "Keep going — practice makes perfect",
    },
  };

  const config = tierConfig[tier];

  useEffect(() => {
    startTimeRef.current = performance.now();

    const animate = (currentTime: number) => {
      const elapsed = currentTime - (startTimeRef.current ?? 0);
      const progress = Math.min(elapsed / duration, 1);
      const eased = easeOutQuart(progress);
      const current = Math.round(eased * score);

      setDisplayScore(current);

      if (progress < 1) {
        animationRef.current = requestAnimationFrame(animate);
      } else {
        setIsComplete(true);
      }
    };

    animationRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [score]);

  return (
    <div className="rounded-2xl border border-border-default overflow-hidden">
      {/* Top section - score display */}
      <div
        className="px-5 py-6 text-center border-b border-border-default"
        style={{
          background: `linear-gradient(135deg, ${config.bg} 0%, rgba(99,102,241,0.04) 100%)`,
        }}
      >
        <p className="text-sm text-text-secondary mb-2">Quiz Results</p>

        {/* Score ring */}
        <div
          className="w-20 h-20 rounded-full mx-auto mb-2.5 flex flex-col items-center justify-center"
          style={{
            background: config.bg,
            border: `2px solid ${config.border}`,
            boxShadow: isComplete ? `0 0 0 6px ${config.bg}` : "none",
            transition: "box-shadow 300ms ease",
          }}
        >
          <span
            className="text-[28px] font-bold leading-none"
            style={{ color: config.color }}
          >
            {displayScore}%
          </span>
          <span
            className="text-[10px] font-medium mt-0.5"
            style={{ color: config.color, opacity: 0.8 }}
          >
            score
          </span>
        </div>

        {/* Contextual message */}
        <p className="text-sm font-semibold text-text-primary">
          {config.message}
        </p>
        <p className="text-xs text-text-tertiary mt-1">
          {correctCount} of {totalCount} correct
        </p>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
cd C:\Users\Asus\Desktop\Clarift\frontend
npx tsc --noEmit --skipLibCheck
```

- [ ] **Step 3: Commit**

```bash
cd C:\Users\Asus\Desktop\Clarift
git add frontend/src/components/features/quiz/score-reveal.tsx
git commit -m "feat(quiz): add ScoreReveal component with animated count-up"
```

---

## Chunk 2: WeakTopicsList Component

**Files:**
- Create: `frontend/src/components/features/quiz/weak-topics-list.tsx`

- [ ] **Step 4: Create WeakTopicsList component**

Create `frontend/src/components/features/quiz/weak-topics-list.tsx`:

```tsx
import { Target } from "lucide-react";

interface WeakTopic {
  topic: string;
  accuracy: number;
}

interface WeakTopicsListProps {
  topics: WeakTopic[];
}

export function WeakTopicsList({ topics }: WeakTopicsListProps) {
  if (topics.length === 0) {
    return (
      <div className="text-center py-8 px-5">
        <Target className="size-8 text-text-tertiary mx-auto mb-3" />
        <p className="text-sm font-medium text-text-primary mb-1">
          No weak areas yet
        </p>
        <p className="text-xs text-text-tertiary">
          Complete a few quizzes to discover your gaps.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {topics.map((topic) => (
        <div
          key={topic.topic}
          className="bg-surface-card border border-border-default rounded-xl p-3.5 flex items-center gap-3"
        >
          {/* Icon ring */}
          <div
            className="size-9 rounded-[10px] flex items-center justify-center flex-shrink-0"
            style={{
              background: "rgba(245,158,11,0.1)",
              border: "1px solid rgba(245,158,11,0.2)",
            }}
          >
            <Target className="size-[18px] text-accent-500" />
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-text-primary mb-1 truncate">
              {topic.topic}
            </p>
            <div className="h-[3px] w-full bg-border-default rounded-full overflow-hidden">
              <div
                className="h-full bg-accent-500 rounded-full"
                style={{ width: `${topic.accuracy}%` }}
              />
            </div>
          </div>

          {/* Percentage */}
          <span className="text-base font-bold text-accent-500 flex-shrink-0">
            {topic.accuracy}%
          </span>
        </div>
      ))}
    </div>
  );
}
```

- [ ] **Step 5: Verify TypeScript compiles**

```bash
cd C:\Users\Asus\Desktop\Clarift\frontend
npx tsc --noEmit --skipLibCheck
```

- [ ] **Step 6: Commit**

```bash
cd C:\Users\Asus\Desktop\Clarift
git add frontend/src/components/features/quiz/weak-topics-list.tsx
git commit -m "feat(quiz): add WeakTopicsList component"
```

---

## Chunk 3: QuestionReview Component

**Files:**
- Create: `frontend/src/components/features/quiz/question-review.tsx`

- [ ] **Step 7: Create QuestionReview component**

Create `frontend/src/components/features/quiz/question-review.tsx`:

```tsx
"use client";

import { useState } from "react";
import { CheckCircle, XCircle } from "lucide-react";
import { RichMarkdown } from "@/components/ui/rich-markdown";
import { cn } from "@/lib/utils";

interface QuestionReviewProps {
  index: number;
  question: string;
  userAnswer: string | boolean | string[];
  correctAnswer: string | boolean | string[];
  isCorrect: boolean;
  explanation: string;
  questionType: string;
  showAnswers: boolean;
}

function formatAnswer(answer: string | boolean | string[]): string {
  if (typeof answer === "boolean") return answer ? "True" : "False";
  if (Array.isArray(answer)) return answer.join(", ");
  return answer;
}

const typeBadgeClasses: Record<string, string> = {
  mcq: "bg-brand-100 text-brand-800",
  true_false: "bg-success-100 text-success-800",
  identification: "bg-accent-100 text-accent-800",
  multi_select: "bg-purple-100 text-purple-800",
  ordering: "bg-sky-100 text-sky-800",
};

export function QuestionReview({
  index,
  question,
  userAnswer,
  correctAnswer,
  isCorrect,
  explanation,
  questionType,
  showAnswers,
}: QuestionReviewProps) {
  const [isRevealed, setIsRevealed] = useState(showAnswers);

  // Sync with parent state
  if (showAnswers && !isRevealed) {
    setIsRevealed(true);
  }

  return (
    <article className="bg-surface-card border border-border-default rounded-2xl p-4 md:p-5 space-y-3.5">
      {/* Header */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-text-secondary">
            {index + 1}.
          </span>
          <span
            className={cn(
              "rounded-full px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide",
              typeBadgeClasses[questionType] || "bg-surface-subtle text-text-secondary"
            )}
          >
            {questionType.replace("_", " ")}
          </span>
        </div>
        {isCorrect ? (
          <CheckCircle className="size-5 text-success-500 flex-shrink-0" />
        ) : (
          <XCircle className="size-5 text-danger-500 flex-shrink-0" />
        )}
      </div>

      {/* Question text */}
      <div className="prose-compact">
        <RichMarkdown content={question} />
      </div>

      {/* User answer */}
      <div
        className={cn(
          "rounded-lg px-3 py-2 text-sm",
          isCorrect
            ? "bg-success-100 text-success-800"
            : "bg-danger-100 text-danger-800"
        )}
      >
        <span className="font-medium">Your answer: </span>
        {formatAnswer(userAnswer)}
      </div>

      {/* Correct answer (revealed) */}
      {isRevealed && !isCorrect && (
        <div className="rounded-lg px-3 py-2 text-sm bg-success-100 text-success-800 animate-in fade-in duration-200">
          <span className="font-medium">Correct answer: </span>
          {formatAnswer(correctAnswer)}
        </div>
      )}

      {/* Explanation (revealed) */}
      {isRevealed && (
        <div className="bg-surface-subtle rounded-xl p-3 prose-compact animate-in fade-in duration-200">
          <span className="font-medium text-sm text-text-primary">Explanation: </span>
          <RichMarkdown content={explanation} />
        </div>
      )}

      {/* Hidden state placeholder */}
      {!isRevealed && (
        <div className="text-xs text-text-tertiary italic">
          Correct answer hidden. Click "Reveal Correct Answers" to see explanation.
        </div>
      )}
    </article>
  );
}
```

- [ ] **Step 8: Verify TypeScript compiles**

```bash
cd C:\Users\Asus\Desktop\Clarift\frontend
npx tsc --noEmit --skipLibCheck
```

- [ ] **Step 9: Commit**

```bash
cd C:\Users\Asus\Desktop\Clarift
git add frontend/src/components/features/quiz/question-review.tsx
git commit -m "feat(quiz): add QuestionReview component with reveal toggle"
```

---

## Chunk 4: QuizResultsActions Component

**Files:**
- Create: `frontend/src/components/features/quiz/quiz-results-actions.tsx`

- [ ] **Step 10: Create QuizResultsActions component**

Create `frontend/src/components/features/quiz/quiz-results-actions.tsx`:

```tsx
"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";

interface QuizResultsActionsProps {
  quizId: string;
  onReveal: () => void;
  isRevealed: boolean;
}

export function QuizResultsActions({ quizId, onReveal, isRevealed }: QuizResultsActionsProps) {
  return (
    <div className="flex flex-col sm:flex-row gap-3 justify-center pt-2">
      <Button
        onClick={onReveal}
        disabled={isRevealed}
        className="bg-brand-500 hover:bg-brand-600 text-white"
      >
        {isRevealed ? "Answers Revealed" : "Reveal Correct Answers"}
      </Button>

      <Button
        variant="ghost"
        asChild
        className="text-text-secondary hover:bg-surface-overlay"
      >
        <Link href={`/quizzes/${quizId}/attempt`}>
          Retry Quiz
        </Link>
      </Button>
    </div>
  );
}
```

- [ ] **Step 11: Verify TypeScript compiles**

```bash
cd C:\Users\Asus\Desktop\Clarift\frontend
npx tsc --noEmit --skipLibCheck
```

- [ ] **Step 12: Commit**

```bash
cd C:\Users\Asus\Desktop\Clarift
git add frontend/src/components/features/quiz/quiz-results-actions.tsx
git commit -m "feat(quiz): add QuizResultsActions component"
```

---

## Chunk 5: Rewrite Results Page

**Files:**
- Modify: `frontend/src/app/(app)/quizzes/[id]/results/page.tsx`

- [ ] **Step 13: Rewrite ResultsPage with new components**

Replace the entire content of `frontend/src/app/(app)/quizzes/[id]/results/page.tsx`:

```tsx
import { auth, currentUser } from "@clerk/nextjs/server";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";

import { ScoreReveal } from "@/components/features/quiz/score-reveal";
import { WeakTopicsList } from "@/components/features/quiz/weak-topics-list";
import { MasteryChart } from "@/components/features/quiz/mastery-chart";
import { QuestionReview } from "@/components/features/quiz/question-review";
import { QuizResultsActions } from "@/components/features/quiz/quiz-results-actions";
import { Button } from "@/components/ui/button";

// Client wrapper for reveal state
import { ResultsClient } from "./results-client";

type QuizResultQuestion = {
  id: string;
  question: string;
  user_answer: string | boolean | string[];
  correct_answer: string | boolean | string[];
  is_correct: boolean;
  topic: string;
  explanation: string;
  type?: string;
};

type QuizResult = {
  score: number;
  per_topic: Record<string, { correct: number; total: number }>;
  questions: QuizResultQuestion[];
};

type ResultsPageProps = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ attempt_id?: string }>;
};

async function fetchAttemptDetails(attemptId: string, token: string): Promise<QuizResult | null> {
  const baseUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
  const res = await fetch(`${baseUrl}/api/v1/quizzes/attempts/${attemptId}`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
    cache: "no-store",
  });

  if (!res.ok) return null;

  return res.json() as Promise<QuizResult>;
}

export default async function ResultsPage({ params, searchParams }: ResultsPageProps) {
  const user = await currentUser();
  if (!user) redirect("/login");

  const session = await auth();
  const token = await session.getToken();
  if (!token) redirect("/login");

  const resolvedParams = await params;
  const resolvedSearchParams = await searchParams;
  const attemptId = resolvedSearchParams.attempt_id;

  if (!attemptId) {
    notFound();
  }

  const result = await fetchAttemptDetails(attemptId, token);
  if (!result) {
    notFound();
  }

  const perTopicAccuracy = Object.entries(result.per_topic).map(([topic, stats]) => ({
    topic,
    accuracy: Math.round((stats.correct / stats.total) * 100),
  }));

  const weakTopics = perTopicAccuracy
    .filter((t) => t.accuracy < 70)
    .map((t) => ({ topic: t.topic, accuracy: t.accuracy }));

  const correctCount = result.questions.filter((q) => q.is_correct).length;

  return (
    <div className="max-w-3xl space-y-6">
      {/* Back button */}
      <Button variant="outline" size="sm" asChild className="w-fit">
        <Link href="/quizzes">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Quizzes
        </Link>
      </Button>

      {/* Score reveal */}
      <ScoreReveal
        score={result.score}
        correctCount={correctCount}
        totalCount={result.questions.length}
      />

      {/* Topic mastery */}
      <section className="bg-surface-card border border-border-default rounded-2xl p-5">
        <h2 className="text-lg font-semibold text-text-primary mb-4">
          Mastery by Topic
        </h2>
        <MasteryChart perTopicAccuracy={perTopicAccuracy} />
      </section>

      {/* Weak topics */}
      {weakTopics.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-lg font-semibold text-text-primary">Weak Areas</h2>
          <WeakTopicsList topics={weakTopics} />
        </section>
      )}

      {/* Question review with client-side reveal */}
      <ResultsClient quizId={resolvedParams.id} questions={result.questions} />
    </div>
  );
}
```

- [ ] **Step 14: Create ResultsClient for reveal state**

Create `frontend/src/app/(app)/quizzes/[id]/results/results-client.tsx`:

```tsx
"use client";

import { useState } from "react";
import { QuestionReview } from "@/components/features/quiz/question-review";
import { QuizResultsActions } from "@/components/features/quiz/quiz-results-actions";

type QuizResultQuestion = {
  id: string;
  question: string;
  user_answer: string | boolean | string[];
  correct_answer: string | boolean | string[];
  is_correct: boolean;
  topic: string;
  explanation: string;
  type?: string;
};

interface ResultsClientProps {
  quizId: string;
  questions: QuizResultQuestion[];
}

export function ResultsClient({ quizId, questions }: ResultsClientProps) {
  const [showAnswers, setShowAnswers] = useState(false);

  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-text-primary">Question Review</h2>
      </div>

      <QuizResultsActions
        quizId={quizId}
        onReveal={() => setShowAnswers(true)}
        isRevealed={showAnswers}
      />

      <div className="space-y-4">
        {questions.map((q, index) => (
          <QuestionReview
            key={q.id}
            index={index}
            question={q.question}
            userAnswer={q.user_answer}
            correctAnswer={q.correct_answer}
            isCorrect={q.is_correct}
            explanation={q.explanation}
            questionType={q.type || "mcq"}
            showAnswers={showAnswers}
          />
        ))}
      </div>
    </section>
  );
}
```

- [ ] **Step 15: Verify TypeScript compiles**

```bash
cd C:\Users\Asus\Desktop\Clarift\frontend
npx tsc --noEmit --skipLibCheck
```

- [ ] **Step 16: Commit**

```bash
cd C:\Users\Asus\Desktop\Clarift
git add frontend/src/app/(app)/quizzes/[id]/results/page.tsx
git add frontend/src/app/(app)/quizzes/[id]/results/results-client.tsx
git commit -m "feat(quiz): rewrite results page with enhanced components"
```

---

## Chunk 6: Update MasteryChart Colors

**Files:**
- Modify: `frontend/src/components/features/quiz/mastery-chart.tsx`

- [ ] **Step 17: Update MasteryChart with brand tokens**

Replace the content of `frontend/src/components/features/quiz/mastery-chart.tsx`:

```tsx
"use client";

import {
  PolarAngleAxis,
  PolarGrid,
  Radar,
  RadarChart,
  ResponsiveContainer,
} from "recharts";

interface MasteryChartProps {
  perTopicAccuracy: { topic: string; accuracy: number }[];
}

export function MasteryChart({ perTopicAccuracy }: MasteryChartProps) {
  if (perTopicAccuracy.length === 0) {
    return (
      <p className="text-sm text-text-secondary">
        No topic data available.
      </p>
    );
  }

  const data = perTopicAccuracy.map((item) => ({
    topic: item.topic,
    accuracy: item.accuracy,
    fullMark: 100,
  }));

  return (
    <ResponsiveContainer width="100%" height={300}>
      <RadarChart data={data}>
        <PolarGrid stroke="#E5E4F0" />
        <PolarAngleAxis
          dataKey="topic"
          tick={{ fill: "#6B6888", fontSize: 12 }}
        />
        <Radar
          name="Accuracy"
          dataKey="accuracy"
          stroke="#6366F1"
          fill="#6366F1"
          fillOpacity={0.3}
        />
      </RadarChart>
    </ResponsiveContainer>
  );
}
```

- [ ] **Step 18: Verify TypeScript compiles**

```bash
cd C:\Users\Asus\Desktop\Clarift\frontend
npx tsc --noEmit --skipLibCheck
```

- [ ] **Step 19: Commit**

```bash
cd C:\Users\Asus\Desktop\Clarift
git add frontend/src/components/features/quiz/mastery-chart.tsx
git commit -m "feat(quiz): update MasteryChart with brand colors"
```

---

## Chunk 7: Update AttemptWizard to Redirect

**Files:**
- Modify: `frontend/src/components/features/quiz/attempt-wizard.tsx`

- [ ] **Step 20: Update handleSubmit to redirect to results**

In `frontend/src/components/features/quiz/attempt-wizard.tsx`, update the `handleSubmit` function:

```typescript
const handleSubmit = async () => {
  const response = await mutateAsync({
    quiz_id: quizId,
    answers,
  });
  // Redirect to results page instead of showing inline results
  router.push(`/quizzes/${quizId}/results?attempt_id=${response.attempt_id}`);
};
```

Also remove any `setResult` or inline result display code if present (the current code doesn't have it, but ensure it's clean).

- [ ] **Step 21: Verify TypeScript compiles**

```bash
cd C:\Users\Asus\Desktop\Clarift\frontend
npx tsc --noEmit --skipLibCheck
```

- [ ] **Step 22: Commit**

```bash
cd C:\Users\Asus\Desktop\Clarift
git add frontend/src/components/features/quiz/attempt-wizard.tsx
git commit -m "feat(quiz): redirect to results page after quiz submission"
```

---

## Chunk 8: Deprecate Legacy Quiz Page

**Files:**
- Modify: `frontend/src/app/(app)/quizzes/[id]/page.tsx`

- [ ] **Step 23: Update legacy page to redirect to attempt page**

Replace `frontend/src/app/(app)/quizzes/[id]/page.tsx` with:

```tsx
import { redirect } from "next/navigation";

type QuizPageProps = {
  params: Promise<{ id: string }>;
};

export default async function QuizPage({ params }: QuizPageProps) {
  const resolvedParams = await params;
  redirect(`/quizzes/${resolvedParams.id}/attempt`);
}
```

- [ ] **Step 24: Verify TypeScript compiles**

```bash
cd C:\Users\Asus\Desktop\Clarift\frontend
npx tsc --noEmit --skipLibCheck
```

- [ ] **Step 25: Commit**

```bash
cd C:\Users\Asus\Desktop\Clarift
git add frontend/src/app/(app)/quizzes/[id]/page.tsx
git commit -m "feat(quiz): redirect legacy quiz page to attempt wizard"
```

---

## Chunk 9: Add Markdown Rendering to Quiz Questions

**Files:**
- Modify: `frontend/src/components/features/quiz/attempt-wizard.tsx`

- [ ] **Step 26: Update question rendering to use RichMarkdown**

In `frontend/src/components/features/quiz/attempt-wizard.tsx`:

1. Add import:
```tsx
import { RichMarkdown } from "@/components/ui/rich-markdown";
```

2. Update the question text display:
```tsx
{/* Question text */}
<div className="prose-compact max-w-none">
  <RichMarkdown content={currentQuestion.question} />
</div>
```

3. Update option rendering in MCQQuestion and MultiSelectQuestion to use RichMarkdown:

For MCQ:
```tsx
<span className="text-sm text-foreground prose-compact">
  <RichMarkdown content={option} />
</span>
```

For MultiSelect:
```tsx
<span className="text-sm text-foreground prose-compact">
  <RichMarkdown content={option} />
</span>
```

**Note:** Apply `prose-compact` class to the container. The `RichMarkdown` component will handle the rendering. For inline options, we may need a wrapper with `prose-p:inline prose-p:text-sm` to prevent block-level elements.

Create a minimal wrapper component or use inline styling. Let's add a compact inline variant:

```tsx
// In MCQQuestion and MultiSelectQuestion, replace option text span:
<span className="text-sm text-foreground">
  <RichMarkdown 
    content={option} 
    className="prose-compact prose-p:inline prose-p:m-0 prose-p:text-sm prose-code:text-xs" 
  />
</span>
```

- [ ] **Step 27: Verify TypeScript compiles**

```bash
cd C:\Users\Asus\Desktop\Clarift\frontend
npx tsc --noEmit --skipLibCheck
```

- [ ] **Step 28: Commit**

```bash
cd C:\Users\Asus\Desktop\Clarift
git add frontend/src/components/features/quiz/attempt-wizard.tsx
git commit -m "feat(quiz): render quiz questions and options as markdown"
```

---

## Chunk 10: Backend Quiz Chain Updates

**Files:**
- Modify: `backend/src/chains/quiz_chain.py`

- [ ] **Step 29: Update TYPE_PROMPTS with markdown instructions**

Add markdown formatting instructions to each TYPE_PROMPT. Insert after "Base every question STRICTLY on the provided source material" in each prompt:

```python
TYPE_PROMPTS = {
    "mcq": (
        "Generate exactly {count} multiple choice questions. "
        "Each question MUST have exactly 4 options labeled A, B, C, D. "
        "Only ONE option is correct. "
        "Base every question and option STRICTLY on the provided source material. "
        "Do NOT use outside knowledge. "
        "Question text max 200 characters. Each option max 100 characters. "
        "Mark the correct answer clearly. "
        "\n\n"
        "Markdown formatting is ALLOWED in question text and options: "
        "Use LaTeX ($...$ or $$...$$) for mathematical expressions, chemical formulas, and equations. "
        "Use code blocks (```lang...```) for programming snippets. "
        "Use tables (| col | col |) for structured data. "
        "Use bold/italic for emphasis. "
        "Use lists for multi-part information."
    ),
    "true_false": (
        "Generate exactly {count} true/false questions. "
        "Each question must be a clear, unambiguous factual claim derived ONLY from the provided source material. "
        "Do NOT use outside knowledge. "
        "Question text max 200 characters. "
        "The correct answer must be either `true` or `false`. "
        "\n\n"
        "Markdown formatting is ALLOWED in question text: "
        "Use LaTeX ($...$ or $$...$$) for mathematical expressions, chemical formulas, and equations. "
        "Use code blocks (```lang...```) for programming snippets. "
        "Use tables (| col | col |) for structured data. "
        "Use bold/italic for emphasis."
    ),
    "identification": (
        "Generate exactly {count} fill-in-the-blank (identification) questions. "
        "Base every question STRICTLY on the provided source material. "
        "Do NOT use outside knowledge. "
        "\n\n"
        "STRICT RULES:\n"
        "1. Each blank replaces a SINGLE specific term, keyword, number, date, or short phrase (max 3 words).\n"
        "2. The correct_answer MUST be 1-3 words only. NEVER a full sentence, NEVER a definition, NEVER a restatement of the question.\n"
        "3. Every question MUST include a format hint in parentheses at the end, such as:\n"
        "   - (1 word)\n"
        "   - (2 words)\n"
        "   - (abbreviation)\n"
        "   - (with unit)\n"
        "   - (with symbol)\n"
        "   - (2 decimal places)\n"
        "   - (year)\n"
        "4. Question text max 200 characters. correct_answer max 30 characters.\n"
        "\n"
        "CORRECT EXAMPLES:\n"
        "- Question: 'The ____ command displays the commit history. (1 word)' -> correct_answer: 'log'\n"
        "- Question: 'The ____ protocol encrypts web traffic. (abbreviation, 5 letters)' -> correct_answer: 'HTTPS'\n"
        "- Question: 'The speed of light is approximately ____ m/s. (9 digits)' -> correct_answer: '299792458'\n"
        "- Question: 'The value of pi to two decimal places is ____. (number)' -> correct_answer: '3.14'\n"
        "\n"
        "WRONG EXAMPLES (never do this):\n"
        "- Question: 'What does git log do?' -> correct_answer: 'Displays a list of all commits' (WRONG: answer is a sentence)\n"
        "- Question: 'The process of cell division is called ____. (1 word)' -> correct_answer: 'The process where a cell divides' (WRONG: answer is a sentence)\n"
        "- Question: '____ discovered penicillin. (2 words)' -> correct_answer: 'Alexander Fleming was a scientist who discovered penicillin in 1928' (WRONG: far too long)"
        "\n\n"
        "Markdown formatting is ALLOWED in question text:\n"
        "Use LaTeX ($...$ or $$...$$) for mathematical expressions, chemical formulas, and equations. "
        "Use code blocks (```lang...```) for programming snippets. "
        "Use tables (| col | col |) for structured data. "
        "Use bold/italic for emphasis. "
        "Use lists for multi-part information.\n\n"
        "STRICT GUARDRAIL for identification questions:\n"
        "The `correct_answer` field MUST be plain text only. "
        "NEVER include markdown syntax (*, _, $, `, #, etc.) in `correct_answer`. "
        "NEVER include LaTeX in `correct_answer`. "
        "If the question asks about a formula, the answer must be the NAME or DESCRIPTION, not the formula itself. "
        "Example: Question: 'The formula $E=mc^2$ represents ____. (2 words)' -> correct_answer: 'mass-energy equivalence' NOT '$E=mc^2$'."
    ),
    "multi_select": (
        "Generate exactly {count} multiple-select questions. "
        "Each question must have 4-6 options. "
        "TWO or MORE options must be correct. "
        "Base every question and option STRICTLY on the provided source material. "
        "Do NOT use outside knowledge. "
        "Question text max 200 characters. Each option max 100 characters. "
        "Mark all correct answers clearly. "
        "\n\n"
        "Markdown formatting is ALLOWED in question text and options: "
        "Use LaTeX ($...$ or $$...$$) for mathematical expressions, chemical formulas, and equations. "
        "Use code blocks (```lang...```) for programming snippets. "
        "Use tables (| col | col |) for structured data. "
        "Use bold/italic for emphasis. "
        "Use lists for multi-part information."
    ),
    "ordering": (
        "Generate exactly {count} sequencing questions. "
        "Each question must provide 4-6 steps, events, or items that the student must arrange in the correct order. "
        "Base every question STRICTLY on the provided source material. "
        "Do NOT use outside knowledge. "
        "Question text max 200 characters. Each step max 100 characters. "
        "Provide the correct order clearly. "
        "\n\n"
        "Markdown formatting is ALLOWED in question text and steps: "
        "Use LaTeX ($...$ or $$...$$) for mathematical expressions, chemical formulas, and equations. "
        "Use code blocks (```lang...```) for programming snippets. "
        "Use tables (| col | col |) for structured data. "
        "Use bold/italic for emphasis. "
        "Use lists for multi-part information."
    ),
}
```

- [ ] **Step 30: Update _validate_questions to check for markdown in identification answers**

In `backend/src/chains/quiz_chain.py`, update the identification validation:

```python
elif qtype == "identification":
    answer = q.get("correct_answer", "")
    if not answer:
        errors.append(f"Identification question {q['id']} has empty correct_answer")
    elif len(str(answer).split()) > 5:
        errors.append(
            f"Identification question {q['id']} correct_answer too long "
            f"({len(str(answer).split())} words, max 5)"
        )
    # Check for markdown syntax in answer
    import re
    markdown_patterns = [
        r'\*\*', r'\*', r'__', r'_', r'\$', r'`', r'#', 
        r'\[.*?\]\(.*?\)', r'!\[.*?\]\(.*?\)'
    ]
    answer_str = str(answer)
    if any(re.search(pattern, answer_str) for pattern in markdown_patterns):
        errors.append(
            f"Identification question {q['id']} correct_answer contains markdown syntax. "
            f"It must be plain text only."
        )
```

- [ ] **Step 31: Run backend tests**

```bash
cd C:\Users\Asus\Desktop\Clarift\backend
pytest tests/test_quiz_chain.py -v
```

If tests don't exist, at least verify syntax:
```bash
cd C:\Users\Asus\Desktop\Clarift\backend
python -m py_compile src/chains/quiz_chain.py
```

- [ ] **Step 32: Commit**

```bash
cd C:\Users\Asus\Desktop\Clarift
git add backend/src/chains/quiz_chain.py
git commit -m "feat(quiz): update prompts for markdown generation and add answer key guardrails"
```

---

## Chunk 11: Integration & Testing

- [ ] **Step 33: Run frontend type check**

```bash
cd C:\Users\Asus\Desktop\Clarift\frontend
npx tsc --noEmit --skipLibCheck
```

- [ ] **Step 34: Run frontend tests**

```bash
cd C:\Users\Asus\Desktop\Clarift\frontend
pnpm run test:run
```

- [ ] **Step 35: Run linting**

```bash
cd C:\Users\Asus\Desktop\Clarift\frontend
npx biome check .
cd C:\Users\Asus\Desktop\Clarift\backend
ruff check .
```

- [ ] **Step 36: Final verification commit**

```bash
cd C:\Users\Asus\Desktop\Clarift
git commit --allow-empty -m "feat(quiz): complete quiz results and UX enhancement"
```

---

## Verification Checklist

- [ ] Results page shows animated score reveal with contextual message
- [ ] Weak topics displayed in amber cards with accuracy percentages
- [ ] Topic mastery radar graph uses brand colors
- [ ] "Reveal Correct Answers" button toggles answer visibility
- [ ] "Retry Quiz" button navigates to attempt page
- [ ] Quiz attempts redirect to results page after submission
- [ ] Legacy quiz page redirects to attempt wizard
- [ ] Quiz questions render markdown (math, code, tables)
- [ ] Quiz options render markdown
- [ ] Identification answer keys validated as plain text
- [ ] All components support dark mode
- [ ] TypeScript compiles without errors
- [ ] Tests pass
- [ ] Linting passes

---

## Grouping Note

This plan covers Sub-Projects 3 and 4 combined per user direction. Next group to plan: Group B (Custom Dropdown + Dashboard UI + Quota Display).
