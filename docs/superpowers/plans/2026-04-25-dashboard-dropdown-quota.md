# Dashboard, Dropdown & Quota Enhancement Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace generic dropdowns with shadcn Select, add Quizzes/Settings to desktop sidebar, enhance dashboard with recent summaries + weak areas + live quota, display quota on feature pages, and add backend GET quota endpoint.

**Architecture:** Swap `<select>` elements for shadcn Select primitives. Extend desktop sidebar routes. Add new reusable components for quota display, recent summaries, and weak areas. Create backend endpoint to fetch quota usage.

**Tech Stack:** Next.js 15, TypeScript, Tailwind CSS 4, shadcn/ui, Radix Select, FastAPI, SQLAlchemy

---

## Chunk 1: Replace Dropdowns with shadcn Select

**Files:**
- Modify: `frontend/src/components/features/quiz/quiz-creation.tsx`
- Modify: `frontend/src/components/features/summary/summary-creation.tsx`

- [ ] **Step 1: Update QuizCreation to use shadcn Select**

In `frontend/src/components/features/quiz/quiz-creation.tsx`, replace the native `<select>` (lines 60-70) with:

```tsx
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

// Replace the <select> element (lines 60-70) with:
<div className="space-y-1.5">
  <label className="text-sm font-medium text-text-primary">Document</label>
  <Select value={documentId} onValueChange={setDocumentId}>
    <SelectTrigger className="w-full h-10 px-3 text-sm bg-surface-subtle border-border-default rounded-lg focus:border-brand-500 focus:ring-2 focus:ring-brand-500/15">
      <SelectValue placeholder="Select a document" />
    </SelectTrigger>
    <SelectContent>
      {documents.map((doc) => (
        <SelectItem key={doc.id} value={doc.id}>
          {doc.title}
        </SelectItem>
      ))}
    </SelectContent>
  </Select>
</div>
```

- [ ] **Step 2: Update SummaryCreation to use shadcn Select**

In `frontend/src/components/features/summary/summary-creation.tsx`, replace the native `<select>` (lines 145-155) with:

```tsx
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

// Replace the <select> element (lines 145-155) with:
<div className="space-y-2">
  <span className="text-sm font-medium text-foreground">Document</span>
  <Select value={documentId} onValueChange={setDocumentId}>
    <SelectTrigger className="w-full rounded-xl border-border bg-background px-3 py-2 text-sm">
      <SelectValue placeholder="Select a document" />
    </SelectTrigger>
    <SelectContent>
      {documents.map((document) => (
        <SelectItem key={document.id} value={document.id}>
          {document.title}
        </SelectItem>
      ))}
    </SelectContent>
  </Select>
</div>
```

- [ ] **Step 3: Verify TypeScript compiles**

```bash
cd C:\Users\Asus\Desktop\Clarift\frontend
npx tsc --noEmit --skipLibCheck
```

- [ ] **Step 4: Commit**

```bash
cd C:\Users\Asus\Desktop\Clarift
git add frontend/src/components/features/quiz/quiz-creation.tsx
git add frontend/src/components/features/summary/summary-creation.tsx
git commit -m "feat(ui): replace native selects with shadcn Select"
```

---

## Chunk 2: Desktop Sidebar Expansion

**Files:**
- Modify: `frontend/src/components/app-shell-desktop.tsx`

- [ ] **Step 5: Add Quizzes and Settings to sidebar**

Replace the routes array and imports in `frontend/src/components/app-shell-desktop.tsx`:

```tsx
import {
  LayoutDashboard,
  FileText,
  BookOpen,
  GraduationCap,
  Target,
  MessageSquare,
  Settings2,
} from "lucide-react"

const routes = [
  { name: "Dashboard", path: "/dashboard", icon: LayoutDashboard },
  { name: "Documents", path: "/documents", icon: FileText },
  { name: "Summaries", path: "/summaries", icon: BookOpen },
  { name: "Quizzes", path: "/quizzes", icon: GraduationCap },
  { name: "Practice", path: "/practice", icon: Target },
  { name: "Chat", path: "/chat", icon: MessageSquare },
  { name: "Settings", path: "/settings", icon: Settings2 },
]
```

