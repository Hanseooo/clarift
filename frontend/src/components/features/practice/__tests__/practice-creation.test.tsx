import { render, screen, fireEvent } from "@testing-library/react"
import { describe, it, expect, vi } from "vitest"

vi.mock("@clerk/nextjs", () => ({
  useAuth: () => ({ getToken: vi.fn() }),
}))

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
}))

vi.mock("@/contexts/quota-context", () => ({
  useQuota: () => ({ optimisticallyIncrement: vi.fn(() => vi.fn()) }),
}))

import { PracticeCreation } from "../practice-creation"

describe("PracticeCreation", () => {
  it("shows validation error when drillCount is 0", async () => {
    const onStartLesson = vi.fn()
    render(<PracticeCreation selectedTopics={["Math"]} onStartLesson={onStartLesson} />)

    const input = screen.getByRole("spinbutton")
    fireEvent.change(input, { target: { value: "0" } })
    fireEvent.click(screen.getByRole("button", { name: /start practice/i }))

    expect(screen.getByText(/Please enter a number between 1 and 20/i)).toBeInTheDocument()
    expect(onStartLesson).not.toHaveBeenCalled()
  })
})
