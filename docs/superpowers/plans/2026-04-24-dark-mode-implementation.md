# Dark Mode Implementation Plan

> **For agentic workers:** Use superpowers:subagent-driven-development or superpowers:executing-plans to implement. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Activate dark mode across the entire Clarift frontend using `next-themes` with system preference detection and a manual toggle in settings. All pages must render correctly in both light and dark modes.

**Architecture:** `next-themes` ThemeProvider in root layout → `ThemeToggle` component in app shell → CSS `dark:` variants already defined in `globals.css`.

**Tech Stack:** Next.js 15, `next-themes`, Tailwind CSS v4, shadcn/ui

---

## Prerequisites

- [ ] Frontend foundation Phase 1 is complete (tokens, app shell, shared components)
- [ ] `globals.css` already contains `.dark` block with full dark palette overrides
- [ ] All landing page components use brand tokens (no hardcoded light colors)

---

## File Structure

| File | Action | Responsibility |
|---|---|---|
| `frontend/package.json` | Modify | Add `next-themes` dependency |
| `frontend/src/app/layout.tsx` | Modify | Wrap app in `ThemeProvider` with `attribute="class"` |
| `frontend/src/components/theme-provider.tsx` | Create | `next-themes` wrapper with forced system default |
| `frontend/src/components/theme-toggle.tsx` | Create | Sun/moon toggle button for app shell |
| `frontend/src/components/app-shell-desktop.tsx` | Modify | Add theme toggle to sidebar footer |
| `frontend/src/components/app-shell-mobile.tsx` | Modify | Add theme toggle to mobile nav or settings |
| `frontend/src/app/(app)/dashboard/settings/page.tsx` | Modify | Add theme preference dropdown |
| `frontend/src/app/globals.css` | Verify | Ensure `.dark` block covers all custom tokens |

---

## Chunk 1: Install next-themes

### Task 1: Add next-themes dependency

**Files:**
- Modify: `frontend/package.json`

- [ ] **Step 1: Install next-themes**

Run: `pnpm add next-themes` in `frontend/`

- [ ] **Step 2: Verify install**

Run: `pnpm list next-themes`
Expected: `next-themes` listed

- [ ] **Step 3: Commit**

```bash
git add frontend/package.json frontend/pnpm-lock.yaml
git commit -m "chore(frontend): add next-themes for dark mode"
```

---

## Chunk 2: Theme Provider Setup

### Task 2: Create ThemeProvider wrapper

**Files:**
- Create: `frontend/src/components/theme-provider.tsx`

- [ ] **Step 1: Create wrapper component**

```tsx
"use client"

import { ThemeProvider as NextThemesProvider } from "next-themes"
import { type ReactNode } from "react"

export function ThemeProvider({ children }: { children: ReactNode }) {
  return (
    <NextThemesProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      disableTransitionOnChange={false}
    >
      {children}
    </NextThemesProvider>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/components/theme-provider.tsx
git commit -m "feat(frontend): add ThemeProvider wrapper"
```

### Task 3: Update root layout

**Files:**
- Modify: `frontend/src/app/layout.tsx`

- [ ] **Step 1: Add ThemeProvider to layout**

Wrap `ClerkProvider` children with `ThemeProvider`:

```tsx
import { ThemeProvider } from "@/components/theme-provider"

// ... existing imports

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable} ${jetbrainsMono.variable}`} suppressHydrationWarning>
      <body className="min-h-screen bg-surface-page text-text-primary antialiased">
        <ThemeProvider>
          <ClerkProvider>{children}</ClerkProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}
```

Note: `suppressHydrationWarning` on `<html>` prevents Next.js hydration mismatch warnings from theme class toggling.

- [ ] **Step 2: Commit**

```bash
git add frontend/src/app/layout.tsx
git commit -m "feat(frontend): integrate ThemeProvider into root layout"
```

---

## Chunk 3: Theme Toggle Component

### Task 4: Create ThemeToggle

**Files:**
- Create: `frontend/src/components/theme-toggle.tsx`

- [ ] **Step 1: Create toggle button**

```tsx
"use client"

import { useTheme } from "next-themes"
import { Button } from "@/components/ui/button"
import { Sun, Moon } from "lucide-react"
import { useEffect, useState } from "react"

