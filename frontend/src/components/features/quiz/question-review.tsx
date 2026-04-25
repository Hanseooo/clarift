"use client";

import { useState, useEffect } from "react";
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

  useEffect(() => {
    if (showAnswers && !isRevealed) {
      setIsRevealed(true);
    }
  }, [showAnswers, isRevealed]);

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
