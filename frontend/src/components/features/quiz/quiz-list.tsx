"use client";

import Link from "next/link"
import { CheckSquare, Trash2 } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { SwipeCard } from "@/components/ui/swipe-card"
import { RenameTitle } from "@/components/features/rename-title"
import { updateQuizTitle, deleteQuiz } from "@/app/actions/quizzes"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

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
        <QuizCard key={quiz.id} quiz={quiz} />
      ))}
    </div>
  )
}

function QuizCard({ quiz }: { quiz: QuizItem }) {
  const handleDelete = async () => {
    await deleteQuiz(quiz.id);
  };

  const handleUpdateTitle = async (id: string, title: string) => {
    await updateQuizTitle(id, title);
  };

  const cardContent = (
    <div className="group bg-surface-card border border-border-default rounded-xl p-4 flex items-center gap-3 hover:bg-surface-overlay hover:border-border-strong transition-colors-fast">
      {/* Icon */}
      <div className="size-9 rounded-lg bg-brand-100 flex items-center justify-center flex-shrink-0">
        <CheckSquare className="size-[18px] text-brand-400" />
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <Link
          href={`/quizzes/${quiz.id}`}
          className="text-sm font-medium text-text-primary hover:text-brand-500 transition-colors-fast truncate block"
        >
          <RenameTitle
            id={quiz.id}
            currentTitle={quiz.title}
            onSave={handleUpdateTitle}
          />
        </Link>
        <p className="text-xs text-text-tertiary mt-0.5">
          {quiz.question_count} questions ·{" "}
          {new Date(quiz.created_at).toLocaleDateString("en-PH", {
            month: "short",
            day: "numeric",
          })}
        </p>
      </div>

      {/* Type badges + Delete */}
      <div className="flex items-center gap-2 flex-shrink-0">
        <div className="flex gap-1">
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
        
        {/* Desktop delete button */}
        <div className="hidden md:block opacity-0 group-hover:opacity-100 transition-opacity">
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <button
                className="p-1.5 text-text-secondary hover:text-danger-500 transition-colors rounded-md hover:bg-surface-subtle"
                aria-label="Delete quiz"
              >
                <Trash2 className="size-4" />
              </button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete Quiz</AlertDialogTitle>
                <AlertDialogDescription>
                  Delete this quiz and all attempts?
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  onClick={handleDelete}
                  className="bg-danger-500 hover:bg-danger-600"
                >
                  Delete
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>
    </div>
  );

  return (
    <SwipeCard
      onDelete={handleDelete}
      deleteConfirmation="Delete this quiz and all attempts?"
    >
      {cardContent}
    </SwipeCard>
  );
}
