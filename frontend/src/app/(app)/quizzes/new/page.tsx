import { auth, currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { QuizGenerationForm } from "@/components/features/quiz/quiz-generation-form";
import { createAuthenticatedClient } from "@/lib/api";

type QuizNewPageProps = {
  searchParams: Promise<{ document_id?: string }>;
};

export default async function QuizNewPage({ searchParams }: QuizNewPageProps) {
  const user = await currentUser();
  if (!user) {
    redirect("/login");
  }

  const session = await auth();
  const token = await session.getToken();
  if (!token) {
    redirect("/login");
  }

  const { document_id } = await searchParams;

  const apiClient = createAuthenticatedClient(token);
  const documentsResponse = await apiClient.GET("/api/v1/documents");

  const documents =
    (documentsResponse.data as Array<{ id: string; title: string }> | undefined) ?? [];

  return (
    <div className="max-w-2xl space-y-6">
      <Button variant="outline" size="sm" asChild className="w-fit">
        <Link href="/quizzes">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Quizzes
        </Link>
      </Button>

      <header className="space-y-1">
        <h1 className="text-xl font-semibold text-foreground">Generate Quiz</h1>
        <p className="text-sm text-muted-foreground">
          Select a document and configure your quiz settings.
        </p>
      </header>

      <QuizGenerationForm documents={documents} preselectedDocumentId={document_id} />
    </div>
  );
}
