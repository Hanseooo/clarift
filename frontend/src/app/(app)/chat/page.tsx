import { auth, currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";

import { ChatPageClient } from "@/components/features/chat/chat-page-client";
import { createAuthenticatedClient } from "@/lib/api";

type DocumentOption = {
  id: string;
  title: string;
};

export default async function ChatPage(
  props: {
    searchParams: Promise<{ [key: string]: string | string[] | undefined }>
  }
) {
  const searchParams = await props.searchParams;
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
  const { data } = await apiClient.GET("/api/v1/documents");
  const documents = (data as DocumentOption[] | undefined) ?? [];

  const initialDocumentId = typeof searchParams.document === 'string' ? searchParams.document : undefined;

  return (
    <main className="min-h-screen bg-background p-4 md:p-8">
      <div className="mx-auto max-w-6xl space-y-6">
        <header className="space-y-1">
          <h1 className="text-3xl font-semibold text-foreground">Grounded Chat</h1>
          <p className="text-sm text-muted-foreground">
            Ask questions using only your uploaded notes and review citations.
          </p>
        </header>

        {documents.length ? (
          <ChatPageClient documents={documents} initialDocumentId={initialDocumentId} />
        ) : (
          <section className="rounded-2xl border border-border bg-card p-5">
            <p className="text-sm text-muted-foreground">
              No documents uploaded yet. Upload notes first to use grounded chat.
            </p>
          </section>
        )}
      </div>
    </main>
  );
}
