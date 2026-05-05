"use client"

import { useState } from "react"
import { Target, X } from "lucide-react"
import { cn } from "@/lib/utils"

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
} from "@/components/ui/alert-dialog"

interface WeakAreaItem {
  topic: string
  accuracy: number
  attempts: number
  quiz_count: number
}

interface WeakAreasDisplayProps {
  weakAreas: WeakAreaItem[]
  selectedTopics: string[]
  onToggleTopic: (topic: string) => void
  onResetTopic?: (topic: string) => void
  isResetting?: boolean
}

export function WeakAreasDisplay({
  weakAreas,
  selectedTopics,
  onToggleTopic,
  onResetTopic,
  isResetting,
}: WeakAreasDisplayProps) {
  const [topicToReset, setTopicToReset] = useState<string | null>(null)

  if (weakAreas.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="size-12 rounded-xl bg-surface-subtle flex items-center justify-center mx-auto mb-3">
          <Target className="size-6 text-text-tertiary" />
        </div>
        <h3 className="text-sm font-medium text-text-primary mb-1">
          No weak areas yet
        </h3>
        <p className="text-xs text-text-tertiary">
          Complete a few quizzes to discover your gaps.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-2">
      {weakAreas.map((area) => {
        const isSelected = selectedTopics.includes(area.topic)
        return (
          <div
            key={area.topic}
            className={cn(
              "group relative w-full bg-surface-card border border-border-default rounded-xl p-3.5 flex items-center gap-3 transition-colors-fast",
              isSelected && "border-accent-500 bg-accent-500/4"
            )}
          >
            {/* Main clickable area */}
            <button
              onClick={() => onToggleTopic(area.topic)}
              className="flex-1 flex items-center gap-3 text-left min-w-0"
            >
              {/* Icon ring — amber per design.md */}
              <div
                className={cn(
                  "size-9 rounded-xl flex items-center justify-center flex-shrink-0 transition-colors-fast",
                  isSelected
                    ? "bg-accent-500/15 border border-accent-500/20"
                    : "bg-accent-500/10 border border-accent-500/10"
                )}
              >
                <Target className="size-[18px] text-accent-500" />
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-text-primary mb-1 truncate">
                  {area.topic}
                </p>
                <div className="h-[3px] bg-border-default rounded-full overflow-hidden mb-1">
                  <div
                    className="h-full bg-accent-500 rounded-full"
                    style={{ width: `${area.accuracy}%` }}
                  />
                </div>
                <p className="text-[11px] text-text-tertiary">
                  {area.attempts} attempts across {area.quiz_count} quizzes
                </p>
              </div>

              {/* Percentage */}
              <span className="text-base font-bold text-accent-500 flex-shrink-0">
                {area.accuracy}%
              </span>
            </button>

            {/* Ghost X button — appears on hover/focus, always visible on mobile touch */}
            {onResetTopic && (
              <AlertDialog
                open={topicToReset === area.topic}
                onOpenChange={(open) => {
                  if (!open) setTopicToReset(null)
                }}
              >
                <AlertDialogTrigger asChild>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation()
                      setTopicToReset(area.topic)
                    }}
                    className={cn(
                      "flex-shrink-0 h-11 w-11 rounded-lg flex items-center justify-center transition-all",
                      "text-text-tertiary hover:text-destructive hover:bg-destructive/10",
                      "opacity-0 group-hover:opacity-100 focus:opacity-100",
                      "sm:opacity-0 sm:group-hover:opacity-100 sm:focus:opacity-100",
                      "opacity-100 sm:opacity-0"
                    )}
                    aria-label={`Reset stats for ${area.topic}`}
                  >
                    <X className="size-4" />
                  </button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Reset topic stats?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This will clear your accuracy history for <strong>{area.topic}</strong>.
                      Your past quiz and practice attempts will still exist, but this topic
                      will no longer appear as a weak area until you accumulate new stats.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel onClick={() => setTopicToReset(null)}>
                      Cancel
                    </AlertDialogCancel>
                    <AlertDialogAction
                      onClick={() => {
                        onResetTopic(area.topic)
                        setTopicToReset(null)
                      }}
                      disabled={isResetting}
                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    >
                      {isResetting ? "Resetting..." : "Reset"}
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )}
          </div>
        )
      })}
    </div>
  )
}
