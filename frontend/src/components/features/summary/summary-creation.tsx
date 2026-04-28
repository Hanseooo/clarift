"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@clerk/nextjs";

import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { BookOpen } from "lucide-react";
import { SSEProgress } from "@/components/ui/sse-progress";
import { createAuthenticatedClient } from "@/lib/api";
import { useQuota } from "@/contexts/quota-context";
import { OverrideSettingsModal } from "@/components/features/generation/override-settings-modal";
import { OverridePreferences } from "@/types/preferences";

type DocumentOption = {
  id: string;
  title: string;
};

type SummaryCreationProps = {
  documents: DocumentOption[];
  initialPreferences?: OverridePreferences;
  onSummaryCreated?: () => void;
  preselectedDocumentId?: string;
};

type CreateSummaryResponse = {
  summary_id: string;
  job_id: string;
  message: string;
};

export function SummaryCreation({ documents, initialPreferences, onSummaryCreated, preselectedDocumentId }: SummaryCreationProps) {
  const router = useRouter();
  const { getToken } = useAuth();
  const [documentId, setDocumentId] = useState(() => {
    if (preselectedDocumentId && documents.some((d) => d.id === preselectedDocumentId)) {
      return preselectedDocumentId;
    }
    return documents[0]?.id ?? "";
  });
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [activeJobId, setActiveJobId] = useState<string | null>(null);
  const [overridePreferences, setOverridePreferences] = useState<OverridePreferences | null>(null);
  const { optimisticallyIncrement } = useQuota();

  if (documents.length === 0) {
    return (
      <div className="text-center py-8 bg-surface-subtle rounded-xl">
        <BookOpen className="size-8 text-text-tertiary mx-auto mb-2" />
        <p className="text-sm text-text-secondary">
          Upload a document first to create a summary
        </p>
      </div>
    );
  }

  const onCreateSummary = async () => {
    setIsLoading(true);
    setErrorMessage(null);
    setActiveJobId(null);
    const rollback = optimisticallyIncrement("summaries");
    try {
      const token = await getToken();
      if (!token) {
        throw new Error("You must be logged in to create summaries.");
      }

      const authClient = createAuthenticatedClient(token);
      const { data, error } = await authClient.POST("/api/v1/summaries", {
        body: {
          document_id: documentId,
          override_preferences: overridePreferences ?? undefined,
        },
      });

      if (error) {
        const errorMessage =
          typeof error === "object" && error !== null && "message" in error
            ? String(error.message)
            : typeof error === "object"
              ? JSON.stringify(error)
              : String(error);
        throw new Error(errorMessage);
      }

      if (!data) {
        throw new Error("Failed to create summary");
      }

      const createResponse = data as CreateSummaryResponse;
      setActiveJobId(createResponse.job_id);
    } catch (caughtError) {
      rollback();
      const message =
        caughtError instanceof Error ? caughtError.message : "Failed to create summary";
      setErrorMessage(message);
      setIsLoading(false);
    }
  };

  const handleComplete = () => {
    setIsLoading(false);
    setActiveJobId(null);
    router.refresh();
    onSummaryCreated?.();
  };

  const handleError = (error: string) => {
    setIsLoading(false);
    setActiveJobId(null);
    setErrorMessage(error);
  };

  return (
    <section className="rounded-2xl border border-border bg-card p-5 space-y-4">
      <header>
        <h2 className="text-xl font-semibold text-foreground">Create Summary</h2>
        <p className="text-sm text-muted-foreground">Select a document and output format.</p>
      </header>

      <div className="space-y-2">
        <label htmlFor="summary-document-select" className="text-sm font-medium text-foreground">Document</label>
        <Select value={documentId} onValueChange={setDocumentId}>
          <SelectTrigger id="summary-document-select" className="w-full rounded-xl border-border bg-background px-3 py-2 text-sm">
            <SelectValue placeholder="Select a document" />
          </SelectTrigger>
          <SelectContent>
            {documents.map((document) => (
              <SelectItem key={document.id} value={document.id}>
                {document.title}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-foreground">Preferences</span>
        <OverrideSettingsModal
          initialPreferences={initialPreferences}
          onSave={async (preferences) => {
            setOverridePreferences(preferences);
          }}
        />
      </div>

      <Button className="w-full" disabled={isLoading || !documentId} onClick={onCreateSummary}>
        {isLoading ? "Generating..." : "Generate Summary"}
      </Button>

      {activeJobId && (
        <SSEProgress
          jobId={activeJobId}
          getToken={getToken}
          onComplete={handleComplete}
          onError={handleError}
        />
      )}
      {errorMessage ? <p className="text-sm text-destructive">{errorMessage}</p> : null}
    </section>
  );
}
