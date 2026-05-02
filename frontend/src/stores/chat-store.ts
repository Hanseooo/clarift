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

export interface ChatState {
  messages: ChatMessage[]
  selectedDocumentIds: string[]
  modeOverride: "strict_rag" | "tutor" | "socratic" | null
  personaOverride: "default" | "encouraging" | "direct" | "witty" | "patient" | null
  addMessage: (message: ChatMessage) => void
  updateMessage: (id: string, updates: Partial<Omit<ChatMessage, "id">>) => void
  clearMessages: () => void
  setSelectedDocumentIds: (ids: string[]) => void
  getRecentMessages: (count: number) => ChatMessage[]
  setModeOverride: (mode: ChatState["modeOverride"]) => void
  setPersonaOverride: (persona: ChatState["personaOverride"]) => void
}

export const useChatStore = create<ChatState>()(
  persist(
    (set, get) => ({
      messages: [],
      selectedDocumentIds: [],
      modeOverride: null,
      personaOverride: null,
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
      setModeOverride: (mode) => set({ modeOverride: mode }),
      setPersonaOverride: (persona) => set({ personaOverride: persona }),
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
