# Summaries Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Redesign the summaries list, creation panel, and paginated reader with brand tokens. Summaries live under `/dashboard/summaries` with list view on the index and detail view with paginated reading.

**Architecture:** Server Component pages fetch summaries and documents. Client components handle creation (SSE-driven), list selection, and paginated reading. Reuses `<Card>`, `<Badge>`, `<Button>`, `<SSEProgress>`, `<RichMarkdown>` from foundation.

**Tech Stack:** Next.js 15 (App Router), TypeScript, Tailwind CSS v4, Lucide React

---

## File Structure

| File | Action | Responsibility |
|---|---|---|
| `frontend/src/app/(app)/dashboard/summaries/page.tsx` | Replace | Summaries list + creation page |
| `frontend/src/app/(app)/dashboard/summaries/[id]/page.tsx` | Replace | Summary detail with paginated reader |
| `frontend/src/components/features/summary/summary-list.tsx` | Replace | Summary list with selection |
| `frontend/src/components/features/summary/summary-creation.tsx` | Replace | Summary creation panel with SSE |
| `frontend/src/components/features/summary/paginated-reader.tsx` | Replace | Paginated markdown reader |

---

## Chunk 1: Summary List

### Task 1: Update summary list component

**Files:**
- Modify: `frontend/src/components/features/summary/summary-list.tsx`

- [ ] **Step 1: Read current summary list**

Read the file to understand existing structure.

- [ ] **Step 2: Replace with redesigned list**

```tsx
"use client"

import Link from "next/link"
import { BookOpen, Sparkles } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Card } from "@/components/ui/card"
import { cn } from "@/lib/utils"

interface Summary {
  id: string
  documentTitle: string
  format: string
  createdAt: string
}

interface SummaryListProps {
  summaries: Summary[]
  initialSelectedId?: string
}

export function SummaryList({ summaries, initialSelectedId }: SummaryListProps) {
  if (summaries.length === 0) {
    return (
      <div className="text-center py-8">
        <div className="size-10 rounded-xl bg-surface-subtle flex items-center justify-center mx-auto mb-2">
          <BookOpen className="size-5 text-text-tertiary" />
        </div>
        <h3 className="text-sm font-medium text-text-primary mb-1">
          No summaries yet
        </h3>
        <p className="text-xs text-text-tertiary">
          Upload a document and generate your first summary
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-2">
      {summaries.map((summary) => (
        <Link
          key={summary.id}
          href={`/dashboard/summaries/${summary.id}`}
          className="block"
        >
          <Card
            variant="document"
            className={cn(
              "cursor-pointer",
              initialSelectedId === summary.id && "border-brand-500 bg-brand-500/4"
            )}
          >
            <div className="flex items-center gap-3">
              <div className="size-9 rounded-lg bg-brand-100 flex items-center justify-center flex-shrink-0">
                <Sparkles className="size-[18px] text-brand-400" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-text-primary truncate">
                  {summary.documentTitle}
                </p>
                <p className="text-xs text-text-tertiary mt-0.5">
                  {new Date(summary.createdAt).toLocaleDateString("en-PH", {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  })}
                </p>
              </div>
              <Badge variant="default">{summary.format}</Badge>
            </div>
          </Card>
        </Link>
      ))}
    </div>
  )
}
```

- [ ] **Step 3: Commit**

```bash
git add frontend/src/components/features/summary/summary-list.tsx
git commit -m "feat(frontend): redesign summary list with brand tokens"
```

---

## Chunk 2: Summary Creation

### Task 2: Update summary creation component

**Files:**
- Modify: `frontend/src/components/features/summary/summary-creation.tsx`

- [ ] **Step 1: Read current summary creation**

Read the file to understand existing SSE integration and form logic.

- [ ] **Step 2: Replace with redesigned creation panel**

