"use client";

import {
  PolarAngleAxis,
  PolarGrid,
  Radar,
  RadarChart,
  ResponsiveContainer,
} from "recharts";

interface MasteryChartProps {
  perTopicAccuracy: { topic: string; accuracy: number }[];
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
