"use client";

import { useCallback, useState } from "react";
import { useAuth } from "@clerk/nextjs";

import { createAuthenticatedClient } from "@/lib/api";
import { useQuota } from "@/contexts/quota-context";

type CreatePracticeInput = {
  weak_topics: string[];
  drill_count?: number;
};

export function useWeakAreas() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { getToken } = useAuth();

  const fetchWeakAreas = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const token = await getToken();
      if (!token) {
        throw new Error("You must be logged in to fetch weak areas.");
      }

      const authClient = createAuthenticatedClient(token);
      const { data, error: apiError } = await authClient.GET("/api/v1/practice/weak-areas");
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
  }, [getToken]);

  return { fetchWeakAreas, isLoading, error };
}

export function useCreatePractice() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { getToken } = useAuth();
  const { optimisticallyIncrement } = useQuota();

  const mutateAsync = useCallback(async (payload: CreatePracticeInput) => {
    setIsLoading(true);
    setError(null);
    const rollback = optimisticallyIncrement("practice");
    try {
      const token = await getToken();
      if (!token) {
        throw new Error("You must be logged in to create a practice session.");
      }

      const authClient = createAuthenticatedClient(token);
      const { data, error: apiError } = await authClient.POST("/api/v1/practice", {
        body: {
          weak_topics: payload.weak_topics,
          drill_count: payload.drill_count ?? 5,
        },
      });
      if (apiError || !data) {
        console.error("[useCreatePractice] API error:", apiError);
        throw new Error("Failed to create practice session");
      }
      return data;
    } catch (caughtError) {
      rollback();
      const message =
        caughtError instanceof Error ? caughtError.message : "Failed to create practice session";
      setError(message);
      throw caughtError;
    } finally {
      setIsLoading(false);
    }
  }, [getToken, optimisticallyIncrement]);

  return { mutateAsync, isLoading, error };
}

export function useSubmitPractice() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { getToken } = useAuth();

  const mutateAsync = useCallback(
    async ({
      practiceId,
      answers,
    }: {
      practiceId: string;
      answers: Record<string, string>;
    }) => {
      setIsLoading(true);
      setError(null);
      try {
        const token = await getToken();
        if (!token) {
          throw new Error("You must be logged in to submit practice.");
        }

        const authClient = createAuthenticatedClient(token);
        const { data, error: apiError } = await authClient.POST(
          "/api/v1/practice/{practice_id}/submit",
          {
            params: { path: { practice_id: practiceId } },
            body: { answers },
          }
        );
        if (apiError || !data) {
          throw new Error("Failed to submit practice");
        }
        return data;
      } catch (caughtError) {
        const message =
          caughtError instanceof Error ? caughtError.message : "Failed to submit practice";
        setError(message);
        throw caughtError;
      } finally {
        setIsLoading(false);
      }
    },
    [getToken]
  );

  return { mutateAsync, isLoading, error };
}

type LessonInput = {
  topics: string[];
};

type LessonOutput = {
  lesson: string;
  chunks_used: number;
};

export function useResetWeakArea() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { getToken } = useAuth();

  const mutateAsync = useCallback(
    async (topic: string) => {
      setIsLoading(true);
      setError(null);
      try {
        const token = await getToken();
        if (!token) {
          throw new Error("You must be logged in to reset a weak area.");
        }

        const authClient = createAuthenticatedClient(token);
        const { error: apiError } = await authClient.DELETE(
          "/api/v1/practice/weak-areas/{topic}",
          {
            params: { path: { topic } },
          }
        );
        if (apiError) {
          throw new Error("Failed to reset weak area");
        }
        return { success: true };
      } catch (caughtError) {
        const message =
          caughtError instanceof Error ? caughtError.message : "Failed to reset weak area";
        setError(message);
        throw caughtError;
      } finally {
        setIsLoading(false);
      }
    },
    [getToken]
  );

  return { mutateAsync, isLoading, error };
}

export function useGenerateLesson() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { getToken } = useAuth();

  const mutateAsync = useCallback(async (payload: LessonInput): Promise<LessonOutput> => {
    setIsLoading(true);
    setError(null);
    try {
      const token = await getToken();
      if (!token) {
        throw new Error("You must be logged in to generate a lesson.");
      }

      const authClient = createAuthenticatedClient(token);
      const { data, error: apiError } = await authClient.POST("/api/v1/practice/lesson", {
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
  }, [getToken]);

  return { mutateAsync, isLoading, error };
}