```tsx
"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { SSEProgress } from "@/components/ui/sse-progress"
import { OverrideSettingsModal } from "@/components/features/generation/override-settings-modal"
import { Settings2 } from "lucide-react"

interface SummaryCreationProps {
  documents: { id: string; title: string }[]
  initialPreferences?: any
  onSummaryCreated?: () => void
}

export function SummaryCreation({
  documents,
  initialPreferences,
  onSummaryCreated,
}: SummaryCreationProps) {
  const router = useRouter()
  const [selectedDoc, setSelectedDoc] = useState("")
  const [format, setFormat] = useState("outline")
  const [isGenerating, setIsGenerating] = useState(false)
  const [jobId, setJobId] = useState<string | null>(null)
  const [showOverrides, setShowOverrides] = useState(false)

  const handleGenerate = async () => {
    if (!selectedDoc) return
    setIsGenerating(true)
    // Call API to generate summary, get jobId
    // Use SSE to track progress
  }

  if (documents.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-sm text-text-tertiary">
          Upload a document first to generate a summary
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold text-text-primary">
        Generate Summary
      </h2>

      {/* Document select */}
      <select
        value={selectedDoc}
        onChange={(e) => setSelectedDoc(e.target.value)}
        className="w-full h-10 px-3 text-sm bg-surface-subtle border border-border-default rounded-lg focus:border-brand-500 focus:ring-2 focus:ring-brand-500/15 transition-colors-fast text-text-primary"
      >
        <option value="">Select a document</option>
        {documents.map((doc) => (
          <option key={doc.id} value={doc.id}>
            {doc.title}
          </option>
        ))}
      </select>

      {/* Format selector */}
      <div className="flex gap-2">
        {["bullet", "outline", "paragraph"].map((f) => (
          <button
            key={f}
            type="button"
            onClick={() => setFormat(f)}
            className={cn(
              "flex-1 h-10 text-sm font-medium rounded-lg border transition-colors-fast",
              format === f
                ? "border-brand-500 bg-brand-500/4 text-brand-500"
                : "border-border-default bg-surface-subtle text-text-secondary hover:border-border-strong"
            )}
          >
            {f.charAt(0).toUpperCase() + f.slice(1)}
          </button>
        ))}
      </div>

      {/* Overrides trigger */}
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setShowOverrides(true)}
        className="w-full"
      >
        <Settings2 className="size-4 mr-2" />
        Override preferences
      </Button>

      {/* Generate button */}
      <Button
        variant="default"
        disabled={!selectedDoc || isGenerating}
        onClick={handleGenerate}
        className="w-full"
      >
        {isGenerating ? "Generating..." : "Generate Summary"}
      </Button>

      {/* SSE progress */}
      {jobId && <SSEProgress jobId={jobId} />}

      {/* Overrides modal */}
      {showOverrides && (
        <OverrideSettingsModal
          initialPreferences={initialPreferences}
          onSave={async (prefs) => {
            // Save overrides
            setShowOverrides(false)
          }}
        />
      )}
    </div>
  )
}
```

- [ ] **Step 3: Commit**

```bash
git add frontend/src/components/features/summary/summary-creation.tsx
git commit -m "feat(frontend): redesign summary creation panel"
```

---

## Chunk 3: Paginated Reader

### Task 3: Update paginated reader

**Files:**
- Modify: `frontend/src/components/features/summary/paginated-reader.tsx`

- [ ] **Step 1: Read current paginated reader**

Read the file to understand existing pagination logic.

- [ ] **Step 2: Replace with redesigned reader**

```tsx
"use client"

import { useState } from "react"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { RichMarkdown } from "@/components/ui/rich-markdown"
import { cn } from "@/lib/utils"

interface PaginatedReaderProps {
  content: string
  documentTitle: string
  format: string
}

export function PaginatedReader({
  content,
  documentTitle,
  format,
}: PaginatedReaderProps) {
  // Split content by ## headers
  const pages = content.split(/## /).filter(Boolean)
  const [currentPage, setCurrentPage] = useState(0)

  const canPrev = currentPage > 0
  const canNext = currentPage < pages.length - 1

  return (
    <div className="max-w-[640px] mx-auto">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-surface-card/95 backdrop-blur supports-[backdrop-filter]:bg-surface-card/60 border-b border-border-default px-4 py-3 flex items-center justify-between">
        <div>
          <h2 className="text-sm font-medium text-text-primary">
            {documentTitle}
          </h2>
        </div>
        <Badge variant="default">{format}</Badge>
      </div>

      {/* Content */}
      <div className="px-4 py-6 min-h-[60vh]">
        <RichMarkdown
          content={pages[currentPage]}
          className="prose-brand"
        />
      </div>

      {/* Footer navigation */}
      <div className="sticky bottom-0 bg-surface-card/95 backdrop-blur supports-[backdrop-filter]:bg-surface-card/60 border-t border-border-default px-4 py-3 flex items-center justify-between">
        <Button
          variant="secondary"
          size="sm"
          disabled={!canPrev}
          onClick={() => setCurrentPage((p) => p - 1)}
        >
          <ChevronLeft className="size-4 mr-1" />
          Previous
        </Button>

        {/* Page indicator */}
        <div className="flex items-center gap-1.5">
          {pages.map((_, i) => (
            <button
              key={i}
              onClick={() => setCurrentPage(i)}
              className={cn(
                "size-2 rounded-full transition-colors-fast",
                i === currentPage
                  ? "bg-brand-500"
                  : "bg-border-default hover:bg-border-strong"
              )}
              aria-label={`Go to page ${i + 1}`}
            />
          ))}
        </div>

        <Button
          variant="default"
          size="sm"
          disabled={!canNext}
          onClick={() => setCurrentPage((p) => p + 1)}
        >
          Next
          <ChevronRight className="size-4 ml-1" />
        </Button>
      </div>

      {/* Page counter */}
      <p className="text-center text-xs text-text-tertiary mt-2">
        Page {currentPage + 1} of {pages.length}
      </p>
    </div>
  )
}
```

