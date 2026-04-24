# Frontend Foundation Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Establish the shared design system foundation — color tokens, typography, spacing, app shell (desktop sidebar + mobile tab bar), shared components (buttons, cards, badges, progress bars, loading states), and motion rules — that all feature pages will build upon.

**Architecture:** Two-tier approach: (1) CSS tokens in `globals.css` via Tailwind v4 `@theme inline`, (2) React components in `components/ui/` (shadcn primitives) and `components/features/` (feature-specific). App shell replaces the current `GlobalNav` with a desktop sidebar and mobile bottom tab bar.

**Tech Stack:** Next.js 15 (App Router), TypeScript, Tailwind CSS v4, shadcn/ui, Framer Motion, Lucide React, clsx + tailwind-merge

---

## File Structure

| File | Action | Responsibility |
|---|---|---|
| `frontend/src/app/globals.css` | Modify | Brand color tokens, typography, spacing, prose overrides, motion rules, dark mode |
| `frontend/src/app/layout.tsx` | Modify | Font config (Inter + JetBrains Mono), remove GlobalNav |
| `frontend/src/components/ui/button.tsx` | Modify | Button variants to match brand tokens |
| `frontend/src/components/ui/progress.tsx` | Create | Progress bar component with color thresholds |
| `frontend/src/components/ui/badge.tsx` | Create | Badge/chip component (status, tier, question type) |
| `frontend/src/components/ui/card.tsx` | Create | Card primitives (document, feature, stat variants) |
| `frontend/src/components/ui/skeleton.tsx` | Create | Skeleton loading component |
| `frontend/src/components/ui/spinner.tsx` | Create | Spinner component with text label |
| `frontend/src/components/ui/sse-progress.tsx` | Create | SSE-driven progress bar (indeterminate → determinate) |
| `frontend/src/components/app-shell.tsx` | Create | Desktop sidebar + mobile tab bar navigation |
| `frontend/src/components/app-shell-mobile.tsx` | Create | Mobile bottom tab bar (21st.dev adapted) |
| `frontend/src/components/app-shell-desktop.tsx` | Create | Desktop fixed left sidebar |
| `frontend/src/components/app-shell-logo.tsx` | Create | Shared Clarift logo component |
| `frontend/src/components/global-nav.tsx` | Delete | Replaced by app-shell components |
| `frontend/src/(app)/layout.tsx` | Modify | Wrap with AppShell instead of GlobalNav |
| `frontend/package.json` | Modify | Add `framer-motion` dependency |

---

## Chunk 1: Design Tokens & CSS Foundation

### Task 1: Add framer-motion dependency

**Files:**
- Modify: `frontend/package.json`

- [ ] **Step 1: Install framer-motion**

Run: `pnpm add framer-motion` in `frontend/` directory

- [ ] **Step 2: Verify install**

Run: `pnpm list framer-motion`
Expected: `framer-motion` listed with version

- [ ] **Step 3: Commit**

```bash
git add frontend/package.json frontend/pnpm-lock.yaml
git commit -m "chore(frontend): add framer-motion for animations"
```

### Task 2: Update globals.css with brand tokens

**Files:**
- Modify: `frontend/src/app/globals.css`

- [ ] **Step 1: Replace color tokens in `@theme inline` and `:root`/`.dark` blocks**

Replace the entire `globals.css` content with the following:

