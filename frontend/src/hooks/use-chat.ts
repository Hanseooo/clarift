"use client";

import { useCallback, useState } from "react";
import { useAuth } from "@clerk/nextjs";
import { createAuthenticatedClient } from "@/lib/api";
import { useQuota } from "@/contexts/quota-context";

type SendChatInput = {
  question: string;
  document_ids?: string[];
  messages?: Array<{ role: string; content: string }>;
  mode_override?: "strict_rag" | "tutor" | "socratic";
  persona_override?: "default" | "encouraging" | "direct" | "witty" | "patient";
};

export function useSendChatMessage() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { getToken } = useAuth();
  const { optimisticallyIncrement } = useQuota();

  const mutateAsync = useCallback(async (payload: SendChatInput) => {
    setIsLoading(true);
    setError(null);
    const rollback = optimisticallyIncrement("chat");
    try {
      const token = await getToken();
      if (!token) {
        throw new Error("You must be logged in to use chat.");
      }

      const authClient = createAuthenticatedClient(token);
      
      const { data, error: apiError } = await authClient.POST("/api/v1/chat", {
        body: {
          question: payload.question,
          document_ids: payload.document_ids ?? [],
          messages: payload.messages ?? [],
          mode_override: payload.mode_override,
          persona_override: payload.persona_override,
        },
      });
      if (apiError || !data) {
        console.error("API error:", apiError);
        throw new Error("Failed to send chat message");
      }
      return data;
    } catch (caughtError) {
      rollback();
      const message =
        caughtError instanceof Error ? caughtError.message : "Failed to send chat message";
      setError(message);
      throw caughtError;
    } finally {
      setIsLoading(false);
    }
  }, [getToken, optimisticallyIncrement]);

  return { mutateAsync, isLoading, error };
}
