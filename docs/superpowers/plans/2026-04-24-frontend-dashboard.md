# Dashboard Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Redesign the dashboard page with quota meters at top, upload zone, recent documents list, and sub-navigation to summaries/quizzes. Clean, action-focused layout following the "keep it simple" approach.

**Architecture:** Server Component page fetches user, documents, summaries, quizzes, and usage data. Client component handles upload interactions, SSE job tracking, and sub-nav tab switching. Route structure: `/dashboard` (main), `/dashboard/summaries`, `/dashboard/quizzes`.

**Tech Stack:** Next.js 15 (App Router), TypeScript, Tailwind CSS v4, Framer Motion, Lucide React

---

## File Structure

| File | Action | Responsibility |
|---|---|---|
| `frontend/src/app/(app)/dashboard/page.tsx` | Replace | Dashboard Server Component (data fetching) |
| `frontend/src/app/(app)/dashboard/layout.tsx` | Create | Dashboard layout with sub-nav tabs |
| `frontend/src/components/features/dashboard/dashboard-client.tsx` | Replace | Dashboard interactive client component |
| `frontend/src/components/features/dashboard/quota-meters.tsx` | Create | Quota usage meters with color thresholds |
| `frontend/src/components/features/dashboard/document-list.tsx` | Create | Document cards list with status badges |
| `frontend/src/components/features/dashboard/dashboard-tabs.tsx` | Create | Sub-nav tabs (Documents, Summaries, Quizzes) |
| `frontend/src/app/(app)/dashboard/summaries/page.tsx` | Move/Create | Summaries list page (moved from `/summaries`) |
| `frontend/src/app/(app)/dashboard/summaries/[id]/page.tsx` | Move/Create | Summary detail page (moved from `/summaries/[id]`) |
| `frontend/src/app/(app)/dashboard/quizzes/page.tsx` | Move/Create | Quizzes list page (moved from `/quizzes`) |
| `frontend/src/app/(app)/dashboard/quizzes/new/page.tsx` | Move/Create | Quiz generation page (moved from `/quizzes/new`) |
| `frontend/src/app/(app)/dashboard/quizzes/[id]/page.tsx` | Move/Create | Quiz detail page (moved from `/quizzes/[id]`) |
| `frontend/src/app/(app)/dashboard/quizzes/[id]/attempt/page.tsx` | Move/Create | Quiz attempt wizard (moved from `/quizzes/[id]/attempt`) |
| `frontend/src/app/(app)/dashboard/quizzes/[id]/results/page.tsx` | Move/Create | Quiz results page (moved from `/quizzes/[id]/results`) |

---

## Chunk 1: Dashboard Layout & Sub-Nav

### Task 1: Create dashboard layout with sub-nav tabs

**Files:**
- Create: `frontend/src/app/(app)/dashboard/layout.tsx`
- Create: `frontend/src/components/features/dashboard/dashboard-tabs.tsx`

- [ ] **Step 1: Create dashboard tabs component**

```tsx
"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import { FileText, ScrollText, GraduationCap } from "lucide-react"

const tabs = [
  { name: "Documents", path: "/dashboard", icon: FileText },
  { name: "Summaries", path: "/dashboard/summaries", icon: ScrollText },
  { name: "Quizzes", path: "/dashboard/quizzes", icon: GraduationCap },
]

export function DashboardTabs() {
  const pathname = usePathname()

  return (
    <div className="flex items-center gap-1 mb-6 border-b border-border-default pb-1">
      {tabs.map((tab) => {
        const Icon = tab.icon
        // Active if pathname matches exactly or is a child route
        const isActive =
          tab.path === "/dashboard"
            ? pathname === "/dashboard"
            : pathname.startsWith(tab.path)

        return (
          <Link
            key={tab.path}
            href={tab.path}
            className={cn(
              "flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-lg transition-colors-fast",
              isActive
                ? "text-brand-500 bg-brand-50 dark:bg-brand-500/10"
                : "text-text-tertiary hover:text-text-primary hover:bg-surface-overlay"
            )}
          >
            <Icon className="size-4 stroke-[1.5]" />
            {tab.name}
          </Link>
        )
      })}
    </div>
  )
}
```

