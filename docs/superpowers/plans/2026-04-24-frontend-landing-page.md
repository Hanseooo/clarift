# Landing Page Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a high-fidelity, conversion-focused landing page at `/` with animated hero (rotating headlines), container scroll reveal (3-frame mock UI), outcome-focused feature cards, and final CTA section — all mobile-first with full dark mode support.

**Architecture:** Single page at `app/page.tsx` composed of section components in `components/features/landing/`. Uses Framer Motion for scroll-driven animations and headline transitions. All components source from 21st.dev patterns adapted to brand tokens.

**Tech Stack:** Next.js 15 (App Router), TypeScript, Tailwind CSS v4, Framer Motion, Lucide React

---

## File Structure

| File | Action | Responsibility |
|---|---|---|
| `frontend/src/app/page.tsx` | Replace | Landing page composition (was default Next.js scaffold) |
| `frontend/src/components/features/landing/hero-section.tsx` | Create | Animated hero with rotating sub-headlines |
| `frontend/src/components/features/landing/scroll-reveal.tsx` | Create | Container scroll with 3-frame mock UI |
| `frontend/src/components/features/landing/feature-cards.tsx` | Create | 4 outcome-focused feature cards |
| `frontend/src/components/features/landing/cta-section.tsx` | Create | Final CTA with "Start Studying" button |
| `frontend/src/components/features/landing/navbar.tsx` | Create | Landing page top nav (logo + CTA button) |
| `frontend/src/components/features/landing/mock-upload-frame.tsx` | Create | Frame 1: mock upload zone |
| `frontend/src/components/features/landing/mock-processing-frame.tsx` | Create | Frame 2: mock processing state |
| `frontend/src/components/features/landing/mock-result-frame.tsx` | Create | Frame 3: split summary + quiz view |
| `frontend/src/components/features/landing/shader-background.tsx` | Create | Subtle animated mesh gradient background |

---

## Chunk 1: Landing Page Shell & Navbar

### Task 1: Create landing page navbar

**Files:**
- Create: `frontend/src/components/features/landing/navbar.tsx`

- [ ] **Step 1: Create navbar component**

```tsx
"use client"

import Link from "next/link"
import { AppShellLogo } from "@/components/app-shell-logo"
import { Button } from "@/components/ui/button"

export function LandingNavbar() {
  return (
    <nav className="fixed top-0 left-0 right-0 z-50 border-b border-border-default bg-surface-page/80 backdrop-blur supports-[backdrop-filter]:bg-surface-page/60">
      <div className="max-w-[768px] mx-auto px-4 h-14 flex items-center justify-between">
        <AppShellLogo />
        <Link href="/login">
          <Button variant="default" size="sm">
            Get Started
          </Button>
        </Link>
      </div>
    </nav>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/components/features/landing/navbar.tsx
git commit -m "feat(frontend): add landing page navbar"
```

### Task 2: Create shader background

**Files:**
- Create: `frontend/src/components/features/landing/shader-background.tsx`

- [ ] **Step 1: Create shader background component**

```tsx
"use client"

import { useEffect, useRef } from "react"

export function ShaderBackground() {
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
      time += 0.005
      const w = canvas.offsetWidth
      const h = canvas.offsetHeight

      ctx.clearRect(0, 0, w, h)

      // Subtle mesh gradient blobs
      const blobs = [
        { x: w * 0.3, y: h * 0.2, r: 200, color: "rgba(99, 102, 241, 0.08)" },
        { x: w * 0.7, y: h * 0.6, r: 180, color: "rgba(129, 140, 248, 0.06)" },
        { x: w * 0.5, y: h * 0.8, r: 150, color: "rgba(99, 102, 241, 0.04)" },
      ]

      blobs.forEach((blob, i) => {
        const offsetX = Math.sin(time + i) * 30
        const offsetY = Math.cos(time * 0.8 + i) * 20
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
git add frontend/src/components/features/landing/shader-background.tsx
git commit -m "feat(frontend): add landing page shader background"
```

---

## Chunk 2: Animated Hero Section

### Task 3: Create animated hero with rotating headlines

**Files:**
- Create: `frontend/src/components/features/landing/hero-section.tsx`

- [ ] **Step 1: Create hero section component**

