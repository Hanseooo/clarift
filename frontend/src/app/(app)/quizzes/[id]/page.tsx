import { auth, currentUser } from "@clerk/nextjs/server";
import { notFound, redirect } from "next/navigation";

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
    <div className="max-w-4xl">
      <QuizAttempt quiz={{ id: data.id, questions: data.questions as never[] }} />
    </div>
  );
}
