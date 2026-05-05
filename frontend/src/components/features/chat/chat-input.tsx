"use client"

import { useState, useRef } from "react"
import { ArrowUp } from "lucide-react"
import { cn } from "@/lib/utils"

interface ChatInputProps {
  disabled?: boolean
  isSending?: boolean
  onSend: (message: string) => Promise<void>
}

export function ChatInput({ disabled, isSending, onSend }: ChatInputProps) {
  const [message, setMessage] = useState("")
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const handleSubmit = async () => {
    if (!message.trim() || isSending || disabled) return
    await onSend(message.trim())
    setMessage("")
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto"
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      handleSubmit()
    }
  }

  const handleInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setMessage(e.target.value)
    const textarea = e.target
    textarea.style.height = "auto"
    textarea.style.height = Math.min(textarea.scrollHeight, 120) + "px"
  }

  const hasText = message.trim().length > 0

  return (
    <div className="bg-surface-card border-t border-border-default p-2.5 flex items-end gap-2">
      <textarea
        ref={textareaRef}
        value={message}
        onChange={handleInput}
        onKeyDown={handleKeyDown}
        placeholder="Ask anything about your notes..."
        disabled={disabled || isSending}
        rows={1}
        className={cn(
          "flex-1 border border-border-default rounded-[20px] px-3.5 py-2.5 text-sm resize-none leading-[1.4] max-h-[120px] transition-colors-fast",
          "bg-surface-subtle text-text-primary placeholder:text-text-tertiary",
          "focus:border-brand-400 focus:outline-none",
          "disabled:opacity-50"
        )}
      />
      <button
        onClick={handleSubmit}
        disabled={!hasText || isSending || disabled}
        className={cn(
          "size-11 rounded-full border-none flex items-center justify-center transition-colors-fast flex-shrink-0",
          hasText
            ? "bg-brand-500 text-white hover:bg-brand-600"
            : "bg-surface-subtle text-text-tertiary",
          "disabled:opacity-50"
        )}
      >
        <ArrowUp className="size-4" />
      </button>
    </div>
  )
}
