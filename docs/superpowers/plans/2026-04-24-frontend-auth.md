# Auth Screen Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a hybrid auth experience — custom branded card with animated background (Aceternity-style) wrapping Clerk's `<SignIn />` / `<SignUp />` components. Clerk handles OAuth complexity; we control the visual presentation.

**Architecture:** Server Component page at `/login` renders a Client Component wrapper that provides the animated background and branded card. Clerk's appearance prop is used to theme internal elements (buttons, inputs, modals) with brand tokens.

**Tech Stack:** Next.js 15 (App Router), TypeScript, Tailwind CSS v4, Framer Motion, Clerk, Lucide React

---

## File Structure

| File | Action | Responsibility |
|---|---|---|
| `frontend/src/app/login/page.tsx` | Replace | Login page (Server Component) |
| `frontend/src/components/features/auth/auth-card.tsx` | Create | Branded card wrapper with animated background |
| `frontend/src/components/features/auth/auth-background.tsx` | Create | Subtle animated mesh gradient (Aceternity-style) |

---

## Chunk 1: Auth Background & Card

### Task 1: Create auth background

**Files:**
- Create: `frontend/src/components/features/auth/auth-background.tsx`

- [ ] **Step 1: Create animated background component**

```tsx
"use client"

import { useEffect, useRef } from "react"

export function AuthBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext("2d")
    if (!ctx) return

    let animationId: number
    let time = 0

    const resize = () => {
      canvas.width = canvas.offsetWidth * window.devicePixelRatio
      canvas.height = canvas.offsetHeight * window.devicePixelRatio
      ctx.scale(window.devicePixelRatio, window.devicePixelRatio)
    }
    resize()
    window.addEventListener("resize", resize)

    const render = () => {
      time += 0.003
      const w = canvas.offsetWidth
      const h = canvas.offsetHeight

      ctx.clearRect(0, 0, w, h)

      const blobs = [
        { x: w * 0.2, y: h * 0.3, r: 250, color: "rgba(99, 102, 241, 0.06)" },
        { x: w * 0.8, y: h * 0.7, r: 200, color: "rgba(129, 140, 248, 0.04)" },
        { x: w * 0.5, y: h * 0.2, r: 180, color: "rgba(99, 102, 241, 0.03)" },
      ]

      blobs.forEach((blob, i) => {
        const offsetX = Math.sin(time + i * 1.5) * 40
        const offsetY = Math.cos(time * 0.7 + i) * 30
        const gradient = ctx.createRadialGradient(
          blob.x + offsetX, blob.y + offsetY, 0,
          blob.x + offsetX, blob.y + offsetY, blob.r
        )
        gradient.addColorStop(0, blob.color)
        gradient.addColorStop(1, "transparent")
        ctx.fillStyle = gradient
        ctx.fillRect(0, 0, w, h)
      })

      animationId = requestAnimationFrame(render)
    }
    render()

    return () => {
      cancelAnimationFrame(animationId)
      window.removeEventListener("resize", resize)
    }
  }, [])

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 w-full h-full pointer-events-none"
      aria-hidden="true"
    />
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/components/features/auth/auth-background.tsx
git commit -m "feat(frontend): add auth page animated background"
```

### Task 2: Create auth card wrapper

**Files:**
- Create: `frontend/src/components/features/auth/auth-card.tsx`

- [ ] **Step 1: Create auth card component**

```tsx
"use client"

import { motion } from "framer-motion"
import { AuthBackground } from "./auth-background"

interface AuthCardProps {
  children: React.ReactNode
  title: string
  subtitle: string
}

export function AuthCard({ children, title, subtitle }: AuthCardProps) {
  return (
    <div className="relative min-h-screen flex items-center justify-center px-4 overflow-hidden bg-surface-page">
      <AuthBackground />

      <motion.div
        initial={{ opacity: 0, scale: 0.98 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.2, ease: "easeOut" }}
        className="relative z-10 w-full max-w-md"
      >
        {/* Card */}
        <div className="bg-surface-card border border-border-default rounded-2xl p-6 md:p-8 shadow-none">
          {/* Logo + tagline */}
          <div className="text-center mb-6">
            <div className="size-10 rounded-lg bg-brand-500 text-white flex items-center justify-center font-bold text-xl mx-auto mb-3">
              C
            </div>
            <h1 className="text-lg font-semibold text-text-primary">{title}</h1>
            <p className="text-xs text-text-tertiary mt-1">{subtitle}</p>
          </div>

          {/* Clerk form */}
          {children}
        </div>
      </motion.div>
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/components/features/auth/auth-card.tsx
git commit -m "feat(frontend): add auth card wrapper with branded layout"
```

