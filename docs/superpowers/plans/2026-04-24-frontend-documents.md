# Documents Page Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a dedicated documents hub at `/documents` with upload zone, searchable/filterable document list, status badges, and delete actions. This is the document management center — the primary entry point for the study loop.

**Architecture:** Server Component page fetches all documents for the authenticated user. Client component handles upload, search filtering, and SSE job tracking. Reuses `<UploadDropzone>`, `<DocumentList>`, and `<SSEProgress>` from foundation.

**Tech Stack:** Next.js 15 (App Router), TypeScript, Tailwind CSS v4, Lucide React

---

## File Structure

| File | Action | Responsibility |
|---|---|---|
| `frontend/src/app/(app)/documents/page.tsx` | Create | Documents hub page (Server Component) |
| `frontend/src/components/features/documents/documents-client.tsx` | Create | Documents interactive client (search, upload, list) |
| `frontend/src/components/features/documents/document-search.tsx` | Create | Search/filter input for document list |

---

## Chunk 1: Documents Page & Client

### Task 1: Create document search component

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

### Task 2: Create documents client component

**Files:**
- Create: `frontend/src/components/features/documents/documents-client.tsx`

- [ ] **Step 1: Create documents client**

```tsx
"use client"

import { useState } from "react"
import { UploadDropzone } from "@/components/upload-dropzone"
import { SSEProgress } from "@/components/ui/sse-progress"
import { DocumentList } from "@/components/features/dashboard/document-list"
import { DocumentSearch } from "./document-search"

interface Document {
  id: string
  title: string
  status: "pending" | "processing" | "ready" | "failed"
  mimeType: string
  createdAt: string
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

  const handleUploadSuccess = (jobId: string) => {
    setActiveJobs((prev) => ({ ...prev, [jobId]: { step: "Processing...", progress: 0 } }))
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

### Task 3: Create documents page

**Files:**
- Create: `frontend/src/app/(app)/documents/page.tsx`

- [ ] **Step 1: Create documents page (Server Component)**

```tsx
import { auth } from "@clerk/nextjs"
import { redirect } from "next/navigation"
import { db } from "@/db"
import { documents } from "@/db/schema"
import { eq, desc } from "drizzle-orm"
import { DocumentsClient } from "@/components/features/documents/documents-client"

export default async function DocumentsPage() {
  const session = await auth()
  if (!session?.userId) redirect("/login")

  const userDocs = await db
    .select()
    .from(documents)
    .where(eq(documents.userId, session.userId))
    .orderBy(desc(documents.createdAt))

  return <DocumentsClient documents={userDocs} />
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

## Chunk 2: Verification

### Task 4: Run tests and lint

- [ ] **Step 1: Run lint**

Run: `pnpm run lint` in `frontend/`
Expected: No errors

### Task 5: Verify dev server

- [ ] **Step 1: Start dev server**

Run: `pnpm run dev` in `frontend/`

- [ ] **Step 2: Verify documents page**

Navigate to `/documents` and verify:
- Page title "Documents" with subtitle
- Upload zone visible at top
- Search input appears when >3 documents
- Document list filters on search input
- Active jobs show SSE progress
- Empty state shows when no documents
- Clicking document title navigates to `/documents/[id]`
- Delete button shows on hover (desktop)

- [ ] **Step 3: Verify mobile**

Resize to 390px and verify:
- Upload zone full width
- Search input full width
- Document cards full width
- Touch targets >= 44px

### Task 6: Final commit

- [ ] **Step 1: Commit all remaining changes**

```bash
git add -A
git commit -m "feat(frontend): complete documents hub page"
```

---

**Plan complete.** Ready to execute?
