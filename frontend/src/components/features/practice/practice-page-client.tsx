"use client";

import { useEffect, useMemo, useState } from "react";

import { PracticeCreation } from "@/components/features/practice/practice-creation";
import { WeakAreasDisplay } from "@/components/features/practice/weak-areas-display";
import { useWeakAreas } from "@/hooks/use-practice";

type WeakAreaItem = {
  topic: string;
  accuracy: number;
  attempts: number;
  quiz_count: number;
};

type WeakAreasApiResponse = {
  weak_topics: WeakAreaItem[];
};

export function PracticePageClient({ initialWeakAreas }: { initialWeakAreas: WeakAreaItem[] }) {
  const [weakAreas, setWeakAreas] = useState<WeakAreaItem[]>(initialWeakAreas);
  const [selectedTopics, setSelectedTopics] = useState<string[]>([]);
  const { fetchWeakAreas } = useWeakAreas();

  useEffect(() => {
    const run = async () => {
      try {
        const response = (await fetchWeakAreas()) as WeakAreasApiResponse;
        setWeakAreas(response.weak_topics ?? []);
      } catch {
        setWeakAreas(initialWeakAreas);
      }
    };
    void run();
  }, [fetchWeakAreas, initialWeakAreas]);

  const selected = useMemo(() => selectedTopics.filter(Boolean), [selectedTopics]);

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <WeakAreasDisplay
        weakAreas={weakAreas}
        selectedTopics={selected}
        onToggleTopic={(topic) => {
          setSelectedTopics((previous) =>
            previous.includes(topic)
              ? previous.filter((currentTopic) => currentTopic !== topic)
              : [...previous, topic]
          );
        }}
      />
      <PracticeCreation selectedTopics={selected} />
    </div>
  );
}
