"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { FileText, ChevronDown, Settings2 } from "lucide-react"
import { ChatInput } from "./chat-input"
import { ChatMessages } from "./chat-messages"
import { DocumentSelector } from "./document-selector"
import { useSendChatMessage } from "@/hooks/use-chat"
import { useChatStore, type ChatMessage, type ChatState } from "@/stores/chat-store"
import { Badge } from "@/components/ui/badge"
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { motion, AnimatePresence } from "framer-motion"

type DocumentOption = {
  id: string
  title: string
}

export function ChatPageClient({
  documents,
  initialDocumentId,
}: {
  documents: DocumentOption[]
  initialDocumentId?: string
}) {
  const {
    messages,
    selectedDocumentIds: selectedIds,
    setSelectedDocumentIds,
    addMessage,
    modeOverride,
    personaOverride,
    setModeOverride,
    setPersonaOverride,
  } = useChatStore()
  const [isSearching, setIsSearching] = useState(false)
  const [isDrawerOpen, setIsDrawerOpen] = useState(false)
  const [streamingMessageId, setStreamingMessageId] = useState<string | null>(null)
  const streamIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const { mutateAsync, isLoading, error } = useSendChatMessage()

  useEffect(() => {
    return () => {
      if (streamIntervalRef.current) {
        clearInterval(streamIntervalRef.current)
      }
    }
  }, [])

  useEffect(() => {
    if (initialDocumentId && selectedIds.length === 0) {
      setSelectedDocumentIds([initialDocumentId])
    }
  }, [initialDocumentId, selectedIds.length, setSelectedDocumentIds])

  const selectedDocumentIds = useMemo(() => selectedIds, [selectedIds])

  const sendMessage = async (message: string) => {
    if (streamIntervalRef.current) {
      clearInterval(streamIntervalRef.current)
      streamIntervalRef.current = null
      setStreamingMessageId(null)
    }

    addMessage({
      id: crypto.randomUUID(),
      role: "user",
      content: message,
      timestamp: Date.now(),
    })
    setIsSearching(true)
    try {
      const contextMessages = useChatStore
        .getState()
        .getRecentMessages(8)
        .map((m) => ({ role: m.role, content: m.content }))

      const response = await mutateAsync({
        question: message,
        document_ids: selectedDocumentIds,
        messages: contextMessages,
        mode_override: modeOverride ?? undefined,
        persona_override: personaOverride ?? undefined,
      })

      const messageId = crypto.randomUUID()
      setStreamingMessageId(messageId)

      addMessage({
        id: messageId,
        role: "assistant",
        content: "",
        timestamp: Date.now(),
      })

      const words = response.answer.split(/(\s+)/).filter(Boolean)
      let currentIndex = 0
      const BATCH_SIZE = 5
      const TICK_MS = 50

      streamIntervalRef.current = setInterval(() => {
        if (currentIndex >= words.length) {
          if (streamIntervalRef.current) {
            clearInterval(streamIntervalRef.current)
            streamIntervalRef.current = null
          }
          useChatStore.getState().updateMessage(messageId, {
            content: response.answer,
            citations: response.citations as ChatMessage["citations"],
          })
          setStreamingMessageId(null)
          return
        }

        const nextIndex = Math.min(currentIndex + BATCH_SIZE, words.length)
        const partialContent = words.slice(0, nextIndex).join("")
        useChatStore.getState().updateMessage(messageId, {
          content: partialContent,
        })
        currentIndex = nextIndex
      }, TICK_MS)
    } finally {
      setIsSearching(false)
    }
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[280px_minmax(0,1fr)] h-[calc(100vh-200px)] min-h-[400px]">
      {/* Document selector sidebar */}
      <div className="hidden lg:flex flex-col gap-4">
        <div className="bg-surface-card border border-border-default rounded-xl overflow-hidden flex flex-col">
          <div className="p-4 border-b border-border-default">
            <h3 className="text-xs font-semibold text-text-tertiary uppercase tracking-wide">
              Context
            </h3>
            <p className="text-[11px] text-text-tertiary mt-1">
              Select documents to chat with
            </p>
          </div>
          <div className="flex-1 overflow-y-auto max-h-[calc(100vh-320px)]">
            <DocumentSelector
              documents={documents}
              selectedIds={selectedIds}
              variant="checkbox"
              onToggle={(id) => {
                setSelectedDocumentIds(
                  selectedIds.includes(id)
                    ? selectedIds.filter((item) => item !== id)
                    : [...selectedIds, id]
                )
              }}
            />
          </div>
        </div>
      </div>

      {/* Chat area */}
      <div className="bg-surface-card border border-border-default rounded-xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-3 border-b border-border-default flex items-center gap-2">
          <div className="size-2 rounded-full bg-success-500" />
          <span className="text-sm font-medium text-text-primary">
            Chat with your notes
          </span>
          {selectedDocumentIds.length > 0 && (
            <span className="hidden lg:inline-flex ml-auto text-[11px] text-text-tertiary bg-surface-subtle border border-border-default rounded-md px-2 py-0.5">
              {selectedDocumentIds.length === 1
                ? documents.find((d) => d.id === selectedDocumentIds[0])?.title || "Document"
                : `${selectedDocumentIds.length} documents`}
            </span>
          )}

          {/* Persona override chip */}
          <Dialog>
            <DialogTrigger asChild>
              <button className="inline-flex items-center gap-1.5 text-[11px] text-text-secondary hover:text-text-primary transition-colors ml-auto lg:ml-0">
                <Badge variant="secondary" className="font-normal text-[10px] cursor-pointer truncate max-w-[100px]">
                  {personaOverride ? personaOverride : modeOverride ? modeOverride.replace("_", " ") : "Default"}
                </Badge>
                <Settings2 className="size-3" />
              </button>
            </DialogTrigger>
            <DialogContent className="fixed bottom-0 left-0 right-0 top-auto translate-x-0 translate-y-0 w-full max-w-none rounded-t-2xl rounded-b-none p-0 gap-0 sm:top-1/2 sm:left-1/2 sm:right-auto sm:bottom-auto sm:-translate-x-1/2 sm:-translate-y-1/2 sm:max-w-md sm:rounded-4xl sm:p-6 sm:gap-6">
              <DialogTitle className="sr-only">Override chat mode and persona</DialogTitle>
              <div className="p-4 border-b border-border-default">
                <h3 className="text-sm font-semibold text-text-primary">Chat Settings</h3>
                <p className="text-[11px] text-text-tertiary mt-1">
                  Overrides apply only to this session
                </p>
              </div>
              <div className="p-4 space-y-4">
                <div>
                  <div className="text-xs font-medium text-text-secondary uppercase tracking-wide mb-2">
                    Mode
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {["strict_rag", "tutor", "socratic"].map((m) => (
                      <Badge
                        key={m}
                        variant={modeOverride === m ? "default" : "secondary"}
                        className="cursor-pointer text-xs capitalize"
                        onClick={() => setModeOverride(modeOverride === m ? null : m as ChatState["modeOverride"])}
                      >
                        {m.replace("_", " ")}
                      </Badge>
                    ))}
                  </div>
                </div>
                <div>
                  <div className="text-xs font-medium text-text-secondary uppercase tracking-wide mb-2">
                    Persona
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {["default", "encouraging", "direct", "witty", "patient"].map((p) => (
                      <Badge
                        key={p}
                        variant={personaOverride === p ? "default" : "secondary"}
                        className="cursor-pointer text-xs capitalize"
                        onClick={() => setPersonaOverride(personaOverride === p ? null : p as ChatState["personaOverride"])}
                      >
                        {p}
                      </Badge>
                    ))}
                  </div>
                </div>
              </div>
            </DialogContent>
          </Dialog>

          {/* Mobile context selector trigger */}
          <Dialog open={isDrawerOpen} onOpenChange={setIsDrawerOpen}>
            <DialogTrigger asChild>
              <button className="lg:hidden ml-auto inline-flex items-center gap-1.5 text-[11px] text-text-tertiary bg-surface-subtle border border-border-default rounded-md px-2 py-0.5">
                <FileText className="size-3" />
                <span className="max-w-[120px] truncate">
                  {selectedDocumentIds.length > 0
                    ? selectedDocumentIds.length === 1
                      ? documents.find((d) => d.id === selectedDocumentIds[0])?.title || "1 document"
                      : `${selectedDocumentIds.length} documents`
                    : "Select context"}
                </span>
                <ChevronDown className="size-3" />
              </button>
            </DialogTrigger>
            <DialogContent className="fixed bottom-0 left-0 right-0 top-auto translate-x-0 translate-y-0 w-full max-w-none rounded-t-2xl rounded-b-none p-0 gap-0 sm:top-1/2 sm:left-1/2 sm:right-auto sm:bottom-auto sm:-translate-x-1/2 sm:-translate-y-1/2 sm:max-w-md sm:rounded-4xl sm:p-6 sm:gap-6">
              <DialogTitle className="sr-only">Select document context</DialogTitle>
              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.25, ease: "easeOut" }}
              >
                <div className="p-4 border-b border-border-default">
                  <h3 className="text-sm font-semibold text-text-primary">Select context</h3>
                  <p className="text-[11px] text-text-tertiary mt-1">
                    Choose documents to chat with
                  </p>
                </div>
                <div className="max-h-[60vh] overflow-y-auto p-2">
                  <DocumentSelector
                    documents={documents}
                    selectedIds={selectedIds}
                    variant="checkbox"
                    animated
                    onToggle={(id) => {
                      setSelectedDocumentIds(
                        selectedIds.includes(id)
                          ? selectedIds.filter((item) => item !== id)
                          : [...selectedIds, id]
                      )
                    }}
                  />
                </div>
              </motion.div>
            </DialogContent>
          </Dialog>
        </div>

        {/* Messages */}
        <ChatMessages
          error={error}
          isSearching={isSearching}
          messages={messages}
          streamingMessageId={streamingMessageId}
        />

        {/* Input */}
        <ChatInput
          disabled={!selectedIds.length}
          isSending={isLoading}
          onSend={sendMessage}
        />
      </div>
    </div>
  )
}
