"use client"

import { cn } from "@/lib/utils"
import { Check } from "lucide-react"

interface OptionCardProps {
  icon: React.ReactNode
  title: string
  description: string
  preview: string
  selected: boolean
  onClick: () => void
  className?: string
}

export function OptionCard({
  icon,
  title,
  description,
  preview,
  selected,
  onClick,
  className,
}: OptionCardProps) {
  return (
    <div
      role="radio"
      aria-checked={selected}
      tabIndex={0}
      onClick={onClick}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault()
          onClick()
        }
      }}
      className={cn(
        "bg-surface-card border-[1.5px] border-border-default rounded-[14px] p-4 cursor-pointer transition-colors-fast relative",
        "hover:border-border-strong hover:bg-surface-overlay",
        selected && "border-brand-500 bg-brand-500/4",
        className
      )}
    >
      {/* Checkmark */}
      <div
        className={cn(
          "absolute top-3 right-3 size-[18px] rounded-full bg-brand-500 flex items-center justify-center transition-opacity duration-150",
          selected ? "opacity-100" : "opacity-0"
        )}
      >
        <Check className="size-[10px] text-white" />
      </div>

      <div className="flex gap-3">
        {/* Icon */}
        <div
          className={cn(
            "size-[38px] rounded-xl flex items-center justify-center flex-shrink-0 transition-colors-fast",
            selected ? "bg-brand-500/15" : "bg-brand-500/10"
          )}
        >
          {icon}
        </div>

        {/* Body */}
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-semibold text-text-primary mb-0.5 break-words">
            {title}
          </h3>
          <p className="text-xs text-text-secondary leading-relaxed mb-2 break-words">
            {description}
          </p>

          {/* Preview snippet — REQUIRED per design.md */}
          <div className="bg-surface-subtle rounded-md p-2 text-[11px] text-text-tertiary leading-relaxed font-mono whitespace-pre-wrap break-words">
            {preview}
          </div>
        </div>
      </div>
    </div>
  )
}