---

## Chunk 2: Login Page

### Task 3: Replace login page

**Files:**
- Modify: `frontend/src/app/login/page.tsx`

- [ ] **Step 1: Read current login page**

Read the file to understand current Clerk setup and redirect logic.

- [ ] **Step 2: Replace with branded auth page**

```tsx
import { SignIn } from "@clerk/nextjs"
import { AuthCard } from "@/components/features/auth/auth-card"

export default function LoginPage() {
  return (
    <AuthCard
      title="The Study Engine"
      subtitle="For Filipino board exam students — nursing, CPA, engineering, medicine"
    >
      <SignIn
        routing="path"
        path="/login"
        redirectUrl="/dashboard"
        appearance={{
          elements: {
            rootBox: "w-full",
            card: "shadow-none p-0 bg-transparent border-none",
            headerTitle: "hidden",
            headerSubtitle: "hidden",
            socialButtonsBlockButton:
              "border border-border-default bg-surface-subtle text-text-primary hover:bg-surface-overlay transition-colors-fast rounded-lg h-10",
            socialButtonsBlockButtonText: "text-sm font-medium",
            dividerLine: "bg-border-default",
            dividerText: "text-xs text-text-tertiary",
            formFieldLabel: "text-sm text-text-primary",
            formFieldInput:
              "border border-border-default rounded-lg h-10 text-sm bg-surface-subtle focus:border-brand-500 focus:ring-2 focus:ring-brand-500/15 transition-colors-fast",
            formButtonPrimary:
              "bg-brand-500 text-white hover:bg-brand-600 rounded-lg h-10 text-sm font-medium transition-colors-fast",
            footerActionLink: "text-brand-500 hover:text-brand-600 text-sm",
          },
        }}
      />
    </AuthCard>
  )
}
```

- [ ] **Step 3: Verify build**

Run: `pnpm run build` in `frontend/`
Expected: Build succeeds

- [ ] **Step 4: Verify dev server**

Run: `pnpm run dev` in `frontend/`
Navigate to `/login` and verify:
- Animated background visible (subtle brand-colored blobs)
- Card centered with Clarift logo, title, subtitle
- Google OAuth button styled with brand tokens
- Email/password fields styled with brand borders
- Sign-in button shows brand-500 bg
- "Sign up" link styled with brand color
- After sign-in: redirects to `/dashboard` (or `/onboarding` if new user)
- Dark mode: card bg switches to #1A1929, text to #F0EFFF, background to #0F0E1A

- [ ] **Step 5: Commit**

```bash
git add frontend/src/app/login/page.tsx
git commit -m "feat(frontend): replace default Clerk login with branded auth card"
```

---

## Chunk 3: Verification

### Task 4: Run tests and lint

- [ ] **Step 1: Run lint**

Run: `pnpm run lint` in `frontend/`
Expected: No errors

- [ ] **Step 2: Run tests**

Run: `pnpm run test:run` in `frontend/`
Expected: All tests pass

### Task 5: Mobile verification

- [ ] **Step 1: Test mobile viewport**

Resize browser to 390px width and verify:
- Card fits within viewport without horizontal scroll
- Touch targets >= 44px (OAuth button, sign-in button, input fields)
- Animated background performs well (no jank)
- Clerk modal overlays (if triggered) are centered and readable

### Task 6: Final commit

- [ ] **Step 1: Commit all remaining changes**

```bash
git add -A
git commit -m "feat(frontend): complete auth screen implementation"
```

---

**Plan complete.** Ready to execute?
