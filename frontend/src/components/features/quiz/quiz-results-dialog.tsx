"use client"

import { useRouter } from "next/navigation"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Target } from "lucide-react"

interface WeakTopic {
  topic: string
  accuracy: number
}

interface QuizResultsDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  score: number
  total: number
  weakTopics: WeakTopic[]
}

export function QuizResultsDialog({
  open,
  onOpenChange,
  score,
  total,
  weakTopics,
}: QuizResultsDialogProps) {
  const router = useRouter()

  const handlePractice = (topic?: string) => {
    const params = topic ? `?topics=${encodeURIComponent(topic)}` : ""
    router.push(`/practice${params}`)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold text-text-primary">
            You scored {score}/{total}
          </DialogTitle>
          <DialogDescription className="text-sm text-text-secondary">
            {weakTopics.length > 0
              ? "We found some topics to work on."
              : "Great work — no weak areas detected!"}
          </DialogDescription>
        </DialogHeader>

        {weakTopics.length > 0 && (
          <div className="space-y-3 py-4">
            <p className="text-sm font-medium text-text-primary">Weak spots detected:</p>
            <div className="space-y-2">
              {weakTopics.map((wt) => (
                <div
                  key={wt.topic}
                  className="flex items-center justify-between p-3 rounded-lg border border-border-default bg-surface-subtle"
                >
                  <div className="flex items-center gap-2">
                    <Target className="size-4 text-accent-500" />
                    <span className="text-sm font-medium text-text-primary">{wt.topic}</span>
                  </div>
                  <span className="text-sm font-semibold text-accent-500">
                    {wt.accuracy}%
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        <DialogFooter className="flex-col gap-2 sm:flex-col">
          {weakTopics.length > 0 && (
            <Button
              onClick={() => handlePractice(weakTopics[0].topic)}
              className="w-full bg-brand-500 text-white hover:bg-brand-600"
            >
              <Target className="size-4 mr-2" />
              Practice {weakTopics[0].topic}
            </Button>
          )}
          {weakTopics.length > 1 && (
            <Button
              variant="secondary"
              onClick={() => handlePractice()}
              className="w-full"
            >
              Practice All Weak Topics
            </Button>
          )}
          <Button variant="ghost" onClick={() => onOpenChange(false)} className="w-full">
            Review Answers
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
