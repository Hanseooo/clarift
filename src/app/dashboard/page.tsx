import { redirect } from "next/navigation";
import { auth, currentUser } from "@clerk/nextjs/server";
import { DashboardClient } from "@/components/dashboard-client";

export default async function DashboardPage() {
  const user = await currentUser();
  if (!user) {
    redirect("/login");
  }

  // Get Clerk JWT token for backend API calls
  const session = await auth();
  const token = await session.getToken();

  return (
    <DashboardClient
      token={token || undefined}
      userEmail={user.emailAddresses[0]?.emailAddress || "user"}
    />
  );
}