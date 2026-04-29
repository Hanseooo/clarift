# Next.js Navigation Performance Optimization Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Improve perceived and actual navigation speed between authenticated app routes and deep links using phased, non-breaking optimizations.

**Architecture:** Three-phase rollout — (1) Add loading states and Suspense for instant perceived feedback, (2) Parallelize fetches and add strategic caching to reduce actual load times, (3) Code-split heavy components to reduce per-route bundle size. Each phase is self-contained and non-breaking.

**Tech Stack:** Next.js 16.2.3, React 19.2.4, TypeScript, Tailwind CSS, shadcn/ui, Clerk, pnpm

**Prerequisites:**
- Read `frontend/src/app/(app)/*` page files to understand current data fetching patterns
- Read `frontend/src/components/*` for existing UI patterns
- Verify `pnpm run test:run` passes before starting
- All changes are additive — no existing behavior is removed

---

## File Structure Map

**Phase 1 (Skeleton Loaders + Suspense):**
- `frontend/src/app/(app)/loading.tsx` — App shell skeleton for all authenticated routes
- `frontend/src/app/(app)/dashboard/loading.tsx` — Dashboard-specific skeleton
- `frontend/src/app/(app)/documents/loading.tsx` — Documents page skeleton
- `frontend/src/app/(app)/chat/loading.tsx` — Chat page skeleton
- `frontend/src/app/(app)/error.tsx` — Catch-all error boundary for app routes
- `frontend/src/components/ui/skeleton.tsx` — Reusable skeleton components (if not already in shadcn)
- `frontend/src/components/loaders/` — New directory for custom loading UIs

**Phase 2 (Caching + Parallel Fetching):**
- `frontend/src/lib/cache.ts` — React.cache() wrappers for common data fetches
- `frontend/src/lib/clerk-cache.ts` — Cached currentUser() and auth() helpers
- `frontend/src/app/(app)/dashboard/page.tsx` — Parallelized fetches
- `frontend/src/app/(app)/documents/page.tsx` — Parallelized fetches
- `frontend/src/app/actions/*` — Add revalidateTag support

**Phase 3 (Code Splitting):**
- `frontend/src/components/dynamic-imports.ts` — Centralized dynamic imports registry
- `frontend/src/app/page.tsx` — Dynamic imports for landing page heavy components
- `frontend/src/app/(app)/documents/page.tsx` — Dynamic Tiptap/editor components
- `frontend/src/app/(app)/chat/page.tsx` — Dynamic chat heavy components

---

## Chunk 1: Phase 1 — Skeleton Loaders & Suspense Boundaries

> **Non-breaking guarantee:** All `loading.tsx` and `error.tsx` files are purely additive. Next.js automatically uses them without changing existing page logic.

### Task 1.1: Audit existing shadcn skeleton component

**Files:**
- Read: `frontend/src/components/ui/skeleton.tsx`

- [ ] **Step 1: Check if skeleton component exists**

Run: `ls frontend/src/components/ui/skeleton.tsx`
Expected: File exists or not found

- [ ] **Step 2: If missing, create skeleton component**

Create: `frontend/src/components/ui/skeleton.tsx`

```tsx
import { cn } from "@/lib/utils"

function Skeleton({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("animate-pulse rounded-md bg-primary/10", className)}
      {...props}
    />
  )
}

export { Skeleton }
```

- [ ] **Step 3: Verify component renders**

No test needed — shadcn standard component. Just confirm file exists.

---

### Task 1.2: Create app-wide loading skeleton layout

**Files:**
- Create: `frontend/src/components/loaders/app-shell-skeleton.tsx`
- Create: `frontend/src/app/(app)/loading.tsx`

- [ ] **Step 1: Create reusable app shell skeleton**

Create: `frontend/src/components/loaders/app-shell-skeleton.tsx`

```tsx
import { Skeleton } from "@/components/ui/skeleton"

export function AppShellSkeleton() {
  return (
    <div className="flex min-h-screen">
      {/* Sidebar skeleton */}
      <div className="hidden lg:flex w-64 flex-col border-r p-4 space-y-4">
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
      <div className="lg:hidden fixed top-0 left-0 right-0 h-16 border-b flex items-center justify-between px-4 z-50 bg-background">
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
```

