"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@clerk/nextjs"

import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { useCreateQuiz } from "@/hooks/use-quiz"
import { GraduationCap } from "lucide-react"
import { SSEProgress } from "@/components/ui/sse-progress"

type DocumentOption = {
  id: string
  title: string
}

type QuizCreationProps = {
  documents: DocumentOption[]
}

type Step = "form" | "generating" | "complete" | "error"

export function QuizCreation({ documents }: QuizCreationProps) {
  const router = useRouter()
  const { getToken } = useAuth()
  const [documentId, setDocumentId] = useState(documents[0]?.id ?? "")
  const { mutateAsync, isLoading, error } = useCreateQuiz()
  const [step, setStep] = useState<Step>("form")
  const [jobId, setJobId] = useState<string | null>(null)
  const [quizId, setQuizId] = useState<string | null>(null)
  const [errorMsg, setErrorMsg] = useState<string>("")

  const onCreateQuiz = async () => {
    if (!documentId) {
      return
    }
    try {
      const response = await mutateAsync({
        document_id: documentId,
        question_count: 5,
        auto_mode: true,
      })
      setJobId((response.job_id as string) ?? (response.quiz_id as string))
      setQuizId(response.quiz_id as string)
      setStep("generating")
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Failed to create quiz")
      setStep("error")
    }
  }

  if (step === "generating" && jobId) {
    return (
      <div className="bg-surface-card border border-border-default rounded-xl p-5 space-y-4">
        <div className="space-y-2">
          <h3 className="text-sm font-semibold text-text-primary">Generating Quiz</h3>
        </div>
        <SSEProgress
          jobId={jobId}
          getToken={getToken}
          onComplete={(result) => {
            if (result.quiz_id) {
              setQuizId(result.quiz_id as string)
            }
            setStep("complete")
          }}
          onError={(msg) => {
            setErrorMsg(msg)
            setStep("error")
          }}
        />
      </div>
    )
  }

  if (step === "complete") {
    return (
      <div className="bg-surface-card border border-border-default rounded-xl p-5 space-y-4 text-center">
        <div className="space-y-1">
          <h3 className="text-lg font-semibold text-text-primary">Quiz Ready!</h3>
          <p className="text-xs text-text-tertiary">
            Your quiz has been generated successfully.
          </p>
        </div>
        <Button
          className="w-full h-10 md:h-9 bg-brand-500 hover:bg-brand-600 text-white text-sm font-medium rounded-lg"
          onClick={() => router.push(`/quizzes/${quizId}`)}
        >
          Start Quiz
        </Button>
      </div>
    )
  }

  if (step === "error") {
    return (
      <div className="bg-surface-card border border-border-default rounded-xl p-5 space-y-4 text-center">
        <p className="text-xs text-danger-500">{errorMsg || error || "Failed to generate quiz"}</p>
        <Button
          variant="outline"
          className="w-full h-10 md:h-9"
          onClick={() => setStep("form")}
        >
          Try Again
        </Button>
      </div>
    )
  }

  if (documents.length === 0) {
    return (
      <div className="text-center py-8 bg-surface-subtle rounded-xl">
        <GraduationCap className="size-8 text-text-tertiary mx-auto mb-2" />
        <p className="text-sm text-text-secondary">
          Upload a document first to generate a quiz
        </p>
      </div>
    )
  }

  return (
    <div className="bg-surface-card border border-border-default rounded-xl p-5 space-y-4">
      <div>
        <h2 className="text-lg font-semibold text-text-primary">Quick Quiz</h2>
        <p className="text-xs text-text-tertiary mt-0.5">
          Generate a quiz from your uploaded notes
        </p>
      </div>

      {/* Document select */}
      <div className="space-y-1.5">
        <label htmlFor="quiz-document-select" className="text-sm font-medium text-text-primary">Document</label>
        <Select value={documentId} onValueChange={setDocumentId}>
          <SelectTrigger id="quiz-document-select" className="w-full h-11 px-3 text-sm bg-surface-subtle border-border-default rounded-lg focus:border-brand-500 focus:ring-2 focus:ring-brand-500/15">
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
      </div>

      {/* Error */}
      {error ? <p className="text-xs text-danger-500">{error}</p> : null}

      {/* Generate button */}
      <Button
        variant="default"
        disabled={!documentId || isLoading}
        onClick={onCreateQuiz}
        className="w-full h-10 md:h-9 bg-brand-500 hover:bg-brand-600 text-white text-sm font-medium rounded-lg"
      >
        {isLoading ? "Creating..." : "Generate Quiz"}
      </Button>

      {/* Customize settings link */}
      <button
        type="button"
        onClick={() => router.push(`/quizzes/new?document_id=${documentId}`)}
        className="w-full text-sm text-brand-500 hover:underline text-center bg-transparent border-0 p-0 cursor-pointer"
      >
        Customize settings →
      </button>
    </div>
  )
}
