# Mobile Responsiveness & Navigation Design Spec

> **Project:** Clarift — AI Study Engine  
> **Date:** 2026-04-25  
> **Sub-Project:** 1 of 6 (Mobile Responsiveness & Navigation)  
> **Status:** Approved for implementation

---

## Problem Statement

1. **Delete buttons are inaccessible on mobile.** `document-card.tsx` uses `opacity-0 group-hover:opacity-100` which is invisible on touch devices.
2. **Summary and quiz cards have no delete capability.** Users cannot remove generated summaries or quizzes.
3. **Bottom navigation lacks visual polish** — active states are not prominent enough for quick wayfinding.
4. **Chat context notice is persistent** and cannot be dismissed, taking up vertical space.

---

## Goals

- Enable delete actions on **all** card types (document, summary, quiz) on mobile via swipe-to-delete
- Keep existing hover-reveal delete on desktop for consistency
- Improve bottom navigation active state clarity
- Allow users to dismiss the chat context notice
- Follow `design.md` flat-surface philosophy (no glassmorphism)

---

## Architecture

### New Components

| Component | Path | Purpose |
|-----------|------|---------|
| `SwipeCard` | `components/ui/swipe-card.tsx` | Reusable wrapper adding swipe-to-delete gesture |
| `SwipeHint` | `components/ui/swipe-hint.tsx` | Dismissible hint bar for swipe instruction |

### Modified Components

| Component | Path | Change |
|-----------|------|--------|
| `DocumentCard` | `components/features/documents/document-card.tsx` | Wrap with `SwipeCard`; keep hover delete on desktop |
| `SummaryCard` | `components/features/summary/summary-card.tsx` | Wrap with `SwipeCard`; add visible delete button on desktop |
| `QuizList` | `components/features/quiz/quiz-list.tsx` | Wrap quiz cards with `SwipeCard`; move Link to inner content |
| `AppShellMobile` | `components/app-shell-mobile.tsx` | Add active indicator dot; top border; safe area padding |
| `ChatMessages` | `components/features/chat/chat-messages.tsx` | Add dismissible X button to context notice |

### New Server Actions

| Action | Path | Purpose |
|--------|------|---------|
| `deleteSummary` | `app/actions/summaries.ts` | Delete a summary by ID (with auth check) |
| `deleteQuiz` | `app/actions/quizzes.ts` | Delete a quiz by ID (with auth check) |

---

## Design Details

### SwipeCard Component

**Props:**
```typescript
interface SwipeCardProps {
  children: React.ReactNode;
  onDelete: () => Promise<void>;
  deleteConfirmation?: string;
  disabled?: boolean;
}
```

**Touch Behavior:**
- Touch start: Record initial X position
- Touch move: Track deltaX; if deltaX < -40px, start revealing delete panel underneath
- Threshold 1 (80px): Reveal delete action panel (red background `bg-danger-500`, white trash icon)
- Threshold 2 (160px): Auto-trigger delete confirmation dialog
- Release before Threshold 1: Snap back to 0 with 200ms ease-out
- Swipe right: Snap back immediately

**Desktop Behavior:**
- No swipe handlers registered
- Renders children directly; delete action handled by parent via hover

**Animation:**
- Snap-back: `transform: translateX(0)` over 200ms ease-out
- Reveal: `transform: translateX(-80px)` on inner card over 150ms ease
- Delete panel opacity: 0 → 1 over 150ms

**Accessibility:**
- `aria-label="Swipe left to delete"` on swipeable area
- Keyboard users: Tab to focus → `Delete` key opens confirmation dialog
- `prefers-reduced-motion`: Disable snap animation, instant reset

**Implementation Notes:**
- Use `touchstart`/`touchmove`/`touchend` (not PointerEvents) for consistent mobile behavior
- Prevent default scroll only when horizontal delta exceeds vertical delta by 10px
- Delete panel positioned absolute behind card content
- On delete: Show existing `AlertDialog` confirmation before calling `onDelete`
- `disabled` prop: When true, disable swipe gestures and hide delete panel (use for processing/pending items)

### Card-by-Card Application

**Document Card:**
- Wrap existing card with `SwipeCard` (no Link restructuring needed — Link is already inside content area)
- `onDelete` calls existing `deleteDocument` Server Action
- Desktop: Keep existing `group-hover:opacity-100` pattern inside `SwipeCard` (desktop mode renders children normally)
- `deleteConfirmation`: "Delete this document and all associated summaries and quizzes?"

**Summary Card:**
- Restructure: Move `<Link>` to inner content area only (title + metadata), not the entire card
- Wrap outer card with `SwipeCard`
- Add visible delete button on desktop (`md:block`) positioned top-right
- Delete button style: Ghost icon (16px trash), `text-text-secondary hover:text-danger-500`
- `onDelete` calls new `deleteSummary` Server Action
- `deleteConfirmation`: "Delete this summary?"