- [ ] **Step 2: Create root app loading boundary**

Create: `frontend/src/app/(app)/loading.tsx`

```tsx
import { AppShellSkeleton } from "@/components/loaders/app-shell-skeleton"

export default function Loading() {
  return <AppShellSkeleton />
}
```

- [ ] **Step 3: Verify loading state appears**

Run: `cd frontend && pnpm run dev`
Navigate to `http://localhost:3000/dashboard`
Expected: Skeleton loader appears instantly before page content renders

---

### Task 1.3: Add route-specific loading states

**Files:**
- Create: `frontend/src/components/loaders/dashboard-skeleton.tsx`
- Create: `frontend/src/app/(app)/dashboard/loading.tsx`
- Create: `frontend/src/components/loaders/documents-skeleton.tsx`
- Create: `frontend/src/app/(app)/documents/loading.tsx`

- [ ] **Step 1: Create dashboard-specific skeleton**

Create: `frontend/src/components/loaders/dashboard-skeleton.tsx`

```tsx
import { Skeleton } from "@/components/ui/skeleton"

export function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-10 w-32" />
      </div>
      
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-28 w-full" />
        ))}
      </div>
      
      <div className="grid gap-4 lg:grid-cols-2">
        <Skeleton className="h-80 w-full" />
        <Skeleton className="h-80 w-full" />
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Add dashboard loading boundary**

Create: `frontend/src/app/(app)/dashboard/loading.tsx`

```tsx
import { DashboardSkeleton } from "@/components/loaders/dashboard-skeleton"

export default function Loading() {
  return <DashboardSkeleton />
}
```

- [ ] **Step 3: Create documents-specific skeleton**

Create: `frontend/src/components/loaders/documents-skeleton.tsx`

```tsx
import { Skeleton } from "@/components/ui/skeleton"

export function DocumentsSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-10 w-32" />
      </div>
      
      <Skeleton className="h-12 w-full max-w-md" />
      
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-48 w-full" />
        ))}
      </div>
    </div>
  )
}
```

- [ ] **Step 4: Add documents loading boundary**

Create: `frontend/src/app/(app)/documents/loading.tsx`

```tsx
import { DocumentsSkeleton } from "@/components/loaders/documents-skeleton"

export default function Loading() {
  return <DocumentsSkeleton />
}
```

---

### Task 1.4: Add Suspense boundaries for independent data sections

**Files:**
- Read: `frontend/src/app/(app)/dashboard/page.tsx`
- Modify: `frontend/src/app/(app)/dashboard/page.tsx`
- Create: `frontend/src/components/loaders/stats-skeleton.tsx`

**Edge case consideration:**
- If dashboard page has a single sequential fetch, Suspense won't help until we parallelize (Phase 2). Add boundaries now so they're ready.
- Never wrap the entire page in Suspense — only independent data sections.

- [ ] **Step 1: Read current dashboard page structure**

Run: `cat frontend/src/app/(app)/dashboard/page.tsx`
Note: Identify independent data sections (e.g., stats cards, recent documents, weak areas)

- [ ] **Step 2: Create stats section skeleton**

Create: `frontend/src/components/loaders/stats-skeleton.tsx`

```tsx
import { Skeleton } from "@/components/ui/skeleton"

export function StatsSkeleton() {
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {Array.from({ length: 4 }).map((_, i) => (
        <Skeleton key={i} className="h-28 w-full" />
      ))}
    </div>
  )
}
```

- [ ] **Step 3: Add Suspense to dashboard**

Modify: `frontend/src/app/(app)/dashboard/page.tsx`

Add import at top:
```tsx
import { Suspense } from "react"
import { StatsSkeleton } from "@/components/loaders/stats-skeleton"
import { DocumentsSkeleton } from "@/components/loaders/documents-skeleton"
```

Wrap independent sections (example — adapt to actual page structure):
```tsx
// Before (sequential):
// const documents = await getDocuments()
// const summaries = await getSummaries()
// const weakAreas = await getWeakAreas()

