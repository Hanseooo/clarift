"use client"

import { useMemo, useState } from "react"
import { ChatInput } from "./chat-input"
import { ChatMessages } from "./chat-messages"
import { DocumentSelector } from "./document-selector"
import { useSendChatMessage } from "@/hooks/use-chat"

type DocumentOption = {
  id: string
  title: string
}

type ChatMessage = {
  id: string
  role: "user" | "assistant"
  content: string
  citations?: Array<{ chunk_id?: string | null }>
}

export function ChatPageClient({
  documents,
  initialDocumentId,
}: {
  documents: DocumentOption[]
  initialDocumentId?: string
}) {
  const [selectedIds, setSelectedIds] = useState<string[]>(
    initialDocumentId ? [initialDocumentId] : []
  )
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const { mutateAsync, isLoading, error } = useSendChatMessage()

  const selectedDocumentId = useMemo(() => selectedIds[0], [selectedIds])

  const sendMessage = async (message: string) => {
    setMessages((previous) => [
      ...previous,
      { id: crypto.randomUUID(), role: "user", content: message },
    ])
    setIsSearching(true)
    try {
      const response = await mutateAsync({
        question: message,
        document_id: selectedDocumentId,
      })
      setMessages((previous) => [
        ...previous,
        {
          id: crypto.randomUUID(),
          role: "assistant",
          content: response.answer,
          citations: response.citations as Array<{ chunk_id?: string | null }>,
        },
      ])
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
              onToggle={(id) => {
                setSelectedIds((previous) =>
                  previous.includes(id)
                    ? previous.filter((item) => item !== id)
                    : [...previous, id]
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
          {selectedDocumentId && (
            <span className="ml-auto text-[11px] text-text-tertiary bg-surface-subtle border border-border-default rounded-md px-2 py-0.5">
              {documents.find((d) => d.id === selectedDocumentId)?.title || "Document"}
            </span>
          )}
        </div>

        {/* Messages */}
        <ChatMessages
          error={error}
          isSearching={isSearching}
          messages={messages}
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
