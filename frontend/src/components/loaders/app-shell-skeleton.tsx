import { Skeleton } from "@/components/ui/skeleton"

export function AppShellSkeleton() {
  return (
    <div className="flex min-h-screen">
      {/* Sidebar skeleton - desktop only */}
      <div className="hidden lg:flex w-[240px] flex-col border-r border-border-default p-4 space-y-4 bg-surface-card">
        <Skeleton className="h-8 w-32" />
        <div className="space-y-2">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
        </div>
        <div className="mt-auto space-y-2">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
        </div>
      </div>

      {/* Mobile header skeleton */}
      <div className="lg:hidden fixed top-0 left-0 right-0 h-16 border-b border-border-default flex items-center justify-between px-4 z-50 bg-surface-card">
        <Skeleton className="h-8 w-8" />
        <Skeleton className="h-8 w-32" />
        <Skeleton className="h-8 w-8" />
      </div>

      {/* Main content area */}
      <main className="flex-1 lg:p-8 p-4 pt-20 lg:pt-8">
        <div className="max-w-6xl mx-auto space-y-6">
          <Skeleton className="h-8 w-48" />
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            <Skeleton className="h-32 w-full" />
            <Skeleton className="h-32 w-full" />
            <Skeleton className="h-32 w-full" />
          </div>
          <Skeleton className="h-64 w-full" />
        </div>
      </main>
    </div>
  )
}
