"use client";

import { useCallback, useEffect, useRef, useState } from "react";

type JobStatus = "pending" | "running" | "complete" | "failed";

type JobEvent = {
  status: JobStatus;
  step?: string;
  message?: string;
  progress?: number;
  result?: Record<string, unknown>;
  error?: string;
};

type UseJobStatusOptions = {
  jobId: string | null;
  token: string;
  onComplete?: (result: Record<string, unknown>) => void;
  onError?: (error: string) => void;
};

export function useJobStatus({ jobId, token, onComplete, onError }: UseJobStatusOptions) {
  const [status, setStatus] = useState<JobStatus>("pending");
  const [step, setStep] = useState<string>("");
  const [message, setMessage] = useState<string>("");
  const [progress, setProgress] = useState<number>(0);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const connect = useCallback(() => {
    if (!jobId || !token) return;

    setStatus("pending");
    setStep("");
    setMessage("");
    setProgress(0);
    setError(null);

    const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
    const url = `${apiUrl}/api/v1/jobs/${jobId}/stream`;

    const abortController = new AbortController();
    abortRef.current = abortController;

    const fetchSSE = async () => {
      try {
        const response = await fetch(url, {
          headers: {
            Authorization: `Bearer ${token}`,
            Accept: "text/event-stream",
          },
          signal: abortController.signal,
        });

        if (!response.ok) {
          throw new Error(`SSE connection failed: ${response.status}`);
        }

        const reader = response.body?.getReader();
        if (!reader) {
          throw new Error("No response body");
        }

        const decoder = new TextDecoder();
        let buffer = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() ?? "";

          for (const line of lines) {
            if (line.startsWith("data: ")) {
              try {
                const data: JobEvent = JSON.parse(line.slice(6));

                setStatus(data.status);
                if (data.step) setStep(data.step);
                if (data.message) setMessage(data.message);
                if (data.progress !== undefined) setProgress(data.progress);

                if (data.status === "complete") {
                  if (data.result && onComplete) {
                    onComplete(data.result);
                  }
                  return;
                }

                if (data.status === "failed") {
                  const errorMsg = data.error || "Job failed unexpectedly";
                  setError(errorMsg);
                  if (onError) {
                    onError(errorMsg);
                  }
                  return;
                }
              } catch {
                // ignore parse errors
              }
            }
          }
        }
      } catch (err) {
        if (err instanceof DOMException && err.name === "AbortError") {
          return;
        }
        const errorMsg = err instanceof Error ? err.message : "Connection lost";
        setError(errorMsg);
        if (onError) {
          onError(errorMsg);
        }
      }
    };

    fetchSSE();
  }, [jobId, token, onComplete, onError]);

  useEffect(() => {
    if (jobId && token) {
      connect();
    }

    return () => {
      if (abortRef.current) {
        abortRef.current.abort();
        abortRef.current = null;
      }
    };
  }, [jobId, token, connect]);

  return { status, step, message, progress, error, reconnect: connect };
}
