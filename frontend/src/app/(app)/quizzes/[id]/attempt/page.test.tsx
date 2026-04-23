import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { AttemptWizard } from "@/components/features/quiz/attempt-wizard";

const mockQuestions = [
  {
    id: "q1",
    type: "mcq" as const,
    question: "What is the capital of France?",
    options: ["London", "Paris", "Berlin", "Madrid"],
    correct_answer: "Paris",
    topic: "Geography",
    explanation: "Paris is the capital of France.",
  },
  {
    id: "q2",
    type: "true_false" as const,
    question: "The Earth is flat.",
    correct_answer: false,
    topic: "Science",
    explanation: "The Earth is an oblate spheroid.",
  },
  {
    id: "q3",
    type: "identification" as const,
    question: "The chemical symbol for water is ____.",
    correct_answer: "H2O",
    topic: "Chemistry",
    explanation: "Water is H2O.",
  },
  {
    id: "q4",
    type: "multi_select" as const,
    question: "Which are prime numbers?",
    options: ["2", "3", "4", "5"],
    correct_answers: ["2", "3", "5"],
    topic: "Math",
    explanation: "Prime numbers have exactly two factors.",
  },
  {
    id: "q5",
    type: "ordering" as const,
    question: "Order the steps of the water cycle.",
    options: ["Evaporation", "Condensation", "Precipitation", "Collection"],
    steps: ["Evaporation", "Condensation", "Precipitation", "Collection"],
    correct_order: [0, 1, 2, 3],
    topic: "Science",
    explanation: "Water cycle sequence.",
  },
];

vi.mock("@/hooks/use-quiz", () => ({
  useSubmitAttempt: () => ({
    mutateAsync: vi.fn().mockResolvedValue({ attempt_id: "test-attempt-id" }),
    isLoading: false,
    error: null,
  }),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: vi.fn(),
  }),
}));

