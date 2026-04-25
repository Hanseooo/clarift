"use client";

import { useState } from "react";
import Link from "next/link";
import { History, ChevronRight, Trophy, Target } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { useQuizAttempts } from "@/hooks/use-quiz";

interface QuizAttemptHistoryProps {
  quizId: string;
  quizTitle: string | null;
}

export function QuizAttemptHistory({ quizId, quizTitle }: QuizAttemptHistoryProps) {
  const [open, setOpen] = useState(false);
  const { attempts, isLoading, fetchAttempts } = useQuizAttempts(quizId);

  const handleOpen = (isOpen: boolean) => {
    setOpen(isOpen);
    if (isOpen && attempts.length === 0 && !isLoading) {
      fetchAttempts();
    }
  };

  return (
    <Sheet open={open} onOpenChange={handleOpen}>
      <SheetTrigger asChild>
        <button className="text-xs font-medium text-brand-500 hover:text-brand-600 transition-colors">
          View history
        </button>
      </SheetTrigger>
      <SheetContent className="w-full max-w-md">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <History className="size-4 text-brand-500" />
            Attempt History
          </SheetTitle>
          <SheetDescription>
            {quizTitle || "Untitled Quiz"}
          </SheetDescription>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto mt-4 space-y-3">
          {isLoading ? (
            <AttemptListSkeleton />
          ) : attempts.length === 0 ? (
            <EmptyState />
          ) : (
            attempts.map((attempt) => (
              <AttemptRow
                key={attempt.attempt_id}
                quizId={quizId}
                attempt={attempt}
              />
            ))
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}

function AttemptRow({
  quizId,
  attempt,
}: {
  quizId: string;
  attempt: {
    attempt_id: string;
    score: number;
    topics: string[];
    created_at: string;
  };
}) {
  const scoreColor =
    attempt.score >= 80
      ? "text-success-500"
      : attempt.score >= 60
        ? "text-warning-500"
        : "text-danger-500";

  const scoreBg =
    attempt.score >= 80
      ? "bg-success-100"
      : attempt.score >= 60
        ? "bg-warning-100"
        : "bg-danger-100";

  return (
    <Link
      href={`/quizzes/${quizId}/results?attempt_id=${attempt.attempt_id}`}
      className="group block bg-surface-card border border-border-default rounded-xl p-4 hover:bg-surface-overlay hover:border-border-strong transition-colors-fast"
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className={`size-9 rounded-lg ${scoreBg} flex items-center justify-center`}>
            <Trophy className={`size-4 ${scoreColor}`} />
          </div>
          <div>
            <p className="text-sm font-medium text-text-primary">
              {attempt.score.toFixed(1)}%
            </p>
            <p className="text-xs text-text-tertiary">
              {new Date(attempt.created_at).toLocaleDateString("en-PH", {
                month: "short",
                day: "numeric",
                year: "numeric",
                hour: "2-digit",
                minute: "2-digit",
              })}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {attempt.topics.length > 0 && (
            <div className="flex items-center gap-1 text-xs text-text-tertiary">
              <Target className="size-3" />
              <span>{attempt.topics.length} weak topics</span>
            </div>
          )}
          <ChevronRight className="size-4 text-text-tertiary group-hover:text-text-primary transition-colors" />
        </div>
      </div>
    </Link>
  );
}

function AttemptListSkeleton() {
  return (
    <div className="space-y-3">
      {Array.from({ length: 3 }).map((_, i) => (
        <div
          key={i}
          className="bg-surface-card border border-border-default rounded-xl p-4 flex items-center gap-3"
        >
          <Skeleton className="size-9 rounded-lg" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-16" />
            <Skeleton className="h-3 w-24" />
          </div>
          <Skeleton className="h-4 w-4" />
        </div>
      ))}
    </div>
  );
}

function EmptyState() {
  return (
    <div className="text-center py-12">
      <div className="size-12 rounded-xl bg-surface-subtle flex items-center justify-center mx-auto mb-3">
        <History className="size-6 text-text-tertiary" />
      </div>
      <h3 className="text-sm font-medium text-text-primary mb-1">
        No attempts yet
      </h3>
      <p className="text-xs text-text-tertiary">
        Take this quiz to see your results here.
      </p>
    </div>
  );
}