```tsx
"use client"

import { useState, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { ShaderBackground } from "./shader-background"

const headlines = [
  "Stop re-reading. Start testing yourself.",
  "Turn 50 pages into 5 key concepts.",
  "Your past papers, now a personalized tutor.",
]

export function HeroSection() {
  const [index, setIndex] = useState(0)

  useEffect(() => {
    const timer = setInterval(() => {
      setIndex((prev) => (prev + 1) % headlines.length)
    }, 3000)
    return () => clearInterval(timer)
  }, [])

  return (
    <section className="relative min-h-[90vh] flex flex-col items-center justify-center px-4 overflow-hidden">
      <ShaderBackground />

      <div className="relative z-10 max-w-[640px] text-center space-y-6">
        {/* Main headline */}
        <h1 className="text-2xl md:text-3xl font-bold text-text-primary">
          Your notes → summaries → quizzes
        </h1>

        {/* Rotating sub-headline */}
        <div className="h-12 md:h-14 flex items-center justify-center">
          <AnimatePresence mode="wait">
            <motion.p
              key={index}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.3, ease: "easeOut" }}
              className="text-base md:text-lg text-text-secondary"
            >
              {headlines[index]}
            </motion.p>
          </AnimatePresence>
        </div>

        {/* CTA */}
        <Link href="/login">
          <Button variant="default" size="lg" className="mt-4">
            Start Studying — It&apos;s Free
          </Button>
        </Link>

        <p className="text-xs text-text-tertiary">
          No credit card required. 3 summaries/day free.
        </p>
      </div>
    </section>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/components/features/landing/hero-section.tsx
git commit -m "feat(frontend): add animated hero with rotating headlines"
```

---

## Chunk 3: Container Scroll Reveal

### Task 4: Create mock UI frames

**Files:**
- Create: `frontend/src/components/features/landing/mock-upload-frame.tsx`
- Create: `frontend/src/components/features/landing/mock-processing-frame.tsx`
- Create: `frontend/src/components/features/landing/mock-result-frame.tsx`

- [ ] **Step 1: Create mock upload frame (Frame 1)**

```tsx
"use client"

import { Upload } from "lucide-react"

export function MockUploadFrame() {
  return (
    <div className="w-full h-full bg-surface-card rounded-2xl border border-border-default p-6 md:p-8 flex flex-col items-center justify-center">
      <div className="w-full border-[1.5px] border-dashed border-brand-400 rounded-2xl p-8 md:p-12 text-center bg-gradient-to-br from-brand-500/4 to-brand-400/2">
        <div className="w-14 h-14 rounded-full bg-brand-500/10 border border-brand-500/20 flex items-center justify-center mx-auto mb-3">
          <Upload className="size-6 text-brand-400" />
        </div>
        <p className="text-sm font-medium text-text-primary mb-1">
          Drop your notes here, or click to upload
        </p>
        <p className="text-xs text-text-tertiary mb-4">
          PDF, PNG, JPG, or TXT — up to 50MB
        </p>
        <div className="flex items-center justify-center gap-1.5">
          {["PDF", "PNG / JPG", "TXT"].map((type) => (
            <span
              key={type}
              className="px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-brand-500/8 border border-brand-500/20 text-brand-500"
            >
              {type}
            </span>
          ))}
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Create mock processing frame (Frame 2)**

```tsx
"use client"

import { SSEProgress } from "@/components/ui/sse-progress"
import { FileText } from "lucide-react"

export function MockProcessingFrame() {
  return (
    <div className="w-full h-full bg-surface-card rounded-2xl border border-border-default p-6 md:p-8">
      {/* File card */}
      <div className="flex items-center gap-3 mb-4">
        <div className="size-9 rounded-lg bg-brand-500/10 flex items-center justify-center">
          <FileText className="size-[18px] text-brand-400" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-text-primary truncate">
            Nursing_Review_Chapter_12.pdf
          </p>
          <p className="text-xs text-brand-500">Processing...</p>
        </div>
      </div>

      {/* Progress */}
      <SSEProgress
        progress={65}
        stepLabel="Generating embeddings... 65%"
        size="thin"
      />
    </div>
  )
}
```

- [ ] **Step 3: Create mock result frame (Frame 3)**

```tsx
"use client"

