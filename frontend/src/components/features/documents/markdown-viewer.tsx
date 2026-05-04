"use client"

import { RichMarkdown } from "@/components/ui/rich-markdown"

interface MarkdownViewerProps {
  content: string
}

export function MarkdownViewer({ content }: MarkdownViewerProps) {
  return (
    <div className="prose-brand">
      <RichMarkdown content={content} />
    </div>
  )
}
