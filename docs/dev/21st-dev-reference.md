# 21st.dev Component Reference

> Which components to source from 21st.dev, how to adapt them to Clarift's design system, and what to never import unchanged.  
> 21st.dev URL: https://21st.dev/community/components  
> All components require color token replacement — never use a 21st.dev component with its default colors.

---

## How to Use This Document

1. Browse 21st.dev using the search terms listed below
2. Pick the component that matches the visual spec in [`design.md`](./design.md)
3. Copy the source code (via their MCP or directly from the component page)
4. Replace all hardcoded colors with Clarift brand tokens (see Adaptation Rules below)
5. Place in `frontend/src/components/features/[feature]/` — never in `components/ui/`

---

## Adaptation Rules (Apply to Every Component)

Before using any 21st.dev component, make these replacements:

```
Their default blue  → brand-500 (#6366F1)
Their default gray  → surface-* variables
Their ring color    → rgba(99,102,241,0.15)
Their border color  → var(--border-default) / #E5E4F0
Their text colors   → var(--text-primary) / var(--text-secondary)
Their white bg      → var(--surface-card)
Their dark bg       → #1A1929 (dark mode card)
Their font          → Inter (already in project)
Their border-radius → match design.md spec for that component type
```

Never import a 21st.dev component into `components/ui/` — those are shadcn primitives only. Feature-specific 21st.dev components go in `components/features/`.

---

## Priority Components by Feature

### 1. Document Upload

**Search on 21st.dev:** `file upload drag drop` · `animated upload zone`

**What to look for:**
- Animated border on drag-over (dashed → solid, color shift)
- Smooth file appear animation after drop
- In-progress state with file name + progress bar

**What to replace after copy:**
- Drop zone border: `border-brand-400` dashed
- Drag-over border: `border-brand-500` solid
- Progress bar fill: `linear-gradient(90deg, #6366F1, #818CF8)`
- Icon tint: `rgba(99,102,241,0.1)` background

**What NOT to use from 21st.dev:**
- Multi-file queue lists (Clarift uploads one document at a time)
- Thumbnail preview grids (documents are PDFs, not images)
- Upload speed / ETA indicators (irrelevant for document processing)

---

### 2. Chat Interface

**Search on 21st.dev:** `ai chat message` · `chat streaming` · `chat thinking indicator`

**What to look for:**
- Streaming token-by-token message appearance
- Thinking/loading state with animated dots
- Message bubble layout (user right, AI left)
- Citation or source attachment below AI messages

**What to replace after copy:**
- User bubble: `bg-brand-500` text white
- AI message: no bubble, plain text on surface-card bg
- Thinking dots: brand-500 fill with staggered opacity animation
- Citation pills: surface-subtle bg with border-default

**Components from 21st.dev AI Chat category most relevant:**
- Any component with "typing indicator" or "thinking" state
- Any component with "source" or "citation" display below messages
- Any component with smooth streaming text appearance

**What NOT to use:**
- Multi-model selector (Clarift chat uses one model, no user choice)
- Conversation history sidebar (out of scope for MVP)
- Message editing / regeneration controls (out of scope for MVP)
- Reaction emojis or thumbs up/down (out of scope for MVP)

---

### 3. Buttons

**Search on 21st.dev:** `button shimmer` · `button loading state` · `button hover glow`

**What to look for:**
- Primary button with built-in loading state (spinner replaces label)
- Subtle shimmer or shine effect on hover (not aggressive)
- Clean disabled state that doesn't look broken

**Clarift button loading pattern:**
```tsx
// Loading state replaces label — never show button + separate spinner
<Button disabled={isLoading}>
  {isLoading ? <Spinner size={16} /> : "Generate Summary"}
</Button>
```

