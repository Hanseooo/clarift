"use client"

import * as React from "react"
import { cn } from "@/lib/utils"

interface ProgressProps extends React.HTMLAttributes<HTMLDivElement> {
  value: number
  max?: number
}

export function Progress({ value, max = 100, className, ...props }: ProgressProps) {
  const percentage = Math.min(Math.max((value / max) * 100, 0), 100)

  const getColor = (pct: number) => {
    if (pct >= 90) return "bg-danger-500"
    if (pct >= 70) return "bg-accent-500"
    return "bg-brand-500"
  }

  return (
    <div
      className={cn("h-1 w-full overflow-hidden rounded-full bg-border-default", className)}
      {...props}
    >
      <div
        data-progress-indicator
        className={cn(
          "h-full rounded-full transition-all duration-300 ease",
          getColor(percentage)
        )}
        style={{ width: `${percentage}%` }}
        role="progressbar"
        aria-valuenow={Math.round(percentage)}
        aria-valuemin={0}
        aria-valuemax={max}
      />
    </div>
  )
}