// After (Suspense-ready):
<Suspense fallback={<StatsSkeleton />}>
  <StatsSection />
</Suspense>

<Suspense fallback={<DocumentsSkeleton />}>
  <RecentDocumentsSection />
</Suspense>
```

**Note:** If the page currently fetches everything inline, extract data fetchers into separate async components first:

```tsx
async function StatsSection() {
  const stats = await getDashboardStats()
  return <StatsCards data={stats} />
}

async function RecentDocumentsSection() {
  const docs = await getDocuments({ limit: 5 })
  return <DocumentList documents={docs} />
}
```

- [ ] **Step 4: Verify dashboard still renders**

Run: `cd frontend && pnpm run test:run`
Expected: All tests pass

Navigate to `/dashboard` in browser
Expected: Page renders correctly, skeletons may appear briefly during hard refresh

---

### Task 1.5: Add error boundaries

**Files:**
- Create: `frontend/src/app/(app)/error.tsx`
- Create: `frontend/src/components/error/error-fallback.tsx`

**Edge case consideration:**
- Error boundaries catch rendering errors, not API errors (those should be handled in components)
- Must be a Client Component ('use client')
- Should include retry functionality

- [ ] **Step 1: Create error fallback component**

Create: `frontend/src/components/error/error-fallback.tsx`

```tsx
'use client'

import { useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { AlertTriangle } from 'lucide-react'

export function ErrorFallback({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('Route error:', error)
  }, [error])

  return (
    <div className="flex min-h-[400px] flex-col items-center justify-center gap-4 p-8">
      <AlertTriangle className="h-12 w-12 text-destructive" />
      <h2 className="text-2xl font-bold">Something went wrong</h2>
      <p className="text-muted-foreground text-center max-w-md">
        {error.message || 'An unexpected error occurred while loading this page.'}
      </p>
      <div className="flex gap-2">
        <Button onClick={reset} variant="default">
          Try again
        </Button>
        <Button onClick={() => window.location.href = '/dashboard'} variant="outline">
          Go to Dashboard
        </Button>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Create app error boundary**

Create: `frontend/src/app/(app)/error.tsx`

```tsx
'use client'

import { ErrorFallback } from '@/components/error/error-fallback'

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return <ErrorFallback error={error} reset={reset} />
}
```

- [ ] **Step 3: Verify error boundary**

Temporarily throw an error in a test page:
```tsx
throw new Error('Test error boundary')
```

Expected: Error fallback UI appears with retry button
Remove the test error after verification

---

## Chunk 2: Phase 2 — Parallel Fetching & Caching

> **Non-breaking guarantee:** All caching is additive. Existing fetch calls remain functional. We only add cached variants and parallelize where safe.

### Task 2.1: Create cached Clerk auth helpers

**Files:**
- Create: `frontend/src/lib/clerk-cache.ts`
- Read: `frontend/src/lib/clerk.ts` (if exists)

**Edge case consideration:**
- `currentUser()` and `auth()` are called on almost every route
- React.cache() deduplicates per request, not across requests
- Must handle cases where user is not authenticated (returns null)

- [ ] **Step 1: Create cached auth helpers**

Create: `frontend/src/lib/clerk-cache.ts`

```tsx
import { auth, currentUser } from '@clerk/nextjs/server'
import { cache } from 'react'

/**
 * Cached version of currentUser() for per-request deduplication.
 * Use this instead of currentUser() directly to avoid multiple Clerk API calls.
 */
export const getCachedUser = cache(async () => {
  return currentUser()
})

/**
 * Cached version of auth() for per-request deduplication.
 * Use this instead of auth() directly to avoid multiple Clerk API calls.
 */
export const getCachedAuth = cache(async () => {
  return auth()
})
```

- [ ] **Step 2: Verify cache works**

Create temporary test in any Server Component:
```tsx
import { getCachedUser } from '@/lib/clerk-cache'

// Call multiple times — should only hit Clerk API once
const user1 = await getCachedUser()
const user2 = await getCachedUser()
console.log('Same user?', user1?.id === user2?.id) // Should be true
```

Expected: Multiple calls return same result without duplicate API requests
Remove test after verification

---

### Task 2.2: Parallelize dashboard page fetches

**Files:**
- Read: `frontend/src/app/(app)/dashboard/page.tsx`
- Modify: `frontend/src/app/(app)/dashboard/page.tsx`

**Edge case consideration:**
- If one fetch fails, others should still resolve
- Use Promise.allSettled() instead of Promise.all() to prevent partial failures from blocking everything
- Must preserve existing error handling behavior

- [ ] **Step 1: Read current dashboard fetches**

Run: `cat frontend/src/app/(app)/dashboard/page.tsx`
Note: Identify all await calls and their dependencies

- [ ] **Step 2: Refactor to parallel fetching**

Modify: `frontend/src/app/(app)/dashboard/page.tsx`

**Before (sequential):**
```tsx
const documents = await getDocuments()
const summaries = await getSummaries()
const weakAreas = await getWeakAreas()
const quizzes = await getRecentQuizzes()
```

**After (parallel with graceful degradation):**
```tsx
const [
  documentsResult,
  summariesResult,
  weakAreasResult,
  quizzesResult,
] = await Promise.allSettled([
  getDocuments(),
  getSummaries(),
  getWeakAreas(),
  getRecentQuizzes(),
])

const documents = documentsResult.status === 'fulfilled' ? documentsResult.value : []
const summaries = summariesResult.status === 'fulfilled' ? summariesResult.value : []
const weakAreas = weakAreasResult.status === 'fulfilled' ? weakAreasResult.value : []
const quizzes = quizzesResult.status === 'fulfilled' ? quizzesResult.value : []

// Log failures for monitoring but don't block rendering
const failures = [
  documentsResult,
  summariesResult,
  weakAreasResult,
  quizzesResult,
].filter((r): r is PromiseRejectedResult => r.status === 'rejected')

if (failures.length > 0) {
  console.error('Dashboard partial load failures:', failures.map(f => f.reason))
}
```

- [ ] **Step 3: Verify dashboard renders all sections**

Run: `cd frontend && pnpm run test:run`
Expected: Tests pass

Navigate to `/dashboard`
Expected: All sections load simultaneously (check Network tab for parallel requests)

---

### Task 2.3: Parallelize documents page fetches

**Files:**
- Read: `frontend/src/app/(app)/documents/page.tsx`
- Modify: `frontend/src/app/(app)/documents/page.tsx`

- [ ] **Step 1: Read current documents page**

Run: `cat frontend/src/app/(app)/documents/page.tsx`

- [ ] **Step 2: Apply parallel fetching pattern**

Modify: `frontend/src/app/(app)/documents/page.tsx`

Use same `Promise.allSettled` pattern as dashboard for independent fetches.
If the page only has one main fetch (e.g., just `getDocuments()`), this task is a no-op — mark complete.

- [ ] **Step 3: Verify**

Run: `cd frontend && pnpm run test:run`
Navigate to `/documents`
Expected: Page loads, fetches are parallelized

---

### Task 2.4: Add fetch caching for appropriate endpoints

**Files:**
- Read: `frontend/src/lib/api.ts` (or wherever openapi-fetch client is configured)
- Modify: `frontend/src/lib/api.ts`

**Edge case consideration:**
- Only cache read-only endpoints (GET requests)
- Never cache user-specific mutations
- Use `next: { revalidate: 60 }` for semi-static data (quota displays, user profile)
- Use `next: { tags: ['documents'] }` for cache invalidation via Server Actions

- [ ] **Step 1: Check current API client setup**

Run: `cat frontend/src/lib/api.ts`
Note: Check if openapi-fetch client has default cache settings

- [ ] **Step 2: Add cache configuration helper**

Modify or create: `frontend/src/lib/api.ts`

Add cache wrapper:
```tsx
/**
 * Cached GET request for semi-static data.
 * Revalidates every 60 seconds.
 */
export async function cachedGet<T>(
  path: string,
  options?: RequestInit
): Promise<T> {
  const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}${path}`, {
    ...options,
    next: { revalidate: 60 },
  })
  if (!response.ok) throw new Error(`API error: ${response.status}`)
  return response.json()
}

