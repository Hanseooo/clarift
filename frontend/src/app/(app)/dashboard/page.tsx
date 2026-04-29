import type { Metadata } from "next"
import { redirect } from "next/navigation"
import { Suspense } from "react"
import { getCachedUser, getCachedAuth } from "@/lib/clerk-cache"
import { DashboardOverview } from "@/components/features/dashboard/dashboard-overview"
import { DashboardSkeleton } from "@/components/loaders/dashboard-skeleton"
import { getDocuments } from "@/app/actions/documents"
import { createAuthenticatedClient } from "@/lib/api"

export const metadata: Metadata = {
  title: "Dashboard",
  robots: { index: false },
}

export default async function DashboardPage() {
  const user = await getCachedUser()
  if (!user) {
    redirect("/login")
  }

  // Parallel fetch all dashboard data with graceful degradation
  const [
    documentsResult,
    summariesResult,
    weakAreasResult,
  ] = await Promise.allSettled([
    getDocuments(),
    (async () => {
      const session = await getCachedAuth()
      const token = await session.getToken()
      if (!token) return []
      const apiClient = createAuthenticatedClient(token)
      const { data } = await apiClient.GET("/api/v1/summaries")
      if (!data || !Array.isArray(data)) return []
      return data.slice(0, 3).map((s: any) => ({
        id: s.id,
        title: s.title,
        format: typeof s.quiz_type_flags === "string" ? s.quiz_type_flags : "structured",
        created_at: s.created_at,
      }))
    })(),
    (async () => {
      const session = await getCachedAuth()
      const token = await session.getToken()
      if (!token) return []
      const apiClient = createAuthenticatedClient(token)
      const { data } = await apiClient.GET("/api/v1/practice/weak-areas")
      if (!data || typeof data !== "object" || !("weak_topics" in data)) return []
      return (data as { weak_topics?: Array<{ topic: string; accuracy: number }> }).weak_topics ?? []
    })(),
  ])

  const rawDocuments = documentsResult.status === 'fulfilled' ? documentsResult.value : []
  const documents = rawDocuments.map((doc) => ({
    ...doc,
    status: doc.status as "pending" | "processing" | "ready" | "failed",
  }))

  const recentSummaries = summariesResult.status === 'fulfilled' ? summariesResult.value : []
  const weakAreas = weakAreasResult.status === 'fulfilled' ? weakAreasResult.value : []

  // Log failures for monitoring but don't block rendering
  const failures = [documentsResult, summariesResult, weakAreasResult]
    .filter((r): r is PromiseRejectedResult => r.status === 'rejected')

  if (failures.length > 0) {
    console.error('Dashboard partial load failures:', failures.map(f => f.reason))
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
