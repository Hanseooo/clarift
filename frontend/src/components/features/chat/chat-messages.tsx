"use client"

import { useRef, useEffect, useState } from "react"
import { X } from "lucide-react"
import { RichMarkdown } from "@/components/ui/rich-markdown"
import { ThinkingIndicator } from "./thinking-indicator"
import { cn } from "@/lib/utils"

interface ChatMessage {
  id: string
  role: "user" | "assistant"
  content: string
  citations?: Array<{
    chunk_id?: string | null
    document_id?: string | null
    document_name?: string | null
    chunk_index?: number | null
  }>
}

interface ChatMessagesProps {
  messages: ChatMessage[]
  isSearching: boolean
  error: string | null
}

const CONTEXT_WINDOW_SIZE = 8
const CHAT_NOTICE_KEY = "chat-context-notice-dismissed"

export function ChatMessages({ messages, isSearching, error }: ChatMessagesProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [isNoticeDismissed, setIsNoticeDismissed] = useState(false)

  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight
    }
  }, [messages, isSearching])

  useEffect(() => {
    const dismissed = localStorage.getItem(CHAT_NOTICE_KEY)
    if (dismissed) {
      setIsNoticeDismissed(true)
    }
  }, [])

  const handleDismissNotice = () => {
    setIsNoticeDismissed(true)
    localStorage.setItem(CHAT_NOTICE_KEY, "true")
  }

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

      {messages.length > CONTEXT_WINDOW_SIZE && !isNoticeDismissed && (
        <div className="sticky top-0 z-10 rounded-md bg-warning-100 px-3 py-2 text-center text-xs text-warning-800 flex items-center justify-center gap-2">
          <span>To keep responses sharp, only the last {CONTEXT_WINDOW_SIZE} messages are used as context.</span>
          <button
            onClick={handleDismissNotice}
            className="p-0.5 hover:text-warning-900 transition-colors"
            aria-label="Dismiss notice"
          >
            <X className="size-3" />
          </button>
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
