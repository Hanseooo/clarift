# Mobile Auth UX Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the Clerk sign-in component responsive on the `/login` page, and provide a visible logout path on mobile by adding a Settings tab to the bottom navigation and including a sign-out button in the Settings page.

**Architecture:** Use existing responsive patterns (`hidden md:flex`, `md:hidden`). Add `UserButton` or explicit sign-out to mobile nav and Settings page. Keep changes minimal and aligned with `design.md` mobile-first rules.

**Tech Stack:** Next.js 15, TypeScript, Tailwind 4, shadcn/ui, Clerk, Lucide React.

---

## Chunk 1: Verify and Fix `/login` Clerk Component Responsiveness

### Task 1: Audit current Clerk `<SignIn>` sizing on mobile

**Files:**
- Read: `frontend/src/app/login/login-content.tsx`
- Read: `frontend/src/app/login/page.tsx`

- [ ] **Step 1: Read the login page files**

Run: Read the two files above.

- [ ] **Step 2: Identify any fixed-width or overflow issues**

Look for:
- Hardcoded `width` or `minWidth` on the `<SignIn>` appearance elements.
- Parent containers that don't shrink on small screens.
- Missing `max-w-full` or `overflow-x-auto`.

- [ ] **Step 3: Add responsive constraints if missing**

In `frontend/src/app/login/login-content.tsx`, ensure the container wrapping `<SignIn>` has:

```tsx
<div className="w-full max-w-full px-4">
  <SignIn ... />
</div>
```

If Clerk's default card is too wide for 390px, add appearance override:

```tsx
<SignIn
  appearance={{
    elements: {
      card: "w-full max-w-[360px] mx-auto",
    },
  }}
/>
```

- [ ] **Step 4: Visual check (manual)**

Run dev server: `cd frontend && pnpm run dev`
Open `http://localhost:3000/login` in a 390px-wide viewport (browser devtools).
Confirm the sign-in card fits without horizontal scroll.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/app/login/login-content.tsx
git commit -m "fix(login): ensure clerk sign-in is responsive on mobile"
```

---

## Chunk 2: Add Settings Tab to Mobile Bottom Navigation

### Task 2: Add Settings link to mobile bottom nav

**Files:**
- Modify: `frontend/src/components/app-shell-mobile.tsx`
- Read: `frontend/src/components/app-shell-desktop.tsx` (for nav item list reference)

- [ ] **Step 1: Read both shell files**

Run: Read both files above.

- [ ] **Step 2: Identify nav items and icons**

Desktop sidebar has: Dashboard, Documents, Summaries, Quizzes, Practice, Chat, Settings.
Mobile bottom nav currently has: Dashboard, Documents, Summaries, Practice, Chat.
Missing: Quizzes, Settings.

Per `design.md`, mobile tabs are: Dashboard, Documents, Practice, Chat, Settings.
So we should **replace Summaries with Settings** (since Summaries is accessed from Documents) or **add a 6th tab** if the layout supports it. Given `design.md` explicitly lists 5 tabs including Settings, replace Summaries with Settings.

- [ ] **Step 3: Update mobile nav items**

In `frontend/src/components/app-shell-mobile.tsx`:

Replace the Summaries tab with Settings:

```tsx
import { Settings2 } from "lucide-react"

// Inside the nav array:
const tabs = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/documents", label: "Documents", icon: FileText },
  { href: "/practice", label: "Practice", icon: Target },
  { href: "/chat", label: "Chat", icon: MessageSquare },
  { href: "/settings", label: "Settings", icon: Settings2 },
]
```

Ensure the tab bar still fits 5 items across the viewport (each ~20% width).

- [ ] **Step 4: Verify visual layout**

Run dev server, open mobile viewport, confirm Settings tab appears and is tappable.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/components/app-shell-mobile.tsx
git commit -m "feat(mobile-nav): add settings tab to bottom navigation"
```

---

## Chunk 3: Add Sign-Out Button to Settings Page

### Task 3: Add explicit sign-out button in Settings

