"use client";

import { useMemo, useState } from "react";

import { ChatInput } from "@/components/features/chat/chat-input";
import { ChatMessages } from "@/components/features/chat/chat-messages";
import { DocumentSelector } from "@/components/features/chat/document-selector";
import { useSendChatMessage } from "@/hooks/use-chat";

type DocumentOption = {
  id: string;
  title: string;
};

type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  citations?: Array<{ chunk_id?: string | null }>;
};

export function ChatPageClient({ 
  documents, 
  initialDocumentId 
}: { 
  documents: DocumentOption[],
  initialDocumentId?: string
}) {
  const [selectedIds, setSelectedIds] = useState<string[]>(initialDocumentId ? [initialDocumentId] : []);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const { mutateAsync, isLoading, error } = useSendChatMessage();

  const selectedDocumentId = useMemo(() => selectedIds[0], [selectedIds]);

  const sendMessage = async (message: string) => {
    setMessages((previous) => [...previous, { id: crypto.randomUUID(), role: "user", content: message }]);
    setIsSearching(true);
    try {
      const response = await mutateAsync({
        question: message,
        document_id: selectedDocumentId,
      });
      setMessages((previous) => [
        ...previous,
        {
          id: crypto.randomUUID(),
          role: "assistant",
          content: response.answer,
          citations: response.citations as Array<{ chunk_id?: string | null }>,
        },
      ]);
    } finally {
      setIsSearching(false);
    }
  };

  return (
    <div className="grid gap-6 lg:grid-cols-[280px_minmax(0,1fr)]">
      <DocumentSelector
        documents={documents}
        selectedIds={selectedIds}
        onToggle={(id) => {
          setSelectedIds((previous) =>
            previous.includes(id) ? previous.filter((item) => item !== id) : [...previous, id]
          );
        }}
      />
      <div className="space-y-4">
        <ChatMessages error={error} isSearching={isSearching} messages={messages} />
        <ChatInput
          disabled={!selectedIds.length}
          isSending={isLoading}
          onSend={async (message) => {
            await sendMessage(message);
          }}
        />
      </div>
    </div>
  );
}
