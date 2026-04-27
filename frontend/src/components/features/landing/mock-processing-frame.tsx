"use client"

import { FileText } from "lucide-react"

export function MockProcessingFrame() {
  return (
    <div className="w-full">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-surface-subtle">
          <FileText className="size-5 text-text-secondary" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium text-text-primary">
            Engineering_Mechanics_Ch3.pdf
          </p>
          <p className="text-xs font-medium text-brand-500">Processing...</p>
        </div>
      </div>
      <div className="mt-4">
        <div className="flex items-center gap-2 mb-1">
          <div className="flex-1 w-full overflow-hidden rounded-full bg-border-default h-1">
            <div
              className="h-full rounded-full bg-brand-500 transition-all duration-300"
              style={{ width: "65%" }}
              role="progressbar"
              aria-valuenow={65}
              aria-valuemin={0}
              aria-valuemax={100}
            />
          </div>
        </div>
        <p className="text-xs text-text-tertiary">
          Generating embeddings... 65%
        </p>
      </div>
    </div>
  )
}