**Files:**
- Modify: `frontend/src/app/(app)/settings/client.tsx`
- Test: `frontend/src/app/(app)/settings/__tests__/settings-client.test.tsx` (add or modify)

- [ ] **Step 1: Read current Settings client component**

Run: Read `frontend/src/app/(app)/settings/client.tsx`.

- [ ] **Step 2: Write the failing test**

```tsx
// frontend/src/app/(app)/settings/__tests__/settings-client.test.tsx
import { render, screen, fireEvent } from "@testing-library/react"
import { describe, it, expect, vi } from "vitest"

vi.mock("@clerk/nextjs", () => ({
  useClerk: () => ({ signOut: vi.fn() }),
  UserProfile: () => <div data-testid="user-profile" />,
}))

describe("SettingsClient", () => {
  it("renders a sign out button", () => {
    const { SettingsClient } = await import("../client")
    render(<SettingsClient />)
    expect(screen.getByRole("button", { name: /sign out/i })).toBeInTheDocument()
  })
})
```

- [ ] **Step 3: Run test to verify it fails**

Run: `pnpm run test:run frontend/src/app/(app)/settings/__tests__/settings-client.test.tsx`
Expected: FAIL — button not found.

- [ ] **Step 4: Add sign-out button**

In `frontend/src/app/(app)/settings/client.tsx`:

```tsx
"use client"

import { useClerk } from "@clerk/nextjs"
import { Button } from "@/components/ui/button"
import { LogOut } from "lucide-react"

export function SettingsClient() {
  const { signOut } = useClerk()

  return (
    <div className="space-y-8">
      {/* existing settings content */}

      <div className="pt-6 border-t border-border-default">
        <Button
          variant="destructive"
          onClick={() => signOut({ redirectUrl: "/login" })}
          className="w-full"
        >
          <LogOut className="w-4 h-4 mr-2" />
          Sign out
        </Button>
      </div>
    </div>
  )
}
```

Use the destructive button style from `design.md`:
- `bg: danger-100`
- `text: danger-800`
- `hover: danger-500 bg, white text`

Tailwind equivalent:

```tsx
className="w-full bg-danger-100 text-danger-800 hover:bg-danger-500 hover:text-white"
```

(Confirm Tailwind config has `danger` colors mapped.)

- [ ] **Step 5: Run test to verify it passes**

Run: `pnpm run test:run frontend/src/app/(app)/settings/__tests__/settings-client.test.tsx`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add frontend/src/app/(app)/settings/client.tsx frontend/src/app/(app)/settings/__tests__/settings-client.test.tsx
git commit -m "feat(settings): add sign-out button for mobile and desktop"
```

---

## Chunk 4: Verification

### Task 4: Run frontend verification

- [ ] **Step 1: Run typecheck**

Run: `cd frontend && pnpm run typecheck`
Expected: No errors.

- [ ] **Step 2: Run vitest**

Run: `pnpm run test:run`
Expected: All tests pass.

- [ ] **Step 3: Manual mobile check**

Run dev server, use browser devtools at 390px width:
1. `/login` — Clerk card fits without scroll.
2. App shell — bottom nav shows Dashboard, Documents, Practice, Chat, Settings.
3. Settings page — Sign out button visible and tappable (min 44px height).
4. Tap Sign out — redirects to `/login`.

- [ ] **Step 4: Commit any fixes**

```bash
git add -A
git commit -m "chore: fix type and test issues for mobile auth ux"
```

---

## Files to Create or Modify Summary

| File | Action | Reason |
|------|--------|--------|
| `frontend/src/app/login/login-content.tsx` | Modify | Responsive Clerk sign-in card |
| `frontend/src/components/app-shell-mobile.tsx` | Modify | Add Settings tab to mobile nav |
| `frontend/src/app/(app)/settings/client.tsx` | Modify | Add sign-out button |
| `frontend/src/app/(app)/settings/__tests__/settings-client.test.tsx` | Create | Test sign-out button presence |