- [ ] **Step 6: Verify TypeScript compiles**

```bash
cd C:\Users\Asus\Desktop\Clarift\frontend
npx tsc --noEmit --skipLibCheck
```

- [ ] **Step 7: Commit**

```bash
cd C:\Users\Asus\Desktop\Clarift
git add frontend/src/components/app-shell-desktop.tsx
git commit -m "feat(nav): add Quizzes and Settings to desktop sidebar"
```

---

## Chunk 3: Backend Quota Endpoint

**Files:**
- Create: `backend/src/api/schemas/quota.py`
- Create: `backend/src/api/routers/quota.py`
- Modify: `backend/src/api/main.py`

- [ ] **Step 8: Create quota response schema**

Create `backend/src/api/schemas/quota.py`:

```python
from datetime import datetime
from pydantic import BaseModel


class QuotaResponse(BaseModel):
    summaries_used: int
    summaries_limit: int
    quizzes_used: int
    quizzes_limit: int
    practice_used: int
    practice_limit: int
    chat_used: int
    chat_limit: int
    reset_at: datetime
    tier: str
```

- [ ] **Step 9: Create quota router**

Create `backend/src/api/routers/quota.py`:

```python
from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from src.api.deps import get_current_user
from src.db.models import User
from src.db.session import get_db
from src.services.quota_service import get_or_create_user_usage, reset_if_needed, TIER_LIMITS
from src.api.schemas.quota import QuotaResponse

router = APIRouter(prefix="/quota", tags=["quota"])


@router.get("", response_model=QuotaResponse)
async def get_quota(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get current quota usage for the authenticated user."""
    usage = await get_or_create_user_usage(db, user.id)
    await reset_if_needed(db, usage)

    limits = TIER_LIMITS.get(user.tier, TIER_LIMITS["free"])

    return QuotaResponse(
        summaries_used=usage.summaries_used,
        summaries_limit=limits["summary"],
        quizzes_used=usage.quizzes_used,
        quizzes_limit=limits["quiz"],
        practice_used=usage.practice_used,
        practice_limit=limits["practice"],
        chat_used=usage.chat_used,
        chat_limit=limits["chat"],
        reset_at=usage.reset_at,
        tier=user.tier,
    )
```

- [ ] **Step 10: Register quota router**

In `backend/src/api/main.py`, add:

```python
from src.api.routers import quota

# In the router inclusion section:
app.include_router(quota.router, prefix="/api/v1")
```

- [ ] **Step 11: Run backend tests**

```bash
cd C:\Users\Asus\Desktop\Clarift\backend
pytest tests/test_quota.py -v
```

If no tests exist, verify syntax:
```bash
cd C:\Users\Asus\Desktop\Clarift\backend
python -m py_compile src/api/routers/quota.py
python -m py_compile src/api/schemas/quota.py
```

- [ ] **Step 12: Commit**

```bash
cd C:\Users\Asus\Desktop\Clarift
git add backend/src/api/schemas/quota.py
git add backend/src/api/routers/quota.py
git add backend/src/api/main.py
git commit -m "feat(api): add GET /api/v1/quota endpoint"
```

---

## Chunk 4: QuotaDisplay Component

**Files:**
- Create: `frontend/src/components/features/quota-display.tsx`

- [ ] **Step 13: Create QuotaDisplay component**

Create `frontend/src/components/features/quota-display.tsx`:

