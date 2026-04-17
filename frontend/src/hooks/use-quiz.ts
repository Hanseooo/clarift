"use client";

import { useCallback, useState } from "react";

import { client } from "@/lib/api-client";

type CreateQuizInput = {
  document_id: string;
  question_count?: number;
  auto_mode?: boolean;
};

type SubmitAttemptInput = {
  quiz_id: string;
  answers: Record<string, string>;
};

export function useCreateQuiz() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const mutateAsync = useCallback(async (payload: CreateQuizInput) => {
    setIsLoading(true);
    setError(null);
    try {
      const { data, error: apiError } = await client.POST("/api/v1/quizzes", {
        body: {
          document_id: payload.document_id,
          question_count: payload.question_count ?? 5,
          auto_mode: payload.auto_mode ?? true,
        },
      });
      if (apiError || !data) {
        throw new Error("Failed to create quiz");
      }
      return data;
    } catch (caughtError) {
      const message = caughtError instanceof Error ? caughtError.message : "Failed to create quiz";
      setError(message);
      throw caughtError;
    } finally {
      setIsLoading(false);
    }
  }, []);

  return { mutateAsync, isLoading, error };
}

export function useSubmitAttempt() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const mutateAsync = useCallback(async (payload: SubmitAttemptInput) => {
    setIsLoading(true);
    setError(null);
    try {
      const { data, error: apiError } = await client.POST("/api/v1/quizzes/attempts", {
        body: payload,
      });
      if (apiError || !data) {
        throw new Error("Failed to submit attempt");
      }
      return data;
    } catch (caughtError) {
      const message =
        caughtError instanceof Error ? caughtError.message : "Failed to submit attempt";
      setError(message);
      throw caughtError;
    } finally {
      setIsLoading(false);
    }
  }, []);

  return { mutateAsync, isLoading, error };
}
