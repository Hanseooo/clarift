import { render } from "@testing-library/react"
import { describe, it, expect, vi } from "vitest"

const mockRefresh = vi.fn()

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: mockRefresh, push: vi.fn() }),
}))

vi.mock("@clerk/nextjs", () => ({
  useAuth: () => ({ getToken: vi.fn() }),
}))

vi.mock("@/app/actions/documents", () => ({
  deleteDocument: vi.fn(),
}))

import { DocumentsClient } from "../documents-client"

describe("DocumentsClient", () => {
  it("renders without error", () => {
    const { container } = render(<DocumentsClient documents={[]} />)
    expect(container).toBeTruthy()
  })
})