- [ ] **Step 2: Create dashboard layout**

```tsx
import { DashboardTabs } from "@/components/features/dashboard/dashboard-tabs"

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div>
      <DashboardTabs />
      {children}
    </div>
  )
}
```

- [ ] **Step 3: Commit**

```bash
git add frontend/src/app/\(app\)/dashboard/layout.tsx frontend/src/components/features/dashboard/dashboard-tabs.tsx
git commit -m "feat(frontend): add dashboard layout with sub-nav tabs"
```

---

## Chunk 2: Quota Meters

### Task 2: Create quota meters component

**Files:**
- Create: `frontend/src/components/features/dashboard/quota-meters.tsx`

- [ ] **Step 1: Create quota meters component**

```tsx
"use client"

import { Progress } from "@/components/ui/progress"
import { cn } from "@/lib/utils"

interface QuotaMetersProps {
  summariesUsed: number
  summariesLimit: number
  quizzesUsed: number
  quizzesLimit: number
  resetAt: string
}

export function QuotaMeters({
  summariesUsed,
  summariesLimit,
  quizzesUsed,
  quizzesLimit,
  resetAt,
}: QuotaMetersProps) {
  const formatResetTime = (resetAt: string) => {
    const date = new Date(resetAt)
    return date.toLocaleTimeString("en-PH", {
      hour: "numeric",
      minute: "2-digit",
    })
  }

  const meters = [
    {
      label: "Summaries",
      used: summariesUsed,
      limit: summariesLimit,
    },
    {
      label: "Quizzes",
      used: quizzesUsed,
      limit: quizzesLimit,
    },
  ]

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-6">
      {meters.map((meter) => {
        const percentage = (meter.used / meter.limit) * 100
        return (
          <div key={meter.label} className="bg-surface-subtle rounded-xl p-3 md:p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-text-secondary">{meter.label}</span>
              <span className="text-xs font-medium text-text-primary">
                {meter.used} of {meter.limit}
              </span>
            </div>
            <Progress value={percentage} max={100} className="mb-2" />
            <p className="text-[11px] text-text-tertiary">
              Resets at {formatResetTime(resetAt)}
            </p>
          </div>
        )
      })}
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/components/features/dashboard/quota-meters.tsx
git commit -m "feat(frontend): add quota meters with color thresholds"
```

---

## Chunk 3: Document List

### Task 3: Create document list component

**Files:**
- Create: `frontend/src/components/features/dashboard/document-list.tsx`

- [ ] **Step 1: Create document list component**

```tsx
import Link from "next/link"
import { FileText, Trash2 } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Card } from "@/components/ui/card"
import { DeleteDocumentButton } from "@/components/features/documents/delete-document-button"
import { cn } from "@/lib/utils"

interface Document {
  id: string
  title: string
  status: "pending" | "processing" | "ready" | "failed"
  mimeType: string
  createdAt: string
}

interface DocumentListProps {
  documents: Document[]
}

export function DocumentList({ documents }: DocumentListProps) {
  if (documents.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="size-12 rounded-xl bg-surface-subtle flex items-center justify-center mx-auto mb-3">
          <FileText className="size-6 text-text-tertiary" />
        </div>
        <h3 className="text-sm font-medium text-text-primary mb-1">
          No documents yet
        </h3>
        <p className="text-xs text-text-tertiary">
          Upload your first PDF to get started
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {documents.map((doc) => (
        <Card key={doc.id} variant="document" className="group">
          <div className="flex items-center gap-3">
            {/* Icon */}
            <div className="size-9 rounded-lg bg-brand-100 flex items-center justify-center flex-shrink-0">
              <FileText className="size-[18px] text-brand-400" />
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0">
              <Link
                href={`/documents/${doc.id}`}
                className="text-sm font-medium text-text-primary hover:text-brand-500 transition-colors-fast truncate block"
              >
                {doc.title}
              </Link>
              <p className="text-xs text-text-tertiary mt-0.5">
                {new Date(doc.createdAt).toLocaleDateString("en-PH", {
                  month: "short",
                  day: "numeric",
                })}
              </p>
            </div>

            {/* Status + Actions */}
            <div className="flex items-center gap-2 flex-shrink-0">
              <Badge variant={doc.status}>{doc.status}</Badge>
              <DeleteDocumentButton
                documentId={doc.id}
                className="opacity-0 group-hover:opacity-100 transition-opacity"
              />
            </div>
          </div>
        </Card>
      ))}
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/components/features/dashboard/document-list.tsx
git commit -m "feat(frontend): add document list with status badges and delete"
```

