"use client";

import { useMemo, useState } from "react";
import { CheckCircle2, XCircle, GripVertical } from "lucide-react";

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
import { CSS } from "@dnd-kit/utilities"

import { Button } from "@/components/ui/button";
import { RichMarkdown } from "@/components/ui/rich-markdown";
import { useSubmitPractice } from "@/hooks/use-practice";
import { cn } from "@/lib/utils";

type DrillType = "mcq" | "true_false" | "identification" | "multi_select" | "ordering";

type PracticeDrill = {
  id: string;
  topic: string;
  type: DrillType;
  question: string;
  options?: string[];
  correct_answer?: string | string[] | boolean;
  explanation?: string;
  difficulty?: number;
};

type PracticeAttemptProps = {
  drills: PracticeDrill[];
  practiceId?: string;
  onFinish?: () => void;
  submitPractice?: (args: { practiceId: string; answers: Record<string, string> }) => Promise<unknown>;
};

const questionTypeLabel: Record<DrillType, string> = {
  mcq: "Multiple Choice",
  true_false: "True or False",
  identification: "Identification",
  multi_select: "Multi-Select",
  ordering: "Ordering",
};

function normalizeAnswer(value: string): string {
  return value.trim().toLowerCase();
}

function SortableItem({ id, label }: { id: string; label: string }) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id })
  const style = { transform: CSS.Transform.toString(transform), transition }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex items-center gap-2 p-3 border border-border-default rounded-lg bg-surface-card"
    >
      <button {...attributes} {...listeners} className="text-text-tertiary" aria-label="drag">
        <GripVertical className="size-4" />
      </button>
      <span className="text-sm">{label}</span>
    </div>
  )
}

export function PracticeAttempt({ drills, practiceId, onFinish, submitPractice: submitPracticeProp }: PracticeAttemptProps) {
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [checked, setChecked] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const { mutateAsync: submitPracticeHook } = useSubmitPractice();
  const submitPractice = submitPracticeProp ?? submitPracticeHook;

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  )

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

  const isSelectedMulti = (option: string) =>
    (answers[current.id] ?? "").split(",").includes(option)

  const isCorrectMulti = (option: string) =>
    Array.isArray(current.correct_answer) && current.correct_answer.includes(option)

  const toggleMultiSelect = (option: string) => {
    const currentAnswers = (answers[current.id] ?? "").split(",").filter(Boolean)
    const next = currentAnswers.includes(option)
      ? currentAnswers.filter((a) => a !== option)
      : [...currentAnswers, option]
    handleSelect(next.join(","))
  }

  const isCorrect = () => {
    if (current.type === "multi_select") {
      const selected = (answers[current.id] ?? "").split(",").filter(Boolean).sort()
      const correct = Array.isArray(current.correct_answer) ? [...current.correct_answer].sort() : []
      return JSON.stringify(selected) === JSON.stringify(correct)
    }
    return normalizeAnswer(answers[current.id]) === normalizeAnswer(String(current.correct_answer ?? ""))
  }

  const isWrong = checked && !isCorrect();

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
        setSubmitError(null);
        try {
          await submitPractice({ practiceId, answers });
          onFinish?.();
        } catch (err) {
          setSubmitError(err instanceof Error ? err.message : "Failed to submit. Please try again.");
        } finally {
          setIsSubmitting(false);
        }
      } else {
        onFinish?.();
      }
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
        ) : current.type === "multi_select" ? (
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
            {isCorrect() && (
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
            {submitError && (
              <p className="text-sm text-danger-500 mb-2">{submitError}</p>
            )}
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
