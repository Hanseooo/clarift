# Dashboard, Dropdown & Quota Enhancement Design Spec

> **Project:** Clarift — AI Study Engine  
> **Date:** 2026-04-25  
> **Sub-Project:** Group B (Dropdown + Dashboard UI + Quota Display)  
> **Status:** Approved for implementation

---

## Problem Statement

1. **Generic HTML dropdowns** in quiz and summary creation don't match the app's design system.
2. **Desktop sidebar is missing Quizzes and Settings** — core features are buried.
3. **Dashboard lacks key information** — no recent summaries, no weak areas, no quota data.
4. **Quota is not displayed** on documents, summaries, practice, or chat pages.
5. **No backend endpoint exists** to fetch current quota usage.

---

## Goals

- Replace generic `<select>` with shadcn/ui `Select` in quiz and summary creation
- Add Quizzes and Settings to desktop sidebar for better discoverability
- Enhance dashboard with recent summaries, weak areas, and live quota meters
- Display quota meters on all feature pages (documents, summaries, practice, chat)
- Add `GET /api/v1/quota` backend endpoint
- All changes mobile-first and aligned with `design.md`

---

## Architecture

### New Components

| Component | Path | Purpose |
|-----------|------|---------|
| `QuotaDisplay` | `components/features/quota-display.tsx` | Reusable quota meter for feature pages |
| `RecentSummaries` | `components/features/dashboard/recent-summaries.tsx` | Dashboard recent summaries section |
| `DashboardWeakAreas` | `components/features/dashboard/dashboard-weak-areas.tsx` | Dashboard weak areas section |

### Modified Components

| Component | Path | Change |
|-----------|------|--------|
| `QuizCreation` | `components/features/quiz/quiz-creation.tsx` | Replace `<select>` with shadcn Select |
| `SummaryCreation` | `components/features/summary/summary-creation.tsx` | Replace `<select>` with shadcn Select |
| `AppShellDesktop` | `components/app-shell-desktop.tsx` | Add Quizzes and Settings routes |
| `QuotaMeter` | `components/features/dashboard/quota-meter.tsx` | Update props to accept `{ label, used, limit, resetAt }` instead of mock data |
| `DashboardOverview` | `components/features/dashboard/dashboard-overview.tsx` | Add recent summaries, weak areas, live quota |
| `DashboardPage` | `app/(app)/dashboard/page.tsx` | Fetch quota + weak areas + summaries data |
| `DocumentsPage` | `app/(app)/documents/page.tsx` | Add document upload count display |
| `SummariesPage` | `app/(app)/summaries/page.tsx` | Add QuotaDisplay |
| `PracticePage` | `app/(app)/practice/page.tsx` | Add QuotaDisplay |
| `ChatPage` | `app/(app)/chat/page.tsx` | Add QuotaDisplay |
| `Backend API` | `backend/src/api/main.py` | Register quota router |

### New Backend

| File | Path | Purpose |
|------|------|---------|
| `Quota response schema` | `backend/src/api/schemas/quota.py` | Pydantic model for quota data |
| `Quota router` | `backend/src/api/routers/quota.py` | GET /api/v1/quota endpoint |

---

## Design Details

### Custom Dropdown (shadcn Select)

Replace generic HTML `<select>` with existing shadcn/ui `Select` component:

```tsx
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

// Usage:
<Select value={documentId} onValueChange={setDocumentId}>
  <SelectTrigger className="w-full">
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
```

**Styling:** Already matches design.md via `select.tsx` overrides:
- Border: `border-border-default`
- Focus: `focus:border-brand-500 focus:ring-brand-500/20`
- Background: `bg-background`
- Text: `text-foreground`

**Files to update:**
- `frontend/src/components/features/quiz/quiz-creation.tsx` (line 60-70)
- `frontend/src/components/features/summary/summary-creation.tsx` (line 145-155)

### Desktop Sidebar Expansion

**New routes array:**
```typescript
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

**Mobile nav:** Unchanged (max 5 items per design.md). Quizzes and Settings remain accessible via dashboard quick actions and header icon.

### Dashboard Layout Improvements

**New section order (mobile-first, stacked):**
1. Welcome header
2. Quota meters (2-column grid on mobile, side-by-side on desktop)
3. Quick actions
4. Recent Documents (3 items)
5. Recent Summaries (3 items)
6. Weak Areas (3 items, or empty state)

**Section spacing:** `space-y-8` between major sections (32px mobile, 48px desktop)

### Recent Summaries Section

```
Section header (flex, justify-between):
  "Recent Summaries" text-sm font-medium text-text-secondary uppercase tracking-wide
  "View all" link (if summaries exist) → /summaries

Summary cards (space-y-2):
  Same structure as DocumentCard but:
    - Icon: BookOpen (18px, brand-400)
    - Icon box bg: brand-100
    - Title: text-sm font-medium text-text-primary
    - Subtitle: "[format badge] · [date]"
    - Format badge: bg-brand-100 text-brand-800 text-[11px] font-medium

Empty state:
  bg-surface-subtle rounded-xl py-8 text-center
  BookOpen icon 32px text-text-tertiary mb-2
  "No summaries yet" text-sm text-text-secondary
  CTA link → /documents "Upload notes to get started →"
```

### Weak Areas Section

```
Section header (flex, justify-between):
  "Weak Areas" text-sm font-medium text-text-secondary uppercase tracking-wide
  "View all" link (if weak areas exist) → /practice

