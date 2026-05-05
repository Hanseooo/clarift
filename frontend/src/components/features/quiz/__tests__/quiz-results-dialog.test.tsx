import { render, screen } from "@testing-library/react"
import "@testing-library/jest-dom/vitest"
import { describe, it, expect, vi } from "vitest"
import { QuizResultsDialog } from "../quiz-results-dialog"

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
}))

describe("QuizResultsDialog", () => {
  it("renders correctCount/total in the title", () => {
    render(
      <QuizResultsDialog
        open={true}
        onOpenChange={() => {}}
        correctCount={1}
        total={5}
        weakTopics={[]}
      />
    )

    expect(screen.getByText("You scored 1/5")).toBeInTheDocument()
  })
})
