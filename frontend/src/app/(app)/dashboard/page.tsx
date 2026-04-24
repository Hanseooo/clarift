import { redirect } from "next/navigation"
import { currentUser } from "@clerk/nextjs/server"
import { DashboardOverview } from "@/components/features/dashboard/dashboard-overview"
import { getDocuments } from "@/app/actions/documents"

export default async function DashboardPage() {
  const user = await currentUser()
  if (!user) {
    redirect("/login")
  }

  const rawDocuments = await getDocuments()

  const documents = rawDocuments.map((doc) => ({
    ...doc,
    status: doc.status as "pending" | "processing" | "ready" | "failed",
  }))

  // TODO: Fetch usage data from API when endpoint is available
  // For now, show dashboard without quota meters
  const usage = undefined

  return (
    <DashboardOverview
      userName={user.firstName || user.emailAddresses[0]?.emailAddress || "Student"}
      documents={documents}
      usage={usage}
    />
  )
}
