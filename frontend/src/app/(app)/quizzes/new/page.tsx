import { auth, currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";

import { QuizGenerationForm } from "@/components/features/quiz/quiz-generation-form";
import { createAuthenticatedClient } from "@/lib/api";

export default async function QuizNewPage() {
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
  const documentsResponse = await apiClient.GET("/api/v1/documents");

  const documents =
    (documentsResponse.data as Array<{ id: string; title: string }> | undefined) ?? [];

  return (
    <div className="max-w-2xl space-y-6">
      <header className="space-y-1">
        <h1 className="text-xl font-semibold text-foreground">Generate Quiz</h1>
        <p className="text-sm text-muted-foreground">
          Select a document and configure your quiz settings.
        </p>
      </header>

      <QuizGenerationForm documents={documents} token={token} />
    </div>
  );
}
