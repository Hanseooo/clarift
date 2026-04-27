import { create } from "zustand"
import { persist } from "zustand/middleware"

export interface ChatMessage {
  id: string
  role: "user" | "assistant"
  content: string
  citations?: Array<{
    chunk_id?: string | null
    document_id?: string | null
    document_name?: string | null
    chunk_index?: number | null
  }>
  timestamp: number
}

interface ChatState {
  messages: ChatMessage[]
  selectedDocumentIds: string[]
  addMessage: (message: ChatMessage) => void
  updateMessage: (id: string, updates: Partial<Omit<ChatMessage, "id">>) => void
  clearMessages: () => void
  setSelectedDocumentIds: (ids: string[]) => void
  getRecentMessages: (count: number) => ChatMessage[]
}

export const useChatStore = create<ChatState>()(
  persist(
    (set, get) => ({
      messages: [],
      selectedDocumentIds: [],
      addMessage: (message) =>
        set((state) => ({
          messages: [...state.messages, message],
        })),
      updateMessage: (id, updates) =>
        set((state) => ({
          messages: state.messages.map((msg) =>
            msg.id === id ? { ...msg, ...updates } : msg
          ),
        })),
      clearMessages: () => set({ messages: [] }),
      setSelectedDocumentIds: (ids) => set({ selectedDocumentIds: ids }),
      getRecentMessages: (count) => {
        const { messages } = get()
        return messages.slice(-count)
      },
    }),
    {
      name: "chat-storage",
      partialize: (state) => ({
        messages: state.messages.slice(-50),
        selectedDocumentIds: state.selectedDocumentIds,
      }),
    }
  )
)