/**
 * Tagged GET request for cache invalidation support.
 */
export async function taggedGet<T>(
  path: string,
  tag: string,
  options?: RequestInit
): Promise<T> {
  const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}${path}`, {
    ...options,
    next: { tags: [tag] },
  })
  if (!response.ok) throw new Error(`API error: ${response.status}`)
  return response.json()
}
```

- [ ] **Step 3: Update Server Actions to use revalidateTag**

Read: `frontend/src/app/actions/documents.ts`

Add to relevant Server Actions:
```tsx
import { revalidateTag } from 'next/cache'

export async function deleteDocument(id: string) {
  // ... existing deletion logic ...
  revalidateTag('documents')
  revalidatePath('/documents')
}
```

- [ ] **Step 4: Verify caching works**

Navigate to `/documents`
Check Network tab: First load fetches from API, subsequent loads within 60s may serve from cache
Trigger a mutation (delete document)
Expected: Cache is invalidated, page shows updated data

---

## Chunk 3: Phase 3 — Code Splitting & Bundle Optimization

> **Non-breaking guarantee:** Dynamic imports load the same components, just asynchronously. Fallbacks ensure no UI regression during load.

### Task 3.1: Audit heavy components for dynamic import

**Files:**
- Search: `frontend/src/components/` for heavy imports
- Read: `frontend/src/app/page.tsx` (landing page)

**Target components for dynamic import:**
- `framer-motion` components (especially landing page animations)
- `@tiptap/*` editor components
- `recharts` charts
- `mermaid` diagrams
- `shiki` syntax highlighter
- Heavy modal/dialog contents

- [ ] **Step 1: Identify heavy components**

Run: `cd frontend && pnpm run build`
Check build output for largest chunks
Alternatively, check bundle analyzer if configured

Key files to read:
- `frontend/src/app/page.tsx` — check for heavy Client Component imports
- `frontend/src/app/(app)/documents/page.tsx` — check for Tiptap/editor imports
- `frontend/src/app/(app)/chat/page.tsx` — check for chat-heavy components

- [ ] **Step 2: Document findings**

List the heaviest components found. For each, note:
- Component name
- File path
- Approximate size (from build output)
- Current import location
- Whether it's above-the-fold (cannot be deferred) or below-the-fold (can be deferred)

---

### Task 3.2: Create dynamic import registry

**Files:**
- Create: `frontend/src/components/dynamic-imports.ts`

- [ ] **Step 1: Create centralized dynamic imports**

Create: `frontend/src/components/dynamic-imports.ts`

```tsx
import dynamic from 'next/dynamic'
import { Skeleton } from '@/components/ui/skeleton'

// Loading fallback for dynamic components
function DynamicSkeleton({ className }: { className?: string }) {
  return <Skeleton className={className || "h-48 w-full"} />
}

// Landing page heavy components
export const ShaderBackground = dynamic(
  () => import('@/components/landing/shader-background').then(m => m.ShaderBackground),
  { 
    loading: () => <DynamicSkeleton className="h-screen w-full" />,
    ssr: false // WebGL cannot SSR
  }
)

export const FloatingBubbles = dynamic(
  () => import('@/components/landing/floating-bubbles').then(m => m.FloatingBubbles),
  { 
    loading: () => <DynamicSkeleton className="h-64 w-full" />,
    ssr: false 
  }
)

// Editor components (only loaded when user interacts with documents)
export const DocumentEditor = dynamic(
  () => import('@/components/documents/document-editor').then(m => m.DocumentEditor),
  { 
    loading: () => <DynamicSkeleton className="h-96 w-full" />,
    ssr: false // Editor is client-only
  }
)

// Chart components
export const ProgressChart = dynamic(
  () => import('@/components/charts/progress-chart').then(m => m.ProgressChart),
  { 
    loading: () => <DynamicSkeleton className="h-80 w-full" />,
  }
)
```

