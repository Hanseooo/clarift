"use client"

import { useState, useEffect, useCallback } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { FileText, ArrowUp } from "lucide-react"

type ChatPhase =
  | { type: "user"; id: number; content: string }
  | { type: "thinking"; id: number }
  | { type: "assistant"; id: number }

type CyclePhase =
  | { stage: "showing"; phase: ChatPhase }
  | { stage: "pausing"; shownIds: number[] }
  | { stage: "clearing" }

const TIMING = {
  userDelay: 1500,
  thinkingDuration: 2000,
  assistantDelay: 1500,
  pauseBeforeNextUser: 800,
  pauseBeforeClear: 2500,
  clearDuration: 500,
}

function ThinkingDots() {
  return (
    <div className="flex items-center gap-2 py-1.5">
      <div className="flex items-center gap-1">
        <span className="thinking-dot" />
        <span className="thinking-dot" />
        <span className="thinking-dot" />
      </div>
      <span className="text-xs text-text-tertiary">Searching your notes...</span>
    </div>
  )
}

function UserBubble({ content }: { content: string }) {
  return (
    <div className="flex justify-end">
      <div className="max-w-[78%] bg-brand-500 text-white rounded-[16px_16px_4px_16px] px-3.5 py-2.5 text-[13px] leading-[1.5]">
        {content}
      </div>
    </div>
  )
}

function AssistantResponse() {
  return (
    <div className="space-y-2 max-w-[92%]">
      <div className="space-y-1.5">
        <div className="h-2 w-full rounded-full bg-surface-subtle" />
        <div className="h-2 w-5/6 rounded-full bg-surface-subtle" />
        <div className="h-2 w-4/5 rounded-full bg-surface-subtle" />
        <div className="h-2 w-full rounded-full bg-surface-subtle" />
      </div>
      <div className="flex flex-wrap gap-1.5 pt-1">
        <div className="inline-flex items-center gap-1 rounded-md bg-surface-subtle border border-border-default px-2 py-1">
          <FileText className="size-3 text-text-tertiary" />
          <span className="text-[11px] text-text-secondary">Nursing Notes · p.12</span>
        </div>
      </div>
    </div>
  )
}

const CONVERSATION: ChatPhase[] = [
  { type: "user", id: 1, content: "What are the key concepts in renal failure?" },
  { type: "thinking", id: 2 },
  { type: "assistant", id: 3 },
  { type: "user", id: 4, content: "Explain the pathophysiology in detail" },
  { type: "thinking", id: 5 },
  { type: "assistant", id: 6 },
]

export function MockChatFrame() {
  const [shownIds, setShownIds] = useState<Set<number>>(new Set())
  const [thinkingId, setThinkingId] = useState<number | null>(null)
  const [currentPhaseIndex, setCurrentPhaseIndex] = useState(0)
  const [isClearing, setIsClearing] = useState(false)

  const advance = useCallback(() => {
    setCurrentPhaseIndex((prev) => {
      const next = prev + 1
      if (next >= CONVERSATION.length) {
        return -1 // Signal to pause then clear
      }
      return next
    })
  }, [])

  useEffect(() => {
    if (isClearing) return

    if (currentPhaseIndex === -1) {
      // All phases shown, pause then clear
      const pauseTimer = setTimeout(() => {
        setIsClearing(true)
        const clearTimer = setTimeout(() => {
          setShownIds(new Set())
          setThinkingId(null)
          setCurrentPhaseIndex(0)
          setIsClearing(false)
        }, TIMING.clearDuration)
        return () => clearTimeout(clearTimer)
      }, TIMING.pauseBeforeClear)
      return () => clearTimeout(pauseTimer)
    }

    const phase = CONVERSATION[currentPhaseIndex]
    if (!phase) return

    if (phase.type === "user") {
      const timer = setTimeout(() => {
        setShownIds((prev) => new Set(prev).add(phase.id))
        advance()
      }, currentPhaseIndex === 0 ? 600 : TIMING.pauseBeforeNextUser)
      return () => clearTimeout(timer)
    }

    if (phase.type === "thinking") {
      const timer = setTimeout(() => {
        setThinkingId(phase.id)
        const doneTimer = setTimeout(() => {
          setThinkingId(null)
          advance()
        }, TIMING.thinkingDuration)
        return () => clearTimeout(doneTimer)
      }, TIMING.userDelay)
      return () => clearTimeout(timer)
    }

    if (phase.type === "assistant") {
      const timer = setTimeout(() => {
        setShownIds((prev) => new Set(prev).add(phase.id))
        advance()
      }, TIMING.assistantDelay)
      return () => clearTimeout(timer)
    }
  }, [currentPhaseIndex, isClearing, advance])

  const getMessageForId = (id: number) => {
    const phase = CONVERSATION.find((p) => p.id === id)
    if (!phase || phase.type !== "user") return null
    return phase.content
  }

  return (
    <div className="w-full flex flex-col h-[320px]">
      {/* Chat header */}
      <div className="flex items-center gap-2 px-4 py-3 border-b border-border-default">
        <div className="size-2 rounded-full bg-success-500" />
        <span className="text-sm font-medium text-text-primary">Chat with your notes</span>
        <div className="ml-auto flex items-center gap-1.5 bg-surface-subtle border border-border-default rounded-md px-2 py-0.5">
          <FileText className="size-3 text-text-tertiary" />
          <span className="text-[11px] text-text-tertiary">Nursing Notes</span>
        </div>
      </div>

      {/* Messages area */}
      <div className="flex-1 overflow-hidden p-4 space-y-3">
        <AnimatePresence mode="popLayout">
          {Array.from(shownIds).map((id) => (
            <motion.div
              key={id}
              layout
              initial={{ opacity: 0, y: 12, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -8, scale: 0.96 }}
              transition={{ duration: 0.35, ease: "easeOut" }}
            >
              {getMessageForId(id) ? (
                <UserBubble content={getMessageForId(id)!} />
              ) : (
                <AssistantResponse />
              )}
            </motion.div>
          ))}

          {thinkingId !== null && (
            <motion.div
              key={`thinking-${thinkingId}`}
              layout
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.25 }}
            >
              <ThinkingDots />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Input bar */}
      <div className="border-t border-border-default p-2.5 flex items-end gap-2">
        <div className="flex-1 h-10 rounded-[20px] border border-border-default bg-surface-subtle flex items-center px-3.5">
          <span className="text-sm text-text-tertiary">Ask anything about your notes...</span>
        </div>
        <div className="size-[34px] rounded-full bg-surface-subtle flex items-center justify-center flex-shrink-0">
          <ArrowUp className="size-4 text-text-tertiary" />
        </div>
      </div>
    </div>
  )
}