- [ ] **Step 3: Commit**

```bash
git add frontend/src/components/features/summary/paginated-reader.tsx
git commit -m "feat(frontend): redesign paginated reader with sticky nav"
```

---

## Chunk 4: Summary Detail Page

### Task 4: Update summary detail page

**Files:**
- Modify: `frontend/src/app/(app)/dashboard/summaries/[id]/page.tsx`

- [ ] **Step 1: Read current summary detail page**

Read the file to understand data fetching.

- [ ] **Step 2: Update page to use paginated reader**

Ensure the page:
1. Fetches summary content, document title, and format
2. Renders `<PaginatedReader>` with the data
3. Shows edit mode when `?edit=true` query param is present
4. Includes a "Generate Quiz" CTA (sticky on desktop, fixed on mobile)

- [ ] **Step 3: Commit**

```bash
git add frontend/src/app/\(app\)/dashboard/summaries/\[id\]/page.tsx
git commit -m "feat(frontend): update summary detail with paginated reader"
```

---

## Chunk 5: Summaries List Page

### Task 5: Update summaries list page

**Files:**
- Modify: `frontend/src/app/(app)/dashboard/summaries/page.tsx`

- [ ] **Step 1: Read current summaries page**

Read the file to understand data fetching.

- [ ] **Step 2: Update page layout**

Structure as two-column grid on desktop (list left, creation right), stacked on mobile:

```tsx
export default async function SummariesPage() {
  // Fetch summaries, documents, preferences
  return (
    <div>
      <h1 className="text-xl font-semibold text-text-primary mb-6">
        Summaries
      </h1>
      <div className="grid grid-cols-1 md:grid-cols-[1fr_320px] gap-6">
        <SummaryList summaries={summaries} />
        <SummaryCreation
          documents={documents}
          initialPreferences={preferences}
        />
      </div>
    </div>
  )
}
```

- [ ] **Step 3: Commit**

```bash
git add frontend/src/app/\(app\)/dashboard/summaries/page.tsx
git commit -m "feat(frontend): update summaries list page layout"
```

---

## Chunk 6: Verification

### Task 6: Run tests and lint

- [ ] **Step 1: Run lint**

Run: `pnpm run lint` in `frontend/`
Expected: No errors

### Task 7: Verify dev server

- [ ] **Step 1: Start dev server**

Run: `pnpm run dev` in `frontend/`

- [ ] **Step 2: Verify summaries**

Navigate to `/dashboard/summaries` and verify:
- Page title "Summaries"
- Two-column layout on desktop (list + creation panel)
- Stacked layout on mobile
- Summary list shows cards with sparkles icon, title, date, format badge
- Empty state when no summaries
- Creation panel has document select, format buttons, generate button
- Clicking summary navigates to detail page

Navigate to `/dashboard/summaries/[id]` and verify:
- Paginated reader with sticky header (document title + format badge)
- Content split by ## headers into pages
- Previous/Next buttons with dot indicators
- Page counter at bottom
- "Generate Quiz" CTA visible

### Task 8: Final commit

- [ ] **Step 1: Commit all remaining changes**

```bash
git add -A
git commit -m "feat(frontend): complete summaries redesign"
```

---

**Plan complete.** Ready to execute?
