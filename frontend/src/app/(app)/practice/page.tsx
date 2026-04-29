import { auth, currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";

import { PracticePageClient } from "@/components/features/practice/practice-page-client";
import { createAuthenticatedClient } from "@/lib/api";
import { OptimisticQuotaDisplay } from "@/components/features/optimistic-quota-display";

type WeakAreaItem = {
  topic: string;
  accuracy: number;
  attempts: number;
  quiz_count: number;
};

export default async function PracticePage({
  searchParams,
}: {
  searchParams: { topics?: string }
}) {
  const user = await currentUser();
  if (!user) {
    redirect("/login");
  }

  const session = await auth();
  const token = await session.getToken();
  if (!token) {
    redirect("/login");
  }

  const topicsParam = searchParams.topics
  const initialTopics = topicsParam ? topicsParam.split(",") : undefined

  const apiClient = createAuthenticatedClient(token);
  const response = await apiClient.GET("/api/v1/practice/weak-areas");
  const weakAreas = (response.data as { weak_topics?: WeakAreaItem[] } | undefined)?.weak_topics ?? [];

  return (
    <div className="space-y-6">
      <div className="mb-6">
        <OptimisticQuotaDisplay feature="practice" />
      </div>
      <header className="space-y-1">
        <h1 className="text-xl font-semibold text-text-primary">Targeted Practice</h1>
        <p className="text-sm text-text-secondary">
          Focus on what you need to improve most
        </p>
      </header>
      <PracticePageClient initialWeakAreas={weakAreas} preselectedTopics={initialTopics} />
    </div>
  );
}
