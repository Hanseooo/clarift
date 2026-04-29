import { describe, it, expect, vi, beforeEach } from "vitest"
import { renderHook, waitFor } from "@testing-library/react"
import { useSendChatMessage } from "../use-chat"

const mockPost = vi.fn()

vi.mock("@/lib/api", () => ({
  createAuthenticatedClient: () => ({
    POST: mockPost,
  }),
}))

vi.mock("@clerk/nextjs", () => ({
  useAuth: () => ({ getToken: vi.fn(() => Promise.resolve("test-token")) }),
}))

vi.mock("@/contexts/quota-context", () => ({
  useQuota: () => ({ optimisticallyIncrement: vi.fn(() => vi.fn()) }),
}))

describe("useSendChatMessage", () => {
  beforeEach(() => {
    mockPost.mockClear()
    mockPost.mockResolvedValue({ data: { answer: "test", citations: [], relevant_chunks: [] }, error: null })
  })

  it("sends document_ids array when provided", async () => {
    const { result } = renderHook(() => useSendChatMessage())
    
    await result.current.mutateAsync({
      question: "Hello?",
      document_ids: ["doc-1", "doc-2"],
      messages: [],
    })

    await waitFor(() => {
      expect(mockPost).toHaveBeenCalledWith("/api/v1/chat", {
        body: {
          question: "Hello?",
          document_ids: ["doc-1", "doc-2"],
          messages: [],
        },
      })
    })
  })
})