---

## Chunk 4: Dashboard Client & Page

### Task 4: Update dashboard client component

**Files:**
- Modify: `frontend/src/components/dashboard-client.tsx`

- [ ] **Step 1: Read current dashboard-client.tsx**

Read the file to understand existing logic (upload, SSE tracking, document display).

- [ ] **Step 2: Refactor to use new components**

Replace the component to use `<QuotaMeters>`, `<DocumentList>`, and the existing `<UploadDropzone>`. Keep SSE job tracking logic. Structure:

```tsx
"use client"

import { useState } from "react"
import { UploadDropzone } from "@/components/upload-dropzone"
import { SSEProgress } from "@/components/ui/sse-progress"
import { QuotaMeters } from "@/components/features/dashboard/quota-meters"
import { DocumentList } from "@/components/features/dashboard/document-list"
import { useJobStatus } from "@/hooks/use-job-status"

interface DashboardClientProps {
  userEmail: string
  documents: any[]
  usage: {
    summariesUsed: number
    summariesLimit: number
    quizzesUsed: number
    quizzesLimit: number
    resetAt: string
  }
}

export function DashboardClient({
  userEmail,
  documents,
  usage,
}: DashboardClientProps) {
  const [activeJobs, setActiveJobs] = useState<Record<string, { step: string; progress: number }>>({})

  const handleUploadSuccess = (jobId: string) => {
    setActiveJobs((prev) => ({ ...prev, [jobId]: { step: "Processing...", progress: 0 } }))
  }

  return (
    <div>
      {/* Quota meters */}
      <QuotaMeters
        summariesUsed={usage.summariesUsed}
        summariesLimit={usage.summariesLimit}
        quizzesUsed={usage.quizzesUsed}
        quizzesLimit={usage.quizzesLimit}
        resetAt={usage.resetAt}
      />

      {/* Upload zone */}
      <div className="mb-6">
        <UploadDropzone onUploadSuccess={handleUploadSuccess} />
      </div>

      {/* Active jobs */}
      {Object.keys(activeJobs).length > 0 && (
        <div className="space-y-3 mb-6">
          {Object.entries(activeJobs).map(([jobId, job]) => (
            <SSEProgress
              key={jobId}
              progress={job.progress > 0 ? job.progress : undefined}
              stepLabel={job.step}
            />
          ))}
        </div>
      )}

      {/* Document list */}
      <DocumentList documents={documents} />
    </div>
  )
}
```

- [ ] **Step 3: Commit**

```bash
git add frontend/src/components/dashboard-client.tsx
git commit -m "feat(frontend): refactor dashboard client with new components"
```

### Task 5: Update dashboard page

**Files:**
- Modify: `frontend/src/app/(app)/dashboard/page.tsx`

- [ ] **Step 1: Read current dashboard page**

Read the file to understand data fetching logic.

- [ ] **Step 2: Update page to pass usage data**

