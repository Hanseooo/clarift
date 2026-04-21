"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { useCreatePractice } from "@/hooks/use-practice";

type PracticeCreationProps = {
  selectedTopics: string[];
};

export function PracticeCreation({ selectedTopics }: PracticeCreationProps) {
  const router = useRouter();
  const [drillCount, setDrillCount] = useState(5);
  const { mutateAsync, isLoading, error } = useCreatePractice();

  const onCreate = async () => {
    if (!selectedTopics.length) {
      return;
    }
    const response = await mutateAsync({
      weak_topics: selectedTopics,
      drill_count: drillCount,
    });
    router.push(`/practice/${response.practice_id}`);
  };

  return (
    <section className="rounded-2xl border border-border bg-card p-5 space-y-4">
      <h2 className="text-xl font-semibold text-foreground">Start Practice</h2>
      <p className="text-sm text-muted-foreground">Selected topics: {selectedTopics.join(", ") || "None"}</p>

      <label className="block space-y-2">
        <span className="text-sm font-medium text-foreground">Drill count</span>
        <input
          className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm"
          max={20}
          min={1}
          type="number"
          value={drillCount}
          onChange={(event) => setDrillCount(Number(event.target.value))}
        />
      </label>

      <Button className="w-full" disabled={!selectedTopics.length || isLoading} onClick={onCreate}>
        {isLoading ? "Creating..." : "Start Practice"}
      </Button>

      {error ? <p className="text-sm text-destructive">{error}</p> : null}
    </section>
  );
}
