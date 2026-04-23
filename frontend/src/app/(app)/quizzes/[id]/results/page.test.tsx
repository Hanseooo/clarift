import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { MasteryChart } from "@/components/features/quiz/mastery-chart";

vi.mock("recharts", () => ({
  ResponsiveContainer: ({ children, ...props }: { children: React.ReactNode; width?: string | number; height?: number }) => (
    <div data-testid="responsive-container" {...props}>
      {children}
    </div>
  ),
  RadarChart: ({ children, ...props }: { children: React.ReactNode; data?: unknown[] }) => (
    <div data-testid="radar-chart" {...props}>
      {children}
    </div>
  ),
  PolarGrid: () => <div data-testid="polar-grid" />,
  PolarAngleAxis: ({ dataKey }: { dataKey: string }) => (
    <div data-testid="polar-angle-axis" data-key={dataKey} />
  ),
  Radar: ({ dataKey, name }: { dataKey: string; name: string }) => (
    <div data-testid="radar" data-key={dataKey} data-name={name} />
  ),
}));

describe("MasteryChart", () => {
  it("renders empty state when no data", () => {
    render(<MasteryChart perTopicAccuracy={[]} />);
    expect(screen.getByText("No topic data available.")).toBeInTheDocument();
  });

  it("renders chart with topic data", () => {
    const data = [
      { topic: "Math", accuracy: 85 },
      { topic: "Science", accuracy: 70 },
      { topic: "History", accuracy: 60 },
    ];
    render(<MasteryChart perTopicAccuracy={data} />);
    expect(screen.getByTestId("radar-chart")).toBeInTheDocument();
    expect(screen.getByTestId("responsive-container")).toBeInTheDocument();
  });

  it("passes correct data to chart", () => {
    const data = [
      { topic: "Geography", accuracy: 90 },
      { topic: "Chemistry", accuracy: 45 },
    ];
    const { container } = render(<MasteryChart perTopicAccuracy={data} />);
    const radarChart = screen.getByTestId("radar-chart");
    expect(radarChart).toBeInTheDocument();
  });

  it("renders with single topic", () => {
    const data = [{ topic: "Math", accuracy: 100 }];
    render(<MasteryChart perTopicAccuracy={data} />);
    expect(screen.getByTestId("radar-chart")).toBeInTheDocument();
  });

  it("renders with multiple topics", () => {
    const data = [
      { topic: "Math", accuracy: 80 },
      { topic: "Science", accuracy: 75 },
      { topic: "History", accuracy: 65 },
      { topic: "Geography", accuracy: 90 },
      { topic: "Chemistry", accuracy: 55 },
    ];
    render(<MasteryChart perTopicAccuracy={data} />);
    expect(screen.getByTestId("radar-chart")).toBeInTheDocument();
  });
});

describe("Results page logic", () => {
  describe("formatAnswer", () => {
    function formatAnswer(answer: string | boolean | string[]): string {
      if (typeof answer === "boolean") return answer ? "True" : "False";
      if (Array.isArray(answer)) return answer.join(", ");
      return answer;
    }

    it("formats boolean true as True", () => {
      expect(formatAnswer(true)).toBe("True");
    });

    it("formats boolean false as False", () => {
      expect(formatAnswer(false)).toBe("False");
    });

    it("formats array as comma-separated string", () => {
      expect(formatAnswer(["A", "B", "C"])).toBe("A, B, C");
    });

    it("returns string as-is", () => {
      expect(formatAnswer("Paris")).toBe("Paris");
    });

    it("formats empty array as empty string", () => {
      expect(formatAnswer([])).toBe("");
    });
  });

  describe("weak topics detection", () => {
    function getWeakTopics(perTopic: Record<string, { correct: number; total: number }>): string[] {
      const perTopicAccuracy = Object.entries(perTopic).map(([topic, stats]) => ({
        topic,
        accuracy: Math.round((stats.correct / stats.total) * 100),
      }));
      return perTopicAccuracy.filter((t) => t.accuracy < 70).map((t) => t.topic);
    }

    it("detects topics below 70% as weak", () => {
      const perTopic = {
        Math: { correct: 3, total: 10 },
        Science: { correct: 8, total: 10 },
      };
      const weak = getWeakTopics(perTopic);
      expect(weak).toContain("Math");
      expect(weak).not.toContain("Science");
    });

    it("returns empty array when all topics above 70%", () => {
      const perTopic = {
        Math: { correct: 8, total: 10 },
        Science: { correct: 9, total: 10 },
      };
      const weak = getWeakTopics(perTopic);
      expect(weak).toHaveLength(0);
    });

    it("returns all topics when all below 70%", () => {
      const perTopic = {
        Math: { correct: 2, total: 10 },
        Science: { correct: 3, total: 10 },
      };
      const weak = getWeakTopics(perTopic);
      expect(weak).toHaveLength(2);
    });

    it("handles exact 70% as not weak", () => {
      const perTopic = {
        Math: { correct: 7, total: 10 },
      };
      const weak = getWeakTopics(perTopic);
      expect(weak).toHaveLength(0);
    });

    it("handles 69% as weak", () => {
      const perTopic = {
        Math: { correct: 69, total: 100 },
      };
      const weak = getWeakTopics(perTopic);
      expect(weak).toContain("Math");
    });
  });

  describe("score calculation", () => {
    function calculateScore(correct: number, total: number): number {
      if (total === 0) return 0;
      return Math.round((correct / total) * 100);
    }

    it("calculates 100% for all correct", () => {
      expect(calculateScore(10, 10)).toBe(100);
    });

    it("calculates 0% for none correct", () => {
      expect(calculateScore(0, 10)).toBe(0);
    });

    it("calculates 50% for half correct", () => {
      expect(calculateScore(5, 10)).toBe(50);
    });

    it("handles zero total questions", () => {
      expect(calculateScore(0, 0)).toBe(0);
    });
  });
});