**What to replace:**
- Default blue → brand-500 (#6366F1)
- Hover → brand-600 (#4F46E5)
- Shimmer color → white at 10% opacity (subtle, not flashy)

**What NOT to use:**
- Gradient buttons (flat surfaces only per design.md)
- Glow effect buttons (too aggressive for a study tool)
- 3D / raised button effects

---

### 4. Progress / Loading Indicators

**Search on 21st.dev:** `progress bar animated` · `spinner loader branded` · `skeleton loading`

**What to look for:**
- Thin progress bar (2–4px height) with smooth fill animation
- Indeterminate shimmer animation for unknown-duration waits
- Skeleton that matches card shapes

**Processing progress bar (SSE-driven):**
```
height: 2px
position: below card or page header
indeterminate: shimmer animation until pct% arrives
determinate: width transitions smoothly as pct updates from SSE
color: brand-500
```

**Skeleton loading:**
```
Always matches the shape of the content it replaces
border-radius: same as the real element
animate-pulse with brand-100 (light) / surface-subtle (dark) color
Never show skeleton for < 300ms — add 300ms delay before showing
```

---

### 5. Number / Score Display

**Search on 21st.dev:** `number counter animate` · `animated number` · `counting up`

**What to look for:**
- Count-up animation from 0 to target value
- Configurable duration and easing
- Works with percentage values

**Clarift score reveal spec:**
```
Count from 0 to final score over 800ms
Easing: easeOutQuart
Trigger: on component mount, after 200ms delay (let card appear first)
Color changes to semantic color (green/amber/red) when animation completes
```

**What to replace:**
- Font weight: 700 for score numbers only (exception to the 500 rule)
- Color: success-500 / accent-500 / danger-500 based on score tier

---

### 6. Cards

**Search on 21st.dev:** `card hover` · `feature card` · `stat card`

**What to look for:**
- Subtle hover lift (very slight — 1–2px translate or barely perceptible shadow)
- Clean icon + title + meta layout
- Compact information density

**Clarift hover pattern:**
```
Default: border-default (no shadow)
Hover:   border-strong, bg: surface-overlay
NO box-shadow on hover — flat surfaces only
transition: all 150ms ease
```

**What NOT to use:**
- Cards with heavy drop shadows
- Cards with colored gradient backgrounds
- Cards with animated border gradients (too distracting for a study tool)

---

### 7. Inputs and Textareas

**Search on 21st.dev:** `input animated` · `textarea auto resize` · `chat input`

**What to look for:**
- Clean focus ring that uses brand color
- Auto-resize textarea that grows with content
- Placeholder that clears cleanly

**Chat textarea spec (from design.md):**
```
border-radius: 20px (pill shape)
padding: 9px 14px
auto-resize: yes, max-height 120px
focus: border-brand-400 (not a heavy ring — subtle)
background: surface-subtle
```

**Settings textarea (custom instructions):**
```
standard rectangular textarea
character counter below: right-aligned, text-xs text-tertiary
  turns accent-500 at 400/500 chars
  turns danger-500 at 480/500 chars
```

---

### 8. Radio Groups (Settings / Onboarding)

**Search on 21st.dev:** `radio group card` · `option selector card`

**What to look for:**
- Card-style radio group where the entire card is the clickable area
- Smooth selection animation (border color change, background tint)
- Checkmark indicator on selected state

**Important:** 21st.dev radio groups will not have the preview snippet. Add the monospace preview block manually after copying — it's required per design.md.

---

### 9. Toasts / Notifications

**Search on 21st.dev:** `toast notification` · `alert toast`

**What to look for:**
- Appears from bottom-right on desktop, bottom-center on mobile
- Auto-dismisses after 4 seconds
- Has close button

**Clarift toast variants:**
```
Success (document ready, quota reset):
  background: success-100, text: success-800, icon: CheckCircle success-500

Warning (quota near limit):
  background: accent-100, text: accent-800, icon: AlertTriangle accent-500
  Copy: "1 summary left today — resets at midnight"

Error (generation failed, upload failed):
  background: danger-100, text: danger-800, icon: XCircle danger-500
  Always include what to do next in the message body

Info (processing started):
  background: brand-100, text: brand-800, icon: Sparkles brand-500
```

Use shadcn's Sonner (toast library) — it's already in the ecosystem. Only source from 21st.dev if the Sonner default styling needs significant visual customization.

---

### 10. Shaders / Backgrounds (Landing Page Only)

**Search on 21st.dev:** `shader background` · `mesh gradient` · `animated background`

**What to look for:**
- Subtle animated mesh or noise in brand colors
- Performance-safe (not 60fps WebGL that kills mobile batteries)
- Works with indigo + purple color family

**Where to use:**
- Landing page hero section ONLY
- Not in the app shell, dashboard, or any feature page

**Adaptation:**
- Primary mesh color: #6366F1 (brand-500)
- Secondary: #818CF8 (brand-400)
- Background: #0F0E1A (dark) or #F8F7FF (light)
- Opacity: 0.6–0.8 max (never full opacity on a shader)

---

## Components to Build from Scratch (Do Not Source from 21st.dev)

These are either too Clarift-specific or too simple to need a library component:

| Component | Reason to build from scratch |
|---|---|
| Quiz option with letter badge | Too specific — A/B/C/D letter system |
| Weak area card with icon ring | Simple flex layout, no complex behavior |
| Concept callout block | Pure CSS, no interaction |
| MermaidJS diagram wrapper | Wrapper around mermaid.render(), no UI complexity |
| Dot-and-pill quiz progress | 10 lines of CSS, no component needed |
| Quota meter with color thresholds | Simple progress bar + conditional color |
| Nav bar (mobile bottom) | shadcn is sufficient with custom colors |
| Citation pills | Inline flex, 5 lines of CSS |

---

## 21st.dev MCP Integration (Recommended)

Install the 21st.dev MCP for OpenCode so you can search and copy components without leaving your editor:

```bash
# In OpenCode settings, add the 21st.dev MCP
# This lets you run: /component "file upload animated"
# And get the source pasted directly into your editor
```

When using the MCP, always specify in your prompt:
```
"Use Tailwind CSS and shadcn/ui. Adapt colors to use CSS variables 
instead of hardcoded values. Target React + Next.js App Router."
```

This prevents the MCP from generating components with hardcoded Tailwind colors that would need manual replacement.

---

## Quality Bar

Before committing any 21st.dev component, verify:

- [ ] All hardcoded colors replaced with brand tokens or CSS variables
- [ ] Font is Inter (not the library's default)
- [ ] border-radius matches design.md spec for that component type
- [ ] Dark mode works — test with `dark` class on html element
- [ ] Touch targets are ≥ 44px on mobile
- [ ] No animations that play on every render — only on user interaction or state change
- [ ] Component is placed in `components/features/[feature]/` not `components/ui/`