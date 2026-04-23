import { auth, currentUser } from "@clerk/nextjs/server";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { MasteryChart } from "@/components/features/quiz/mastery-chart";
import { Button } from "@/components/ui/button";

type QuizResultQuestion = {
  id: string;
  question: string;
  user_answer: string | boolean | string[];
  correct_answer: string | boolean | string[];
  is_correct: boolean;
  topic: string;
  explanation: string;
};

type QuizResult = {
  score: number;
  per_topic: Record<string, { correct: number; total: number }>;
  questions: QuizResultQuestion[];
};

type ResultsPageProps = {
  searchParams: Promise<{ attempt_id?: string }>;
};

function formatAnswer(answer: string | boolean | string[]): string {
  if (typeof answer === "boolean") return answer ? "True" : "False";
  if (Array.isArray(answer)) return answer.join(", ");
  return answer;
}

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

export default async function ResultsPage({ searchParams }: ResultsPageProps) {
  const user = await currentUser();
  if (!user) redirect("/login");

  const session = await auth();
  const token = await session.getToken();
  if (!token) redirect("/login");

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
    .map((t) => t.topic);

  return (
    <main className="min-h-screen bg-background p-4 md:p-8">
      <div className="mx-auto max-w-3xl space-y-8">
        <section className="space-y-6">
          <div className="text-center space-y-2">
            <p className="text-sm text-muted-foreground">Quiz Results</p>
            <p className="text-6xl font-bold text-foreground">{result.score}%</p>
            <p className="text-sm text-muted-foreground">Overall Score</p>
          </div>

          <div className="rounded-2xl border border-border bg-card p-6">
            <h2 className="text-lg font-semibold text-foreground mb-4">Mastery by Topic</h2>
            <MasteryChart perTopicAccuracy={perTopicAccuracy} />
          </div>
        </section>

        {weakTopics.length > 0 && (
          <div className="rounded-xl border border-amber-300 bg-amber-50 p-4 dark:bg-amber-950/30 dark:border-amber-800">
            <p className="text-sm text-amber-800 dark:text-amber-200 mb-3">
              Weak areas detected: {weakTopics.join(", ")}
            </p>
            <Button
              asChild
              variant="outline"
              className="border-amber-400 text-amber-900 hover:bg-amber-100 dark:border-amber-700 dark:text-amber-100 dark:hover:bg-amber-900"
            >
              <Link href={`/practice?topics=${weakTopics.join(",")}`}>
                Start Targeted Practice
              </Link>
            </Button>
          </div>
        )}

        <section className="space-y-4">
          <h2 className="text-lg font-semibold text-foreground">Question Review</h2>
          {result.questions.map((q, index) => (
            <article
              key={q.id}
              className="rounded-xl border border-border bg-card p-4 space-y-3"
            >
              <div className="flex items-start gap-2">
                <span className="text-sm font-medium text-muted-foreground mt-0.5">
                  {index + 1}.
                </span>
                <p className="font-medium text-foreground">{q.question}</p>
              </div>

              <div className="space-y-2 pl-6">
                <div
                  className={`rounded-lg px-3 py-2 text-sm ${
                    q.is_correct
                      ? "bg-green-50 text-green-900 dark:bg-green-950/30 dark:text-green-200"
                      : "bg-red-50 text-red-900 dark:bg-red-950/30 dark:text-red-200"
                  }`}
                >
                  <span className="font-medium">Your answer: </span>
                  {formatAnswer(q.user_answer)}
                </div>

                {!q.is_correct && (
                  <div className="rounded-lg bg-primary/10 px-3 py-2 text-sm text-primary">
                    <span className="font-medium">Correct answer: </span>
                    {formatAnswer(q.correct_answer)}
                  </div>
                )}

                <div className="rounded-lg bg-muted px-3 py-2 text-sm text-muted-foreground">
                  <span className="font-medium text-foreground">Explanation: </span>
                  {q.explanation}
                </div>
              </div>
            </article>
          ))}
        </section>

        <div className="flex justify-center pt-4">
          <Button asChild>
            <Link href="/quizzes">Back to Quizzes</Link>
          </Button>
        </div>
      </div>
    </main>
  );
}
