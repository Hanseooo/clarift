"use client"

import { FileText, Check } from "lucide-react"
import { cn } from "@/lib/utils"

type DocumentOption = {
  id: string
  title: string
}

type DocumentSelectorProps = {
  documents: DocumentOption[]
  selectedIds: string[]
  onToggle: (id: string) => void
}

export function DocumentSelector({ documents, selectedIds, onToggle }: DocumentSelectorProps) {
  if (!documents.length) {
    return (
      <div className="p-4 text-center">
        <div className="size-10 rounded-xl bg-surface-subtle flex items-center justify-center mx-auto mb-2">
          <FileText className="size-5 text-text-tertiary" />
        </div>
        <p className="text-xs text-text-tertiary">
          No documents available yet.
        </p>
      </div>
    )
  }

  return (
    <div className="p-2 space-y-1">
      {documents.map((document) => {
        const isSelected = selectedIds.includes(document.id)
        return (
          <button
            key={document.id}
            onClick={() => onToggle(document.id)}
            className={cn(
              "w-full flex items-center gap-3 rounded-lg px-3 py-2.5 text-left transition-colors-fast",
              isSelected
                ? "bg-brand-500/8 border border-brand-500/20"
                : "hover:bg-surface-overlay border border-transparent"
            )}
          >
            {/* Checkbox indicator */}
            <div
              className={cn(
                "size-5 rounded-md flex items-center justify-center flex-shrink-0 transition-colors-fast border",
                isSelected
                  ? "bg-brand-500 border-brand-500"
                  : "bg-surface-subtle border-border-default"
              )}
            >
              {isSelected && <Check className="size-3 text-white" />}
            </div>

            {/* Document info */}
            <div className="flex-1 min-w-0">
              <p className={cn(
                "text-sm font-medium truncate",
                isSelected ? "text-brand-700" : "text-text-primary"
              )}>
                {document.title}
              </p>
            </div>
          </button>
        )
      })}
    </div>
  )
}
