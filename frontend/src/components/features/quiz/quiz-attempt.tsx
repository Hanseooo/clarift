"use client";

import { useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { useSubmitAttempt } from "@/hooks/use-quiz";

type QuizQuestion = {
  id: string;
  type: string;
  question: string;
  options?: string[];
  correct_answer?: string | boolean;
  correct_answers?: string[];
  steps?: string[];
  correct_order?: number[];
  topic: string;
  explanation: string;
};

type QuizData = {
  id: string;
  questions: QuizQuestion[];
};

type QuizAttemptProps = {
  quiz: QuizData;
};

const LETTERS = ["A", "B", "C", "D", "E", "F"];

export function QuizAttempt({ quiz }: QuizAttemptProps) {
  const { mutateAsync, isLoading, error } = useSubmitAttempt();
  const [answers, setAnswers] = useState<Record<string, string | string[] | number[]>>({});
  const [result, setResult] = useState<null | { score: number; weak_topics: string[] }>(null);

  const total = quiz.questions.length;
  const answered = useMemo(() => Object.keys(answers).length, [answers]);

  const onSubmit = async () => {
    const serializedAnswers: Record<string, string> = {};
    for (const [key, value] of Object.entries(answers)) {
      serializedAnswers[key] = Array.isArray(value) ? JSON.stringify(value) : value;
    }
    const response = await mutateAsync({
      quiz_id: quiz.id,
      answers: serializedAnswers,
    });
    setResult({ score: response.score, weak_topics: response.weak_topics });
  };

  const renderQuestion = (question: QuizQuestion, index: number) => {
    const qtype = question.type;

    if (qtype === "mcq") {
      return (
        <div className="grid gap-2">
          {(question.options ?? []).map((option, optionIndex) => {
            const letter = LETTERS[optionIndex] ?? String(optionIndex + 1);
            const selected = answers[question.id] === option;
            return (
              <button
                key={`${question.id}-${letter}`}
                className={`flex items-center gap-3 rounded-xl border px-3 py-2 text-left ${
                  selected
                    ? "border-primary bg-primary/10 text-foreground"
                    : "border-border bg-background"
                }`}
                type="button"
                onClick={() => setAnswers((prev) => ({ ...prev, [question.id]: option }))}
              >
                <span className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-border bg-background text-xs font-semibold">
                  {letter}
                </span>
                <span className="text-sm">{option}</span>
              </button>
            );
          })}
        </div>
      );
    }

    if (qtype === "true_false") {
      return (
        <div className="grid gap-2">
          {["True", "False"].map((option) => {
            const selected = answers[question.id] === option;
            return (
              <button
                key={`${question.id}-${option}`}
                className={`flex items-center gap-3 rounded-xl border px-3 py-2 text-left ${
                  selected
                    ? "border-primary bg-primary/10 text-foreground"
                    : "border-border bg-background"
                }`}
                type="button"
                onClick={() => setAnswers((prev) => ({ ...prev, [question.id]: option }))}
              >
                <span className="text-sm">{option}</span>
              </button>
            );
          })}
        </div>
      );
    }

    if (qtype === "identification") {
      return (
        <input
          className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm"
          placeholder="Type your answer"
          value={(answers[question.id] as string) ?? ""}
          onChange={(event) =>
            setAnswers((prev) => ({
              ...prev,
              [question.id]: event.target.value,
            }))
          }
        />
      );
    }

    if (qtype === "multi_select") {
      const selected = (answers[question.id] as string[]) ?? [];
      return (
        <div className="grid gap-2">
          {(question.options ?? []).map((option, optionIndex) => {
            const letter = LETTERS[optionIndex] ?? String(optionIndex + 1);
            const isSelected = selected.includes(option);
            return (
              <button
                key={`${question.id}-${letter}`}
                className={`flex items-center gap-3 rounded-xl border px-3 py-2 text-left ${
                  isSelected
                    ? "border-primary bg-primary/10 text-foreground"
                    : "border-border bg-background"
                }`}
                type="button"
                onClick={() => {
                  const next = isSelected
                    ? selected.filter((o) => o !== option)
                    : [...selected, option];
                  setAnswers((prev) => ({ ...prev, [question.id]: next }));
                }}
              >
                <span className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-border bg-background text-xs font-semibold">
                  {letter}
                </span>
                <span className="text-sm">{option}</span>
              </button>
            );
          })}
        </div>
      );
    }

    if (qtype === "ordering") {
      const steps = question.steps ?? [];
      const order = (answers[question.id] as number[]) ?? [];
      return (
        <div className="space-y-2">
          <p className="text-xs text-muted-foreground">Enter step numbers in correct order (comma-separated)</p>
          <input
            className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm"
            placeholder={`e.g. ${steps.map((_, i) => i + 1).join(", ")}`}
            value={order.join(", ")}
            onChange={(event) => {
              const nums = event.target.value
                .split(",")
                .map((s) => parseInt(s.trim(), 10))
                .filter((n) => !isNaN(n));
              setAnswers((prev) => ({ ...prev, [question.id]: nums }));
            }}
          />
          <ol className="list-decimal list-inside text-sm text-muted-foreground">
            {steps.map((step, i) => (
              <li key={i}>{step}</li>
            ))}
          </ol>
        </div>
      );
    }

    return null;
  };

  return (
    <section className="rounded-2xl border border-border bg-card p-5 space-y-5">
      <header className="space-y-1">
        <h2 className="text-2xl font-semibold text-foreground">Quiz Attempt</h2>
        <p className="text-sm text-muted-foreground">
          Answered {answered} of {total}
        </p>
      </header>

      <div className="space-y-4">
        {quiz.questions.map((question, index) => (
          <article key={question.id} className="rounded-xl border border-border p-4 space-y-3">
            <h3 className="font-medium text-foreground">
              {index + 1}. {question.question}
            </h3>

            {renderQuestion(question, index)}
          </article>
        ))}
      </div>

      <Button className="w-full" disabled={isLoading || answered === 0} onClick={onSubmit}>
        {isLoading ? "Submitting..." : "Submit Attempt"}
      </Button>

      {error ? <p className="text-sm text-destructive">{error}</p> : null}

      {result ? (
        <section className="rounded-xl border border-amber-300 bg-amber-50 p-4 space-y-2">
          <p className="font-semibold text-amber-900">Score: {result.score}%</p>
          <p className="text-sm text-amber-800">Weak topics: {result.weak_topics.join(", ") || "None"}</p>
        </section>
      ) : null}
    </section>
  );
}
