"use client";

import { useState } from "react";
import { QuestionReview } from "@/components/features/quiz/question-review";
import { QuizResultsActions } from "@/components/features/quiz/quiz-results-actions";
import { QuizResultsDialog } from "@/components/features/quiz/quiz-results-dialog";

type QuizResultQuestion = {
  id: string;
  question: string;
  user_answer: string | boolean | string[];
  correct_answer: string | boolean | string[];
  correct_answers?: string[];
  is_correct: boolean;
  topic: string;
  explanation: string;
  type?: string;
};

type WeakTopic = {
  topic: string;
  accuracy: number;
};

interface ResultsClientProps {
  quizId: string;
  questions: QuizResultQuestion[];
  score: number;
  total: number;
  weakTopics: WeakTopic[];
}

export function ResultsClient({ quizId, questions, score, total, weakTopics }: ResultsClientProps) {
  const [showAnswers, setShowAnswers] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(weakTopics.length > 0);

  return (
    <section className="space-y-4">
      <QuizResultsDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        score={score}
        total={total}
        weakTopics={weakTopics}
      />

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
            correctAnswer={
              q.type === "multi_select"
                ? q.correct_answers || []
                : q.correct_answer
            }
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