**Quiz Card:**
- Restructure: Move `<Link>` to inner content area only (title + metadata), not the entire card
- Wrap outer card with `SwipeCard`
- Add visible delete button on desktop (`md:block`) positioned top-right of card
- Delete button style: Ghost icon (16px trash), `text-text-secondary hover:text-danger-500`
- `onDelete` calls new `deleteQuiz` Server Action
- `deleteConfirmation`: "Delete this quiz and all attempts?"

### Bottom Navigation Improvements

**Visual Changes:**
- Add `border-t border-border-default` to separate from content
- Active state: Add 4px indicator dot above icon
  - Dot: `w-1 h-1 rounded-full bg-brand-500`
  - Positioned absolute, centered above icon, `top-1`
- Icon + label container: `relative` for dot positioning
- Ensure `padding-bottom` accounts for iOS safe area (`env(safe-area-inset-bottom)`)

**Animation:**
- Active state transition: Color change 150ms ease
- Dot appearance: Scale 0 → 1, 150ms ease

### Swipe Hint

**Behavior:**
- Appears only on mobile (`md:hidden`)
- Shows at bottom of card lists: "Swipe left on cards to delete"
- Dismissible via X button or auto-dismiss after 5 seconds
- Persist dismissal in `sessionStorage`: `swipe-hint-dismissed`
- Style: Pill-shaped `bg-surface-subtle text-text-secondary text-xs px-3 py-1.5 rounded-full`
- Position: Fixed above bottom nav, centered horizontally

### Chat Context Notice

**Change:**
- Add 16px X button (ghost style) to the right of the notice text
- X icon: `X` from Lucide, `text-text-tertiary hover:text-text-primary`
- On click: Fade opacity 1 → 0 over 150ms, then `display: none`
- Persist in `localStorage`: `chat-context-notice-dismissed`
- Check on mount: If dismissed, don't render notice

---

## Data Flow

### Delete Document (Existing)
```
SwipeCard → onDelete → deleteDocument Server Action → Drizzle DELETE → Revalidate /documents
```

### Delete Summary (New)
```
SwipeCard → onDelete → deleteSummary Server Action → Drizzle DELETE → Revalidate /summaries
```

### Delete Quiz (New)
```
SwipeCard → onDelete → deleteQuiz Server Action → Drizzle DELETE → Revalidate /quizzes
```

---

## Error Handling

- Delete failure: Show toast error "Could not delete [item]. Please try again."
- Network failure during swipe: Card snaps back, no action taken
- Auth failure: Redirect to login (handled by Server Action)

---

## Testing Strategy

- **Unit:** SwipeCard gesture thresholds (80px reveal, 160px trigger)
- **Unit:** Desktop mode — no swipe handlers attached
- **Integration:** Delete document flow (swipe → confirm → delete → list update)
- **Integration:** Delete summary flow (new Server Action)
- **E2E:** Mobile viewport — swipe left on document card, verify delete panel appears
- **E2E:** Chat notice dismissal persists across navigation

---

## Files to Create/Modify

### Create
- `frontend/src/components/ui/swipe-card.tsx`
- `frontend/src/components/ui/swipe-hint.tsx`
- `frontend/src/app/actions/quizzes.ts` (create with `deleteQuiz` — does not currently exist)

### Modify
- `frontend/src/app/actions/summaries.ts` (append `deleteSummary` — file exists with `updateSummaryContent` and `updateSummaryTitle`)

### Modify
- `frontend/src/components/features/documents/document-card.tsx`
- `frontend/src/components/features/summary/summary-card.tsx`
- `frontend/src/components/features/quiz/quiz-list.tsx`
- `frontend/src/components/app-shell-mobile.tsx`
- `frontend/src/components/features/chat/chat-messages.tsx` (context notice dismissal)

---

## Dependencies

- No new packages required
- Uses existing: `lucide-react`, `@radix-ui/react-alert-dialog`, Tailwind CSS

---

## Out of Scope

- Practice/weak area cards (not deletable user content)
- Desktop hover behavior changes (preserved)
- Backend API route changes (Server Actions only, no new FastAPI endpoints)

---

## Success Criteria

- [ ] Document cards show delete action on swipe (mobile)
- [ ] Summary cards have delete capability (mobile swipe + desktop button)
- [ ] Quiz cards have delete capability (mobile swipe + desktop button)
- [ ] Bottom nav active state has indicator dot
- [ ] Chat context notice is dismissible
- [ ] All delete actions have confirmation dialogs
- [ ] No regression on desktop hover interactions
- [ ] Swipe hint appears once and is dismissible
