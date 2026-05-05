"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft, ChevronRight, GripVertical, ArrowUp, ArrowDown } from "lucide-react";

import { Button } from "@/components/ui/button";
import { RichMarkdown } from "@/components/ui/rich-markdown";
import { useSubmitAttempt } from "@/hooks/use-quiz";

type QuizType = "mcq" | "true_false" | "identification" | "multi_select" | "ordering";

interface QuizQuestion {
  id: string;
  type: QuizType;
  question: string;
  options?: string[];
  correct_answer?: string | boolean;
  correct_answers?: string[];
  steps?: string[];
  correct_order?: number[];
  topic: string;
  explanation: string;
}

interface AttemptWizardProps {
  quizId: string;
  questions: QuizQuestion[];
  onSubmit?: (payload: { quiz_id: string; answers: Record<string, string> }) => Promise<{ attempt_id?: string }>;
}

function safeJsonParse(value: string): string[] {
  if (!value) return [];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

const LETTERS = ["A", "B", "C", "D", "E", "F"];

const questionTypeBadgeClasses: Record<QuizType, string> = {
  mcq: "bg-brand-100 text-brand-800 dark:bg-brand-900/40 dark:text-brand-200",
  true_false: "bg-[#F0FDF4] text-[#166534] dark:bg-[#052E16] dark:text-[#4ADE80]",
  identification: "bg-[#FFF7ED] text-[#9A3412] dark:bg-[#431407] dark:text-[#FB923C]",
  multi_select: "bg-[#F5F3FF] text-[#5B21B6] dark:bg-[#1E0A3C] dark:text-[#A78BFA]",
  ordering: "bg-[#F0F9FF] text-[#0C4A6E] dark:bg-[#082F49] dark:text-[#38BDF8]",
};

function OrderItem({
  item,
  index,
  total,
  onMoveUp,
  onMoveDown,
}: {
  item: string;
  index: number;
  total: number;
  onMoveUp: () => void;
  onMoveDown: () => void;
}) {
  return (
    <div className="flex items-center gap-3 rounded-lg border border-border bg-card px-3 py-2.5">
      <div className="text-muted-foreground">
        <GripVertical className="h-4 w-4" strokeWidth={1.5} />
      </div>
      <span className="flex h-5 w-5 items-center justify-center rounded bg-surface-subtle text-[10px] font-semibold text-muted-foreground">
        {index + 1}
      </span>
      <span className="flex-1 text-sm text-foreground min-w-0">{item}</span>
      <div className="flex flex-col gap-0.5">
        <button
          type="button"
          onClick={onMoveUp}
          disabled={index === 0}
          className="h-11 w-8 flex items-center justify-center rounded text-muted-foreground hover:text-foreground disabled:opacity-30 disabled:cursor-not-allowed"
        >
          <ArrowUp className="h-3.5 w-3.5" />
        </button>
        <button
          type="button"
          onClick={onMoveDown}
          disabled={index === total - 1}
          className="h-11 w-8 flex items-center justify-center rounded text-muted-foreground hover:text-foreground disabled:opacity-30 disabled:cursor-not-allowed"
        >
          <ArrowDown className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}

function MCQQuestion({
  question,
  value,
  onChange,
}: {
  question: QuizQuestion;
  value: string;
  onChange: (answer: string) => void;
}) {
  return (
    <div className="space-y-2">
      {(question.options ?? []).map((option, index) => {
        const letter = LETTERS[index] ?? String(index + 1);
        const selected = value === option;

        return (
          <button
            key={option}
            type="button"
            onClick={() => onChange(option)}
            className={`w-full flex items-center gap-3 rounded-lg border px-3 min-h-11 text-left transition-all ${
              selected
                ? "border-brand-500 bg-brand-50/50 dark:bg-brand-950/20"
                : "border-border bg-background hover:border-border-strong hover:bg-surface-overlay"
            }`}
          >
            <span
              className={`flex h-5.5 w-5.5 shrink-0 items-center justify-center rounded text-[11px] font-semibold transition-all ${
                selected
                  ? "border-brand-500 bg-brand-500 text-white"
                  : "border-border bg-surface-subtle text-muted-foreground"
              }`}
              style={{ width: 22, height: 22 }}
            >
              {letter}
            </span>
            <span className="text-sm text-foreground min-w-0">
              <RichMarkdown
                content={option}
                className="prose-compact prose-p:inline prose-p:m-0 prose-p:text-sm prose-code:text-xs"
              />
            </span>
          </button>
        );
      })}
    </div>
  );
}

function TrueFalseQuestion({
  value,
  onChange,
}: {
  value: string;
  onChange: (answer: string) => void;
}) {
  return (
    <div className="grid grid-cols-2 gap-3">
      {["True", "False"].map((option) => {
        const selected = value === option;

        return (
          <button
            key={option}
            type="button"
            onClick={() => onChange(option)}
            className={`flex h-14 items-center justify-center rounded-lg border text-sm font-medium transition-all ${
              selected
                ? "border-brand-500 bg-brand-500 text-white"
                : "border-border bg-background text-foreground hover:border-border-strong hover:bg-surface-overlay"
            }`}
          >
            {option}
          </button>
        );
      })}
    </div>
  );
}

function IdentificationQuestion({
  value,
  onChange,
}: {
  value: string;
  onChange: (answer: string) => void;
}) {
  return (
    <input
      type="text"
      placeholder="Type your answer..."
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="w-full rounded-lg border border-border bg-background px-3 h-11 text-sm text-foreground placeholder:text-muted-foreground focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
    />
  );
}

function MultiSelectQuestion({
  question,
  value,
  onChange,
}: {
  question: QuizQuestion;
  value: string;
  onChange: (answer: string) => void;
}) {
  const selectedAnswers: string[] = safeJsonParse(value);

  const toggleOption = (option: string) => {
    const updated = selectedAnswers.includes(option)
      ? selectedAnswers.filter((a) => a !== option)
      : [...selectedAnswers, option];
    onChange(JSON.stringify(updated));
  };

  return (
    <div className="space-y-2">
      {(question.options ?? []).map((option, index) => {
        const letter = LETTERS[index] ?? String(index + 1);
        const selected = selectedAnswers.includes(option);

        return (
          <button
            key={option}
            type="button"
            onClick={() => toggleOption(option)}
            className={`w-full flex items-center gap-3 rounded-lg border px-3 min-h-11 text-left transition-all ${
              selected
                ? "border-brand-500 bg-brand-50/50 dark:bg-brand-950/20"
                : "border-border bg-background hover:border-border-strong hover:bg-surface-overlay"
            }`}
          >
            <span
              className={`flex h-5.5 w-5.5 shrink-0 items-center justify-center rounded text-[11px] font-semibold transition-all ${
                selected
                  ? "border-brand-500 bg-brand-500 text-white"
                  : "border-border bg-surface-subtle text-muted-foreground"
              }`}
              style={{ width: 22, height: 22 }}
            >
              {letter}
            </span>
            <span className="text-sm text-foreground min-w-0">
              <RichMarkdown
                content={option}
                className="prose-compact prose-p:inline prose-p:m-0 prose-p:text-sm prose-code:text-xs"
              />
            </span>
          </button>
        );
      })}
    </div>
  );
}

function OrderingQuestion({
  question,
  value,
  onChange,
}: {
  question: QuizQuestion;
  value: string;
  onChange: (answer: string) => void;
}) {
  const items: string[] = value ? safeJsonParse(value) : (question.options ?? []);

  const handleMoveUp = (index: number) => {
    if (index === 0) return;
    const newItems = [...items];
    [newItems[index - 1], newItems[index]] = [newItems[index], newItems[index - 1]];
    onChange(JSON.stringify(newItems));
  };

  const handleMoveDown = (index: number) => {
    if (index === items.length - 1) return;
    const newItems = [...items];
    [newItems[index], newItems[index + 1]] = [newItems[index + 1], newItems[index]];
    onChange(JSON.stringify(newItems));
  };

  if (items.length === 0) return null;

  return (
    <div className="space-y-2">
      {items.map((item, index) => (
        <OrderItem
          key={item}
          item={item}
          index={index}
          total={items.length}
          onMoveUp={() => handleMoveUp(index)}
          onMoveDown={() => handleMoveDown(index)}
        />
      ))}
    </div>
  );
}

export function AttemptWizard({ quizId, questions, onSubmit }: AttemptWizardProps) {
  const router = useRouter();
  const { mutateAsync, isLoading, error } = useSubmitAttempt();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});

  const currentQuestion = questions[currentIndex];
  const totalQuestions = questions.length;
  const answeredCount = useMemo(() => Object.keys(answers).length, [answers]);
  const currentAnswer = answers[currentQuestion?.id] ?? "";
  const isLastQuestion = currentIndex === totalQuestions - 1;
  const hasAnswer = currentAnswer !== "" && currentAnswer !== "[]";

  const handleAnswer = (answer: string) => {
    setAnswers((prev) => ({
      ...prev,
      [currentQuestion.id]: answer,
    }));
  };

  const handleNext = () => {
    if (isLastQuestion) {
      handleSubmit();
    } else {
      setCurrentIndex((prev) => prev + 1);
    }
  };

  const handlePrevious = () => {
    if (currentIndex > 0) {
      setCurrentIndex((prev) => prev - 1);
    }
  };

  const handleSubmit = async () => {
    const payload = { quiz_id: quizId, answers };
    if (onSubmit) {
      const response = await onSubmit(payload);
      if (response?.attempt_id) {
        router.push(`/quizzes/${quizId}/results?attempt_id=${response.attempt_id}`);
      }
    } else {
      const response = await mutateAsync(payload);
      router.push(`/quizzes/${quizId}/results?attempt_id=${response.attempt_id}`);
    }
  };

  const progressPct = ((currentIndex + 1) / totalQuestions) * 100;

  return (
    <div className="space-y-4">
      {/* Progress bar */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium text-muted-foreground">
            Question {currentIndex + 1} of {totalQuestions}
          </span>
          <span className="text-xs text-muted-foreground">
            {answeredCount} answered
          </span>
        </div>
        <div className="h-1 w-full rounded-full bg-border">
          <div
            className="h-1 rounded-full bg-brand-500 transition-all duration-300"
            style={{ width: `${progressPct}%` }}
          />
        </div>
      </div>

      {/* Question card */}
      <div className="rounded-xl border border-border bg-card p-4 md:p-5 space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide ${questionTypeBadgeClasses[currentQuestion.type]}`}>
            {currentQuestion.type.replace("_", " ")}
          </span>
          <span className="text-xs text-muted-foreground min-w-0 truncate ml-2">
            Topic: {currentQuestion.topic}
          </span>
        </div>

        {/* Question text */}
        <div className="prose-compact max-w-none">
          <RichMarkdown content={currentQuestion.question} />
        </div>

        {/* Answer input by type */}
        {currentQuestion.type === "mcq" && (
          <MCQQuestion
            question={currentQuestion}
            value={currentAnswer}
            onChange={handleAnswer}
          />
        )}

        {currentQuestion.type === "true_false" && (
          <TrueFalseQuestion
            value={currentAnswer}
            onChange={handleAnswer}
          />
        )}

        {currentQuestion.type === "identification" && (
          <IdentificationQuestion
            value={currentAnswer}
            onChange={handleAnswer}
          />
        )}

        {currentQuestion.type === "multi_select" && (
          <MultiSelectQuestion
            question={currentQuestion}
            value={currentAnswer}
            onChange={handleAnswer}
          />
        )}

        {currentQuestion.type === "ordering" && (
          <OrderingQuestion
            question={currentQuestion}
            value={currentAnswer}
            onChange={handleAnswer}
          />
        )}
      </div>

      {/* Navigation */}
      <div className="flex items-center gap-3">
        <Button
          variant="outline"
          onClick={handlePrevious}
          disabled={currentIndex === 0}
          className="flex-1 h-11"
        >
          <ChevronLeft className="mr-1 h-4 w-4" />
          Previous
        </Button>

        <Button
          onClick={handleNext}
          disabled={!hasAnswer}
          className="flex-1 h-11"
        >
          {isLastQuestion ? (
            isLoading ? (
              "Submitting..."
            ) : (
              "Submit Quiz"
            )
          ) : (
            <>
              Next
              <ChevronRight className="ml-1 h-4 w-4" />
            </>
          )}
        </Button>
      </div>

      {error && (
        <p className="text-sm text-destructive text-center">{error}</p>
      )}
    </div>
  );
}