```tsx
import { BookOpen, GraduationCap, Target, MessageSquare } from "lucide-react";
import { cn } from "@/lib/utils";

interface QuotaDisplayProps {
  feature: "summaries" | "quizzes" | "practice" | "chat";
  used: number;
  limit: number;
  resetAt?: string;
}

const featureConfig = {
  summaries: { label: "Summaries", icon: BookOpen },
  quizzes: { label: "Quizzes", icon: GraduationCap },
  practice: { label: "Practice", icon: Target },
  chat: { label: "Chat", icon: MessageSquare },
};

export function QuotaDisplay({ feature, used, limit, resetAt }: QuotaDisplayProps) {
  const config = featureConfig[feature];
  const Icon = config.icon;
  const percentage = Math.min((used / limit) * 100, 100);

  const getBarColor = () => {
    if (percentage >= 90) return "bg-danger-500";
    if (percentage >= 70) return "bg-accent-500";
    return "bg-brand-500";
  };

  const formatResetTime = (resetAt?: string) => {
    if (!resetAt) return null;
    const date = new Date(resetAt);
    return date.toLocaleTimeString("en-PH", { hour: "numeric", minute: "2-digit" });
  };

  return (
    <div className="bg-surface-subtle rounded-lg px-4 py-3 flex items-center gap-3">
      <Icon className="size-4 text-brand-500 flex-shrink-0" />
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-sm text-text-secondary">
            {used} of {limit} {config.label.toLowerCase()} used today
          </span>
        </div>
        <div className="h-1.5 bg-border-default rounded-full overflow-hidden">
          <div
            className={cn("h-full rounded-full transition-all duration-300", getBarColor())}
            style={{ width: `${percentage}%` }}
          />
        </div>
      </div>
      {resetAt && (
        <span className="text-xs text-text-tertiary flex-shrink-0">
          Resets at {formatResetTime(resetAt)}
        </span>
      )}
    </div>
  );
}
```

- [ ] **Step 14: Verify TypeScript compiles**

```bash
cd C:\Users\Asus\Desktop\Clarift\frontend
npx tsc --noEmit --skipLibCheck
```

- [ ] **Step 15: Commit**

```bash
cd C:\Users\Asus\Desktop\Clarift
git add frontend/src/components/features/quota-display.tsx
git commit -m "feat(quota): add QuotaDisplay component"
```

---

## Chunk 5: Update QuotaMeter Props

**Files:**
- Modify: `frontend/src/components/features/dashboard/quota-meter.tsx`

- [ ] **Step 16: Update QuotaMeter to accept props**

The existing `QuotaMeter` already has the correct props interface. Verify it matches:

```tsx
interface QuotaMeterProps {
  label: string
  used: number
  limit: number
  resetAt?: string
}
```

This is already correct in the existing file. No changes needed unless the prop names differ.

- [ ] **Step 17: Verify TypeScript compiles**

```bash
cd C:\Users\Asus\Desktop\Clarift\frontend
npx tsc --noEmit --skipLibCheck
```

---

## Chunk 6: Dashboard Data Fetching

**Files:**
- Modify: `frontend/src/app/(app)/dashboard/page.tsx`

- [ ] **Step 18: Update DashboardPage to fetch quota and weak areas**

Replace `frontend/src/app/(app)/dashboard/page.tsx`:

```tsx
import { redirect } from "next/navigation"
import { currentUser } from "@clerk/nextjs/server"
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

  // Fetch quota data
  let usage = undefined
  try {
    const session = await auth()
    const token = await session.getToken()
    if (token) {
      const apiClient = createAuthenticatedClient(token)
      const { data: quotaData } = await apiClient.GET("/api/v1/quota")
      if (quotaData) {
        usage = {
          summariesUsed: quotaData.summaries_used,
          summariesLimit: quotaData.summaries_limit,
          quizzesUsed: quotaData.quizzes_used,
          quizzesLimit: quotaData.quizzes_limit,
          practiceUsed: quotaData.practice_used,
          practiceLimit: quotaData.practice_limit,
          chatUsed: quotaData.chat_used,
          chatLimit: quotaData.chat_limit,
          resetAt: quotaData.reset_at,
        }
      }
    }
  } catch {
    // Graceful degradation - show dashboard without quota
  }

  // Fetch recent summaries
  let recentSummaries = []
  try {
    const session = await auth()
    const token = await session.getToken()
    if (token) {
      const apiClient = createAuthenticatedClient(token)
      const { data: summariesData } = await apiClient.GET("/api/v1/summaries")
      if (summariesData && Array.isArray(summariesData)) {
        recentSummaries = summariesData.slice(0, 3)
      }
    }
  } catch {
    // Graceful degradation
  }

  // Fetch weak areas
  let weakAreas = []
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
      usage={usage}
      recentSummaries={recentSummaries}
      weakAreas={weakAreas}
    />
  )
}
```

