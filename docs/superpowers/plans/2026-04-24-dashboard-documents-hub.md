# Dashboard & Documents Hub Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Create a true `/dashboard` overview page and a dedicated `/documents` hub. Dashboard shows quota, recent activity, and quick actions. Documents page handles upload, search, and document management. Fix broken `/documents` navigation link.

**Architecture:** Server Component pages fetch data. Client components handle interactions (upload SSE, search filter). Shared `DocumentCard` component enforces design system consistency across both pages.

**Tech Stack:** Next.js 15 (App Router), TypeScript, Tailwind CSS v4, shadcn/ui

**Reference:** `docs/dev/design.md` — Sections "Dashboard", "Document card", "Upload Zone", "Cards", "Mobile-First Breakpoints"

---

## File Structure

| File | Action | Responsibility |
|---|---|---|
| `frontend/src/app/(app)/dashboard/page.tsx` | Replace | Dashboard overview (Server Component) |
| `frontend/src/app/(app)/documents/page.tsx` | Create | Documents hub (Server Component) |
| `frontend/src/components/features/dashboard/dashboard-overview.tsx` | Create | Dashboard client with quick actions + recent docs |
| `frontend/src/components/features/dashboard/quota-meter.tsx` | Create | Single quota meter with color thresholds |
| `frontend/src/components/features/dashboard/quick-action-card.tsx` | Create | Icon + label action card |
| `frontend/src/components/features/documents/documents-client.tsx` | Create | Documents hub client (upload, search, list) |
| `frontend/src/components/features/documents/document-search.tsx` | Create | Search input for document list |
| `frontend/src/components/features/documents/document-card.tsx` | Create | Reusable document card with status badge |
| `frontend/src/components/features/documents/document-list.tsx` | Create | Document list using DocumentCard |
| `frontend/src/components/dashboard-client.tsx` | Delete | Old dashboard client (functionality split) |
| `frontend/src/components/app-shell-desktop.tsx` | Modify | Ensure nav routes are correct |
| `frontend/src/components/app-shell-mobile.tsx` | Modify | Ensure nav routes are correct |

---

## Chunk 1: Shared Document Card

### Task 1: Create DocumentCard component

**Files:**
- Create: `frontend/src/components/features/documents/document-card.tsx`

- [ ] **Step 1: Create DocumentCard**

```tsx
import Link from "next/link"
import { FileText } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import { DeleteDocumentButton } from "./delete-document-button"

interface DocumentCardProps {
  id: string
  title: string
  status: "pending" | "processing" | "ready" | "failed"
  createdAt: Date | string
  showDelete?: boolean
}

export function DocumentCard({ id, title, status, createdAt, showDelete = true }: DocumentCardProps) {
  const dateStr = typeof createdAt === "string" 
    ? createdAt 
    : createdAt.toLocaleDateString("en-PH", { month: "short", day: "numeric" })

  return (
    <div className="group bg-surface-card border border-border-default rounded-xl p-4 flex items-center gap-3 hover:bg-surface-overlay hover:border-border-strong transition-colors-fast">
      {/* Icon box */}
      <div className="size-9 rounded-lg bg-brand-100 flex items-center justify-center flex-shrink-0">
        <FileText className="size-[18px] text-brand-400" />
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <Link
          href={`/documents/${id}`}
          className="text-sm font-medium text-text-primary hover:text-brand-500 transition-colors-fast truncate block"
        >
          {title}
        </Link>
        <p className="text-xs text-text-tertiary mt-0.5">
          {dateStr}
        </p>
      </div>

      {/* Status + Actions */}
      <div className="flex items-center gap-2 flex-shrink-0">
        <Badge 
          variant={status === "ready" ? "default" : status === "failed" ? "destructive" : "secondary"}
          className={cn(
            "text-[11px] font-medium",
            status === "ready" && "bg-success-100 text-success-800 hover:bg-success-100",
            status === "processing" && "bg-brand-100 text-brand-800 hover:bg-brand-100",
            status === "pending" && "bg-surface-subtle text-text-tertiary hover:bg-surface-subtle",
            status === "failed" && "bg-danger-100 text-danger-800 hover:bg-danger-100"
          )}
        >
          {status}
        </Badge>
        {showDelete && (
          <div className="opacity-0 group-hover:opacity-100 transition-opacity">
            <DeleteDocumentButton documentId={id} />
          </div>
        )}
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/components/features/documents/document-card.tsx
git commit -m "feat(frontend): add DocumentCard component with status badges"
```

