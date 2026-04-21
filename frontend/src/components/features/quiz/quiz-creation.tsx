"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { useCreateQuiz } from "@/hooks/use-quiz";

type DocumentOption = {
  id: string;
  title: string;
};

type QuizCreationProps = {
  documents: DocumentOption[];
};

export function QuizCreation({ documents }: QuizCreationProps) {
  const router = useRouter();
  const [documentId, setDocumentId] = useState(documents[0]?.id ?? "");
  const [questionCount, setQuestionCount] = useState(5);
  const { mutateAsync, isLoading, error } = useCreateQuiz();

  const onCreateQuiz = async () => {
    if (!documentId) {
      return;
    }
    const response = await mutateAsync({
      document_id: documentId,
      question_count: questionCount,
      auto_mode: true,
    });
    router.push(`/quizzes/${response.quiz_id}`);
  };

  return (
    <section className="rounded-2xl border border-border bg-card p-5 space-y-4">
      <header>
        <h2 className="text-xl font-semibold text-foreground">Create Quiz</h2>
        <p className="text-sm text-muted-foreground">Pick a document and generate questions.</p>
      </header>

      <label className="block space-y-2">
        <span className="text-sm font-medium text-foreground">Document</span>
        <select
          className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm"
          value={documentId}
          onChange={(event) => setDocumentId(event.target.value)}
        >
          {documents.map((document) => (
            <option key={document.id} value={document.id}>
              {document.title}
            </option>
          ))}
        </select>
      </label>

      <label className="block space-y-2">
        <span className="text-sm font-medium text-foreground">Question count</span>
        <input
          className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm"
          min={1}
          max={20}
          type="number"
          value={questionCount}
          onChange={(event) => setQuestionCount(Number(event.target.value))}
        />
      </label>

      <Button className="w-full" disabled={isLoading || !documentId} onClick={onCreateQuiz}>
        {isLoading ? "Creating..." : "Create Quiz"}
      </Button>

      {error ? <p className="text-sm text-destructive">{error}</p> : null}
    </section>
  );
}
