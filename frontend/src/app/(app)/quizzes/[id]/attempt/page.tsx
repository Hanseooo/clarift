import { auth, currentUser } from "@clerk/nextjs/server";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { AttemptWizard } from "@/components/features/quiz/attempt-wizard";
import { createAuthenticatedClient } from "@/lib/api";

type AttemptPageProps = {
  params: Promise<{ id: string }>;
};

export default async function QuizAttemptPage({ params }: AttemptPageProps) {
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

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <Button variant="outline" size="sm" asChild className="w-fit">
        <Link href="/quizzes">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Quizzes
        </Link>
      </Button>

      <header className="space-y-1">
        <h1 className="text-xl font-semibold text-foreground">Quiz</h1>
        <p className="text-sm text-muted-foreground">
          {questions.length} questions · Answer each to complete
        </p>
      </header>

      <AttemptWizard quizId={data.id} questions={questions} />
    </div>
  );
}