---

## Chunk 2: Documents Hub

### Task 2: Create document search component

**Files:**
- Create: `frontend/src/components/features/documents/document-search.tsx`

- [ ] **Step 1: Create search component**

```tsx
"use client"

import { Search } from "lucide-react"

interface DocumentSearchProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
}

export function DocumentSearch({
  value,
  onChange,
  placeholder = "Search documents...",
}: DocumentSearchProps) {
  return (
    <div className="relative">
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-text-tertiary" />
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full h-10 pl-9 pr-4 text-sm bg-surface-subtle border border-border-default rounded-lg focus:border-brand-500 focus:ring-2 focus:ring-brand-500/15 transition-colors-fast text-text-primary placeholder:text-text-tertiary"
      />
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/components/features/documents/document-search.tsx
git commit -m "feat(frontend): add document search input"
```

### Task 3: Create documents client

**Files:**
- Create: `frontend/src/components/features/documents/documents-client.tsx`

- [ ] **Step 1: Create documents client**

```tsx
"use client"

import { useState } from "react"
import { UploadDropzone } from "@/components/upload-dropzone"
import { SSEProgress } from "@/components/ui/sse-progress"
import { DocumentList } from "./document-list"
import { DocumentSearch } from "./document-search"

interface Document {
  id: string
  title: string
  status: "pending" | "processing" | "ready" | "failed"
  mimeType: string
  createdAt: Date | string
}

interface DocumentsClientProps {
  documents: Document[]
}

export function DocumentsClient({ documents }: DocumentsClientProps) {
  const [search, setSearch] = useState("")
  const [activeJobs, setActiveJobs] = useState<Record<string, { step: string; progress: number }>>({})

  const filtered = documents.filter((doc) =>
    doc.title.toLowerCase().includes(search.toLowerCase())
  )

  const handleUploadSuccess = (data: { document_id: string; job_id: string; message: string }) => {
    setActiveJobs((prev) => ({ ...prev, [data.job_id]: { step: "Processing...", progress: 0 } }))
  }

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div>
        <h1 className="text-xl font-semibold text-text-primary">Documents</h1>
        <p className="text-sm text-text-secondary mt-1">
          Upload and manage your study materials
        </p>
      </div>

      {/* Upload zone */}
      <UploadDropzone onUploadSuccess={handleUploadSuccess} />

      {/* Active jobs */}
      {Object.keys(activeJobs).length > 0 && (
        <div className="space-y-3">
          {Object.entries(activeJobs).map(([jobId, job]) => (
            <SSEProgress
              key={jobId}
              progress={job.progress > 0 ? job.progress : undefined}
              stepLabel={job.step}
            />
          ))}
        </div>
      )}

      {/* Search */}
      {documents.length > 3 && (
        <DocumentSearch value={search} onChange={setSearch} />
      )}

      {/* Document list */}
      <DocumentList documents={filtered} />
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/components/features/documents/documents-client.tsx
git commit -m "feat(frontend): add documents client with search and upload"
```

### Task 4: Create document list

**Files:**
- Create: `frontend/src/components/features/documents/document-list.tsx`

- [ ] **Step 1: Create document list**

```tsx
import { FileText } from "lucide-react"
import { DocumentCard } from "./document-card"

interface Document {
  id: string
  title: string
  status: "pending" | "processing" | "ready" | "failed"
  mimeType: string
  createdAt: Date | string
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
    <div className="space-y-2">
      {documents.map((doc) => (
        <DocumentCard
          key={doc.id}
          id={doc.id}
          title={doc.title}
          status={doc.status as "pending" | "processing" | "ready" | "failed"}
          createdAt={doc.createdAt}
        />
      ))}
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/components/features/documents/document-list.tsx
git commit -m "feat(frontend): add document list with empty state"
```

