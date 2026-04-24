"use client"

import { Search } from "lucide-react"

interface DocumentSearchProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
}

export function DocumentSearch({
  value,
  onChange,
  placeholder = "Search documents...",
}: DocumentSearchProps) {
  return (
    <div className="relative">
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-text-tertiary" />
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full h-10 pl-9 pr-4 text-sm bg-surface-subtle border border-border-default rounded-lg focus:border-brand-500 focus:ring-2 focus:ring-brand-500/15 transition-colors-fast text-text-primary placeholder:text-text-tertiary"
      />
    </div>
  )
}
