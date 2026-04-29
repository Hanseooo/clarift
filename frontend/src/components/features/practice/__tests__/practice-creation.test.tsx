import { render, screen, fireEvent, waitFor } from "@testing-library/react"
import { describe, it, expect, vi } from "vitest"
import { PracticeCreation } from "../practice-creation"

const mockMutateAsync = vi.fn()
const mockPush = vi.fn()

vi.mock("@/hooks/use-practice", () => ({
  useCreatePractice: () => ({
    mutateAsync: mockMutateAsync,
    isLoading: false,
    error: null,
  }),
}))

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: mockPush,
  }),
}))

describe("PracticeCreation", () => {
  beforeEach(() => {
    mockMutateAsync.mockClear()
    mockPush.mockClear()
  })

  it("shows validation error when drillCount is 0 and does not call mutateAsync", async () => {
    render(<PracticeCreation selectedTopics={["Math"]} onStartLesson={() => {}} />)

    const input = screen.getByRole("spinbutton")
    fireEvent.change(input, { target: { value: "0" } })
    fireEvent.click(screen.getByRole("button", { name: /start practice/i }))

    await waitFor(() => {
      expect(screen.getByText(/Please enter a number between 1 and 20/i)).toBeInTheDocument()
    })
    expect(mockMutateAsync).not.toHaveBeenCalled()
  })

  it("shows validation error when drillCount is greater than 20", async () => {
    render(<PracticeCreation selectedTopics={["Math"]} onStartLesson={() => {}} />)

    const input = screen.getByRole("spinbutton")
    fireEvent.change(input, { target: { value: "25" } })
    fireEvent.click(screen.getByRole("button", { name: /start practice/i }))

    await waitFor(() => {
      expect(screen.getByText(/Please enter a number between 1 and 20/i)).toBeInTheDocument()
    })
    expect(mockMutateAsync).not.toHaveBeenCalled()
  })

  it("shows validation error when drillCount is NaN", async () => {
    render(<PracticeCreation selectedTopics={["Math"]} onStartLesson={() => {}} />)

    const input = screen.getByRole("spinbutton")
    fireEvent.change(input, { target: { value: "abc" } })
    fireEvent.click(screen.getByRole("button", { name: /start practice/i }))

    await waitFor(() => {
      expect(screen.getByText(/Please enter a number between 1 and 20/i)).toBeInTheDocument()
    })
    expect(mockMutateAsync).not.toHaveBeenCalled()
  })
})