### Task 5: Create documents page

**Files:**
- Create: `frontend/src/app/(app)/documents/page.tsx`

- [ ] **Step 1: Create documents page**

```tsx
import { redirect } from "next/navigation"
import { currentUser } from "@clerk/nextjs/server"
import { DocumentsClient } from "@/components/features/documents/documents-client"
import { getDocuments } from "@/app/actions/documents"

export default async function DocumentsPage() {
  const user = await currentUser()
  if (!user) {
    redirect("/login")
  }

  const documents = await getDocuments()

  return <DocumentsClient documents={documents} />
}
```

- [ ] **Step 2: Verify build**

Run: `pnpm run build` in `frontend/`
Expected: Build succeeds

- [ ] **Step 3: Commit**

```bash
git add frontend/src/app/\(app\)/documents/page.tsx
git commit -m "feat(frontend): create documents hub page"
```

---

## Chunk 3: Dashboard Overview

### Task 6: Create quota meter component

**Files:**
- Create: `frontend/src/components/features/dashboard/quota-meter.tsx`

- [ ] **Step 1: Create quota meter**

```tsx
"use client"

import { Progress } from "@/components/ui/progress"
import { cn } from "@/lib/utils"

interface QuotaMeterProps {
  label: string
  used: number
  limit: number
  resetAt?: string
}

export function QuotaMeter({ label, used, limit, resetAt }: QuotaMeterProps) {
  const percentage = Math.min((used / limit) * 100, 100)
  
  const getBarColor = () => {
    if (percentage >= 90) return "bg-danger-500"
    if (percentage >= 70) return "bg-accent-500"
    return "bg-brand-500"
  }

  const formatResetTime = (resetAt?: string) => {
    if (!resetAt) return null
    const date = new Date(resetAt)
    return date.toLocaleTimeString("en-PH", { hour: "numeric", minute: "2-digit" })
  }

  return (
    <div className="bg-surface-subtle rounded-xl p-3 md:p-4">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs text-text-secondary">{label}</span>
        <span className="text-xs font-medium text-text-primary">
          {used} of {limit}
        </span>
      </div>
      <div className="h-1 bg-border-default rounded-full overflow-hidden mb-2">
        <div 
          className={cn("h-full rounded-full transition-all duration-300", getBarColor())}
          style={{ width: `${percentage}%` }}
        />
      </div>
      {resetAt && (
        <p className="text-[11px] text-text-tertiary">
          Resets at {formatResetTime(resetAt)}
        </p>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/components/features/dashboard/quota-meter.tsx
git commit -m "feat(frontend): add quota meter with color thresholds"
```

### Task 7: Create quick action card

**Files:**
- Create: `frontend/src/components/features/dashboard/quick-action-card.tsx`

- [ ] **Step 1: Create quick action card**

```tsx
import Link from "next/link"
import { cn } from "@/lib/utils"

interface QuickActionCardProps {
  href: string
  icon: React.ReactNode
  label: string
  description: string
  className?: string
}

export function QuickActionCard({ href, icon, label, description, className }: QuickActionCardProps) {
  return (
    <Link
      href={href}
      className={cn(
        "block bg-surface-card border border-border-default rounded-xl p-4",
        "hover:border-border-strong hover:bg-surface-overlay transition-colors-fast",
        className
      )}
    >
      <div className="flex items-center gap-3">
        <div className="size-10 rounded-lg bg-brand-500/10 flex items-center justify-center flex-shrink-0">
          {icon}
        </div>
        <div>
          <h3 className="text-sm font-medium text-text-primary">{label}</h3>
          <p className="text-xs text-text-tertiary">{description}</p>
        </div>
      </div>
    </Link>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/components/features/dashboard/quick-action-card.tsx
git commit -m "feat(frontend): add quick action card component"
```

### Task 8: Create dashboard overview client

**Files:**
- Create: `frontend/src/components/features/dashboard/dashboard-overview.tsx`

