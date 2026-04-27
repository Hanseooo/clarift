"use client";

import { QuotaProvider } from "@/contexts/quota-context";
import type { ReactNode } from "react";

type QuotaState = {
  summaries_used: number;
  summaries_limit: number;
  quizzes_used: number;
  quizzes_limit: number;
  practice_used: number;
  practice_limit: number;
  chat_used: number;
  chat_limit: number;
  reset_at?: string;
};

export function QuotaClientProvider({
  children,
  initialQuota,
}: {
  children: ReactNode;
  initialQuota?: QuotaState | null;
}) {
  return (
    <QuotaProvider initialQuota={initialQuota}>
      {children}
    </QuotaProvider>
  );
}
