"use client";

import { useCallback, useState } from "react";
import { useAuth } from "@clerk/nextjs";
import { createAuthenticatedClient } from "@/lib/api";

type SendChatInput = {
  question: string;
  document_id?: string;
};

export function useSendChatMessage() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { getToken } = useAuth();

  const mutateAsync = useCallback(async (payload: SendChatInput) => {
    setIsLoading(true);
    setError(null);
    try {
      const token = await getToken();
      if (!token) {
        throw new Error("You must be logged in to use chat.");
      }

      const authClient = createAuthenticatedClient(token);
      
      const { data, error: apiError } = await authClient.POST("/api/v1/chat", {
        body: {
          question: payload.question,
          document_id: payload.document_id,
        },
      });
      if (apiError || !data) {
        console.error("API error:", apiError);
        throw new Error("Failed to send chat message");
      }
      return data;
    } catch (caughtError) {
      const message =
        caughtError instanceof Error ? caughtError.message : "Failed to send chat message";
      setError(message);
      throw caughtError;
    } finally {
      setIsLoading(false);
    }
  }, [getToken]);

  return { mutateAsync, isLoading, error };
}
