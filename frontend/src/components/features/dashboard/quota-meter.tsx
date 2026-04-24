"use client"

import { cn } from "@/lib/utils"

interface QuotaMeterProps {
  label: string
  used: number
  limit: number
  resetAt?: string
}

export function QuotaMeter({ label, used, limit, resetAt }: QuotaMeterProps) {
  const percentage = Math.min((used / limit) * 100, 100)

  const getBarColor = () => {
    if (percentage >= 90) return "bg-danger-500"
    if (percentage >= 70) return "bg-accent-500"
    return "bg-brand-500"
  }

  const formatResetTime = (resetAt?: string) => {
    if (!resetAt) return null
    const date = new Date(resetAt)
    return date.toLocaleTimeString("en-PH", { hour: "numeric", minute: "2-digit" })
  }

  return (
    <div className="bg-surface-subtle rounded-xl p-3 md:p-4">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs text-text-secondary">{label}</span>
        <span className="text-xs font-medium text-text-primary">
          {used} of {limit}
        </span>
      </div>
      <div className="h-1 bg-border-default rounded-full overflow-hidden mb-2">
        <div
          className={cn("h-full rounded-full transition-all duration-300", getBarColor())}
          style={{ width: `${percentage}%` }}
        />
      </div>
      {resetAt && (
        <p className="text-[11px] text-text-tertiary">
          Resets at {formatResetTime(resetAt)}
        </p>
      )}
    </div>
  )
}
