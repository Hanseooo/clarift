import type { Metadata } from "next"
import { redirect } from "next/navigation"
import { auth, currentUser } from "@clerk/nextjs/server"

export const metadata: Metadata = {
  title: "Dashboard",
  robots: { index: false },
}
import { DashboardOverview } from "@/components/features/dashboard/dashboard-overview"
import { getDocuments } from "@/app/actions/documents"
import { createAuthenticatedClient } from "@/lib/api"

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

  // Fetch recent summaries
  let recentSummaries: Array<{ id: string; title: string | null; format: string; created_at: string }> = []
  try {
    const session = await auth()
    const token = await session.getToken()
    if (token) {
      const apiClient = createAuthenticatedClient(token)
      const { data: summariesData } = await apiClient.GET("/api/v1/summaries")
      if (summariesData && Array.isArray(summariesData)) {
        recentSummaries = summariesData.slice(0, 3).map((s: any) => ({
          id: s.id,
          title: s.title,
          format: typeof s.quiz_type_flags === "string" ? s.quiz_type_flags : "structured",
          created_at: s.created_at,
        }))
      }
    }
  } catch {
    // Graceful degradation
  }

  // Fetch weak areas
  let weakAreas: Array<{ topic: string; accuracy: number }> = []
  try {
    const session = await auth()
    const token = await session.getToken()
    if (token) {
      const apiClient = createAuthenticatedClient(token)
      const { data: weakAreasData } = await apiClient.GET("/api/v1/practice/weak-areas")
      if (weakAreasData && typeof weakAreasData === "object" && "weak_topics" in weakAreasData) {
        weakAreas = (weakAreasData as { weak_topics?: Array<{ topic: string; accuracy: number }> }).weak_topics ?? []
      }
    }
  } catch {
    // Graceful degradation
  }

  return (
    <DashboardOverview
      userName={user.firstName || user.emailAddresses[0]?.emailAddress || "Student"}
      documents={documents}
      recentSummaries={recentSummaries}
      weakAreas={weakAreas}
    />
  )
}