- [ ] **Step 19: Verify TypeScript compiles**

```bash
cd C:\Users\Asus\Desktop\Clarift\frontend
npx tsc --noEmit --skipLibCheck
```

- [ ] **Step 20: Commit**

```bash
cd C:\Users\Asus\Desktop\Clarift
git add frontend/src/app/(app)/dashboard/page.tsx
git commit -m "feat(dashboard): fetch quota, summaries, and weak areas data"
```

---

## Chunk 7: Update DashboardOverview

**Files:**
- Modify: `frontend/src/components/features/dashboard/dashboard-overview.tsx`

- [ ] **Step 21: Add RecentSummaries, WeakAreas, and updated Quota to DashboardOverview**

Update `frontend/src/components/features/dashboard/dashboard-overview.tsx` to accept new props and render new sections:

```tsx
"use client"

import Link from "next/link"
import { FileText, MessageSquare, GraduationCap, Target, Upload, BookOpen, Settings } from "lucide-react"
import { QuotaMeter } from "./quota-meter"
import { QuickActionCard } from "./quick-action-card"
import { DocumentCard } from "@/components/features/documents/document-card"
import { RecentSummaries } from "./recent-summaries"
import { DashboardWeakAreas } from "./dashboard-weak-areas"

interface Document {
  id: string
  title: string
  status: "pending" | "processing" | "ready" | "failed"
  createdAt: Date | string
}

interface Summary {
  id: string
  title: string | null
  format: string
  created_at: string
}

interface WeakArea {
  topic: string
  accuracy: number
}

interface DashboardOverviewProps {
  userName: string
  documents: Document[]
  usage?: {
    summariesUsed: number
    summariesLimit: number
    quizzesUsed: number
    quizzesLimit: number
    practiceUsed: number
    practiceLimit: number
    chatUsed: number
    chatLimit: number
    resetAt: string
  }
  recentSummaries?: Summary[]
  weakAreas?: WeakArea[]
}

export function DashboardOverview({ 
  userName, 
  documents, 
  usage, 
  recentSummaries = [], 
  weakAreas = [] 
}: DashboardOverviewProps) {
  const recentDocuments = documents.slice(0, 3)
  const hasDocuments = documents.length > 0

  return (
    <div className="space-y-8">
      {/* Welcome header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-semibold text-text-primary">
            Welcome back{userName ? `, ${userName.split(" ")[0]}` : ""}
          </h1>
          <p className="text-sm text-text-secondary mt-1">
            Here&apos;s what&apos;s happening with your studies
          </p>
        </div>
        <Link
          href="/settings"
          className="flex items-center justify-center size-9 rounded-lg bg-surface-subtle text-text-secondary hover:text-text-primary hover:bg-surface-overlay transition-colors-fast"
          aria-label="Settings"
        >
          <Settings className="size-[18px] stroke-[1.5]" />
        </Link>
      </div>

      {/* Quota meters - 4 types in 2x2 grid mobile, 4-col desktop */}
      {usage && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
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
          <QuotaMeter
            label="Practice"
            used={usage.practiceUsed}
            limit={usage.practiceLimit}
            resetAt={usage.resetAt}
          />
          <QuotaMeter
            label="Chat"
            used={usage.chatUsed}
            limit={usage.chatLimit}
            resetAt={usage.resetAt}
          />
        </div>
      )}

      {/* Quick actions */}
      <section>
        <h2 className="text-sm font-medium text-text-secondary mb-3 uppercase tracking-wide">
          Quick Actions
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
          <QuickActionCard
            href="/documents"
            icon={<Upload className="size-5 text-brand-500" />}
            label="Upload"
            description="Add notes"
          />
          <QuickActionCard
            href="/summaries"
            icon={<BookOpen className="size-5 text-brand-500" />}
            label="Summaries"
            description="Study guides"
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

      {/* Recent Documents */}
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
                status={doc.status}
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
              Upload your first notes &rarr;
            </Link>
          </div>
        )}
      </section>

      {/* Recent Summaries */}
      <RecentSummaries summaries={recentSummaries} />

      {/* Weak Areas */}
      <DashboardWeakAreas weakAreas={weakAreas} />
    </div>
  )
}
```

