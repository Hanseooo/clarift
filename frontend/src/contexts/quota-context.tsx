"use client";

import {
  createContext,
  useContext,
  useState,
  useCallback,
  type ReactNode,
} from "react";

type QuotaFeature = "summaries" | "quizzes" | "practice" | "chat";

interface QuotaState {
  summaries_used: number;
  summaries_limit: number;
  quizzes_used: number;
  quizzes_limit: number;
  practice_used: number;
  practice_limit: number;
  chat_used: number;
  chat_limit: number;
  reset_at?: string;
}

interface QuotaContextValue {
  quota: QuotaState | null;
  setQuota: (quota: QuotaState | null) => void;
  optimisticallyIncrement: (feature: QuotaFeature) => () => void;
  isOverQuota: (feature: QuotaFeature) => boolean;
}

const QuotaContext = createContext<QuotaContextValue | null>(null);

export function QuotaProvider({
  children,
  initialQuota,
}: {
  children: ReactNode;
  initialQuota?: QuotaState | null;
}) {
  const [quota, setQuota] = useState<QuotaState | null>(initialQuota ?? null);

  const optimisticallyIncrement = useCallback(
    (feature: QuotaFeature) => {
      const previous = quota;
      setQuota((current) => {
        if (!current) return current;
        const key = `${feature}_used` as const;
        return {
          ...current,
          [key]: (current[key] as number) + 1,
        };
      });
      return () => setQuota(previous);
    },
    [quota]
  );

  const isOverQuota = useCallback(
    (feature: QuotaFeature) => {
      if (!quota) return false;
      const usedKey = `${feature}_used` as const;
      const limitKey = `${feature}_limit` as const;
      return (quota[usedKey] as number) >= (quota[limitKey] as number);
    },
    [quota]
  );

  return (
    <QuotaContext.Provider
      value={{ quota, setQuota, optimisticallyIncrement, isOverQuota }}
    >
      {children}
    </QuotaContext.Provider>
  );
}

export function useQuota() {
  const context = useContext(QuotaContext);
  if (!context) {
    throw new Error("useQuota must be used within a QuotaProvider");
  }
  return context;
}
