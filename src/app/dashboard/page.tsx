import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { DashboardClient } from "@/components/dashboard-client";

export default async function DashboardPage() {
  const session = await auth();

  if (!session?.user) {
    redirect("/login");
  }

  // TODO: Extract JWT token from session (NextAuth v5 beta)
  // For now, pass undefined; uploads will fail without proper authentication.
  const token = undefined;

  return (
    <DashboardClient
      token={token}
      userEmail={session.user.email || "user"}
    />
  );
}