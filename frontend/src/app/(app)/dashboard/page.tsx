import { redirect } from "next/navigation";
import { currentUser } from "@clerk/nextjs/server";
import { DashboardClient } from "@/components/dashboard-client";
import { getDocuments } from "@/app/actions/documents";

export default async function DashboardPage() {
  const user = await currentUser();
  if (!user) {
    redirect("/login");
  }

  const documents = await getDocuments();

  return (
    <DashboardClient
      userEmail={user.emailAddresses[0]?.emailAddress || "user"}
      documents={documents}
    />
  );
}