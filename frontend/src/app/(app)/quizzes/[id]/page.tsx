import { auth, currentUser } from "@clerk/nextjs/server";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft, Play } from "lucide-react";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { createAuthenticatedClient } from "@/lib/api";

type QuizPageProps = {
  params: Promise<{ id: string }>;
};

export default async function QuizPage({ params }: QuizPageProps) {
  const user = await currentUser();
  if (!user) {
    redirect("/login");
  }

  const session = await auth();
  const token = await session.getToken();
  if (!token) {
    redirect("/login");
  }

  const resolvedParams = await params;
  const apiClient = createAuthenticatedClient(token);
  const { data } = await apiClient.GET("/api/v1/quizzes/{quiz_id}", {
    params: { path: { quiz_id: resolvedParams.id } },
  });

  if (!data) {
    notFound();
  }

  const questions = (data.questions as Array<{
    id: string;
    type: "mcq" | "true_false" | "identification" | "multi_select" | "ordering";
    question: string;
    options?: string[];
    correct_answer?: string | boolean;
    correct_answers?: string[];
    steps?: string[];
    correct_order?: number[];
    topic: string;
    explanation: string;
  }>) ?? [];

  const isGenerating = questions.length === 0;

  return (
    <div className="max-w-[640px] mx-auto space-y-6">
      <Button variant="outline" size="sm" asChild className="w-fit">
        <Link href="/quizzes">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Quizzes
        </Link>
      </Button>

      <header className="space-y-1">
        <h1 className="text-xl font-semibold text-text-primary">
          {data.title ?? "Quiz"}
        </h1>
        <p className="text-sm text-text-secondary">
          {isGenerating
            ? "Generating questions..."
            : `${questions.length} question${questions.length === 1 ? "" : "s"}`}
        </p>
      </header>

      {isGenerating ? (
        <div className="bg-surface-card border border-border-default rounded-xl p-5">
          <p className="text-sm text-text-secondary">
            This quiz is still being generated. Please check back in a moment.
          </p>
        </div>
      ) : (
        <div className="bg-surface-card border border-border-default rounded-xl p-5 space-y-4">
          <Button
            asChild
            className="w-full sm:w-auto bg-brand-500 hover:bg-brand-600 text-white text-sm font-medium h-10 md:h-9 px-4 rounded-lg"
          >
            <Link href={`/quizzes/${resolvedParams.id}/attempt`}>
              <Play className="mr-2 h-4 w-4" />
              Start Quiz
            </Link>
          </Button>
        </div>
      )}
    </div>
  );
}
