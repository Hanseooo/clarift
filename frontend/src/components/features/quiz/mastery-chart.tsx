"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  PolarAngleAxis,
  PolarGrid,
  Radar,
  RadarChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

interface MasteryChartProps {
  perTopicAccuracy: { topic: string; accuracy: number }[];
}

function getBarColor(accuracy: number): string {
  return accuracy >= 70 ? "#6366F1" : "#F59E0B";
}

export function MasteryChart({ perTopicAccuracy }: MasteryChartProps) {
  if (perTopicAccuracy.length === 0) {
    return (
      <p className="text-sm text-text-secondary">
        No topic data available.
      </p>
    );
  }

  const data = perTopicAccuracy.map((item) => ({
    topic: item.topic,
    accuracy: item.accuracy,
    fullMark: 100,
  }));

  // Bar chart for 1-2 topics (radar looks broken with so few points)
  if (perTopicAccuracy.length <= 2) {
    return (
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={data} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#E5E4F0" vertical={false} />
          <XAxis
            dataKey="topic"
            tick={{ fill: "#6B6888", fontSize: 12 }}
            axisLine={{ stroke: "#E5E4F0" }}
            tickLine={false}
          />
          <YAxis
            domain={[0, 100]}
            tick={{ fill: "#6B6888", fontSize: 12 }}
            axisLine={false}
            tickLine={false}
            tickFormatter={(value: number) => `${value}%`}
          />
          <Tooltip
            formatter={(value) => [`${value}%`, "Accuracy"]}
            contentStyle={{
              borderRadius: "8px",
              border: "1px solid #E5E4F0",
              fontSize: "13px",
            }}
          />
          <Bar dataKey="accuracy" radius={[6, 6, 0, 0]} maxBarSize={80}>
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={getBarColor(entry.accuracy)} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    );
  }

  // Radar chart for 3+ topics
  return (
    <ResponsiveContainer width="100%" height={300}>
      <RadarChart data={data}>
        <PolarGrid stroke="#E5E4F0" />
        <PolarAngleAxis
          dataKey="topic"
          tick={{ fill: "#6B6888", fontSize: 12 }}
        />
        <Radar
          name="Accuracy"
          dataKey="accuracy"
          stroke="#6366F1"
          fill="#6366F1"
          fillOpacity={0.3}
        />
      </RadarChart>
    </ResponsiveContainer>
  );
}