Ensure the page fetches `user_usage` table data and passes it to `<DashboardClient>` as the `usage` prop. Keep existing document fetching logic.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/app/\(app\)/dashboard/page.tsx
git commit -m "feat(frontend): update dashboard page with quota data"
```

---

## Chunk 5: Route Migration (Summaries & Quizzes)

### Task 6: Move summaries routes under /dashboard

**Files:**
- Move: `frontend/src/app/(app)/summaries/` → `frontend/src/app/(app)/dashboard/summaries/`
- Move: `frontend/src/app/(app)/summaries/[id]/` → `frontend/src/app/(app)/dashboard/summaries/[id]/`

- [ ] **Step 1: Create new route directories**

Create the directory structure under `/dashboard/summaries/`.

- [ ] **Step 2: Move page files**

Copy the page files from the old location to the new location. Update any relative imports if needed.

- [ ] **Step 3: Update internal links**

Search for all references to `/summaries` and `/summaries/[id]` in the codebase and update them to `/dashboard/summaries` and `/dashboard/summaries/[id]`.

- [ ] **Step 4: Commit**

```bash
git add frontend/src/app/\(app\)/dashboard/summaries/
git rm -r frontend/src/app/\(app\)/summaries/
git commit -m "feat(frontend): move summaries routes under /dashboard"
```

### Task 7: Move quizzes routes under /dashboard

**Files:**
- Move: `frontend/src/app/(app)/quizzes/` → `frontend/src/app/(app)/dashboard/quizzes/`
- Move: `frontend/src/app/(app)/quizzes/new/` → `frontend/src/app/(app)/dashboard/quizzes/new/`
- Move: `frontend/src/app/(app)/quizzes/[id]/` → `frontend/src/app/(app)/dashboard/quizzes/[id]/`
- Move: `frontend/src/app/(app)/quizzes/[id]/attempt/` → `frontend/src/app/(app)/dashboard/quizzes/[id]/attempt/`
- Move: `frontend/src/app/(app)/quizzes/[id]/results/` → `frontend/src/app/(app)/dashboard/quizzes/[id]/results/`

- [ ] **Step 1: Create new route directories**

Create the directory structure under `/dashboard/quizzes/`.

- [ ] **Step 2: Move page files**

Copy all quiz-related page files to the new location.

- [ ] **Step 3: Update internal links**

Search for all references to `/quizzes` and update them to `/dashboard/quizzes`.

- [ ] **Step 4: Commit**

```bash
git add frontend/src/app/\(app\)/dashboard/quizzes/
git rm -r frontend/src/app/\(app\)/quizzes/
git commit -m "feat(frontend): move quizzes routes under /dashboard"
```

---

## Chunk 6: Verification

### Task 8: Run tests and lint

- [ ] **Step 1: Run lint**

Run: `pnpm run lint` in `frontend/`
Expected: No errors

- [ ] **Step 2: Run tests**

Run: `pnpm run test:run` in `frontend/`
Expected: All tests pass

### Task 9: Verify dev server

- [ ] **Step 1: Start dev server**

Run: `pnpm run dev` in `frontend/`

- [ ] **Step 2: Verify dashboard**

Navigate to `/dashboard` and verify:
- Sub-nav tabs visible (Documents, Summaries, Quizzes)
- Quota meters at top (2-col grid on desktop, stacked on mobile)
- Upload zone below quota meters
- Active jobs show SSE progress bars
- Document list shows cards with status badges
- Empty state shows when no documents
- Clicking "Summaries" tab navigates to `/dashboard/summaries`
- Clicking "Quizzes" tab navigates to `/dashboard/quizzes`
- Back button or tab click returns to `/dashboard`

- [ ] **Step 3: Verify mobile**

Resize to 390px and verify:
- Tabs scroll horizontally if needed
- Quota meters stack vertically
- Upload zone full width
- Document cards full width
- Touch targets >= 44px

### Task 10: Final commit

- [ ] **Step 1: Commit all remaining changes**

```bash
git add -A
git commit -m "feat(frontend): complete dashboard redesign with sub-nav"
```

---

**Plan complete.** Ready to execute?