**Note:** Adjust paths based on actual file locations from codebase exploration.

---

### Task 3.3: Apply dynamic imports to landing page

**Files:**
- Read: `frontend/src/app/page.tsx`
- Modify: `frontend/src/app/page.tsx`

**Edge case consideration:**
- Landing page must still render critical content immediately (SEO, hero text, CTA)
- Only defer below-the-fold or non-critical visual effects
- `ssr: false` for WebGL/canvas components to avoid hydration mismatches

- [ ] **Step 1: Read current landing page imports**

Run: `cat frontend/src/app/page.tsx`

- [ ] **Step 2: Replace static imports with dynamic**

Modify: `frontend/src/app/page.tsx`

Keep static imports for above-the-fold content:
- Hero text, CTAs, navigation
- Anything critical for SEO

Replace with dynamic imports:
- ShaderBackground
- FloatingBubbles  
- MockDeviceFrame
- MockChatFrame
- ScrollReveal (if below fold)
- FeatureShowcase (if below fold)

Example:
```tsx
// Before:
import { ShaderBackground } from '@/components/landing/shader-background'
import { FloatingBubbles } from '@/components/landing/floating-bubbles'

// After:
import { ShaderBackground, FloatingBubbles } from '@/components/dynamic-imports'
```

- [ ] **Step 3: Verify landing page still works**

Run: `cd frontend && pnpm run build`
Expected: Build succeeds, landing page JS bundle is smaller

Navigate to landing page
Expected: Critical content renders immediately, animations load progressively

---

### Task 3.4: Apply dynamic imports to document editor

**Files:**
- Read: `frontend/src/app/(app)/documents/page.tsx`
- Modify: `frontend/src/app/(app)/documents/page.tsx`

**Edge case consideration:**
- Editor should only load when user actually needs to edit
- Documents list view doesn't need Tiptap at all
- Editor should have a meaningful loading state

- [ ] **Step 1: Check when editor is rendered**

Run: `cat frontend/src/app/(app)/documents/page.tsx`
Note: Is the editor always rendered, or only on edit action?

- [ ] **Step 2: Defer editor if always rendered**

If editor is always loaded but rarely used (e.g., in a modal or tab):

```tsx
import { DocumentEditor } from '@/components/dynamic-imports'

// Replace direct usage:
// <DocumentEditor ... />

// The dynamic import handles loading state automatically
```

If editor is already conditional (only shown on edit), this may be a no-op.

- [ ] **Step 3: Verify**

Navigate to `/documents`
Expected: List loads quickly. Editor loads only when triggered.

---

### Task 3.5: Apply dynamic imports to charts

**Files:**
- Search: `frontend/src/components/` for recharts imports
- Modify: Files with chart imports

- [ ] **Step 1: Find chart components**

Run: `grep -r "recharts" frontend/src/components/ --include="*.tsx" -l`

- [ ] **Step 2: Apply dynamic imports to chart wrappers**

For each chart file found:

```tsx
// Before:
import { ProgressChart } from '@/components/charts/progress-chart'

// After:
import { ProgressChart } from '@/components/dynamic-imports'
```

- [ ] **Step 3: Verify charts still render**

Navigate to pages with charts
Expected: Charts appear after brief skeleton loading state

---

## Verification & Testing

### Task V.1: Run full test suite

- [ ] **Step 1: Run frontend tests**

Run: `cd frontend && pnpm run test:run`
Expected: All existing tests pass

- [ ] **Step 2: Build check**

Run: `cd frontend && pnpm run build`
Expected: Build succeeds with no new errors

- [ ] **Step 3: Type check**

Run: `cd frontend && pnpm run typecheck` (or `tsc --noEmit`)
Expected: No TypeScript errors

### Task V.2: Manual navigation testing

- [ ] **Step 1: Test navigation between routes**

Navigate through these routes rapidly:
1. `/dashboard` → `/documents` → `/chat` → `/summaries` → `/dashboard`