- [ ] **Step 1: Create dashboard overview**

```tsx
"use client"

import Link from "next/link"
import { FileText, MessageSquare, GraduationCap, Target, Upload, Plus } from "lucide-react"
import { QuotaMeter } from "./quota-meter"
import { QuickActionCard } from "./quick-action-card"
import { DocumentCard } from "@/components/features/documents/document-card"

interface Document {
  id: string
  title: string
  status: "pending" | "processing" | "ready" | "failed"
  createdAt: Date | string
}

interface DashboardOverviewProps {
  userName: string
  documents: Document[]
  usage?: {
    summariesUsed: number
    summariesLimit: number
    quizzesUsed: number
    quizzesLimit: number
    resetAt: string
  }
}

export function DashboardOverview({ userName, documents, usage }: DashboardOverviewProps) {
  const recentDocuments = documents.slice(0, 3)
  const hasDocuments = documents.length > 0

  return (
    <div className="space-y-8">
      {/* Welcome header */}
      <div>
        <h1 className="text-xl font-semibold text-text-primary">
          Welcome back{userName ? `, ${userName.split(" ")[0]}` : ""}
        </h1>
        <p className="text-sm text-text-secondary mt-1">
          Here&apos;s what&apos;s happening with your studies
        </p>
      </div>

      {/* Quota meters */}
      {usage && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <QuotaMeter
            label="Summaries"
            used={usage.summariesUsed}
            limit={usage.summariesLimit}
            resetAt={usage.resetAt}
          />
          <QuotaMeter
            label="Quizzes"
            used={usage.quizzesUsed}
            limit={usage.quizzesLimit}
            resetAt={usage.resetAt}
          />
        </div>
      )}

      {/* Quick actions */}
      <section>
        <h2 className="text-sm font-medium text-text-secondary mb-3 uppercase tracking-wide">
          Quick Actions
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <QuickActionCard
            href="/documents"
            icon={<Upload className="size-5 text-brand-500" />}
            label="Upload"
            description="Add notes"
          />
          <QuickActionCard
            href="/quizzes"
            icon={<GraduationCap className="size-5 text-brand-500" />}
            label="Quiz"
            description="Test yourself"
          />
          <QuickActionCard
            href="/practice"
            icon={<Target className="size-5 text-brand-500" />}
            label="Practice"
            description="Weak areas"
          />
          <QuickActionCard
            href="/chat"
            icon={<MessageSquare className="size-5 text-brand-500" />}
            label="Chat"
            description="Ask questions"
          />
        </div>
      </section>

      {/* Recent documents */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-medium text-text-secondary uppercase tracking-wide">
            Recent Documents
          </h2>
          {hasDocuments && (
            <Link 
              href="/documents" 
              className="text-xs text-brand-500 hover:text-brand-600 font-medium"
            >
              View all
            </Link>
          )}
        </div>

        {hasDocuments ? (
          <div className="space-y-2">
            {recentDocuments.map((doc) => (
              <DocumentCard
                key={doc.id}
                id={doc.id}
                title={doc.title}
                status={doc.status as "pending" | "processing" | "ready" | "failed"}
                createdAt={doc.createdAt}
                showDelete={false}
              />
            ))}
          </div>
        ) : (
          <div className="text-center py-8 bg-surface-subtle rounded-xl">
            <FileText className="size-8 text-text-tertiary mx-auto mb-2" />
            <p className="text-sm text-text-secondary">No documents yet</p>
            <Link 
              href="/documents" 
              className="text-xs text-brand-500 hover:text-brand-600 font-medium mt-1 inline-block"
            >
              Upload your first notes →
            </Link>
          </div>
        )}
      </section>
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/components/features/dashboard/dashboard-overview.tsx
git commit -m "feat(frontend): add dashboard overview with quota and quick actions"
```

### Task 9: Replace dashboard page

**Files:**
- Replace: `frontend/src/app/(app)/dashboard/page.tsx`
- Delete: `frontend/src/components/dashboard-client.tsx`

