import { redirect } from "next/navigation";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";
import { AppShell } from "@/components/app-shell";
import { QuotaClientProvider } from "@/components/providers/quota-client-provider";
import { createAuthenticatedClient } from "@/lib/api";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { userId } = await auth();
  
  if (!userId) {
    redirect("/login");
  }

  let user;
  try {
    user = await db.query.users.findFirst({
      where: eq(users.clerkUserId, userId),
      columns: { userPreferences: true }
    });
  } catch (error) {
    console.error("Failed to verify user onboarding status:", error);
    throw new Error("Unable to load user profile.");
  }

  if (!user || !user.userPreferences) {
    redirect("/onboarding");
  }

  // Fetch initial quota for optimistic UI
  let quotaData = null;
  try {
    const session = await auth();
    const token = await session.getToken();
    if (token) {
      const apiClient = createAuthenticatedClient(token);
      const { data } = await apiClient.GET("/api/v1/quota");
      if (data) {
        quotaData = {
          summaries_used: data.summaries_used,
          summaries_limit: data.summaries_limit,
          quizzes_used: data.quizzes_used,
          quizzes_limit: data.quizzes_limit,
          practice_used: data.practice_used,
          practice_limit: data.practice_limit,
          chat_used: data.chat_used,
          chat_limit: data.chat_limit,
          reset_at: data.reset_at,
        };
      }
    }
  } catch {
    // Graceful degradation - app works without quota
  }

  return (
    <QuotaClientProvider initialQuota={quotaData}>
      <AppShell>{children}</AppShell>
    </QuotaClientProvider>
  );
}