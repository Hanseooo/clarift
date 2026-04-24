"use client";

import { useMemo, useState } from "react";

import { Button } from "@/components/ui/button";

type PracticeDrill = {
  id: string;
  topic: string;
  question: string;
  options?: string[];
  correct_answer?: string;
  explanation?: string;
};

type PracticeAttemptProps = {
  drills: PracticeDrill[];
};

export function PracticeAttempt({ drills }: PracticeAttemptProps) {
  const [index, setIndex] = useState(0);
  const [answer, setAnswer] = useState("");
  const [showExplanation, setShowExplanation] = useState(false);

  const current = drills[index];
  const isLast = index >= drills.length - 1;

  const progress = useMemo(() => {
    if (!drills.length) {
      return 0;
    }
    return Math.round(((index + 1) / drills.length) * 100);
  }, [drills.length, index]);

  if (!current) {
    return (
      <section className="rounded-2xl border border-border bg-card p-5">
        <p className="text-sm text-muted-foreground">No drills available.</p>
      </section>
    );
  }

  return (
    <section className="rounded-2xl border border-border bg-card p-5 space-y-4">
      <header className="space-y-1">
        <h2 className="text-2xl font-semibold text-foreground">Practice Session</h2>
        <p className="text-sm text-muted-foreground">Progress {progress}%</p>
      </header>

      <article className="rounded-xl border border-border p-4 space-y-3">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{current.topic}</p>
        <h3 className="font-medium text-foreground">{current.question}</h3>

        {current.options?.length ? (
          <div className="grid gap-2">
            {current.options.map((option) => (
              <button
                key={option}
                className={`rounded-xl border px-3 py-2 text-left text-sm ${
                  answer === option ? "border-primary bg-primary/10" : "border-border"
                }`}
                type="button"
                onClick={() => setAnswer(option)}
              >
                {option}
              </button>
            ))}
          </div>
        ) : (
          <input
            className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm"
            placeholder="Type your answer"
            value={answer}
            onChange={(event) => setAnswer(event.target.value)}
          />
        )}

        {!showExplanation ? (
          <Button disabled={!answer} onClick={() => setShowExplanation(true)}>
            Check Answer
          </Button>
        ) : (
          <div className="space-y-2 rounded-xl border border-warning-300 bg-warning-100 p-3">
            <p className="text-sm text-warning-800">Correct answer: {current.correct_answer ?? "N/A"}</p>
            <p className="text-sm text-warning-800">{current.explanation ?? "No explanation provided."}</p>
            <Button
              onClick={() => {
                if (!isLast) {
                  setIndex((prev) => prev + 1);
                  setAnswer("");
                  setShowExplanation(false);
                }
              }}
            >
              {isLast ? "Done" : "Next Drill"}
            </Button>
          </div>
        )}
      </article>
    </section>
  );
}
