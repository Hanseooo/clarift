import { auth, currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { FileText } from "lucide-react";

import { ChatPageClient } from "@/components/features/chat/chat-page-client";
import { createAuthenticatedClient } from "@/lib/api";
import { OptimisticQuotaDisplay } from "@/components/features/optimistic-quota-display";

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
    <div className="space-y-6">
      <div className="mb-6">
        <OptimisticQuotaDisplay feature="chat" />
      </div>
      <header className="space-y-1">
        <h1 className="text-xl font-semibold text-text-primary">Grounded Chat</h1>
        <p className="text-sm text-text-secondary">
          Ask questions using only your uploaded notes and review citations.
        </p>
      </header>

      {documents.length ? (
        <ChatPageClient documents={documents} initialDocumentId={initialDocumentId} />
      ) : (
        <div className="text-center py-12 bg-surface-card border border-border-default rounded-xl">
          <div className="size-12 rounded-xl bg-surface-subtle flex items-center justify-center mx-auto mb-3">
            <FileText className="size-6 text-text-tertiary" />
          </div>
          <h3 className="text-sm font-medium text-text-primary mb-1">
            No documents yet
          </h3>
          <p className="text-xs text-text-tertiary">
            Upload notes first to use grounded chat.
          </p>
        </div>
      )}
    </div>
  );
}