export function ThemeToggle() {
  const { theme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)

  useEffect(() => setMounted(true), [])

  if (!mounted) {
    return <div className="w-9 h-9" /> // Placeholder to prevent layout shift
  }

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
      aria-label="Toggle theme"
    >
      {theme === "dark" ? (
        <Sun className="size-5 text-text-secondary" />
      ) : (
        <Moon className="size-5 text-text-secondary" />
      )}
    </Button>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/components/theme-toggle.tsx
git commit -m "feat(frontend): add theme toggle button"
```

---

## Chunk 4: Add Toggle to App Shell

### Task 5: Add toggle to desktop sidebar

**Files:**
- Modify: `frontend/src/components/app-shell-desktop.tsx`

- [ ] **Step 1: Add ThemeToggle next to UserButton**

```tsx
import { ThemeToggle } from "./theme-toggle"

// In the footer section:
<div className="p-3 border-t border-border-default flex items-center justify-between">
  <UserButton />
  <ThemeToggle />
</div>
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/components/app-shell-desktop.tsx
git commit -m "feat(frontend): add theme toggle to desktop sidebar"
```

### Task 6: Add theme setting to settings page

**Files:**
- Modify: `frontend/src/app/(app)/dashboard/settings/page.tsx` or settings client component

- [ ] **Step 1: Add theme preference selector**

Add a "Appearance" section with radio options:
- System (default)
- Light
- Dark

Use `useTheme()` from `next-themes` to sync the selection.

- [ ] **Step 2: Commit**

```bash
git add frontend/src/app/(app)/dashboard/settings/page.tsx
git commit -m "feat(frontend): add appearance theme setting"
```

---

## Chunk 5: Dark Mode Audit & Fixes

### Task 7: Fix onboarding page colors

**Files:**
- Modify: `frontend/src/app/onboarding/page.tsx` and related components

- [ ] **Step 1: Replace zinc colors with brand tokens**

Find and replace:
- `bg-zinc-50` → `bg-surface-page`
- `bg-zinc-950` → `bg-surface-page` (dark mode)
- `text-zinc-900` → `text-text-primary`
- `text-zinc-50` → `text-text-primary` (dark mode)
- `border-zinc-200` → `border-border-default`
- `border-zinc-800` → `border-border-default` (dark mode)
- `focus:ring-zinc-900` → `focus:ring-brand-500`

- [ ] **Step 2: Commit**

```bash
git add frontend/src/app/onboarding/
git commit -m "fix(frontend): replace zinc colors with brand tokens in onboarding"
```

### Task 8: Fix settings page colors

**Files:**
- Modify: `frontend/src/app/(app)/dashboard/settings/page.tsx` and settings client

- [ ] **Step 1: Replace zinc colors with brand tokens**

Same replacements as onboarding.

- [ ] **Step 2: Commit**

```bash
git add frontend/src/app/(app)/dashboard/settings/
git commit -m "fix(frontend): replace zinc colors with brand tokens in settings"
```

### Task 9: Fix document status badges

**Files:**
- Modify: `frontend/src/app/documents/[id]/page.tsx` or badge components

- [ ] **Step 1: Replace arbitrary colors with semantic tokens**

Find and replace:
- `bg-green-100 text-green-800` → `bg-success-100 text-success-800`
- `bg-yellow-100` → `bg-warning-100`
- `bg-red-100 text-red-800` → `bg-danger-100 text-danger-800`
- `bg-gray-100` → `bg-surface-subtle text-text-secondary`
- All `dark:bg-*` variants should use the same token system

- [ ] **Step 2: Commit**

```bash
git add frontend/src/app/documents/
git commit -m "fix(frontend): replace arbitrary colors with semantic tokens in documents"
```

### Task 10: Audit dashboard for color drift

**Files:**
- Modify: `frontend/src/components/dashboard-client.tsx`

- [ ] **Step 1: Fix color inconsistencies**

Replace:
- `bg-green-500/10 text-green-700` → `bg-success-100 text-success-800`
- `bg-blue-500/10 text-blue-700` → `bg-brand-100 text-brand-700`

- [ ] **Step 2: Commit**

```bash
git add frontend/src/components/dashboard-client.tsx
git commit -m "fix(frontend): use semantic tokens in dashboard badges"
```

---

## Chunk 6: Verification

### Task 11: Test dark mode across all pages

- [ ] **Step 1: Toggle dark mode in app shell**

- Click sun/moon toggle → page should switch instantly
- No flash of unstyled content (FOUC)
- All cards, text, borders switch correctly

- [ ] **Step 2: Test system preference**

- Set OS to dark mode, reload page → should start in dark
- Set OS to light mode, reload page → should start in light

- [ ] **Step 3: Test each page in dark mode**

Verify on:
- `/` (landing) — shader bg, bubbles, gradient text
- `/login` — centered card
- `/onboarding` — step form
- `/dashboard` — quota meters, document cards
- `/documents/[id]` — summary, quiz
- `/quizzes` — quiz list, creation
- `/chat` — message bubbles, thinking dots
- `/dashboard/settings` — forms, toggles

- [ ] **Step 4: Test landing page components**

- Gradient text "Clarift" should remain visible (brand colors work in dark)
- Floating bubbles should be subtle but present
- Mock device frame borders should use `border-default` (switches in dark)
- Feature cards should use `surface-card` background

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat(frontend): complete dark mode implementation"
```

### Task 12: Run tests and lint

- [ ] **Step 1: Run lint**

Run: `pnpm run lint` in `frontend/`
Expected: No errors

- [ ] **Step 2: Run tests**

Run: `pnpm run test:run` in `frontend/`
Expected: All tests pass

---

## Chunk 7: Documentation Update

### Task 13: Update design.md dark mode section

- [ ] Add note that dark mode is system-preference driven with manual override
- [ ] Document that `.dark` class is applied via `next-themes` `attribute="class"`
- [ ] Clarify that `suppressHydrationWarning` is required on `<html>`

---

**Plan complete.** Ready to execute?
