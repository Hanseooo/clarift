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
    <main className="min-h-screen bg-background p-4 md:p-8">
      <div className="mx-auto max-w-6xl space-y-6">
        <header className="space-y-1">
          <h1 className="text-3xl font-semibold text-foreground">Targeted Practice</h1>
          <p className="text-sm text-muted-foreground">
            Focus on topics where your recent quiz performance is lowest.
          </p>
        </header>
        <PracticePageClient initialWeakAreas={weakAreas} />
      </div>
    </main>
  );
}
