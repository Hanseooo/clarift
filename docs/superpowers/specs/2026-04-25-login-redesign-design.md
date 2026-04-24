# Design Spec: /login Page & Clerk Component Redesign

**Date:** 2026-04-25  
**Status:** Approved by user (Hans)  
**Scope:** UI/UX only — no auth logic changes  

---

## Objective

Redesign the `/login` page to match Clarift's premium brand identity and create visual continuity with the landing page (`/`). Apply a global Clerk theme so all auth components (SignIn, UserButton, modals) use Clarift's design tokens.

---

## Design Direction

**Approach A — Split-Screen Brand Continuity**

Desktop: 50/50 split. Left panel displays branded visuals (ambient background, gradient wordmark, value props). Right panel contains a clean, minimal auth card with the themed SignIn component. Mobile: single column with compressed brand header above auth card.

---

## Files to Modify

| File | Change |
|---|---|
| `frontend/src/app/layout.tsx` | Add global `appearance` prop to `<ClerkProvider>` |
| `frontend/src/app/login/page.tsx` | Full redesign — split-screen layout, brand visuals, themed SignIn |

---

## Layout

### Desktop (md+)
- **Left panel (50%):** `relative`, `hidden md:flex`, flex-col, items-center, justify-center. Contains ShaderBackground, FloatingBubbles, gradient wordmark, 3 value props.
- **Right panel (50%):** `flex`, items-center, justify-center. Contains auth card.
- **Container:** `min-h-screen`, `flex`, `w-full`.

### Mobile (<md)
- Single column: compressed brand section (logo + tagline) on top, auth card below.
- Full-width cards, 16px horizontal padding per `design.md` mobile rules.
- **Ambient backgrounds omitted:** `ShaderBackground` and `FloatingBubbles` are desktop-only to avoid jank on low-end mobile devices.

---

## Left Panel — Brand Continuity

### Visuals
- **Background:** Reuse `ShaderBackground` and `FloatingBubbles` components from landing page.
- **Surface:** `--surface-page` (#F8F7FF light / #0F0E1A dark).

### Content
1. **Logo mark:** `BookOpen` icon in 56px ring (brand-100 bg, brand-400 icon) — smaller than landing page hero to avoid competing with auth form.
2. **Wordmark:** "Clarift" with gradient text (`from-brand-500 via-brand-400 to-brand-600`) and animated underline.
3. **Tagline:** "Your AI-powered study engine" — `text-lg text-text-secondary`.
4. **Value props (3 items):**
   - `BookOpen` → "Turn notes into structured summaries"
   - `CheckSquare` → "Test yourself with AI quizzes"
   - `Target` → "Practice your weak areas"
   - Each: 22px icon, `text-sm text-text-secondary`, flex row with `gap-3`.

### Motion
- **Card entrance:** Fade + slide up, 600ms ease-out.
- **Value props:** Staggered fade-in, 100ms delay between each.
- **Ambient:** Bubble drift (existing 18–22s loops).

---

## Right Panel — Auth Experience

### Card
- **Style:** `bg-surface-card`, `border border-default`, `rounded-2xl`, `p-8`.
- **Width:** `w-full max-w-md`.
- **No shadow** — flat surfaces only per `design.md`.

### Header
- "Welcome back" — `text-xl font-semibold text-primary`.
- "Sign in to start studying" — `text-sm text-text-secondary`.

### SignIn Component
- Embedded `<SignIn />` with `fallbackRedirectUrl="/dashboard"`.
- **Remove the existing per-instance `appearance` prop** from `<SignIn />`. All theming moves to the global `<ClerkProvider>` or CSS variables.
- Clerk's default card/header/footer will now render with the global theme instead of being forcibly hidden.

### Footer
- Terms/Privacy copy retained from current page.
- `text-xs text-text-tertiary`, `pt-6 border-t border-default`.

---

## Clerk Global Theme

Applied via CSS custom properties in `globals.css` (preferred over prop-based theming for automatic dark-mode support):

```css
:root {
  --clerk-color-primary: #6366F1;
  --clerk-color-danger: #EF4444;
  --clerk-color-success: #10B981;
  --clerk-color-warning: #F59E0B;
  --clerk-color-background: #FFFFFF;
  --clerk-color-foreground: #1A1833;
  --clerk-color-muted-foreground: #6B6888;
  --clerk-color-border: #E5E4F0;
  --clerk-color-input-background: #F1F0FE;
  --clerk-color-input-foreground: #1A1833;
  --clerk-color-ring: #6366F1;
  --clerk-border-radius: 0.5rem;
  --clerk-font-family: var(--font-sans), Inter, sans-serif;
}

.dark {
  --clerk-color-background: #1A1929;
  --clerk-color-foreground: #F0EFFF;
  --clerk-color-muted-foreground: #9896B8;
  --clerk-color-border: #2D2C45;
  --clerk-color-input-background: #21203A;
  --clerk-color-input-foreground: #F0EFFF;
}
```

Then in `layout.tsx`, pass `appearance={{ variables: { /* reference CSS vars */ } }}` or rely on the native CSS variable fallback.

This themes:
- SignIn button colors, inputs, focus rings
- UserButton dropdown backgrounds and borders
- Any future Clerk modals
- Automatic dark-mode switching via `.dark` class

---

## Color Compliance

- ✅ Primary: `#6366F1` (brand-500) — never generic blue
- ✅ Text: `#1A1833` (text-primary) — never pure black
- ✅ Surfaces: `surface-card`, `surface-page` — no hardcoded whites/blacks
- ✅ Amber (`accent-500`) reserved for streaks/progress only
- ✅ No gradients in UI chrome (except wordmark and ambient bubbles)

---

## Typography Compliance

- Page title: `text-xl font-semibold`
- Body: `text-sm text-secondary`
- Labels: `text-xs text-tertiary`
- Font: Inter (already configured in layout.tsx)

---

## Motion Compliance

- Marketing page — expressive motion allowed per `design.md`.
- Ambient floating bubbles ✅
- Staggered entrance animations ✅
- Gradient text + animated underline ✅
- No spring physics, no bounce — all ease curves.

---

## Accessibility

- **`useReducedMotion()` pattern:** Follow the exact pattern from `frontend/src/components/features/landing/hero-section.tsx` — import `useReducedMotion` from `framer-motion`, conditionally disable `initial` animation props when true.
- Minimum 44px touch targets on mobile.
- Focus ring on SignIn button matches brand color.

---

## What We Are NOT Changing

- No auth logic (middleware, route guards, onboarding redirect).
- No backend changes.
- No new dependencies — reuses existing `framer-motion`, `lucide-react`.
- No new API endpoints.

---

## Verification Checklist

- [ ] `/login` renders without errors in dev
- [ ] Desktop: split-screen layout visible
- [ ] Mobile: stacked layout, no horizontal scroll
- [ ] SignIn component uses brand colors (indigo button, matching inputs)
- [ ] UserButton dropdown uses matching theme
- [ ] Dark mode surfaces render correctly
- [ ] Reduced motion: animations disabled, static fallback shown
- [ ] `pnpm run test:run` passes (or at least no new failures)