Weak area cards (max 3, space-y-2):
  Compact version of WeakTopicsList:
    - Remove icon ring (save space)
    - Single row: [topic name] [accuracy %]
    - Progress bar below: 3px height, accent-500 fill
    - Card padding: 12px 14px (smaller than full WeakTopicsList)

Empty state:
  bg-surface-subtle rounded-xl py-8 text-center
  Target icon 32px text-text-tertiary mb-2
  "No weak areas yet" text-sm text-text-secondary
  Body: "Complete a few quizzes to discover your gaps." text-xs text-text-tertiary
```

### Quota Meters (Dashboard)

Use existing `QuotaMeter` component. Fetch real data from new endpoint.

**Display all 4 quota types:**
- Summaries (3/day free, 10/day pro)
- Quizzes (3/day free, 15/day pro)
- Practice (3/day free, 12/day pro)
- Chat (12/day free, 60/day pro)

**Note:** Documents have a lifetime upload limit, not a daily meter. Display on Documents page as a simple count ("X of 8 documents uploaded") instead of the QuotaDisplay component.

**Grid layout:**
- Mobile: `grid-cols-2` (2x2 grid)
- Desktop: `grid-cols-4` (single row)

### QuotaDisplay Component (Feature Pages)

Reusable component for Summaries, Practice, and Chat pages:

```
Props:
  feature: "summaries" | "quizzes" | "practice" | "chat"
  usage: { used: number; limit: number; resetAt: string }

Layout:
  Inline quota meter at top of page (below header, above content)
  Style: bg-surface-subtle rounded-lg px-4 py-3 flex items-center gap-3
  
  [Feature icon, 16px, brand-500]
  [Label: "X of Y used today" text-sm text-text-secondary]
  [Progress bar: flex-1, h-1.5, rounded-full]
  [Reset time: text-xs text-text-tertiary]

If no usage data (undefined): Don't render
```

### Backend Quota Endpoint

**Route:** `GET /api/v1/quota`

**Response schema:**
```python
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
    tier: str  # "free" or "pro"
```

**Implementation:**
- Auth: `user: User = Depends(get_current_user)` (Clerk JWT)
- Reuse `quota_service.py` functions
- Get user tier from `User` model
- Call `get_or_create_user_usage()` + `reset_if_needed()`
- Return current counters and limits from `TIER_LIMITS`

**Frontend usage:**
- Server Component fetches on page load
- Pass to `DashboardOverview` and `QuotaDisplay`

---

## Data Flow

### Dashboard Data Fetch
```
DashboardPage (Server Component):
  → getDocuments() [existing Server Action]
  → GET /api/v1/summaries [existing API]
  → GET /api/v1/quota [new]
  → GET /api/v1/practice/weak-areas [existing API]
  → Pass all to DashboardOverview
```

### Feature Page Quota
```
SummariesPage/PracticePage/ChatPage (Server Component):
  → GET /api/v1/quota [new]
  → Pass to page client component → render QuotaDisplay

DocumentsPage (Server Component):
  → getDocuments() [existing Server Action]
  → Count array length vs lifetime limit (5 for free tier)
  → Show simple count: "X of 8 documents uploaded"
```

---

## Error Handling

- Quota fetch fails: Show dashboard without quota meters (graceful degradation)
- Weak areas fetch fails: Omit weak areas section
- Recent summaries fetch fails: Omit recent summaries section
- All errors logged but don't block page render

---

## Testing Strategy

- **Unit:** QuotaDisplay renders correctly with/without data
- **Unit:** Quota endpoint returns correct limits per tier
- **Integration:** Dashboard fetches all data sources correctly
- **E2E:** Quiz creation uses shadcn Select (not native dropdown)
- **E2E:** Desktop sidebar shows 7 nav items including Quizzes and Settings
- **E2E:** Feature pages show quota meters at top

---

## Files to Create/Modify

### Create
- `backend/src/api/schemas/quota.py`
- `backend/src/api/routers/quota.py`
- `frontend/src/components/features/quota-display.tsx`
- `frontend/src/components/features/dashboard/recent-summaries.tsx`
- `frontend/src/components/features/dashboard/dashboard-weak-areas.tsx`

### Modify
- `frontend/src/components/features/quiz/quiz-creation.tsx`
- `frontend/src/components/features/summary/summary-creation.tsx`
- `frontend/src/components/app-shell-desktop.tsx`
- `frontend/src/components/features/dashboard/dashboard-overview.tsx`
- `frontend/src/app/(app)/dashboard/page.tsx`
- `frontend/src/app/(app)/documents/page.tsx`
- `frontend/src/app/(app)/summaries/page.tsx`
- `frontend/src/app/(app)/practice/page.tsx`
- `frontend/src/app/(app)/chat/page.tsx`
- `backend/src/api/main.py` (register quota router)

---

## Dependencies

- Frontend: No new packages (uses existing shadcn Select)
- Backend: No new packages

---

## Out of Scope

- Mobile bottom nav changes (max 5 items enforced)
- Quota enforcement logic (already exists)
- User tier upgrade flow
- Real-time quota updates (page reload required)

---

## Success Criteria

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

## Grouping Note

This spec covers Sub-Projects 2, 5, and 6 combined per user direction. Implementation plan will be written as a single plan with tasks for all three areas.
