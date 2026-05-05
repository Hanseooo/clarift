"use client"

import { RichMarkdown } from "@/components/ui/rich-markdown"

interface Slide {
  number: number
  title?: string
  content: string
}

interface SlideViewerProps {
  content: string
}

function parseSlides(text: string): Slide[] {
  const slides: Slide[] = []
  const parts = text.split(/--- Slide (\d+) ---/)

  // parts[0] is preamble before first slide marker, ignore if empty
  for (let i = 1; i < parts.length; i += 2) {
    const number = parseInt(parts[i], 10)
    const content = parts[i + 1] || ""
    // Try to extract a title from the first line
    const lines = content.trim().split("\n")
    const firstLine = lines[0]?.trim()
    const title = firstLine && !firstLine.startsWith("-") && !firstLine.startsWith("*") ? firstLine : undefined
    const body = title ? lines.slice(1).join("\n").trim() : content.trim()

    slides.push({ number, title, content: body })
  }

  // Fallback: no slide markers found — treat entire text as one slide
  if (slides.length === 0 && text.trim()) {
    slides.push({ number: 1, content: text.trim() })
  }

  return slides
}

function SlideCard({ slide }: { slide: Slide }) {
  return (
    <div className="bg-surface-subtle border border-border-default rounded-xl p-5">
      <div className="flex items-center gap-3 mb-3">
        <span className="bg-brand-100 text-brand-800 text-xs font-semibold rounded-full w-7 h-7 flex items-center justify-center shrink-0">
          {slide.number}
        </span>
        {slide.title && (
          <h3 className="text-base font-semibold text-text-primary min-w-0 truncate">{slide.title}</h3>
        )}
      </div>
      <div className="prose-brand prose-sm">
        <RichMarkdown content={slide.content} />
      </div>
    </div>
  )
}

export function SlideViewer({ content }: SlideViewerProps) {
  const slides = parseSlides(content)

  return (
    <div className="space-y-6">
      {slides.map((slide) => (
        <SlideCard key={slide.number} slide={slide} />
      ))}
    </div>
  )
}
