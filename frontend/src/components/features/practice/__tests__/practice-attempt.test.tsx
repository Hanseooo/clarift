import { render, screen, fireEvent, waitFor } from "@testing-library/react"
import { describe, it, expect, vi } from "vitest"
import { PracticeAttempt } from "../practice-attempt"

vi.mock("@clerk/nextjs", () => ({
  useAuth: () => ({ getToken: vi.fn().mockResolvedValue("mock-token") }),
}))

const mockDrills = [
  {
    id: "drill-1",
    question: "What is 2+2?",
    type: "mcq",
    options: ["3", "4", "5"],
    correct_answer: "4",
    explanation: "Basic math",
    difficulty: 1,
    topic: "Math",
  },
]

describe("PracticeAttempt", () => {
  it("renders checkboxes for multi_select type", () => {
    const multiDrill = {
      ...mockDrills[0],
      type: "multi_select",
      correct_answer: ["4", "5"],
      options: ["3", "4", "5"],
    }

    render(<PracticeAttempt drills={[multiDrill]} practiceId="p1" />)
    expect(screen.getAllByRole("checkbox")).toHaveLength(3)
  })

  it("renders sortable list for ordering type", () => {
    const orderDrill = {
      ...mockDrills[0],
      type: "ordering",
      correct_answer: ["A", "B", "C"],
      options: ["A", "B", "C"],
    }

    render(<PracticeAttempt drills={[orderDrill]} practiceId="p1" />)
    expect(screen.getAllByRole("button", { name: /drag/i })).toHaveLength(3)
  })

  it("does not call onFinish if submitPractice throws", async () => {
    const onFinish = vi.fn()
    const submitPractice = vi.fn().mockRejectedValue(new Error("Network error"))

    render(
      <PracticeAttempt
        drills={mockDrills}
        practiceId="practice-123"
        submitPractice={submitPractice}
        onFinish={onFinish}
      />
    )

    // Select answer and check
    fireEvent.click(screen.getByText("4"))
    fireEvent.click(screen.getByRole("button", { name: /check/i }))
    await waitFor(() => expect(screen.getByText(/explanation/i)).toBeInTheDocument())

    // Click finish (last question)
    fireEvent.click(screen.getByRole("button", { name: /finish/i }))
    await waitFor(() => expect(screen.getByText(/error/i)).toBeInTheDocument())

    expect(onFinish).not.toHaveBeenCalled()
  })
})