```css
@import "tailwindcss";
@import "tw-animate-css";
@import "shadcn/tailwind.css";
@import "highlight.js/styles/github-dark.css";
@plugin "@tailwindcss/typography";

@custom-variant dark (&:is(.dark *));

@theme inline {
  /* Brand — Indigo */
  --color-brand-50: #EEF2FF;
  --color-brand-100: #E0E7FF;
  --color-brand-200: #C7D2FE;
  --color-brand-300: #A5B4FC;
  --color-brand-400: #818CF8;
  --color-brand-500: #6366F1;
  --color-brand-600: #4F46E5;
  --color-brand-700: #4338CA;
  --color-brand-800: #3730A3;
  --color-brand-900: #312E81;

  /* Accent — Amber */
  --color-accent-50: #FFFBEB;
  --color-accent-100: #FEF3C7;
  --color-accent-200: #FDE68A;
  --color-accent-300: #FCD34D;
  --color-accent-400: #FBBF24;
  --color-accent-500: #F59E0B;
  --color-accent-600: #D97706;
  --color-accent-700: #B45309;
  --color-accent-800: #92400E;

  /* Semantic */
  --color-success-500: #10B981;
  --color-success-100: #D1FAE5;
  --color-success-800: #065F46;
  --color-danger-500: #EF4444;
  --color-danger-100: #FEE2E2;
  --color-danger-800: #991B1B;
  --color-warning-500: #F59E0B;
  --color-warning-100: #FEF3C7;
  --color-warning-800: #92400E;

  /* Surface tokens (light mode) */
  --color-surface-page: #F8F7FF;
  --color-surface-card: #FFFFFF;
  --color-surface-subtle: #F1F0FE;
  --color-surface-overlay: rgba(99, 102, 241, 0.04);

  /* Border tokens */
  --color-border-default: #E5E4F0;
  --color-border-strong: #C7C5E0;

  /* Text tokens */
  --color-text-primary: #1A1833;
  --color-text-secondary: #6B6888;
  --color-text-tertiary: #9896AA;
  --color-text-on-brand: #FFFFFF;

  /* shadcn compatibility mappings */
  --color-background: var(--surface-page);
  --color-foreground: var(--text-primary);
  --color-card: var(--surface-card);
  --color-card-foreground: var(--text-primary);
  --color-popover: var(--surface-card);
  --color-popover-foreground: var(--text-primary);
  --color-primary: var(--brand-500);
  --color-primary-foreground: var(--text-on-brand);
  --color-secondary: var(--surface-subtle);
  --color-secondary-foreground: var(--text-primary);
  --color-muted: var(--surface-subtle);
  --color-muted-foreground: var(--text-secondary);
  --color-accent: var(--surface-subtle);
  --color-accent-foreground: var(--text-primary);
  --color-destructive: var(--danger-500);
  --color-destructive-foreground: var(--text-on-brand);
  --color-border: var(--border-default);
  --color-input: var(--border-default);
  --color-ring: var(--brand-500);

  /* Chart colors (brand-aligned) */
  --color-chart-1: var(--brand-500);
  --color-chart-2: var(--brand-400);
  --color-chart-3: var(--accent-500);
  --color-chart-4: var(--success-500);
  --color-chart-5: var(--danger-500);

  /* Sidebar tokens */
  --color-sidebar: var(--surface-card);
  --color-sidebar-foreground: var(--text-primary);
  --color-sidebar-primary: var(--brand-500);
  --color-sidebar-primary-foreground: var(--text-on-brand);
  --color-sidebar-accent: var(--surface-subtle);
  --color-sidebar-accent-foreground: var(--text-primary);
  --color-sidebar-border: var(--border-default);
  --color-sidebar-ring: var(--brand-500);

  /* Radius */
  --radius: 0.625rem;
  --radius-sm: calc(var(--radius) * 0.6);
  --radius-md: calc(var(--radius) * 0.8);
  --radius-lg: var(--radius);
  --radius-xl: calc(var(--radius) * 1.4);
  --radius-2xl: calc(var(--radius) * 1.8);
  --radius-3xl: calc(var(--radius) * 2.2);
  --radius-4xl: calc(var(--radius) * 2.6);
}

/* Light mode (default) */
:root {
  --background: var(--surface-page);
  --foreground: var(--text-primary);
  --card: var(--surface-card);
  --card-foreground: var(--text-primary);
  --popover: var(--surface-card);
  --popover-foreground: var(--text-primary);
  --primary: var(--brand-500);
  --primary-foreground: var(--text-on-brand);
  --secondary: var(--surface-subtle);
  --secondary-foreground: var(--text-primary);
  --muted: var(--surface-subtle);
  --muted-foreground: var(--text-secondary);
  --accent: var(--surface-subtle);
  --accent-foreground: var(--text-primary);
  --destructive: var(--danger-500);
  --destructive-foreground: var(--text-on-brand);
  --border: var(--border-default);
  --border-strong: var(--border-strong);
  --input: var(--border-default);
  --ring: var(--brand-500);
  --surface-subtle: var(--surface-subtle);
  --surface-overlay: var(--surface-overlay);
  --chart-1: var(--brand-500);
  --chart-2: var(--brand-400);
  --chart-3: var(--accent-500);
  --chart-4: var(--success-500);
  --chart-5: var(--danger-500);
  --sidebar: var(--surface-card);
  --sidebar-foreground: var(--text-primary);
  --sidebar-primary: var(--brand-500);
  --sidebar-primary-foreground: var(--text-on-brand);
  --sidebar-accent: var(--surface-subtle);
  --sidebar-accent-foreground: var(--text-primary);
  --sidebar-border: var(--border-default);
  --sidebar-ring: var(--brand-500);
}

/* Dark mode */
.dark {
  --background: #0F0E1A;
  --foreground: #F0EFFF;
  --card: #1A1929;
  --card-foreground: #F0EFFF;
  --popover: #1A1929;
  --popover-foreground: #F0EFFF;
  --primary: #6366F1;
  --primary-foreground: #FFFFFF;
  --secondary: #21203A;
  --secondary-foreground: #F0EFFF;
  --muted: #21203A;
  --muted-foreground: #9896B8;
  --accent: #21203A;
  --accent-foreground: #F0EFFF;
  --destructive: #EF4444;
  --destructive-foreground: #FFFFFF;
  --border: #2D2C45;
  --border-strong: #3D3C58;
  --input: #2D2C45;
  --ring: #6366F1;
  --surface-subtle: #21203A;
  --surface-overlay: rgba(99, 102, 241, 0.08);
  --chart-1: #6366F1;
  --chart-2: #818CF8;
  --chart-3: #F59E0B;
  --chart-4: #10B981;
  --chart-5: #EF4444;
  --sidebar: #1A1929;
  --sidebar-foreground: #F0EFFF;
  --sidebar-primary: #6366F1;
  --sidebar-primary-foreground: #FFFFFF;
  --sidebar-accent: #21203A;
  --sidebar-accent-foreground: #F0EFFF;
  --sidebar-border: #2D2C45;
  --sidebar-ring: #6366F1;
}

/* Page background noise texture (barely perceptible warmth) */
@layer base {
  body {
    background-color: var(--surface-page);
    color: var(--text-primary);
    font-family: var(--font-sans);
  }

  /* Noise texture on page background only — never on cards */
  body::before {
    content: "";
    position: fixed;
    inset: 0;
    pointer-events: none;
    z-index: 0;
    opacity: 0.025;
    background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E");
  }

  .dark body::before {
    opacity: 0.015;
  }

  * {
    @apply border-border outline-ring/50;
  }

  html {
    font-family: 'Inter', system-ui, sans-serif;
  }
}

/* Prose overrides for AI-generated content */
@layer utilities {
  .prose-brand {
    @apply prose prose-sm max-w-none;
  }

  .prose-brand h2 {
    font-size: 15px;
    font-weight: 600;
    color: var(--text-primary);
    margin-top: 20px;
  }

  .prose-brand h3 {
    font-size: 13px;
    font-weight: 600;
    color: var(--text-secondary);
    margin-top: 14px;
  }

  .prose-brand p {
    font-size: 15px;
    line-height: 1.75;
    color: var(--text-primary);
  }

  .prose-brand li {
    font-size: 15px;
    line-height: 1.75;
  }

  .prose-brand strong {
    font-weight: 500;
  }

  .prose-brand code {
    font-family: 'JetBrains Mono', monospace;
    font-size: 12px;
    background: var(--surface-subtle);
    padding: 2px 6px;
    border-radius: 4px;
  }

  /* Markdown alert overrides with brand colors */
  .markdown-alert {
    @apply mb-4 rounded-lg border-l-4 p-4;
  }
  .markdown-alert-note {
    @apply border-brand-500 bg-brand-50 dark:bg-brand-900/20;
  }
  .markdown-alert-tip {
    @apply border-success-500 bg-success-100 dark:bg-success-900/20;
  }
  .markdown-alert-important {
    @apply border-brand-400 bg-brand-50 dark:bg-brand-900/20;
  }
  .markdown-alert-warning {
    @apply border-accent-500 bg-accent-100 dark:bg-accent-900/20;
  }
  .markdown-alert-caution {
    @apply border-danger-500 bg-danger-100 dark:bg-danger-900/20;
  }
  .markdown-alert-title {
    @apply mb-1 flex items-center gap-2 font-semibold;
  }
  .markdown-alert-note .markdown-alert-title {
    @apply text-brand-700 dark:text-brand-300;
  }
  .markdown-alert-tip .markdown-alert-title {
    @apply text-success-700 dark:text-success-300;
  }
  .markdown-alert-important .markdown-alert-title {
    @apply text-brand-600 dark:text-brand-300;
  }
  .markdown-alert-warning .markdown-alert-title {
    @apply text-accent-700 dark:text-accent-300;
  }
  .markdown-alert-caution .markdown-alert-title {
    @apply text-danger-700 dark:text-danger-300;
  }
}

/* Motion rules — animation communicates state, never entertains */
@layer utilities {
  /* Transition timing */
  .transition-colors-fast {
    transition: color 150ms ease, background-color 150ms ease, border-color 150ms ease;
  }
  .transition-transform-fast {
    transition: transform 200ms ease;
  }
  .transition-panel {
    transition: transform 250ms ease, opacity 250ms ease;
  }
  .transition-page {
    transition: opacity 200ms ease;
  }

  /* Loading states */
  .skeleton {
    animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
    background: var(--brand-100);
    border-radius: inherit;
  }
  .dark .skeleton {
    background: var(--surface-subtle);
  }

  /* Spinner */
  .spinner {
    width: 20px;
    height: 20px;
    border: 2px solid var(--brand-100);
    border-top-color: var(--brand-500);
    border-radius: 50%;
    animation: spin 1s linear infinite;
  }
  @keyframes spin {
    to { transform: rotate(360deg); }
  }

  /* SSE progress bar shimmer */
  .sse-progress-indeterminate {
    background: linear-gradient(90deg, var(--brand-500) 0%, var(--brand-400) 100%);
    background-size: 200% 100%;
    animation: shimmer 1.5s ease-in-out infinite;
  }
  @keyframes shimmer {
    0% { background-position: 200% 0; }
    100% { background-position: -200% 0; }
  }

  /* Thinking dots animation */
  @keyframes pulse-dot {
    0%, 80%, 100% { opacity: 0.4; }
    40% { opacity: 0.9; }
  }
  .thinking-dot {
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background: var(--brand-500);
  }
  .thinking-dot:nth-child(1) { animation: pulse-dot 1.2s ease-in-out infinite 0ms; }
  .thinking-dot:nth-child(2) { animation: pulse-dot 1.2s ease-in-out infinite 150ms; }
  .thinking-dot:nth-child(3) { animation: pulse-dot 1.2s ease-in-out infinite 300ms; }

  /* Score count-up animation helper */
  @keyframes score-glow {
    0%, 100% { box-shadow: 0 0 0 6px rgba(16, 185, 129, 0.08); }
    50% { box-shadow: 0 0 0 8px rgba(16, 185, 129, 0.12); }
  }
  .score-ring-glow {
    animation: score-glow 2s ease-in-out infinite;
  }

  /* Wrong answer shake */
  @keyframes shake {
    0%, 100% { transform: translateX(0); }
    25% { transform: translateX(-4px); }
    50% { transform: translateX(4px); }
    75% { transform: translateX(-2px); }
  }
  .shake-wrong {
    animation: shake 300ms ease;
  }
}
```