- [ ] **Step 1: Replace dashboard page**

```tsx
import { redirect } from "next/navigation"
import { currentUser } from "@clerk/nextjs/server"
import { DashboardOverview } from "@/components/features/dashboard/dashboard-overview"
import { getDocuments } from "@/app/actions/documents"

export default async function DashboardPage() {
  const user = await currentUser()
  if (!user) {
    redirect("/login")
  }

  const documents = await getDocuments()

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
```

- [ ] **Step 2: Delete old dashboard client**

```bash
rm frontend/src/components/dashboard-client.tsx
```

- [ ] **Step 3: Commit**

```bash
git add frontend/src/app/\(app\)/dashboard/page.tsx
git rm frontend/src/components/dashboard-client.tsx
git commit -m "feat(frontend): redesign dashboard as overview page"
```

---

## Chunk 4: Navigation & Verification

### Task 10: Update navigation routes

**Files:**
- Verify: `frontend/src/components/app-shell-desktop.tsx`
- Verify: `frontend/src/components/app-shell-mobile.tsx`

- [ ] **Step 1: Verify desktop routes**

Ensure routes array includes:
```tsx
const routes = [
  { name: "Dashboard", path: "/dashboard", icon: LayoutDashboard },
  { name: "Documents", path: "/documents", icon: FileText },
  { name: "Practice", path: "/practice", icon: Target },
  { name: "Chat", path: "/chat", icon: MessageSquare },
  { name: "Settings", path: "/settings", icon: Settings2 },
]
```

- [ ] **Step 2: Verify mobile routes**

Same routes as desktop.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/components/app-shell-desktop.tsx frontend/src/components/app-shell-mobile.tsx
git commit -m "fix(frontend): verify nav routes for new page structure"
```

### Task 11: Run tests and lint

- [ ] **Step 1: Run lint**

Run: `pnpm run lint` in `frontend/`
Expected: No errors

- [ ] **Step 2: Run tests**

Run: `pnpm run test:run` in `frontend/`
Expected: All tests pass

### Task 12: Verify dev server

- [ ] **Step 1: Start dev server**

Run: `pnpm run dev` in `frontend/`

- [ ] **Step 2: Verify dashboard**

Navigate to `/dashboard` and verify:
- Welcome message with user name
- Quota meters visible (if usage data provided)
- Quick actions grid: Upload, Quiz, Practice, Chat
- Recent documents section shows last 3 docs
- "View all" link navigates to `/documents`
- Empty state shows when no documents with CTA

- [ ] **Step 3: Verify documents page**

Navigate to `/documents` and verify:
- Page title "Documents"
- Upload zone visible
- Search appears when >3 documents
- Document list shows cards with status badges
- Empty state shows when no documents
- Clicking document title navigates to `/documents/[id]`
- Delete button shows on hover (desktop)

- [ ] **Step 4: Verify mobile**

Resize to 390px and verify:
- Dashboard: quick actions in 2-col grid
- Documents: upload zone full width, cards full width
- Bottom nav has all 5 items
- Touch targets >= 44px

- [ ] **Step 5: Verify dark mode**

Toggle dark mode and verify:
- All cards use dark surface colors
- Badges visible and correctly colored
- Upload zone readable
- No light leaks

- [ ] **Step 6: Final commit**

```bash
git add -A
git commit -m "feat(frontend): complete dashboard and documents hub redesign"
```

---

## Notes

- The dashboard intentionally does NOT include an upload zone. Upload is the primary action of `/documents`. This separation gives each page a clear purpose.
- Quota meters are prepared but require a backend endpoint for usage data. The dashboard renders without them gracefully.
- `DocumentCard` is shared between dashboard (recent docs) and documents hub (full list), ensuring visual consistency.
- The old `dashboard-client.tsx` is deleted because its functionality is split: upload/SSE logic moves to `/documents`, document display uses shared `DocumentCard`, and the overview layout is handled by `DashboardOverview`.

---

**Plan complete and saved to `docs/superpowers/plans/2026-04-24-dashboard-documents-hub.md`. Ready to execute?**