describe("AttemptWizard", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("carousel navigation", () => {
    it("shows question 1 of total on first load", () => {
      render(<AttemptWizard quizId="quiz-1" questions={mockQuestions} />);
      expect(screen.getByText(/Question 1 of 5/)).toBeInTheDocument();
    });

    it("navigates to next question when Next is clicked", () => {
      render(<AttemptWizard quizId="quiz-1" questions={mockQuestions} />);
      const firstOption = screen.getByText("Paris");
      fireEvent.click(firstOption);
      const nextButton = screen.getByText(/Next/);
      fireEvent.click(nextButton);
      expect(screen.getByText(/Question 2 of 5/)).toBeInTheDocument();
    });

    it("navigates to previous question when Previous is clicked", () => {
      render(<AttemptWizard quizId="quiz-1" questions={mockQuestions} />);
      const firstOption = screen.getByText("Paris");
      fireEvent.click(firstOption);
      fireEvent.click(screen.getByText(/Next/));
      fireEvent.click(screen.getByText(/Previous/));
      expect(screen.getByText(/Question 1 of 5/)).toBeInTheDocument();
    });

    it("disables Previous button on first question", () => {
      render(<AttemptWizard quizId="quiz-1" questions={mockQuestions} />);
      const prevButton = screen.getByText(/Previous/);
      expect(prevButton).toBeDisabled();
    });

    it("shows answered count updates when answering", () => {
      render(<AttemptWizard quizId="quiz-1" questions={mockQuestions} />);
      expect(screen.getByText("0 answered")).toBeInTheDocument();
      const firstOption = screen.getByText("Paris");
      fireEvent.click(firstOption);
      expect(screen.getByText("1 answered")).toBeInTheDocument();
    });
  });

  describe("question type rendering", () => {
    it("renders MCQ question with options", () => {
      render(<AttemptWizard quizId="quiz-1" questions={[mockQuestions[0]]} />);
      expect(screen.getByText("What is the capital of France?")).toBeInTheDocument();
      expect(screen.getByText("London")).toBeInTheDocument();
      expect(screen.getByText("Paris")).toBeInTheDocument();
      expect(screen.getByText("Berlin")).toBeInTheDocument();
      expect(screen.getByText("Madrid")).toBeInTheDocument();
    });

    it("renders True/False question with True and False buttons", () => {
      render(<AttemptWizard quizId="quiz-1" questions={[mockQuestions[1]]} />);
      expect(screen.getByText("The Earth is flat.")).toBeInTheDocument();
      expect(screen.getByText("True")).toBeInTheDocument();
      expect(screen.getByText("False")).toBeInTheDocument();
    });

    it("renders Identification question with text input", () => {
      render(<AttemptWizard quizId="quiz-1" questions={[mockQuestions[2]]} />);
      expect(screen.getByText("The chemical symbol for water is ____."));
      const input = screen.getByPlaceholderText("Type your answer...");
      expect(input).toBeInTheDocument();
    });

    it("renders Multi-select question with options", () => {
      render(<AttemptWizard quizId="quiz-1" questions={[mockQuestions[3]]} />);
      expect(screen.getByText("Which are prime numbers?")).toBeInTheDocument();
      expect(screen.getByText("2")).toBeInTheDocument();
      expect(screen.getByText("3")).toBeInTheDocument();
      expect(screen.getByText("4")).toBeInTheDocument();
      expect(screen.getByText("5")).toBeInTheDocument();
    });

    it("renders Ordering question with reorderable items", () => {
      render(<AttemptWizard quizId="quiz-1" questions={[mockQuestions[4]]} />);
      expect(screen.getByText("Order the steps of the water cycle.")).toBeInTheDocument();
      expect(screen.getByText("Evaporation")).toBeInTheDocument();
      expect(screen.getByText("Condensation")).toBeInTheDocument();
      expect(screen.getByText("Precipitation")).toBeInTheDocument();
      expect(screen.getByText("Collection")).toBeInTheDocument();
    });

    it("shows question type badge", () => {
      render(<AttemptWizard quizId="quiz-1" questions={[mockQuestions[0]]} />);
      expect(screen.getByText("mcq")).toBeInTheDocument();
    });

    it("shows topic label", () => {
      render(<AttemptWizard quizId="quiz-1" questions={[mockQuestions[0]]} />);
      expect(screen.getByText(/Topic: Geography/)).toBeInTheDocument();
    });
  });

  describe("submit behavior", () => {
    it("shows Submit button on last question when answered", () => {
      const lastQuestion = {
        id: "q5",
        type: "true_false" as const,
        question: "The Earth orbits the Sun.",
        correct_answer: true,
        topic: "Science",
        explanation: "Earth orbits the Sun.",
      };
      render(<AttemptWizard quizId="quiz-1" questions={[lastQuestion]} />);
      expect(screen.getByText(/Question 1 of 1/)).toBeInTheDocument();
      const trueButton = screen.getByText("True");
      fireEvent.click(trueButton);
      expect(screen.getByRole("button", { name: /Submit/ })).toBeInTheDocument();
    });

    it("disables Submit button when no answer selected on single question", () => {
      render(<AttemptWizard quizId="quiz-1" questions={[mockQuestions[0]]} />);
      const submitButton = screen.getByRole("button", { name: /Submit/ });
      expect(submitButton).toBeDisabled();
    });

    it("enables Submit button when answer is selected on single question", () => {
      render(<AttemptWizard quizId="quiz-1" questions={[mockQuestions[0]]} />);
      const firstOption = screen.getByText("Paris");
      fireEvent.click(firstOption);
      const submitButton = screen.getByRole("button", { name: /Submit/ });
      expect(submitButton).not.toBeDisabled();
    });

    it("disables Next button when no answer selected", () => {
      render(<AttemptWizard quizId="quiz-1" questions={mockQuestions} />);
      const nextButton = screen.getByRole("button", { name: /Next/ });
      expect(nextButton).toBeDisabled();
    });

    it("enables Next button when answer is selected", () => {
      render(<AttemptWizard quizId="quiz-1" questions={mockQuestions} />);
      const firstOption = screen.getByText("Paris");
      fireEvent.click(firstOption);
      const nextButton = screen.getByRole("button", { name: /Next/ });
      expect(nextButton).not.toBeDisabled();
    });

    it("shows progress bar", () => {
      render(<AttemptWizard quizId="quiz-1" questions={mockQuestions} />);
      const progressBar = document.querySelector('[style*="width"]');
      expect(progressBar).toBeInTheDocument();
    });
  });
});
