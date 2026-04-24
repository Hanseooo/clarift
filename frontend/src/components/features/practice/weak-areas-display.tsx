"use client"

import { Target } from "lucide-react"
import { cn } from "@/lib/utils"

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
}

export function WeakAreasDisplay({
  weakAreas,
  selectedTopics,
  onToggleTopic,
}: WeakAreasDisplayProps) {
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
          <button
            key={area.topic}
            onClick={() => onToggleTopic(area.topic)}
            className={cn(
              "w-full bg-surface-card border border-border-default rounded-xl p-3.5 flex items-center gap-3 text-left transition-colors-fast",
              isSelected && "border-accent-500 bg-accent-500/4"
            )}
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
              <p className="text-sm font-medium text-text-primary mb-1">
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
        )
      })}
    </div>
  )
}