Expected: 
- Skeleton loaders appear instantly during transitions
- No blank white pages during navigation
- Each page's content streams in as data resolves

- [ ] **Step 2: Test deep linking**

Open directly in new tab:
1. `/documents/123` (if exists)
2. `/chat`
3. `/summaries/456` (if exists)

Expected: Skeleton appears immediately, then content replaces it

- [ ] **Step 3: Test error scenarios**

Temporarily break an API endpoint (e.g., wrong URL in env)
Navigate to affected route
Expected: Error boundary shows friendly error UI with retry button

Restore API endpoint after test

### Task V.3: Performance benchmarking

- [ ] **Step 1: Measure before/after**

Use Chrome DevTools Lighthouse or Performance tab:
1. Clear cache
2. Navigate to `/dashboard`
3. Record: Time to First Contentful Paint (FCP), Largest Contentful Paint (LCP), Total Blocking Time (TBT)

Repeat for `/documents` and `/chat`

- [ ] **Step 2: Document improvements**

Create brief note in PR description with metrics.
Expected improvements:
- FCP: Should improve significantly (skeleton appears instantly)
- LCP: May improve moderately (parallel fetches)
- TBT: Should improve (smaller JS bundles from code splitting)

---

## Rollback Plan

If any issues arise:

1. **Phase 1 rollback:** Delete `loading.tsx` and `error.tsx` files. App reverts to default Next.js behavior.
2. **Phase 2 rollback:** Replace `Promise.allSettled` with original sequential awaits. Remove cache wrappers and use original `currentUser()` / `auth()` calls.
3. **Phase 3 rollback:** Replace dynamic imports with original static imports.

All phases are independent. Rollback one without affecting others.

---

## Completion Criteria

- [ ] All routes have `loading.tsx` with appropriate skeleton
- [ ] Dashboard and documents pages use parallel fetching
- [ ] Clerk auth calls use per-request caching
- [ ] Heavy landing page components load dynamically
- [ ] Document editor/chart components load dynamically
- [ ] Error boundaries catch and display graceful failures
- [ ] All tests pass (`pnpm run test:run`)
- [ ] Build succeeds (`pnpm run build`)
- [ ] Manual navigation feels snappy with no blank screens
- [ ] PR includes before/after performance metrics

---

## Appendix: File Paths Quick Reference

**Loading States:**
- `frontend/src/components/ui/skeleton.tsx`
- `frontend/src/components/loaders/app-shell-skeleton.tsx`
- `frontend/src/components/loaders/dashboard-skeleton.tsx`
- `frontend/src/components/loaders/documents-skeleton.tsx`
- `frontend/src/components/loaders/stats-skeleton.tsx`
- `frontend/src/app/(app)/loading.tsx`
- `frontend/src/app/(app)/dashboard/loading.tsx`
- `frontend/src/app/(app)/documents/loading.tsx`

**Error Handling:**
- `frontend/src/components/error/error-fallback.tsx`
- `frontend/src/app/(app)/error.tsx`

**Caching:**
- `frontend/src/lib/clerk-cache.ts`
- `frontend/src/lib/api.ts`
- `frontend/src/app/actions/documents.ts`

**Code Splitting:**
- `frontend/src/components/dynamic-imports.ts`
- `frontend/src/app/page.tsx`
- `frontend/src/app/(app)/documents/page.tsx`

**Pages to Modify:**
- `frontend/src/app/(app)/dashboard/page.tsx`
- `frontend/src/app/(app)/documents/page.tsx`
- `frontend/src/app/(app)/chat/page.tsx`
- `frontend/src/app/(app)/summaries/page.tsx`
- `frontend/src/app/(app)/quizzes/page.tsx`
- `frontend/src/app/(app)/practice/page.tsx`

**Key Commands:**
- `cd frontend && pnpm run test:run`
- `cd frontend && pnpm run build`
- `cd frontend && pnpm run typecheck`

---

*Plan generated on 2026-04-30. Next step: Invoke writing-plans skill to create task breakdown, then execute via subagent-driven-development.*
