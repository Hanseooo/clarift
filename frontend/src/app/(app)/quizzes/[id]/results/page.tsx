import { auth, currentUser } from "@clerk/nextjs/server";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";

import { ScoreReveal } from "@/components/features/quiz/score-reveal";
import { WeakTopicsList } from "@/components/features/quiz/weak-topics-list";
import { MasteryChart } from "@/components/dynamic-imports";
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
      <ResultsClient
        quizId={resolvedParams.id}
        questions={result.questions}
        score={result.score}
        total={result.questions.length}
        weakTopics={weakTopics}
      />
    </div>
  );
}
