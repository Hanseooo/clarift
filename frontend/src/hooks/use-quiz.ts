"use client";

import { useCallback, useState } from "react";
import { useAuth } from "@clerk/nextjs";

import { createAuthenticatedClient } from "@/lib/api";
import { useQuota } from "@/contexts/quota-context";

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
  const { getToken } = useAuth();
  const { optimisticallyIncrement } = useQuota();

  const mutateAsync = useCallback(async (payload: CreateQuizInput) => {
    setIsLoading(true);
    setError(null);
    const rollback = optimisticallyIncrement("quizzes");
    try {
      const token = await getToken();
      if (!token) {
        throw new Error("You must be logged in to create a quiz.");
      }

      const authClient = createAuthenticatedClient(token);
      const { data, error: apiError } = await authClient.POST("/api/v1/quizzes", {
        body: {
          document_id: payload.document_id,
          question_count: payload.question_count ?? 5,
          auto_mode: payload.auto_mode ?? true,
        },
      });
      if (apiError || !data) {
        console.error("[useCreateQuiz] API error:", apiError);
        const errorDetail = apiError && typeof apiError === "object" && "detail" in apiError
          ? JSON.stringify(apiError.detail)
          : "Failed to create quiz";
        throw new Error(errorDetail);
      }
      return data;
    } catch (caughtError) {
      rollback();
      const message = caughtError instanceof Error ? caughtError.message : "Failed to create quiz";
      setError(message);
      throw caughtError;
    } finally {
      setIsLoading(false);
    }
  }, [getToken, optimisticallyIncrement]);

  return { mutateAsync, isLoading, error };
}

export function useSubmitAttempt() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { getToken } = useAuth();

  const mutateAsync = useCallback(async (payload: SubmitAttemptInput) => {
    setIsLoading(true);
    setError(null);
    try {
      const token = await getToken();
      if (!token) {
        throw new Error("You must be logged in to submit an attempt.");
      }

      const authClient = createAuthenticatedClient(token);
      const { data, error: apiError } = await authClient.POST("/api/v1/quizzes/attempts", {
        body: payload,
      });
      if (apiError || !data) {
        console.error("[useSubmitAttempt] API error:", apiError);
        const errorDetail = apiError && typeof apiError === "object" && "detail" in apiError
          ? JSON.stringify(apiError.detail)
          : "Failed to submit attempt";
        throw new Error(errorDetail);
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
  }, [getToken]);

  return { mutateAsync, isLoading, error };
}

type Attempt = {
  attempt_id: string;
  score: number;
  topics: string[];
  created_at: string;
};

export function useQuizAttempts(quizId: string) {
  const [attempts, setAttempts] = useState<Attempt[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { getToken } = useAuth();

  const fetchAttempts = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const token = await getToken();
      if (!token) {
        throw new Error("You must be logged in to view attempts.");
      }

      const authClient = createAuthenticatedClient(token);
      const { data, error: apiError } = await authClient.GET(
        "/api/v1/quizzes/{quiz_id}/attempts",
        {
          params: { path: { quiz_id: quizId } },
        }
      );
      if (apiError || !data) {
        throw new Error("Failed to load attempts");
      }
      setAttempts(data.attempts);
    } catch (caughtError) {
      const message =
        caughtError instanceof Error ? caughtError.message : "Failed to load attempts";
      setError(message);
    } finally {
      setIsLoading(false);
    }
  }, [getToken, quizId]);

  return { attempts, isLoading, error, fetchAttempts };
}
