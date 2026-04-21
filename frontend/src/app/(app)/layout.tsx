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
    return redirect("/login");
  }

  const user = await db.query.users.findFirst({
    where: eq(users.clerkUserId, userId),
  });

  if (user && !user.userPreferences) {
    return redirect("/onboarding");
  }

  return <>{children}</>;
}