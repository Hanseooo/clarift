import Link from "next/link"
import { CheckSquare } from "lucide-react"
import { Badge } from "@/components/ui/badge"

interface QuizItem {
  id: string
  title: string | null
  question_count: number
  question_types: string[]
  created_at: string
}

interface QuizListProps {
  quizzes: QuizItem[]
}

const typeLabels: Record<string, string> = {
  mcq: "Multiple Choice",
  true_false: "True/False",
  identification: "Identification",
  multi_select: "Multi-Select",
  ordering: "Ordering",
}

export function QuizList({ quizzes }: QuizListProps) {
  if (!quizzes.length) {
    return (
      <div className="text-center py-12">
        <div className="size-12 rounded-xl bg-surface-subtle flex items-center justify-center mx-auto mb-3">
          <CheckSquare className="size-6 text-text-tertiary" />
        </div>
        <h3 className="text-sm font-medium text-text-primary mb-1">
          No quizzes yet
        </h3>
        <p className="text-xs text-text-tertiary">
          Upload and summarize a document first, then generate a quiz from it.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-2">
      {quizzes.map((quiz) => (
        <Link
          key={quiz.id}
          href={`/quizzes/${quiz.id}`}
          className="block bg-surface-card border border-border-default rounded-xl p-4 hover:bg-surface-overlay hover:border-border-strong transition-colors-fast"
        >
          <div className="flex items-center gap-3">
            {/* Icon */}
            <div className="size-9 rounded-lg bg-brand-100 flex items-center justify-center flex-shrink-0">
              <CheckSquare className="size-[18px] text-brand-400" />
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-text-primary truncate">
                {quiz.title ?? "Untitled quiz"}
              </p>
              <p className="text-xs text-text-tertiary mt-0.5">
                {quiz.question_count} questions ·{" "}
                {new Date(quiz.created_at).toLocaleDateString("en-PH", {
                  month: "short",
                  day: "numeric",
                })}
              </p>
            </div>

            {/* Type badges */}
            <div className="flex gap-1 flex-shrink-0">
              {quiz.question_types.slice(0, 2).map((type) => (
                <Badge
                  key={type}
                  variant="secondary"
                  className="text-[11px] font-medium bg-brand-100 text-brand-800 hover:bg-brand-100"
                >
                  {typeLabels[type] || type}
                </Badge>
              ))}
            </div>
          </div>
        </Link>
      ))}
    </div>
  )
}
