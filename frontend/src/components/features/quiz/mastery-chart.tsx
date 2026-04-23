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
      <p className="text-sm text-muted-foreground">
        No topic data available.
      </p>
    );
  }

  const data = perTopicAccuracy.map((item) => ({
    topic: item.topic,
    accuracy: item.accuracy,
  }));

  return (
    <ResponsiveContainer width="100%" height={300}>
      <RadarChart data={data}>
        <PolarGrid />
        <PolarAngleAxis dataKey="topic" tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }} />
        <Radar
          name="Accuracy"
          dataKey="accuracy"
          stroke="hsl(var(--primary))"
          fill="hsl(var(--primary))"
          fillOpacity={0.3}
        />
      </RadarChart>
    </ResponsiveContainer>
  );
}
