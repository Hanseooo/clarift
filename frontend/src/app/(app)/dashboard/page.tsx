import { redirect } from "next/navigation";
import { currentUser } from "@clerk/nextjs/server";
import { DashboardClient } from "@/components/dashboard-client";

export default async function DashboardPage() {
  const user = await currentUser();
  if (!user) {
    redirect("/login");
  }

  return (
    <DashboardClient
      userEmail={user.emailAddresses[0]?.emailAddress || "user"}
    />
  );
}