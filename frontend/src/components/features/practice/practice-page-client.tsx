"use client";

import { useEffect, useMemo, useState } from "react";

import { MiniLesson } from "@/components/features/practice/mini-lesson";
import { PracticeCreation } from "@/components/features/practice/practice-creation";
import { WeakAreasDisplay } from "@/components/features/practice/weak-areas-display";
import { AttemptWizard } from "@/components/features/quiz/attempt-wizard";
import { Button } from "@/components/ui/button";
import { useCreatePractice, useWeakAreas } from "@/hooks/use-practice";

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

export function PracticePageClient({ initialWeakAreas }: { initialWeakAreas: WeakAreaItem[] }) {
  const [weakAreas, setWeakAreas] = useState<WeakAreaItem[]>(initialWeakAreas);
  const [selectedTopics, setSelectedTopics] = useState<string[]>([]);
  const [state, setState] = useState<PageState>("select");
  const [drills, setDrills] = useState<PracticeDrill[]>([]);
  const [practiceId, setPracticeId] = useState<string>("");

  const { fetchWeakAreas } = useWeakAreas();
  const { mutateAsync: createPractice, isLoading: isCreating } = useCreatePractice();

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
    const response = await createPractice({
      weak_topics: selected,
      drill_count: 5,
    });
    setPracticeId(response.practice_id);
    setDrills(response.drills as PracticeDrill[]);
    setState("drill");
  };

  const handleBackToSelect = () => {
    setState("select");
    setDrills([]);
    setPracticeId("");
  };

  if (state === "drill" && practiceId) {
    const handlePracticeSubmit = async () => {
      // Practice drills don't have a backend submission endpoint yet.
      // Just return to topic selection on completion.
      handleBackToSelect();
      return {};
    };

    return (
      <div className="max-w-3xl mx-auto space-y-4">
        <Button variant="outline" size="sm" onClick={handleBackToSelect}>
          Back to Topics
        </Button>
        <AttemptWizard quizId={practiceId} questions={drills} onSubmit={handlePracticeSubmit} />
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