- [ ] **Step 22: Verify TypeScript compiles**

```bash
cd C:\Users\Asus\Desktop\Clarift\frontend
npx tsc --noEmit --skipLibCheck
```

- [ ] **Step 23: Commit**

```bash
cd C:\Users\Asus\Desktop\Clarift
git add frontend/src/components/features/dashboard/dashboard-overview.tsx
git commit -m "feat(dashboard): add recent summaries and weak areas sections"
```

---

## Chunk 8: Create RecentSummaries Component

**Files:**
- Create: `frontend/src/components/features/dashboard/recent-summaries.tsx`

- [ ] **Step 24: Create RecentSummaries component**

Create `frontend/src/components/features/dashboard/recent-summaries.tsx`:

```tsx
import Link from "next/link";
import { BookOpen } from "lucide-react";

interface Summary {
  id: string;
  title: string | null;
  format: string;
  created_at: string;
}

interface RecentSummariesProps {
  summaries: Summary[];
}

export function RecentSummaries({ summaries }: RecentSummariesProps) {
  const hasSummaries = summaries.length > 0;

  return (
    <section>
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-medium text-text-secondary uppercase tracking-wide">
          Recent Summaries
        </h2>
        {hasSummaries && (
          <Link
            href="/summaries"
            className="text-xs text-brand-500 hover:text-brand-600 font-medium"
          >
            View all
          </Link>
        )}
      </div>

      {hasSummaries ? (
        <div className="space-y-2">
          {summaries.map((summary) => (
            <Link
              key={summary.id}
              href={`/summaries/${summary.id}`}
              className="group bg-surface-card border border-border-default rounded-xl p-4 flex items-center gap-3 hover:bg-surface-overlay hover:border-border-strong transition-colors-fast"
            >
              <div className="size-9 rounded-lg bg-brand-100 flex items-center justify-center flex-shrink-0">
                <BookOpen className="size-[18px] text-brand-400" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-text-primary truncate">
                  {summary.title || "Untitled summary"}
                </p>
                <p className="text-xs text-text-tertiary mt-0.5">
                  <span className="inline-flex items-center rounded-full bg-brand-100 px-2 py-0.5 text-[11px] font-medium text-brand-800 mr-2">
                    {summary.format}
                  </span>
                  {new Date(summary.created_at).toLocaleDateString("en-PH", {
                    month: "short",
                    day: "numeric",
                  })}
                </p>
              </div>
            </Link>
          ))}
        </div>
      ) : (
        <div className="text-center py-8 bg-surface-subtle rounded-xl">
          <BookOpen className="size-8 text-text-tertiary mx-auto mb-2" />
          <p className="text-sm text-text-secondary">No summaries yet</p>
          <Link
            href="/documents"
            className="text-xs text-brand-500 hover:text-brand-600 font-medium mt-1 inline-block"
          >
            Upload notes to get started &rarr;
          </Link>
        </div>
      )}
    </section>
  );
}
```

- [ ] **Step 25: Verify TypeScript compiles**

```bash
cd C:\Users\Asus\Desktop\Clarift\frontend
npx tsc --noEmit --skipLibCheck
```

- [ ] **Step 26: Commit**

```bash
cd C:\Users\Asus\Desktop\Clarift
git add frontend/src/components/features/dashboard/recent-summaries.tsx
git commit -m "feat(dashboard): add RecentSummaries component"
```

---

## Chunk 9: Create DashboardWeakAreas Component

**Files:**
- Create: `frontend/src/components/features/dashboard/dashboard-weak-areas.tsx`

- [ ] **Step 27: Create DashboardWeakAreas component**

Create `frontend/src/components/features/dashboard/dashboard-weak-areas.tsx`:

