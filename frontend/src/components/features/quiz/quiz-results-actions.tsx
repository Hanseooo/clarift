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
