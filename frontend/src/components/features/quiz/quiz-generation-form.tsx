"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, CheckCircle2, AlertCircle } from "lucide-react";

import { Button } from "@/components/ui/button";
import { QuizSettingsPanel } from "@/components/features/quiz/quiz-settings-panel";
import { useJobStatus } from "@/hooks/use-job-status";
import { client } from "@/lib/api";
import type { QuizTypeFlags } from "@/db/schema";

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
  token: string;
}

type Step = "select" | "settings" | "generating" | "complete" | "error";

export function QuizGenerationForm({ documents, token }: QuizGenerationFormProps) {
  const router = useRouter();
  const [step, setStep] = useState<Step>("select");
  const [selectedDocId, setSelectedDocId] = useState<string>(documents[0]?.id ?? "");
  const [jobId, setJobId] = useState<string | null>(null);
  const [quizId, setQuizId] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string>("");

  const [applicabilityFlags, setApplicabilityFlags] = useState<QuizTypeFlags | null>(null);

  const handleComplete = (result: Record<string, unknown>) => {
    if (result.quiz_id) {
      setQuizId(result.quiz_id as string);
      setStep("complete");
    }
  };

  const handleError = (error: string) => {
    setErrorMsg(error);
    setStep("error");
  };

  const { status, step: jobStep, message, progress, error: jobError } = useJobStatus({
    jobId,
    token,
    onComplete: handleComplete,
    onError: handleError,
  });

  const handleSelectDocument = () => {
    if (!selectedDocId) return;
    setStep("settings");
  };

  const handleGenerate = async (settings: QuizSettings | null) => {
    if (!selectedDocId) return;

    const payload = settings
      ? {
          document_id: selectedDocId,
          question_count: 5,
          auto_mode: settings.auto_mode,
          type_overrides: settings.type_overrides,
        }
      : {
          document_id: selectedDocId,
          question_count: 5,
          auto_mode: true,
        };

    try {
      const { data, error: apiError } = await client.POST("/api/v1/quizzes", {
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
      <div className="rounded-xl border border-border bg-card p-5 space-y-4">
        <h3 className="text-sm font-semibold text-foreground">Select Document</h3>

        {documents.length === 0 ? (
          <div className="py-8 text-center">
            <p className="text-sm text-muted-foreground">
              No documents available. Upload a document first.
            </p>
          </div>
        ) : (
          <>
            <select
              value={selectedDocId}
              onChange={(e) => setSelectedDocId(e.target.value)}
              className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm text-foreground focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
            >
              {documents.map((doc) => (
                <option key={doc.id} value={doc.id}>
                  {doc.title}
                </option>
              ))}
            </select>

            <Button className="w-full" onClick={handleSelectDocument} disabled={!selectedDocId}>
              Continue
            </Button>
          </>
        )}
      </div>
    );
  }

  if (step === "settings") {
    return (
      <QuizSettingsPanel
        applicabilityFlags={applicabilityFlags}
        onGenerate={handleGenerate}
      />
    );
  }

  if (step === "generating") {
    return (
      <div className="rounded-xl border border-border bg-card p-6 space-y-5">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Loader2 className="h-4 w-4 animate-spin text-brand-500" />
            <h3 className="text-sm font-semibold text-foreground">Generating Quiz</h3>
          </div>
          <p className="text-xs text-muted-foreground">
            {message || jobStep || "Preparing your quiz..."}
          </p>
        </div>

        {/* Progress steps */}
        <div className="space-y-3">
          <ProgressStep
            label="Retrieving chunks"
            status={getStepStatus(jobStep, ["retrieving", "chunk"])}
          />
          <ProgressStep
            label="Generating questions"
            status={getStepStatus(jobStep, ["generating", "question"])}
          />
          <ProgressStep
            label="Validating"
            status={getStepStatus(jobStep, ["validating", "validate"])}
          />
        </div>

        {/* Progress bar */}
        <div className="h-1.5 w-full rounded-full bg-border overflow-hidden">
          <div
            className="h-1.5 rounded-full bg-brand-500 transition-all duration-500"
            style={{ width: `${progress}%` }}
          />
        </div>

        {jobError && (
          <div className="flex items-center gap-2 rounded-lg border border-destructive/20 bg-destructive/5 px-3 py-2">
            <AlertCircle className="h-4 w-4 text-destructive" />
            <p className="text-xs text-destructive">{jobError}</p>
          </div>
        )}
      </div>
    );
  }

  if (step === "complete") {
    return (
      <div className="rounded-xl border border-border bg-card p-6 space-y-4 text-center">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-success-100 dark:bg-success-900/20">
          <CheckCircle2 className="h-6 w-6 text-success-500" />
        </div>

        <div className="space-y-1">
          <h3 className="text-lg font-semibold text-foreground">Quiz Ready!</h3>
          <p className="text-sm text-muted-foreground">
            Your quiz has been generated successfully.
          </p>
        </div>

        <Button className="w-full" onClick={handleGoToQuiz}>
          Start Quiz
        </Button>
      </div>
    );
  }

  if (step === "error") {
    return (
      <div className="rounded-xl border border-border bg-card p-6 space-y-4 text-center">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10">
          <AlertCircle className="h-6 w-6 text-destructive" />
        </div>

        <div className="space-y-1">
          <h3 className="text-lg font-semibold text-foreground">Generation Failed</h3>
          <p className="text-sm text-muted-foreground">{errorMsg}</p>
        </div>

        <Button variant="outline" className="w-full" onClick={() => setStep("select")}>
          Try Again
        </Button>
      </div>
    );
  }

  return null;
}

function ProgressStep({ label, status }: { label: string; status: "pending" | "active" | "done" }) {
  return (
    <div className="flex items-center gap-3">
      <div
        className={`flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-semibold transition-all ${
          status === "done"
            ? "bg-brand-500 text-white"
            : status === "active"
              ? "bg-brand-100 text-brand-600 dark:bg-brand-900/40 dark:text-brand-400"
              : "bg-muted text-muted-foreground"
        }`}
      >
        {status === "done" ? (
          <CheckCircle2 className="h-3.5 w-3.5" />
        ) : status === "active" ? (
          <Loader2 className="h-3 w-3 animate-spin" />
        ) : (
          <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground/30" />
        )}
      </div>
      <span
        className={`text-xs ${
          status === "done"
            ? "text-foreground"
            : status === "active"
              ? "text-brand-600 dark:text-brand-400 font-medium"
              : "text-muted-foreground"
        }`}
      >
        {label}
      </span>
    </div>
  );
}

function getStepStatus(
  currentStep: string | undefined,
  keywords: string[]
): "pending" | "active" | "done" {
  if (!currentStep) return "pending";
  const lower = currentStep.toLowerCase();
  const isActive = keywords.some((k) => lower.includes(k));
  if (isActive) return "active";
  // Simple heuristic: if we're past this step, mark done
  // This is a simplification — the backend should ideally send step completion events
  return "pending";
}