- [ ] **Step 2: Verify CSS compiles**

Run: `pnpm run build` in `frontend/` directory
Expected: Build succeeds without CSS errors

- [ ] **Step 3: Commit**

```bash
git add frontend/src/app/globals.css
git commit -m "feat(frontend): establish brand design tokens in globals.css"
```

### Task 3: Update layout.tsx with Inter + JetBrains Mono

**Files:**
- Modify: `frontend/src/app/layout.tsx`

- [ ] **Step 1: Read current layout.tsx**

Read the file to understand current font setup.

- [ ] **Step 2: Update font imports**

Replace the font configuration to use Inter as primary and JetBrains Mono for code:

```tsx
import { Inter, JetBrains_Mono } from "next/font/google";
// Keep existing Clerk imports

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
  display: "swap",
});

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable} ${jetbrainsMono.variable}`}>
      <body className="min-h-screen bg-surface-page text-text-primary antialiased">
        <ClerkProvider>{children}</ClerkProvider>
      </body>
    </html>
  );
}
```

- [ ] **Step 3: Remove GlobalNav from root layout**

The GlobalNav will be replaced by AppShell in the `(app)` layout. Remove any GlobalNav import/render from root layout if present.

- [ ] **Step 4: Verify build**

Run: `pnpm run build` in `frontend/`
Expected: Build succeeds

- [ ] **Step 5: Commit**

```bash
git add frontend/src/app/layout.tsx
git commit -m "feat(frontend): configure Inter + JetBrains Mono fonts"
```

---

## Chunk 2: Shared UI Components

### Task 4: Create Button overrides

**Files:**
- Modify: `frontend/src/components/ui/button.tsx`

- [ ] **Step 1: Update button variants to match brand tokens**

Replace the CVA variants:

```tsx
const buttonVariants = cva(
  "group/button inline-flex shrink-0 items-center justify-center rounded-lg border border-transparent bg-clip-padding text-sm font-medium whitespace-nowrap transition-all duration-150 ease outline-none select-none focus-visible:border-brand-500 focus-visible:ring-3 focus-visible:ring-brand-500/15 active:not-aria-[haspopup]:translate-y-px disabled:pointer-events-none disabled:opacity-50 aria-invalid:border-danger-500 aria-invalid:ring-3 aria-invalid:ring-danger-500/20 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  {
    variants: {
      variant: {
        default: "bg-brand-500 text-white hover:bg-brand-600 active:bg-brand-700",
        outline:
          "border-border-default bg-surface-card text-text-primary hover:border-border-strong hover:bg-surface-overlay",
        secondary:
          "bg-surface-subtle text-text-primary border border-border-default hover:border-border-strong hover:bg-surface-card",
        ghost:
          "text-text-secondary hover:bg-surface-overlay",
        destructive:
          "bg-danger-100 text-danger-800 hover:bg-danger-500 hover:text-white",
        link: "text-brand-500 underline-offset-4 hover:underline",
      },
      size: {
        default: "h-10 px-4 gap-2 md:h-9 md:px-3",
        xs: "h-6 gap-1 px-2.5 text-xs [&_svg:not([class*='size-'])]:size-3",
        sm: "h-8 gap-1.5 px-3",
        lg: "h-11 gap-2 px-5 text-base",
        icon: "size-9",
        "icon-xs": "size-6 [&_svg:not([class*='size-'])]:size-3",
        "icon-sm": "size-8",
        "icon-lg": "size-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)
```

- [ ] **Step 2: Verify button renders correctly**

Run: `pnpm run dev` in `frontend/`, navigate to any page with buttons
Expected: Buttons show brand-500 bg, correct hover states

- [ ] **Step 3: Commit**

```bash
git add frontend/src/components/ui/button.tsx
git commit -m "feat(frontend): update button variants to brand tokens"
```

### Task 5: Create Progress component

**Files:**
- Create: `frontend/src/components/ui/progress.tsx`

- [ ] **Step 1: Write tests**

Create: `frontend/src/components/ui/progress.test.tsx`

```tsx
import { render, screen } from "@testing-library/react"
import { Progress } from "./progress"

describe("Progress", () => {
  it("renders with default value", () => {
    render(<Progress value={50} />)
    const bar = screen.getByRole("progressbar")
    expect(bar).toHaveAttribute("aria-valuenow", "50")
  })

  it("applies brand color for 0-70%", () => {
    render(<Progress value={50} />)
    const indicator = document.querySelector("[data-progress-indicator]")
    expect(indicator).toHaveClass("bg-brand-500")
  })

  it("applies amber color for 70-90%", () => {
    render(<Progress value={80} />)
    const indicator = document.querySelector("[data-progress-indicator]")
    expect(indicator).toHaveClass("bg-accent-500")
  })

  it("applies danger color for 90-100%", () => {
    render(<Progress value={95} />)
    const indicator = document.querySelector("[data-progress-indicator]")
    expect(indicator).toHaveClass("bg-danger-500")
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm run test:run frontend/src/components/ui/progress.test.tsx`
Expected: FAIL — module not found

- [ ] **Step 3: Create Progress component**

```tsx
"use client"

import * as React from "react"
import { cn } from "@/lib/utils"

interface ProgressProps extends React.HTMLAttributes<HTMLDivElement> {
  value: number
  max?: number
}

export function Progress({ value, max = 100, className, ...props }: ProgressProps) {
  const percentage = Math.min(Math.max((value / max) * 100, 0), 100)

  const getColor = (pct: number) => {
    if (pct >= 90) return "bg-danger-500"
    if (pct >= 70) return "bg-accent-500"
    return "bg-brand-500"
  }

  return (
    <div
      className={cn("h-1 w-full overflow-hidden rounded-full bg-border-default", className)}
      {...props}
    >
      <div
        data-progress-indicator
        className={cn(
          "h-full rounded-full transition-all duration-300 ease",
          getColor(percentage)
        )}
        style={{ width: `${percentage}%` }}
        role="progressbar"
        aria-valuenow={Math.round(percentage)}
        aria-valuemin={0}
        aria-valuemax={max}
      />
    </div>
  )
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm run test:run frontend/src/components/ui/progress.test.tsx`
Expected: All 4 tests pass

- [ ] **Step 5: Commit**

```bash
git add frontend/src/components/ui/progress.tsx frontend/src/components/ui/progress.test.tsx
git commit -m "feat(frontend): add Progress component with color thresholds"
```

### Task 6: Create Badge component

**Files:**
- Create: `frontend/src/components/ui/badge.tsx`

- [ ] **Step 1: Create Badge component**

```tsx
import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium tracking-wide transition-colors-fast",
  {
    variants: {
      variant: {
        // Document status
        pending: "bg-surface-subtle text-text-tertiary",
        processing: "bg-brand-100 text-brand-800",
        ready: "bg-success-100 text-success-800",
        failed: "bg-danger-100 text-danger-800",
        // Tier
        free: "bg-surface-subtle text-text-secondary",
        pro: "bg-accent-100 text-accent-800",
        // Question types
        mcq: "bg-brand-100 text-brand-800",
        true_false: "bg-green-50 text-green-800 dark:bg-green-900/20 dark:text-green-300",
        identification: "bg-orange-50 text-orange-800 dark:bg-orange-900/20 dark:text-orange-300",
        multi_select: "bg-purple-50 text-purple-800 dark:bg-purple-900/20 dark:text-purple-300",
        ordering: "bg-sky-50 text-sky-800 dark:bg-sky-900/20 dark:text-sky-300",
        // Generic
        default: "bg-brand-100 text-brand-800",
        secondary: "bg-surface-subtle text-text-secondary",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <span className={cn(badgeVariants({ variant }), className)} {...props} />
  )
}

export { Badge, badgeVariants }
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/components/ui/badge.tsx
git commit -m "feat(frontend): add Badge component with status/tier/question type variants"
```

### Task 7: Create Card component

**Files:**
- Create: `frontend/src/components/ui/card.tsx`

- [ ] **Step 1: Create Card primitives**

```tsx
import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const cardVariants = cva(
  "transition-colors-fast",
  {
    variants: {
      variant: {
        // Document card — list items, dashboard
        document: "bg-surface-card border border-border-default rounded-xl p-4 hover:bg-surface-overlay hover:border-border-strong",
        // Feature card — summary, quiz, practice results
        feature: "bg-surface-card border border-border-default rounded-2xl p-5 md:p-6",
        // Stat card — quota meter, score display
        stat: "bg-surface-subtle rounded-xl p-3 md:p-4",
        // Option card — settings/onboarding selectors
        option: "bg-surface-card border-[1.5px] border-border-default rounded-[14px] p-4 cursor-pointer transition-colors-fast hover:border-border-strong hover:bg-surface-overlay",
        // Default (shadcn compatible)
        default: "bg-surface-card border border-border-default rounded-xl",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

export interface CardProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof cardVariants> {}

function Card({ className, variant, ...props }: CardProps) {
  return (
    <div className={cn(cardVariants({ variant }), className)} {...props} />
  )
}

function CardHeader({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("flex items-center justify-between", className)} {...props} />
}

function CardContent({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("", className)} {...props} />
}

function CardFooter({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("flex items-center gap-2", className)} {...props} />
}

export { Card, CardHeader, CardContent, CardFooter, cardVariants }
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/components/ui/card.tsx
git commit -m "feat(frontend): add Card component with document/feature/stat/option variants"
```

### Task 8: Create Skeleton component

**Files:**
- Create: `frontend/src/components/ui/skeleton.tsx`

- [ ] **Step 1: Create Skeleton component**

```tsx
import { cn } from "@/lib/utils"

function Skeleton({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("skeleton", className)}
      {...props}
    />
  )
}

export { Skeleton }
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/components/ui/skeleton.tsx
git commit -m "feat(frontend): add Skeleton loading component"
```

### Task 9: Create Spinner component

**Files:**
- Create: `frontend/src/components/ui/spinner.tsx`

- [ ] **Step 1: Create Spinner component**

```tsx
import { cn } from "@/lib/utils"

interface SpinnerProps extends React.HTMLAttributes<HTMLDivElement> {
  size?: "sm" | "md" | "lg"
  label?: string
}

export function Spinner({ size = "md", label, className, ...props }: SpinnerProps) {
  const sizeClasses = {
    sm: "w-4 h-4",
    md: "w-5 h-5",
    lg: "w-6 h-6",
  }

  return (
    <div className={cn("flex flex-col items-center gap-2", className)} {...props}>
      <div className={cn("spinner", sizeClasses[size])} />
      {label && <span className="text-xs text-text-tertiary">{label}</span>}
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/components/ui/spinner.tsx
git commit -m "feat(frontend): add Spinner component with text label"
```

### Task 10: Create SSE Progress component

**Files:**
- Create: `frontend/src/components/ui/sse-progress.tsx`

- [ ] **Step 1: Create SSE Progress component**

```tsx
"use client"

import { cn } from "@/lib/utils"

interface SSEProgressProps {
  /** Current progress percentage (0-100). If undefined, shows indeterminate shimmer */
  progress?: number
  /** Step label shown below progress bar */
  stepLabel?: string
  /** Height of the progress bar */
  size?: "thin" | "normal"
  className?: string
}

export function SSEProgress({ progress, stepLabel, size = "normal", className }: SSEProgressProps) {
  const height = size === "thin" ? "h-[2px]" : "h-1"

  return (
    <div className={cn("w-full", className)}>
      <div className={cn("w-full overflow-hidden rounded-full bg-border-default", height)}>
        {progress !== undefined ? (
          // Determinate — gradient fill with smooth width transition
          <div
            className={cn(
              "h-full rounded-full transition-all duration-300 ease",
              "bg-gradient-to-r from-brand-500 to-brand-400"
            )}
            style={{ width: `${Math.min(Math.max(progress, 0), 100)}%` }}
            role="progressbar"
            aria-valuenow={progress}
            aria-valuemin={0}
            aria-valuemax={100}
          />
        ) : (
          // Indeterminate — shimmer animation
          <div className={cn("h-full w-1/3 sse-progress-indeterminate rounded-full")} />
        )}
      </div>
      {stepLabel && (
        <p className="mt-1 text-xs text-text-tertiary">{stepLabel}</p>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/components/ui/sse-progress.tsx
git commit -m "feat(frontend): add SSEProgress component (indeterminate → determinate)"
```

---

## Chunk 3: App Shell (Navigation)

### Task 11: Create App Shell Logo component

**Files:**
- Create: `frontend/src/components/app-shell-logo.tsx`

- [ ] **Step 1: Create shared logo component**

```tsx
import Link from "next/link"
import { cn } from "@/lib/utils"

interface AppShellLogoProps {
  showLabel?: boolean
  className?: string
}

export function AppShellLogo({ showLabel = true, className }: AppShellLogoProps) {
  return (
    <Link href="/dashboard" className={cn("flex items-center gap-2", className)}>
      <div className="size-8 rounded-lg bg-brand-500 text-white flex items-center justify-center font-bold text-xl">
        C
      </div>
      {showLabel && (
        <span className="font-semibold text-lg text-text-primary">Clarift</span>
      )}
    </Link>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/components/app-shell-logo.tsx
git commit -m "feat(frontend): add shared AppShellLogo component"
```

### Task 12: Create Desktop Sidebar

**Files:**
- Create: `frontend/src/components/app-shell-desktop.tsx`

- [ ] **Step 1: Create desktop sidebar component**

```tsx
"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { UserButton } from "@clerk/nextjs"
import { cn } from "@/lib/utils"
import {
  LayoutDashboard,
  FileText,
  Target,
  MessageSquare,
  Settings2,
} from "lucide-react"
import { AppShellLogo } from "./app-shell-logo"

const routes = [
  { name: "Dashboard", path: "/dashboard", icon: LayoutDashboard },
  { name: "Documents", path: "/documents", icon: FileText },
  { name: "Practice", path: "/practice", icon: Target },
  { name: "Chat", path: "/chat", icon: MessageSquare },
  { name: "Settings", path: "/dashboard/settings", icon: Settings2 },
]

export function AppShellDesktop() {
  const pathname = usePathname()

  return (
    <aside className="hidden md:flex md:flex-col md:fixed md:inset-y-0 md:w-[240px] md:border-r md:border-border-default md:bg-surface-card md:z-40">
      {/* Logo */}
      <div className="h-14 flex items-center px-4 border-b border-border-default">
        <AppShellLogo />
      </div>

      {/* Nav items */}
      <nav className="flex-1 py-4 px-3 space-y-1">
        {routes.map((route) => {
          const Icon = route.icon
          const isActive = pathname.startsWith(route.path)
          return (
            <Link
              key={route.path}
              href={route.path}
              className={cn(
                "flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors-fast",
                isActive
                  ? "text-brand-500"
                  : "text-text-tertiary hover:text-text-primary hover:bg-surface-overlay"
              )}
            >
              <Icon className="size-[22px] stroke-[1.5]" />
              {route.name}
            </Link>
          )
        })}
      </nav>

      {/* User button */}
      <div className="p-3 border-t border-border-default">
        <UserButton />
      </div>
    </aside>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/components/app-shell-desktop.tsx
git commit -m "feat(frontend): create desktop sidebar navigation"
```

### Task 13: Create Mobile Tab Bar

**Files:**
- Create: `frontend/src/components/app-shell-mobile.tsx`

- [ ] **Step 1: Create mobile bottom tab bar**

```tsx
"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import {
  LayoutDashboard,
  FileText,
  Target,
  MessageSquare,
  Settings2,
} from "lucide-react"

const routes = [
  { name: "Dashboard", path: "/dashboard", icon: LayoutDashboard },
  { name: "Documents", path: "/documents", icon: FileText },
  { name: "Practice", path: "/practice", icon: Target },
  { name: "Chat", path: "/chat", icon: MessageSquare },
  { name: "Settings", path: "/dashboard/settings", icon: Settings2 },
]

export function AppShellMobile() {
  const pathname = usePathname()

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 h-[56px] border-t border-border-default bg-surface-card/95 backdrop-blur supports-[backdrop-filter]:bg-surface-card/60">
      <div className="flex items-center justify-around h-full">
        {routes.map((route) => {
          const Icon = route.icon
          const isActive = pathname.startsWith(route.path)
          return (
            <Link
              key={route.path}
              href={route.path}
              className={cn(
                "flex flex-col items-center justify-center gap-0.5 min-w-[44px] min-h-[44px] transition-colors-fast",
                isActive ? "text-brand-500" : "text-text-tertiary"
              )}
            >
              <Icon className="size-[22px] stroke-[1.5]" />
              <span className="text-[11px] font-medium">{route.name}</span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/components/app-shell-mobile.tsx
git commit -m "feat(frontend): create mobile bottom tab bar navigation"
```

### Task 14: Create App Shell wrapper

**Files:**
- Create: `frontend/src/components/app-shell.tsx`

- [ ] **Step 1: Create App Shell composition component**

```tsx
import { AppShellDesktop } from "./app-shell-desktop"
import { AppShellMobile } from "./app-shell-mobile"

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-surface-page">
      <AppShellDesktop />
      <AppShellMobile />
      {/* Content area */}
      <main className="md:ml-[240px] md:pb-0 pb-[56px]">
        <div className="max-w-[768px] mx-auto px-4 md:px-6 py-6 md:py-8">
          {children}
        </div>
      </main>
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/components/app-shell.tsx
git commit -m "feat(frontend): create AppShell wrapper combining desktop + mobile nav"
```

### Task 15: Update (app) layout to use AppShell

**Files:**
- Modify: `frontend/src/app/(app)/layout.tsx`
- Delete: `frontend/src/components/global-nav.tsx`

- [ ] **Step 1: Read current (app) layout**

Read `frontend/src/app/(app)/layout.tsx` to understand current auth guard logic.

- [ ] **Step 2: Replace GlobalNav with AppShell**

Wrap the children content with `<AppShell>` instead of rendering `<GlobalNav>`. The layout should:
1. Keep auth guard logic (redirect to `/login` if unauthenticated)
2. Keep onboarding check (redirect to `/onboarding` if no preferences)
3. Wrap `<>{children}</>` with `<AppShell>{children}</AppShell>`

- [ ] **Step 3: Delete GlobalNav**

Remove `frontend/src/components/global-nav.tsx` — replaced by AppShell.

- [ ] **Step 4: Update any imports of GlobalNav**

Search for any remaining imports of `GlobalNav` and remove them.

- [ ] **Step 5: Verify build**

Run: `pnpm run build` in `frontend/`
Expected: Build succeeds, no GlobalNav references

- [ ] **Step 6: Commit**

```bash
git add frontend/src/app/\(app\)/layout.tsx
git rm frontend/src/components/global-nav.tsx
git commit -m "feat(frontend): replace GlobalNav with AppShell (sidebar + tab bar)"
```

---

## Chunk 4: Verification & Cleanup

### Task 16: Run full test suite

- [ ] **Step 1: Run frontend tests**

Run: `pnpm run test:run` in `frontend/`
Expected: All existing tests pass, new component tests pass

### Task 17: Run lint

- [ ] **Step 1: Run lint**

Run: `pnpm run lint` in `frontend/`
Expected: No errors

### Task 18: Verify dev server

- [ ] **Step 1: Start dev server**

Run: `pnpm run dev` in `frontend/`

- [ ] **Step 2: Verify navigation**

- Desktop: sidebar visible at 240px width, nav items clickable, active state shows brand-500
- Mobile (resize to <768px): bottom tab bar visible, 56px height, active state shows brand-500
- Logo links to `/dashboard`
- UserButton visible in sidebar footer (desktop)

- [ ] **Step 3: Verify color tokens**

- Buttons show brand-500 bg
- Cards show surface-card bg with border-default
- Text shows text-primary color
- Dark mode (if system preference): colors switch to dark tokens

### Task 19: Final commit

- [ ] **Step 1: Commit all remaining changes**

```bash
git add -A
git commit -m "feat(frontend): complete foundation design system implementation"
```

---

**Plan complete.** Ready to execute?