export function MockResultFrame() {
  return (
    <div className="w-full h-full flex flex-col md:flex-row gap-3 md:gap-4">
      {/* Summary panel */}
      <div className="flex-1 bg-surface-card rounded-2xl border border-border-default p-4 md:p-5">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-text-primary">Summary</h3>
          <span className="px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-brand-100 border border-brand-200 text-brand-500">
            Outline
          </span>
        </div>
        <div className="space-y-2">
          <div className="h-2 bg-surface-subtle rounded-full w-full" />
          <div className="h-2 bg-surface-subtle rounded-full w-5/6" />
          <div className="h-2 bg-surface-subtle rounded-full w-4/6" />
          <div className="h-2 bg-brand-500/10 rounded-full w-full border-l-[3px] border-brand-500 pl-2">
            <div className="h-2 bg-surface-subtle rounded-full w-3/4" />
          </div>
          <div className="h-2 bg-surface-subtle rounded-full w-5/6" />
          <div className="h-2 bg-surface-subtle rounded-full w-2/3" />
        </div>
      </div>

      {/* Quiz panel */}
      <div className="flex-1 bg-surface-card rounded-2xl border border-border-default p-4 md:p-5">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-text-primary">Quiz</h3>
          <span className="px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-brand-100 text-brand-800">
            MCQ
          </span>
        </div>
        <p className="text-xs text-text-primary mb-3">
          What is the primary function of the renal system?
        </p>
        <div className="space-y-2">
          {["A. Filter blood and produce urine", "B. Regulate body temperature", "C. Transport oxygen"].map((opt, i) => (
            <div
              key={i}
              className={`flex items-center gap-2.5 p-2 rounded-lg border text-xs ${
                i === 0
                  ? "border-success-500 bg-success-500/5"
                  : "border-border-default bg-surface-card"
              }`}
            >
              <span className={`size-[22px] rounded-md flex items-center justify-center text-[11px] font-semibold ${
                i === 0
                  ? "bg-success-500 text-white"
                  : "bg-surface-subtle text-text-secondary"
              }`}>
                {String.fromCharCode(65 + i)}
              </span>
              <span className="text-text-primary">{opt.slice(3)}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 4: Commit**

```bash
git add frontend/src/components/features/landing/mock-*.tsx
git commit -m "feat(frontend): create mock UI frames for scroll reveal"
```

### Task 5: Create container scroll reveal

**Files:**
- Create: `frontend/src/components/features/landing/scroll-reveal.tsx`

- [ ] **Step 1: Create scroll reveal component**

```tsx
"use client"

import { useRef } from "react"
import { motion, useScroll, useTransform, MotionValue } from "framer-motion"
import { MockUploadFrame } from "./mock-upload-frame"
import { MockProcessingFrame } from "./mock-processing-frame"
import { MockResultFrame } from "./mock-result-frame"

function useProgress(scrollYProgress: MotionValue<number>, start: number, end: number) {
  return useTransform(scrollYProgress, [start, end], [0, 1])
}

export function ScrollReveal() {
  const containerRef = useRef<HTMLDivElement>(null)
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start end", "end start"],
  })

  const frame1Progress = useProgress(scrollYProgress, 0, 0.33)
  const frame2Progress = useProgress(scrollYProgress, 0.33, 0.66)
  const frame3Progress = useProgress(scrollYProgress, 0.66, 1)

  return (
    <section ref={containerRef} className="relative py-16 md:py-24 px-4">
      {/* Title */}
      <div className="max-w-[640px] mx-auto text-center mb-8 md:mb-12">
        <h2 className="text-xl md:text-2xl font-semibold text-text-primary mb-2">
          Watch your notes become study material
        </h2>
        <p className="text-sm text-text-secondary">
          Upload, process, and get structured summaries with quizzes — all automatically.
        </p>
      </div>

      {/* Scroll container */}
      <div className="max-w-[640px] mx-auto relative" style={{ height: "600px" }}>
        <div className="sticky top-24 h-[400px] md:h-[450px]">
          {/* Frame 1: Upload */}
          <motion.div
            className="absolute inset-0"
            style={{ opacity: useTransform(frame1Progress, [0, 0.5, 1], [1, 1, 0]) }}
          >
            <MockUploadFrame />
          </motion.div>

          {/* Frame 2: Processing */}
          <motion.div
            className="absolute inset-0"
            style={{ opacity: useTransform(frame2Progress, [0, 0.3, 0.7, 1], [0, 1, 1, 0]) }}
          >
            <MockProcessingFrame />
          </motion.div>

          {/* Frame 3: Results */}
          <motion.div
            className="absolute inset-0"
            style={{ opacity: useTransform(frame3Progress, [0, 0.5, 1], [0, 1, 1]) }}
          >
            <MockResultFrame />
          </motion.div>
        </div>
      </div>
    </section>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/components/features/landing/scroll-reveal.tsx
git commit -m "feat(frontend): add container scroll reveal with 3-frame transition"
```

---

## Chunk 4: Feature Cards & CTA

### Task 6: Create feature cards section

**Files:**
- Create: `frontend/src/components/features/landing/feature-cards.tsx`

- [ ] **Step 1: Create feature cards component**

```tsx
import { FileUp, Target, CheckSquare, TrendingUp } from "lucide-react"

const features = [
  {
    icon: FileUp,
    title: "Board exam prep in minutes, not hours",
    description: "Upload your notes and let AI extract what matters. No more re-reading 200-page chapters.",
  },
  {
    icon: Target,
    title: "Know exactly what to study",
    description: "We track your weak spots across quizzes so you never waste time on what you already know.",
  },
  {
    icon: CheckSquare,
    title: "Practice like it's the real exam",
    description: "MCQ, True/False, Identification — question types that match your actual board exam format.",
  },
  {
    icon: TrendingUp,
    title: "Track your progress daily",
    description: "See your accuracy improve over time. Celebrate milestones and stay motivated.",
  },
]

export function FeatureCards() {
  return (
    <section className="py-12 md:py-16 px-4">
      <div className="max-w-[640px] mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-5">
          {features.map((feature) => {
            const Icon = feature.icon
            return (
              <div
                key={feature.title}
                className="bg-surface-card border border-border-default rounded-2xl p-5 transition-colors-fast hover:bg-surface-overlay hover:border-border-strong"
              >
                <div className="size-10 rounded-xl bg-brand-500/10 flex items-center justify-center mb-3">
                  <Icon className="size-5 text-brand-400" />
                </div>
                <h3 className="text-sm font-semibold text-text-primary mb-1">
                  {feature.title}
                </h3>
                <p className="text-xs text-text-secondary leading-relaxed">
                  {feature.description}
                </p>
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/components/features/landing/feature-cards.tsx
git commit -m "feat(frontend): add outcome-focused feature cards section"
```

### Task 7: Create CTA section

**Files:**
- Create: `frontend/src/components/features/landing/cta-section.tsx`

- [ ] **Step 1: Create CTA section component**

```tsx
import Link from "next/link"
import { Button } from "@/components/ui/button"

export function CTASection() {
  return (
    <section className="py-12 md:py-16 px-4">
      <div className="max-w-[640px] mx-auto text-center space-y-4">
        <h2 className="text-xl md:text-2xl font-semibold text-text-primary">
          Ready to study smarter?
        </h2>
        <Link href="/login">
          <Button variant="default" size="lg">
            Start Studying — It&apos;s Free
          </Button>
        </Link>
        <p className="text-xs text-text-tertiary">
          No credit card required. 3 summaries/day free.
        </p>
      </div>
    </section>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/components/features/landing/cta-section.tsx
git commit -m "feat(frontend): add final CTA section"
```

---

## Chunk 5: Compose Landing Page

### Task 8: Replace default page.tsx with landing page

**Files:**
- Modify: `frontend/src/app/page.tsx`

- [ ] **Step 1: Replace page.tsx content**

```tsx
import { LandingNavbar } from "@/components/features/landing/navbar"
import { HeroSection } from "@/components/features/landing/hero-section"
import { ScrollReveal } from "@/components/features/landing/scroll-reveal"
import { FeatureCards } from "@/components/features/landing/feature-cards"
import { CTASection } from "@/components/features/landing/cta-section"

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-surface-page">
      <LandingNavbar />
      <HeroSection />
      <ScrollReveal />
      <FeatureCards />
      <CTASection />
    </div>
  )
}
```

- [ ] **Step 2: Verify build**

Run: `pnpm run build` in `frontend/`
Expected: Build succeeds

- [ ] **Step 3: Verify dev server**

Run: `pnpm run dev` in `frontend/`
Navigate to `/` and verify:
- Navbar shows logo + "Get Started" button
- Hero shows headline + rotating sub-headlines (3s interval)
- Scroll down: mock UI transitions through upload → processing → results
- Feature cards show 4 outcome-focused cards (2x2 on mobile, 4-col on desktop)
- CTA section at bottom with "Start Studying" button
- Dark mode: all colors switch correctly

- [ ] **Step 4: Commit**

```bash
git add frontend/src/app/page.tsx
git commit -m "feat(frontend): replace default scaffold with landing page"
```

---

## Chunk 6: Verification

### Task 9: Run tests and lint

- [ ] **Step 1: Run lint**

Run: `pnpm run lint` in `frontend/`
Expected: No errors

- [ ] **Step 2: Run tests**

Run: `pnpm run test:run` in `frontend/`
Expected: All tests pass

### Task 10: Mobile verification

- [ ] **Step 1: Test mobile viewport**

Resize browser to 390px width and verify:
- Hero text readable, not overflowing
- Scroll reveal frames stack vertically (summary on top, quiz below)
- Feature cards stack in single column
- All touch targets >= 44px
- Bottom padding accounts for mobile tab bar (if logged in)

### Task 11: Final commit

- [ ] **Step 1: Commit all remaining changes**

```bash
git add -A
git commit -m "feat(frontend): complete landing page implementation"
```

---

**Plan complete.** Ready to execute?
