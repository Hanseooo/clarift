import { auth, currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";

import { QuizCreation } from "@/components/features/quiz/quiz-creation";
import { QuizList } from "@/components/features/quiz/quiz-list";
import { createAuthenticatedClient } from "@/lib/api";

export default async function QuizzesPage() {
  const user = await currentUser();
  if (!user) {
    redirect("/login");
  }

  const session = await auth();
  const token = await session.getToken();
  if (!token) {
    redirect("/login");
  }

  const apiClient = createAuthenticatedClient(token);

  const [documentsResponse, quizzesResponse] = await Promise.all([
    apiClient.GET("/api/v1/documents"),
    apiClient.GET("/api/v1/quizzes"),
  ]);

  const documents =
    (documentsResponse.data as Array<{ id: string; title: string }> | undefined) ?? [];
  const quizzes =
    (quizzesResponse.data as
      | Array<{ id: string; question_count: number; question_types: string[]; created_at: string }>
      | undefined) ?? [];

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <QuizList quizzes={quizzes} />
      <QuizCreation documents={documents} />
    </div>
  );
}
