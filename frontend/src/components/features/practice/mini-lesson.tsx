"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import { RichMarkdown } from "@/components/ui/rich-markdown";
import { useGenerateLesson } from "@/hooks/use-practice";

type MiniLessonProps = {
  topics: string[];
  onStartDrill: () => void;
};

export function MiniLesson({ topics, onStartDrill }: MiniLessonProps) {
  const { mutateAsync, isLoading, error } = useGenerateLesson();
  const [lesson, setLesson] = useState<string | null>(null);
  const [chunksUsed, setChunksUsed] = useState<number>(0);

  const handleGenerate = async () => {
    const result = await mutateAsync({ topics });
    setLesson(result.lesson);
    setChunksUsed(result.chunks_used);
  };

  if (!lesson) {
    return (
      <section className="rounded-2xl border border-border bg-card p-5 space-y-4">
        <h2 className="text-xl font-semibold text-foreground">Mini-Lesson</h2>
        <p className="text-sm text-muted-foreground">
          Topics: {topics.join(", ") || "None selected"}
        </p>
        <Button
          className="w-full"
          disabled={!topics.length || isLoading}
          onClick={handleGenerate}
        >
          {isLoading ? "Generating lesson..." : "Generate Lesson"}
        </Button>
        {error && <p className="text-sm text-destructive">{error}</p>}
      </section>
    );
  }

  return (
    <section className="rounded-2xl border border-border bg-card p-5 space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-foreground">Mini-Lesson</h2>
        <span className="text-xs text-muted-foreground">
          Based on {chunksUsed} source chunk{chunksUsed !== 1 ? "s" : ""}
        </span>
      </div>
      <div className="prose-brand">
        <RichMarkdown content={lesson} />
      </div>
      <Button className="w-full" onClick={onStartDrill}>
        Start Drill
      </Button>
    </section>
  );
}
