"use client";

import { QuotaDisplay as QuotaDisplayBase } from "@/components/features/quota-display";
import { useQuota } from "@/contexts/quota-context";

type QuotaFeature = "summaries" | "quizzes" | "practice" | "chat";

interface OptimisticQuotaDisplayProps {
  feature: QuotaFeature;
}

export function OptimisticQuotaDisplay({ feature }: OptimisticQuotaDisplayProps) {
  const { quota } = useQuota();

  if (!quota) return null;

  const usedKey = `${feature}_used` as const;
  const limitKey = `${feature}_limit` as const;

  return (
    <QuotaDisplayBase
      feature={feature}
      used={quota[usedKey] as number}
      limit={quota[limitKey] as number}
      resetAt={quota.reset_at}
    />
  );
}