```tsx
import Link from "next/link";
import { Target } from "lucide-react";

interface WeakArea {
  topic: string;
  accuracy: number;
}

interface DashboardWeakAreasProps {
  weakAreas: WeakArea[];
}

export function DashboardWeakAreas({ weakAreas }: DashboardWeakAreasProps) {
  const hasWeakAreas = weakAreas.length > 0;
  const displayAreas = weakAreas.slice(0, 3);

  return (
    <section>
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-medium text-text-secondary uppercase tracking-wide">
          Weak Areas
        </h2>
        {hasWeakAreas && (
          <Link
            href="/practice"
            className="text-xs text-brand-500 hover:text-brand-600 font-medium"
          >
            View all
          </Link>
        )}
      </div>

      {hasWeakAreas ? (
        <div className="space-y-2">
          {displayAreas.map((area) => (
            <div
              key={area.topic}
              className="bg-surface-card border border-border-default rounded-xl p-3 flex items-center gap-3"
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-1">
                  <p className="text-sm font-medium text-text-primary truncate">
                    {area.topic}
                  </p>
                  <span className="text-sm font-semibold text-accent-500 flex-shrink-0 ml-2">
                    {area.accuracy}%
                  </span>
                </div>
                <div className="h-[3px] w-full bg-border-default rounded-full overflow-hidden">
                  <div
                    className="h-full bg-accent-500 rounded-full"
                    style={{ width: `${area.accuracy}%` }}
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-8 bg-surface-subtle rounded-xl">
          <Target className="size-8 text-text-tertiary mx-auto mb-2" />
          <p className="text-sm text-text-secondary">No weak areas yet</p>
          <p className="text-xs text-text-tertiary mt-1">
            Complete a few quizzes to discover your gaps.
          </p>
        </div>
      )}
    </section>
  );
}
```

- [ ] **Step 28: Verify TypeScript compiles**

```bash
cd C:\Users\Asus\Desktop\Clarift\frontend
npx tsc --noEmit --skipLibCheck
```

- [ ] **Step 29: Commit**

```bash
cd C:\Users\Asus\Desktop\Clarift
git add frontend/src/components/features/dashboard/dashboard-weak-areas.tsx
git commit -m "feat(dashboard): add DashboardWeakAreas component"
```

---

## Chunk 10: Add Quota to Feature Pages

**Files:**
- Modify: `frontend/src/app/(app)/summaries/page.tsx`
- Modify: `frontend/src/app/(app)/practice/page.tsx`
- Modify: `frontend/src/app/(app)/chat/page.tsx`
- Modify: `frontend/src/app/(app)/documents/page.tsx`

- [ ] **Step 30: Add QuotaDisplay to Summaries page**

Add to `frontend/src/app/(app)/summaries/page.tsx` before the return statement:

```tsx
// Fetch quota data
let quotaData = null
if (token) {
  try {
    const quotaResponse = await apiClient.GET("/api/v1/quota")
    if (quotaResponse.data) {
      quotaData = quotaResponse.data
    }
  } catch {
    // Graceful degradation
  }
}
```

Then add `QuotaDisplay` in the JSX:

```tsx
{quotaData && (
  <div className="mb-6">
    <QuotaDisplay
      feature="summaries"
      used={quotaData.summaries_used}
      limit={quotaData.summaries_limit}
      resetAt={quotaData.reset_at}
    />
  </div>
)}
```

- [ ] **Step 31: Add QuotaDisplay to Practice page**

Similar changes to `frontend/src/app/(app)/practice/page.tsx`:

```tsx
// Fetch quota data
let quotaData = null
try {
  const quotaResponse = await apiClient.GET("/api/v1/quota")
  if (quotaResponse.data) {
    quotaData = quotaResponse.data
  }
} catch {
  // Graceful degradation
}
```

```tsx
{quotaData && (
  <div className="mb-6">
    <QuotaDisplay
      feature="practice"
      used={quotaData.practice_used}
      limit={quotaData.practice_limit}
      resetAt={quotaData.reset_at}
    />
  </div>
)}
```

- [ ] **Step 32: Add QuotaDisplay to Chat page**

Similar changes to `frontend/src/app/(app)/chat/page.tsx`:

