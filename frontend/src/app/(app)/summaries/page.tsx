import { auth, currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";

import { SummaryCreation } from "@/components/features/summary/summary-creation";
import { SummaryList } from "@/components/features/summary/summary-list";
import { createAuthenticatedClient } from "@/lib/api";

type DocumentOption = {
  id: string;
  title: string;
};

type SummaryItem = {
  id: string;
  document_id: string;
  format: string;
  content: string;
  diagram_syntax: string | null;
  diagram_type: string | null;
  quiz_type_flags: Record<string, boolean> | null;
  created_at: string;
};

export default async function SummariesPage() {
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
  const [documentsResponse, summariesResponse] = await Promise.all([
    apiClient.GET("/api/v1/documents"),
    apiClient.GET("/api/v1/summaries"),
  ]);

  const documents = (documentsResponse.data as DocumentOption[] | undefined) ?? [];
  const summaries = (summariesResponse.data as SummaryItem[] | undefined) ?? [];

  return (
    <main className="min-h-screen bg-background p-4 md:p-8">
      <div className="mx-auto max-w-6xl space-y-6">
        <header className="space-y-1">
          <h1 className="text-3xl font-semibold text-foreground">Summaries</h1>
          <p className="text-sm text-muted-foreground">
            Generate and review study summaries from your uploaded documents.
          </p>
        </header>

        <div className="grid gap-6 lg:grid-cols-2">
          <SummaryList summaries={summaries} />
          <SummaryCreation documents={documents} />
        </div>
      </div>
    </main>
  );
}
