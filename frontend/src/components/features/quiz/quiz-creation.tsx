"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"

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

type DocumentOption = {
  id: string
  title: string
}

type QuizCreationProps = {
  documents: DocumentOption[]
}

export function QuizCreation({ documents }: QuizCreationProps) {
  const router = useRouter()
  const [documentId, setDocumentId] = useState(documents[0]?.id ?? "")
  const [questionCount, setQuestionCount] = useState(10)
  const { mutateAsync, isLoading, error } = useCreateQuiz()

  const onCreateQuiz = async () => {
    if (!documentId) {
      return
    }
    const response = await mutateAsync({
      document_id: documentId,
      question_count: questionCount,
      auto_mode: true,
    })
    router.push(`/quizzes/${response.quiz_id}`)
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
          <SelectTrigger id="quiz-document-select" className="w-full h-10 px-3 text-sm bg-surface-subtle border-border-default rounded-lg focus:border-brand-500 focus:ring-2 focus:ring-brand-500/15">
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

      {/* Question count */}
      <div className="space-y-1.5">
        <label className="text-sm font-medium text-text-primary">Questions</label>
        <div className="flex items-center gap-3">
          <input
            type="range"
            min={5}
            max={30}
            value={questionCount}
            onChange={(e) => setQuestionCount(Number(e.target.value))}
            className="flex-1 accent-brand-500"
          />
          <span className="text-sm font-medium text-text-primary w-8 text-center">
            {questionCount}
          </span>
        </div>
      </div>

      {/* Error */}
      {error ? <p className="text-xs text-danger-500">{error}</p> : null}

      {/* Create button */}
      <Button
        variant="default"
        disabled={!documentId || isLoading}
        onClick={onCreateQuiz}
        className="w-full"
      >
        {isLoading ? "Creating..." : "Create Quiz"}
      </Button>
    </div>
  )
}
