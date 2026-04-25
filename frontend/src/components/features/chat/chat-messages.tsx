"use client"

import { useRef, useEffect } from "react"
import { FileText } from "lucide-react"
import { RichMarkdown } from "@/components/ui/rich-markdown"
import { ThinkingIndicator } from "./thinking-indicator"
import { cn } from "@/lib/utils"

interface ChatMessage {
  id: string
  role: "user" | "assistant"
  content: string
  citations?: Array<{ chunk_id?: string | null }>
}

interface ChatMessagesProps {
  messages: ChatMessage[]
  isSearching: boolean
  error: string | null
}

const CONTEXT_WINDOW_SIZE = 8

export function ChatMessages({ messages, isSearching, error }: ChatMessagesProps) {
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight
    }
  }, [messages, isSearching])

  return (
    <div
      ref={containerRef}
      className="flex-1 overflow-y-auto p-4 space-y-3 min-h-[300px]"
    >
      {messages.length === 0 && !isSearching && (
        <div className="text-center py-12">
          <p className="text-sm text-text-tertiary">
            Select a document and ask a question to get started
          </p>
        </div>
      )}

      {messages.length > CONTEXT_WINDOW_SIZE && (
        <div className="sticky top-0 z-10 rounded-md bg-warning-100 px-3 py-2 text-center text-xs text-warning-800">
          To keep responses sharp, only the last {CONTEXT_WINDOW_SIZE} messages are used as context.
        </div>
      )}

      {messages.map((msg, index) => {
        const isInContext = index >= messages.length - CONTEXT_WINDOW_SIZE
        return (
          <div
            key={msg.id}
            className={cn(
              "flex transition-all duration-300",
              !isInContext && "opacity-50 grayscale",
              msg.role === "user" ? "justify-end" : "justify-start"
            )}
          >
            {msg.role === "user" ? (
              <div className="max-w-[78%] bg-brand-500 text-white rounded-[16px_16px_4px_16px] px-3.5 py-2.5 text-[13px] leading-[1.5]">
                {msg.content}
              </div>
            ) : (
              <div className="max-w-[92%] space-y-1.5">
                <div className="prose-compact">
                  <RichMarkdown content={msg.content} />
                </div>

                {/* Citation pills */}
                {msg.citations && msg.citations.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {msg.citations.map((citation, i) => (
                      <span
                        key={i}
                        className="inline-flex items-center gap-1 bg-surface-subtle border border-border-default rounded-md px-2 py-0.5 text-[11px] text-text-secondary"
                      >
                        <FileText className="size-[11px] text-text-tertiary" />
                        Citation {i + 1}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )
      })}

      {/* Thinking state */}
      {isSearching && <ThinkingIndicator />}

      {/* Error */}
      {error && (
        <div className="text-center py-2">
          <p className="text-xs text-danger-500">{error}</p>
        </div>
      )}
    </div>
  )
}
