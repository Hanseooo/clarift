import { auth, currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";

import { PracticePageClient } from "@/components/features/practice/practice-page-client";
import { createAuthenticatedClient } from "@/lib/api";

type WeakAreaItem = {
  topic: string;
  accuracy: number;
  attempts: number;
  quiz_count: number;
};

export default async function PracticePage() {
  const user = await currentUser();
  if (!user) {
    redirect("/login");
  }

  const session = await auth();
  const token = await session.getToken();
  if (!token) {
    redirect("/login");
  }

  const apiClient = createAuthenticatedClient(token);
  const response = await apiClient.GET("/api/v1/practice/weak-areas");
  const weakAreas = (response.data as { weak_topics?: WeakAreaItem[] } | undefined)?.weak_topics ?? [];

  return (
    <div className="space-y-6">
      <header className="space-y-1">
        <h1 className="text-xl font-semibold text-text-primary">Targeted Practice</h1>
        <p className="text-sm text-text-secondary">
          Focus on what you need to improve most
        </p>
      </header>
      <PracticePageClient initialWeakAreas={weakAreas} />
    </div>
  );
}
