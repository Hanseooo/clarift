import { render, screen } from "@testing-library/react"
import { describe, it, expect } from "vitest"
import { QuestionReview } from "../question-review"

describe("QuestionReview multi-select", () => {
  it("displays multiple correct answers joined by commas", () => {
    render(
      <QuestionReview
        index={0}
        question="Select all that apply"
        userAnswer={["A", "C"]}
        correctAnswer={["A", "B", "C"]}
        isCorrect={false}
        explanation="Explanation"
        questionType="multi_select"
        showAnswers={true}
      />
    )
    expect(screen.getByText("A, B, C")).toBeInTheDocument()
  })

  it("displays single correct answer for mcq", () => {
    render(
      <QuestionReview
        index={0}
        question="What is the capital of France?"
        userAnswer="London"
        correctAnswer="Paris"
        isCorrect={false}
        explanation="Paris is the capital of France."
        questionType="mcq"
        showAnswers={true}
      />
    )
    expect(screen.getByText("Paris")).toBeInTheDocument()
  })

  it("displays true/false correctly", () => {
    render(
      <QuestionReview
        index={0}
        question="The sky is blue."
        userAnswer={false}
        correctAnswer={true}
        isCorrect={false}
        explanation="Usually yes."
        questionType="true_false"
        showAnswers={true}
      />
    )
    expect(screen.getByText("True")).toBeInTheDocument()
  })
})
