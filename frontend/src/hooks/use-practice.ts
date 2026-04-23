"use client";

import { useCallback, useState } from "react";

import { client } from "@/lib/api-client";

type CreatePracticeInput = {
  weak_topics: string[];
  drill_count?: number;
};

export function useWeakAreas() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchWeakAreas = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const { data, error: apiError } = await client.GET("/api/v1/practice/weak-areas");
      if (apiError || !data) {
        throw new Error("Failed to fetch weak areas");
      }
      return data;
    } catch (caughtError) {
      const message =
        caughtError instanceof Error ? caughtError.message : "Failed to fetch weak areas";
      setError(message);
      throw caughtError;
    } finally {
      setIsLoading(false);
    }
  }, []);

  return { fetchWeakAreas, isLoading, error };
}

export function useCreatePractice() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const mutateAsync = useCallback(async (payload: CreatePracticeInput) => {
    setIsLoading(true);
    setError(null);
    try {
      const { data, error: apiError } = await client.POST("/api/v1/practice", {
        body: {
          weak_topics: payload.weak_topics,
          drill_count: payload.drill_count ?? 5,
        },
      });
      if (apiError || !data) {
        throw new Error("Failed to create practice session");
      }
      return data;
    } catch (caughtError) {
      const message =
        caughtError instanceof Error ? caughtError.message : "Failed to create practice session";
      setError(message);
      throw caughtError;
    } finally {
      setIsLoading(false);
    }
  }, []);

  return { mutateAsync, isLoading, error };
}

export function useSubmitPracticeAnswer() {
  return {
    mutateAsync: async (_payload: unknown) => ({ ok: true }),
    isLoading: false,
    error: null as string | null,
  };
}

type LessonInput = {
  topics: string[];
};

type LessonOutput = {
  lesson: string;
  chunks_used: number;
};

export function useGenerateLesson() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const mutateAsync = useCallback(async (payload: LessonInput): Promise<LessonOutput> => {
    setIsLoading(true);
    setError(null);
    try {
      const { data, error: apiError } = await client.POST("/api/v1/practice/lesson", {
        body: {
          topics: payload.topics,
        },
      });
      if (apiError || !data) {
        throw new Error("Failed to generate lesson");
      }
      return data as LessonOutput;
    } catch (caughtError) {
      const message =
        caughtError instanceof Error ? caughtError.message : "Failed to generate lesson";
      setError(message);
      throw caughtError;
    } finally {
      setIsLoading(false);
    }
  }, []);

  return { mutateAsync, isLoading, error };
}
