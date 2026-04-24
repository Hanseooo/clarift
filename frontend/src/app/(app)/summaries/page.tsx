import { auth, currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { db } from "@/db";
import { eq } from "drizzle-orm";
import { users } from "@/db/schema";

import { SummaryCreation } from "@/components/features/summary/summary-creation";
import { SummariesClient } from "@/components/features/summary/summaries-client";
import { createAuthenticatedClient } from "@/lib/api";
import { OverridePreferences } from "@/types/preferences";

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

type SummariesPageProps = {
  searchParams: Promise<{ document_id?: string }>;
};

export default async function SummariesPage({ searchParams }: SummariesPageProps) {
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
  const [documentsResponse, summariesResponse, userRecord] = await Promise.all([
    apiClient.GET("/api/v1/documents"),
    apiClient.GET("/api/v1/summaries"),
    db.query.users.findFirst({
      where: eq(users.clerkUserId, user.id),
    }),
  ]);

  const documents = (documentsResponse.data as DocumentOption[] | undefined) ?? [];
  const summaries = (summariesResponse.data as SummaryItem[] | undefined) ?? [];
  const initialPreferences = (userRecord?.userPreferences as OverridePreferences) ?? {};

  return (
    <div className="space-y-8">
      <SummariesClient summaries={summaries} />

      {/* Creation section */}
      <section className="pt-4 border-t border-border-default">
        <h2 className="text-sm font-medium text-text-secondary mb-3 uppercase tracking-wide">
          Create Summary
        </h2>
        <SummaryCreation
          documents={documents}
          initialPreferences={initialPreferences}
          preselectedDocumentId={document_id}
        />
      </section>
    </div>
  );
}
