import { auth, currentUser } from "@clerk/nextjs/server";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { QuizAttempt } from "@/components/features/quiz/quiz-attempt";
import { createAuthenticatedClient } from "@/lib/api";

type QuizPageProps = {
  params: Promise<{ id: string }>;
};

export default async function QuizAttemptPage({ params }: QuizPageProps) {
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

  return (
    <div className="max-w-4xl space-y-6">
      <Button variant="outline" size="sm" asChild className="w-fit">
        <Link href="/quizzes">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Quizzes
        </Link>
      </Button>
      <QuizAttempt quiz={{ id: data.id, questions: data.questions as never[] }} />
    </div>
  );
}
