"use client";

import { useEffect, useMemo, useState } from "react";

import { MiniLesson } from "@/components/features/practice/mini-lesson";
import { PracticeCreation } from "@/components/features/practice/practice-creation";
import { WeakAreasDisplay } from "@/components/features/practice/weak-areas-display";
import { PracticeAttempt } from "@/components/features/practice/practice-attempt";
import { Button } from "@/components/ui/button";
import { usePracticeCreation } from "@/hooks/use-practice-creation";
import { useResetWeakArea, useWeakAreas } from "@/hooks/use-practice";

type WeakAreaItem = {
  topic: string;
  accuracy: number;
  attempts: number;
  quiz_count: number;
};

type WeakAreasApiResponse = {
  weak_topics: WeakAreaItem[];
};

type PracticeDrill = {
  id: string;
  type: "mcq" | "true_false" | "identification" | "multi_select" | "ordering";
  question: string;
  options?: string[];
  correct_answer?: string | boolean;
  topic: string;
  explanation: string;
  difficulty: number;
};

type PageState = "select" | "lesson" | "drill";

export function PracticePageClient({
  initialWeakAreas,
  preselectedTopics,
}: {
  initialWeakAreas: WeakAreaItem[]
  preselectedTopics?: string[]
}) {
  const [weakAreas, setWeakAreas] = useState<WeakAreaItem[]>(initialWeakAreas);
  const [selectedTopics, setSelectedTopics] = useState<string[]>(preselectedTopics ?? []);
  const [state, setState] = useState<PageState>("select");

  const { fetchWeakAreas } = useWeakAreas();
  const { create, practiceId, drills, isLoading: isCreating } = usePracticeCreation();
  const { mutateAsync: resetWeakArea, isLoading: isResetting } = useResetWeakArea();

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

  const handleStartLesson = () => {
    if (!selected.length) return;
    setState("lesson");
  };

  const handleStartDrill = async () => {
    await create(selected, selected.length * 3);
    setState("drill");
  };

  const handleBackToSelect = () => {
    setState("select");
  };

  const handleResetTopic = async (topic: string) => {
    await resetWeakArea(topic);
    setWeakAreas((previous) => previous.filter((area) => area.topic !== topic));
    setSelectedTopics((previous) => previous.filter((currentTopic) => currentTopic !== topic));
  };

  if (state === "drill" && practiceId) {
    return (
      <div className="max-w-3xl mx-auto space-y-4">
        <Button variant="outline" size="sm" onClick={handleBackToSelect}>
          Back to Topics
        </Button>
        <PracticeAttempt
          drills={drills as PracticeDrill[]}
          practiceId={practiceId}
          onFinish={handleBackToSelect}
        />
      </div>
    );
  }

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
        onResetTopic={handleResetTopic}
        isResetting={isResetting}
      />
      <div className="space-y-4">
        {state === "select" && (
          <PracticeCreation selectedTopics={selected} onStartLesson={handleStartLesson} />
        )}
        {state === "lesson" && (
          <>
            <Button variant="outline" size="sm" onClick={handleBackToSelect}>
              Back to Topics
            </Button>
            <MiniLesson topics={selected} onStartDrill={handleStartDrill} />
          </>
        )}
        {isCreating && (
          <p className="text-sm text-muted-foreground text-center">Generating practice drills...</p>
        )}
      </div>
    </div>
  );
}
