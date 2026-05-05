"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { usePracticeCreation } from "@/hooks/use-practice-creation";
import { cn } from "@/lib/utils";

type PracticeCreationProps = {
  selectedTopics: string[];
  onStartLesson: () => void;
};

export function PracticeCreation({ selectedTopics, onStartLesson }: PracticeCreationProps) {
  const router = useRouter();
  const [drillCount, setDrillCount] = useState(5);
  const [countError, setCountError] = useState<string | null>(null);
  const { create, isLoading, error } = usePracticeCreation();

  const handleCountChange = (value: string) => {
    const num = parseInt(value, 10);
    if (Number.isNaN(num) || num < 1 || num > 20) {
      setCountError("Please enter a number between 1 and 20");
    } else {
      setCountError(null);
    }
    setDrillCount(Number.isNaN(num) ? 0 : num);
  };

  const onCreate = async () => {
    if (!selectedTopics.length) {
      return;
    }
    if (drillCount < 1 || drillCount > 20) {
      setCountError("Please enter a number between 1 and 20");
      return;
    }
    const response = await create(selectedTopics, drillCount);
    router.push(`/practice/${response.practice_id}`);
  };

  return (
    <section className="rounded-2xl border border-border bg-card p-5 space-y-4">
      <h2 className="text-xl font-semibold text-foreground">Start Practice</h2>
      <p className="text-sm text-muted-foreground">Selected topics: {selectedTopics.join(", ") || "None"}</p>

      <Button
        className="w-full h-11"
        disabled={!selectedTopics.length}
        onClick={onStartLesson}
      >
        Generate Lesson & Drill
      </Button>

      <label className="block space-y-2">
        <span className="text-sm font-medium text-foreground">Drill count</span>
        <input
          className={cn(
            "w-full rounded-xl border border-border bg-background px-3 h-11 text-sm",
            countError && "border-red-500"
          )}
          max={20}
          min={1}
          type="number"
          value={drillCount}
          onChange={(event) => handleCountChange(event.target.value)}
        />
        {countError && <p className="text-xs text-red-500 mt-1">{countError}</p>}
      </label>

      <Button className="w-full h-11" disabled={!selectedTopics.length || isLoading} onClick={onCreate}>
        {isLoading ? "Creating..." : "Start Practice"}
      </Button>

      {error ? <p className="text-sm text-destructive">{error}</p> : null}
    </section>
  );
}
