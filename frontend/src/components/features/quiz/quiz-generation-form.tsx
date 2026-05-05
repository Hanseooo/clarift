"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@clerk/nextjs";
import { CheckCircle2, AlertCircle } from "lucide-react";


import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { QuizSettingsPanel } from "@/components/features/quiz/quiz-settings-panel";
import { SSEProgress } from "@/components/ui/sse-progress";
import { createAuthenticatedClient } from "@/lib/api";

type DocumentOption = {
  id: string;
  title: string;
};

type QuizSettings = {
  auto_mode: boolean;
  type_overrides: {
    mcq: boolean;
    true_false: boolean;
    identification: boolean;
    multi_select: boolean;
    ordering: boolean;
  } | null;
};

interface QuizGenerationFormProps {
  documents: DocumentOption[];
  preselectedDocumentId?: string;
}

type Step = "select" | "settings" | "generating" | "complete" | "error";

export function QuizGenerationForm({ documents, preselectedDocumentId }: QuizGenerationFormProps) {
  const router = useRouter();
  const { getToken } = useAuth();
  const [step, setStep] = useState<Step>("select");
  const [selectedDocId, setSelectedDocId] = useState<string>(() => {
    if (preselectedDocumentId && documents.some((d) => d.id === preselectedDocumentId)) {
      return preselectedDocumentId;
    }
    return documents[0]?.id ?? "";
  });
  const [jobId, setJobId] = useState<string | null>(null);
  const [quizId, setQuizId] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string>("");
  const [applicabilityFlags, setApplicabilityFlags] = useState<Record<string, { applicable: boolean; reason: string }> | null>(null);
  const [loadingFlags, setLoadingFlags] = useState(false);

  const fetchApplicabilityFlags = async (docId: string) => {
    setLoadingFlags(true);
    try {
      const token = await getToken();
      if (!token) return;
      const authClient = createAuthenticatedClient(token);
      const { data } = await authClient.GET("/api/v1/summaries");

      if (data) {
        const summaries = data as Array<{ document_id: string; quiz_type_flags?: Record<string, boolean> }>;
        const docSummary = summaries.find((s) => s.document_id === docId);
        const rawFlags = docSummary?.quiz_type_flags;
        if (rawFlags) {
          const flags = Object.fromEntries(
            Object.entries(rawFlags).map(([key, value]) => [
              key,
              { applicable: value as boolean, reason: value ? "Content supports this type" : "Insufficient content for this type" },
            ])
          );
          setApplicabilityFlags(flags as Record<string, { applicable: boolean; reason: string }>);
        }
      }
    } catch {
      // Flags will remain null, panel shows fallback
    } finally {
      setLoadingFlags(false);
    }
  };

  const handleSelectDocument = () => {
    if (!selectedDocId) return;
    fetchApplicabilityFlags(selectedDocId);
    setStep("settings");
  };

  const handleGenerate = async (settings: QuizSettings | null) => {
    if (!selectedDocId) return;

    const payload = settings
      ? {
          document_id: selectedDocId,
          question_count: 5,
          auto_mode: settings.auto_mode,
          type_overrides: settings.auto_mode
            ? undefined
            : settings.type_overrides
              ? (Object.entries(settings.type_overrides)
                  .filter(([, v]) => v)
                  .map(([k]) => k) as string[])
              : undefined,
        }
      : {
          document_id: selectedDocId,
          question_count: 5,
          auto_mode: true,
        };

    try {
      const token = await getToken();
      if (!token) {
        setErrorMsg("Authentication required. Please log in again.");
        setStep("error");
        return;
      }
      const authClient = createAuthenticatedClient(token);
      const { data, error: apiError } = await authClient.POST("/api/v1/quizzes", {
        body: payload,
      });

      if (apiError || !data) {
        setErrorMsg("Failed to start quiz generation. Please try again.");
        setStep("error");
        return;
      }

      const responseData = data as { quiz_id: string; job_id?: string; message?: string };
      setJobId(responseData.job_id ?? responseData.quiz_id);
      setQuizId(responseData.quiz_id);
      setStep("generating");
    } catch {
      setErrorMsg("Failed to start quiz generation. Please try again.");
      setStep("error");
    }
  };

  const handleGoToQuiz = () => {
    if (quizId) {
      router.push(`/quizzes/${quizId}/attempt`);
    }
  };

  if (step === "select") {
    return (
      <div className="mx-auto max-w-2xl rounded-xl border border-border bg-card p-5 space-y-4">
        <h3 className="text-sm font-semibold text-foreground">Select Document</h3>

        {documents.length === 0 ? (
          <div className="py-8 text-center">
            <p className="text-sm text-muted-foreground">
              No documents available. Upload a document first.
            </p>
          </div>
        ) : (
          <>
            <Select value={selectedDocId} onValueChange={setSelectedDocId}>
              <SelectTrigger>
                <SelectValue placeholder="Select a document" />
              </SelectTrigger>
              <SelectContent>
                {documents.map((doc) => (
                  <SelectItem key={doc.id} value={doc.id}>
                    {doc.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Button className="w-full h-11" onClick={handleSelectDocument} disabled={!selectedDocId}>
              Continue
            </Button>
          </>
        )}
      </div>
    );
  }

  if (step === "settings") {
    return (
      <div className="mx-auto max-w-2xl">
        <QuizSettingsPanel
          applicabilityFlags={applicabilityFlags}
          loadingFlags={loadingFlags}
          onGenerate={handleGenerate}
        />
      </div>
    );
  }

  if (step === "generating" && jobId) {
    return (
      <div className="mx-auto max-w-2xl rounded-xl border border-border bg-card p-6 space-y-5">
        <div className="space-y-2">
          <h3 className="text-sm font-semibold text-foreground">Generating Quiz</h3>
        </div>

        <SSEProgress
          jobId={jobId}
          getToken={getToken}
          onComplete={(result) => {
            if (result.quiz_id) {
              setQuizId(result.quiz_id as string);
              setStep("complete");
            } else {
              setStep("complete");
            }
          }}
          onError={(error) => {
            setErrorMsg(error);
            setStep("error");
          }}
        />
      </div>
    );
  }

  if (step === "complete") {
    return (
      <div className="mx-auto max-w-2xl rounded-xl border border-border bg-card p-6 space-y-4 text-center">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-success-100 dark:bg-success-900/20">
          <CheckCircle2 className="h-6 w-6 text-success-500" />
        </div>

        <div className="space-y-1">
          <h3 className="text-lg font-semibold text-foreground">Quiz Ready!</h3>
          <p className="text-sm text-muted-foreground">
            Your quiz has been generated successfully.
          </p>
        </div>

        <Button className="w-full h-11" onClick={handleGoToQuiz}>
          Start Quiz
        </Button>
      </div>
    );
  }

  if (step === "error") {
    return (
      <div className="mx-auto max-w-2xl rounded-xl border border-border bg-card p-6 space-y-4 text-center">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10">
          <AlertCircle className="h-6 w-6 text-destructive" />
        </div>

        <div className="space-y-1">
          <h3 className="text-lg font-semibold text-foreground">Generation Failed</h3>
          <p className="text-sm text-muted-foreground">{errorMsg}</p>
        </div>

        <Button variant="outline" className="w-full h-11" onClick={() => setStep("select")}>
          Try Again
        </Button>
      </div>
    );
  }

  return null;
}
