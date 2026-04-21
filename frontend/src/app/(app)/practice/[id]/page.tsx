import { auth, currentUser } from "@clerk/nextjs/server";
import { notFound, redirect } from "next/navigation";

import { PracticeAttempt } from "@/components/features/practice/practice-attempt";
import { createAuthenticatedClient } from "@/lib/api";

type PracticeDetailPageProps = {
  params: Promise<{ id: string }>;
};

export default async function PracticeDetailPage({ params }: PracticeDetailPageProps) {
  const user = await currentUser();
  if (!user) {
    redirect("/login");
  }

  const session = await auth();
  const token = await session.getToken();
  if (!token) {
    redirect("/login");
  }

  const resolvedParams = await params;
  const apiClient = createAuthenticatedClient(token);
  const response = await apiClient.GET("/api/v1/practice/{practice_id}", {
    params: { path: { practice_id: resolvedParams.id } },
  });

  if (!response.data) {
    notFound();
  }

  return (
    <main className="min-h-screen bg-background p-4 md:p-8">
      <div className="mx-auto max-w-4xl">
        <PracticeAttempt drills={response.data.drills as never[]} />
      </div>
    </main>
  );
}
