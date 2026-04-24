# Landing Page Implementation Plan (Updated)

> **Status:** IMPLEMENTED. This plan reflects the current production landing page. Use for reference, maintenance, and as a template for future marketing pages.

**Goal:** High-fidelity, conversion-focused landing page at `/` with dramatic hero animations, true scroll-pin reveal with directional transitions, outcome-focused feature cards, and polished CTA — all mobile-first with full dark mode support.

**Architecture:** Single page at `app/page.tsx` composed of section components in `components/features/landing/`. Uses Framer Motion for scroll-driven animations, entrance animations, and headline transitions. Follows the "Marketing vs. App" animation boundary defined in `design.md`.

**Tech Stack:** Next.js 15 (App Router), TypeScript, Tailwind CSS v4, Framer Motion, Lucide React

---

## File Structure

| File | Status | Responsibility |
|---|---|---|
| `frontend/src/app/page.tsx` | ✅ Implemented | Landing page composition |
| `frontend/src/components/features/landing/hero-section.tsx` | ✅ Implemented | Dramatic hero with gradient "Clarift", word-by-word headlines, floating bubbles, device frame |
| `frontend/src/components/features/landing/scroll-reveal.tsx` | ✅ Implemented | True scroll-pin with directional slide transitions + progress dots |
| `frontend/src/components/features/landing/feature-cards.tsx` | ✅ Implemented | 4 outcome-focused feature cards |
| `frontend/src/components/features/landing/cta-section.tsx` | ✅ Implemented | Final CTA with glassmorphism bg + shimmer button |
| `frontend/src/components/features/landing/navbar.tsx` | ✅ Implemented | Landing page top nav (logo + CTA button) |
| `frontend/src/components/features/landing/mock-upload-frame.tsx` | ✅ Implemented | Frame 1: mock upload zone (naked, for device frame) |
| `frontend/src/components/features/landing/mock-processing-frame.tsx` | ✅ Implemented | Frame 2: mock processing state (naked, for device frame) |
| `frontend/src/components/features/landing/mock-result-frame.tsx` | ✅ Implemented | Frame 3: split summary + quiz view (naked, for device frame) |
| `frontend/src/components/features/landing/shader-background.tsx` | ✅ Implemented | Subtle animated mesh gradient background |
| `frontend/src/components/features/landing/floating-bubbles.tsx` | ✅ Implemented | Ambient drifting bubbles (indigo + amber) |
| `frontend/src/components/features/landing/mock-device-frame.tsx` | ✅ Implemented | Browser chrome wrapper for mock UIs |

---

## Design Decisions

### Hero Section
- **"Clarift"** is the sole h1, massive scale (`text-6xl md:text-8xl lg:text-9xl`)
- **Gradient text** using `bg-gradient-to-r from-brand-500 via-brand-400 to-brand-600 bg-clip-text`
- **Animated underline** sweeps across beneath the heading
- **Word-by-word stagger reveal** for rotating headlines (each word animates individually)
- **Floating bubbles** provide ambient depth (3 large blurred circles, slow drift, 18–22s loops)
- **Mock device frame** with browser chrome sits below the CTA, showing the upload UI
- **Staggered entrance animations** — each element fades up with increasing delay

### Scroll Reveal
- **True pin**: 300vh container with sticky inner frame
- **Directional transitions**: each frame slides in from bottom, slides out upward
- **Scale micro-animation**: frames pulse slightly (0.95→1→0.95) during transitions
- **Progress dots** on left edge indicate active step
- **Background color shift**: surface-page → surface-subtle → surface-page as user scrolls
- **Mock device frame** wraps all three states for realism

### CTA Section
- **Glassmorphism gradient background** — subtle brand tint
- **Shimmer button** — white sheen passes across on hover
- **"Start Studying Free"** — no em dashes, action-oriented

### Navbar
- **Blur backdrop** with `bg-surface-page/70 backdrop-blur-xl`
- **Max-width 960px** to match hero (wider than app shell's 768px)
- Links to `/login` (not `/sign-in`)

---

## Dark Mode Considerations

All landing components must work in dark mode:

| Component | Light Mode | Dark Mode |
|---|---|---|
| Gradient text | `from-brand-500 via-brand-400 to-brand-600` | Same gradient (works on dark) |
| Floating bubbles | `brand-500/10`, `accent-500/8` | Same opacity, visible on dark bg |
| Shader bg | `rgba(99,102,241,0.08)` | Same, subtle on both |
| Device frame | `bg-surface-card`, `border-border-default` | Uses CSS vars (auto-switches) |
| Feature cards | `bg-surface-card`, `hover:bg-surface-overlay` | Uses CSS vars (auto-switches) |
| CTA section | `from-surface-page via-brand-500/[0.02]` | `dark:from-surface-page dark:via-brand-500/[0.05]` |

**Note:** Dark mode is activated via `next-themes` `attribute="class"`. The `.dark` block in `globals.css` handles all token switches automatically.

---

## Animation Spec Reference

See `design.md` → "Motion & Interaction" → "Marketing vs. App Animation Boundary" for the philosophy behind these choices.

| Animation | Duration | Easing | Purpose |
|---|---|---|---|
| Heading entrance | 0.8s | easeOut | Draw attention to brand |
| Underline sweep | 1.0s | easeOut, 0.5s delay | Accentuate heading |
| Subtitle entrance | 0.6s | easeOut, 0.3s delay | Hierarchy build |
| Word-by-word headline | 0.3s per word | easeOut, 40ms stagger | Engaging reveal |
| CTA entrance | 0.6s | easeOut, 0.7s delay | Conversion focus |
| Device frame entrance | 0.8s | easeOut, 1.1s delay | Product preview |
| Scroll frame slide | tied to scroll | — | Progress indication |
| Bubble drift | 18–22s | ease-in-out, infinite | Ambient depth |
| Shimmer hover | 0.6s | ease-out | Interactive delight |

---

## Spacing

- Hero: `min-h-screen`, `pt-20` (navbar clearance), `pb-16`
- Content max-width: `960px` (marketing pages are wider than app's 768px)
- Scroll reveal: `300vh` tall container, sticky frame `h-[calc(100vh-8rem)]`
- Feature cards: `py-12 md:py-16`, container `max-w-[640px]`
- CTA: `py-20 md:py-28`

---

## Maintenance Notes

### Adding new landing sections
1. Create component in `components/features/landing/`
2. Import and compose in `app/page.tsx`
3. Follow marketing animation rules (expressive motion allowed)
4. Use brand tokens, never raw Tailwind colors
5. Test in both light and dark modes

### Updating headlines
Edit the `headlines` array in `hero-section.tsx`. Keep them:
- Action-oriented ("Stop re-reading. Start testing yourself.")
- Specific to Filipino board exam students
- Under 60 characters for mobile readability

### Updating feature cards
Edit the `features` array in `feature-cards.tsx`. Each card needs:
- Lucide icon (20px inside 40px ring)
- Title (short, benefit-focused)
- Description (1–2 sentences, outcome-focused)

---

**Plan is live.** No further implementation needed unless modifying existing sections.