```tsx
{quotaData && (
  <div className="mb-6">
    <QuotaDisplay
      feature="chat"
      used={quotaData.chat_used}
      limit={quotaData.chat_limit}
      resetAt={quotaData.reset_at}
    />
  </div>
)}
```

- [ ] **Step 33: Add document count to Documents page**

For `frontend/src/app/(app)/documents/page.tsx`, show a simple count instead of QuotaDisplay:

```tsx
const documentCount = documents.length
const documentLimit = 5 // Free tier lifetime limit

// In the JSX, add below the header:
{documentCount > 0 && (
  <div className="mb-6 bg-surface-subtle rounded-lg px-4 py-3 flex items-center gap-3">
    <FileText className="size-4 text-brand-500" />
    <span className="text-sm text-text-secondary">
      {documentCount} of {documentLimit} documents uploaded
    </span>
    <div className="flex-1 h-1.5 bg-border-default rounded-full overflow-hidden">
      <div
        className="h-full bg-brand-500 rounded-full"
        style={{ width: `${Math.min((documentCount / documentLimit) * 100, 100)}%` }}
      />
    </div>
  </div>
)}
```

- [ ] **Step 34: Verify TypeScript compiles**

```bash
cd C:\Users\Asus\Desktop\Clarift\frontend
npx tsc --noEmit --skipLibCheck
```

- [ ] **Step 35: Commit**

```bash
cd C:\Users\Asus\Desktop\Clarift
git add frontend/src/app/(app)/summaries/page.tsx
git add frontend/src/app/(app)/practice/page.tsx
git add frontend/src/app/(app)/chat/page.tsx
git add frontend/src/app/(app)/documents/page.tsx
git commit -m "feat(quota): add quota display to feature pages"
```

---

## Chunk 11: Integration & Testing

- [ ] **Step 36: Run frontend type check**

```bash
cd C:\Users\Asus\Desktop\Clarift\frontend
npx tsc --noEmit --skipLibCheck
```

- [ ] **Step 37: Run frontend tests**

```bash
cd C:\Users\Asus\Desktop\Clarift\frontend
pnpm run test:run
```

- [ ] **Step 38: Run linting**

```bash
cd C:\Users\Asus\Desktop\Clarift\frontend
npx biome check .
cd C:\Users\Asus\Desktop\Clarift\backend
ruff check .
```

- [ ] **Step 39: Final verification commit**

```bash
cd C:\Users\Asus\Desktop\Clarift
git commit --allow-empty -m "feat(dashboard): complete dropdown, dashboard, and quota enhancements"
```

---

## Verification Checklist

- [ ] Quiz creation uses shadcn Select component
- [ ] Summary creation uses shadcn Select component
- [ ] Desktop sidebar shows 7 items including Quizzes and Settings
- [ ] Dashboard shows recent summaries section
- [ ] Dashboard shows weak areas section
- [ ] Dashboard shows live quota meters (all 4 types)
- [ ] Documents page shows document upload count
- [ ] Summaries page shows quota display
- [ ] Practice page shows quota display
- [ ] Chat page shows quota display
- [ ] Backend GET /api/v1/quota endpoint works
- [ ] All components mobile-first and follow design.md
- [ ] TypeScript compiles without errors
- [ ] Tests pass

---

## All Plan Documents Complete

This completes the planning phase for all three groups:

1. **Sub-Project 1:** Mobile Responsiveness & Navigation
   - Spec: `docs/superpowers/specs/2026-04-25-mobile-responsiveness-design.md`
   - Plan: `docs/superpowers/plans/2026-04-25-mobile-responsiveness.md`

2. **Group A:** Quiz Results & UX Enhancement
   - Spec: `docs/superpowers/specs/2026-04-25-quiz-results-ux-design.md`
   - Plan: `docs/superpowers/plans/2026-04-25-quiz-results-ux.md`

3. **Group B:** Dashboard, Dropdown & Quota Enhancement
   - Spec: `docs/superpowers/specs/2026-04-25-dashboard-dropdown-quota-design.md`
   - Plan: `docs/superpowers/plans/2026-04-25-dashboard-dropdown-quota.md`

Ready for implementation execution.
