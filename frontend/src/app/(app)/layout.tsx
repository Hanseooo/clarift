import { redirect } from "next/navigation";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";

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

  return <>{children}</>;
}