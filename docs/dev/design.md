# DESIGN.md — Clarift

> Design system source of truth for AI coding agents building Clarift's UI.  
> Stack: Next.js 15 + Tailwind CSS 4 + shadcn/ui  
> Reference this file in every frontend generation task.  
> See [`agents.md`](./agents.md) for architecture rules.

---

## Identity

**Product:** Clarift — The Study Engine Built Around Your Own Material  
**Audience:** Filipino students preparing for board exams (nursing, CPA, engineering, medicine)  
**Emotional register:** Focused, warm, intelligent. Like a study partner who is smarter than you and genuinely wants you to pass.  
**Visual references:** Perplexity (content presentation, AI output layout), Linear (spacing system, interaction quality), Duolingo web (quiz and progress UI)

---

## Design Principles

1. **Content is the hero.** The UI disappears when a student is studying. Never let chrome compete with generated content.
2. **Warmth over sterility.** Indigo anchors intelligence. Amber signals progress and energy. Together they feel premium but not cold.
3. **Mobile first, always.** Filipino students study on phones. Every component is designed at 390px and scaled up.
4. **Density is earned.** Start with breathing room. Add density only where the user is actively working (quiz runner, practice drills).
5. **Progress is visible.** Weak areas, usage meters, quiz scores — always surfaced, never buried.

---

## Color System

### Brand Palette

```css
/* Primary — Indigo */
--color-brand-50:  #EEF2FF;
--color-brand-100: #E0E7FF;
--color-brand-200: #C7D2FE;
--color-brand-300: #A5B4FC;
--color-brand-400: #818CF8;
--color-brand-500: #6366F1;   /* Primary action, buttons, links */
--color-brand-600: #4F46E5;   /* Hover states */
--color-brand-700: #4338CA;   /* Active states */
--color-brand-800: #3730A3;   /* Text on light brand backgrounds */
--color-brand-900: #312E81;   /* Darkest, heavy emphasis */

/* Accent — Amber */
--color-accent-50:  #FFFBEB;
--color-accent-100: #FEF3C7;
--color-accent-200: #FDE68A;
--color-accent-300: #FCD34D;
--color-accent-400: #FBBF24;
--color-accent-500: #F59E0B;   /* Streaks, highlights, warnings */
--color-accent-600: #D97706;   /* Hover on amber elements */
--color-accent-700: #B45309;   /* Active */
--color-accent-800: #92400E;   /* Text on amber backgrounds */

/* Semantic */
--color-success-500: #10B981;  /* Correct answers, ready status */
--color-success-100: #D1FAE5;
--color-success-800: #065F46;

--color-danger-500:  #EF4444;  /* Wrong answers, errors, failed status */
--color-danger-100:  #FEE2E2;
--color-danger-800:  #991B1B;

--color-warning-500: #F59E0B;  /* Quota near limit, weak areas */
--color-warning-100: #FEF3C7;
--color-warning-800: #92400E;
```

### Light Mode Surfaces

```css
--surface-page:      #F8F7FF;  /* Slight indigo tint, not pure white */
--surface-card:      #FFFFFF;
--surface-subtle:    #F1F0FE;  /* Hover states, sidebar backgrounds */
--surface-overlay:   rgba(99, 102, 241, 0.04);  /* Hovered rows */

--border-default:    #E5E4F0;
--border-strong:     #C7C5E0;

--text-primary:      #1A1833;  /* Near-black with indigo undertone */
--text-secondary:    #6B6888;
--text-tertiary:     #9896AA;
--text-on-brand:     #FFFFFF;
```

### Dark Mode Surfaces

```css
--surface-page:      #0F0E1A;  /* Deep indigo-black */
--surface-card:      #1A1929;
--surface-subtle:    #21203A;
--surface-overlay:   rgba(99, 102, 241, 0.08);

--border-default:    #2D2C45;
--border-strong:     #3D3C58;

--text-primary:      #F0EFFF;
--text-secondary:    #9896B8;
--text-tertiary:     #6B6888;
--text-on-brand:     #FFFFFF;
```

### Tailwind Config Extension

```js
// tailwind.config.js
colors: {
  brand: {
    50: '#EEF2FF', 100: '#E0E7FF', 200: '#C7D2FE',
    300: '#A5B4FC', 400: '#818CF8', 500: '#6366F1',
    600: '#4F46E5', 700: '#4338CA', 800: '#3730A3', 900: '#312E81',
  },
  accent: {
    50: '#FFFBEB', 100: '#FEF3C7', 200: '#FDE68A',
    300: '#FCD34D', 400: '#FBBF24', 500: '#F59E0B',
    600: '#D97706', 700: '#B45309', 800: '#92400E',
  },
}
```

---

## Typography

### Font

**Primary:** Inter (Google Fonts)  
**Monospace:** JetBrains Mono (for code blocks in generated summaries only)

```html
<!-- In layout.tsx -->
<link rel="preconnect" href="https://fonts.googleapis.com" />
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet" />
```

### Type Scale

```css
/* Mobile-first. Scale up at md: breakpoint (768px) */

--text-xs:   12px / 1.5  / 400  /* Labels, captions, badges */
--text-sm:   13px / 1.6  / 400  /* Secondary UI text, metadata */
--text-base: 15px / 1.7  / 400  /* Body text, card content */
--text-md:   16px / 1.6  / 500  /* Emphasized body, list items */
--text-lg:   18px / 1.4  / 600  /* Section headings, card titles */
--text-xl:   22px / 1.3  / 600  /* Page headings */
--text-2xl:  28px / 1.2  / 600  /* Hero text (landing page only) */
--text-3xl:  36px / 1.1  / 700  /* Score reveal, big numbers */
```

### Usage Rules

- **Page title:** `text-xl font-semibold text-primary` (22px mobile, 24px desktop)
- **Card title:** `text-lg font-semibold` (18px)
- **Body / generated content:** `text-base` (15px) with `leading-relaxed`
- **Labels, metadata:** `text-sm text-secondary` (13px)
- **Badges, chips:** `text-xs font-medium` (12px)
- **Score numbers:** `text-3xl font-bold text-brand-500` (36px)
- Never use font-weight 700 in UI chrome — only in data callouts (scores, stats)
- Generated AI content (summaries, quiz questions) uses `prose` class from `@tailwindcss/typography`, overridden to match brand colors

---

## Spacing System

Mobile-first base unit: **4px**

```
4px   → gap between icon and label, tight inline spacing
8px   → padding inside chips/badges, gap between related items
12px  → gap between list items, internal card padding (mobile)
16px  → standard card padding, section gaps (mobile)
20px  → between card sections
24px  → between cards in a list
32px  → between major page sections (mobile)
48px  → between major page sections (desktop)
```

### Layout Widths

```css
--layout-max:        768px;   /* App shell max-width */
--layout-content:    640px;   /* Content column max-width */
--layout-sidebar:    240px;   /* Desktop sidebar */

/* Mobile: full width with 16px horizontal padding */
/* Desktop (md+): sidebar fixed left, content scrolls */
```

---

## Component Specifications

### Navigation

**Mobile:** Bottom tab bar (fixed, 56px height)  
Tabs: Dashboard, Documents, Practice, Chat, Settings

**Desktop:** Left sidebar (240px, fixed)  
Same items as mobile tab bar, shown as vertical list with icons + labels

```
Tab bar item:
  - Icon: 22px, stroke-width 1.5
  - Label: 11px, font-medium
  - Active: icon and label in brand-500, no background
  - Inactive: text-tertiary
  - No borders, no cards — just color change
```

### Upload Zone

```
Drop zone container:
  border: 1.5px dashed brand-400
  border-radius: 16px
  background: linear-gradient(135deg, rgba(99,102,241,0.04) 0%, rgba(129,140,248,0.02) 100%)
  padding: 32px 20px
  text-align: center
  position: relative, overflow: hidden

  Radial glow (::before pseudo-element):
    position: absolute, inset: 0, pointer-events: none
    background: radial-gradient(ellipse at 50% 0%, rgba(99,102,241,0.06) 0%, transparent 70%)

  Icon ring:
    56px × 56px circle
    background: rgba(99,102,241,0.1)
    border: 1px solid rgba(99,102,241,0.2)
    margin: 0 auto 12px
    Upload icon, 24px, brand-400

  Title: text-sm font-medium text-primary
  Subtitle: text-xs text-tertiary, margin-bottom 16px

  File type chips (flex row, centered, gap 6px):
    bg: rgba(99,102,241,0.08), border: 1px solid rgba(99,102,241,0.2)
    border-radius: 999px, padding: 3px 10px
    font-size: 11px font-weight 500, color: brand-500
    Labels: "PDF"  "PNG / JPG"  "TXT"

Drag-over state:
  border-color: brand-500
  background: rgba(99,102,241,0.06)
  transform: scale(1.01), transition: all 150ms ease

In-progress file card (shown below drop zone after upload):
  background: surface-card, border: 1px border-default
  border-radius: 12px, padding: 12px 14px
  display: flex, align-items: center, gap: 12px

  File icon box: 36px × 36px, border-radius: 8px
    background: rgba(99,102,241,0.1), FileText icon 18px brand-400

  File name: text-sm font-medium text-primary (text-overflow: ellipsis)
  Step label: text-xs brand-500  e.g. "Generating embeddings... 65%"

  Gradient progress bar:
    height: 3px, track: border-default, border-radius: 999px
    fill: linear-gradient(90deg, brand-500 0%, brand-400 100%)
    Glowing leading edge (::after):
      12px × 5px, background: white opacity 0.6, filter: blur(2px)
      position: absolute at right edge of fill
```

### Cards

Three card variants used throughout:

**Document card** (upload list, dashboard)
```
background: surface-card
border: 1px border-default
border-radius: 12px
padding: 16px
gap between items: 16px

Structure (flex row):
  [icon box 36px × 36px, border-radius 8px, brand-100 bg]   [content]   [status badge]
  Icon box contains FileText icon, 18px, brand-400

  Content:
    title: text-sm font-medium text-primary (truncated)
    subtitle: text-xs text-tertiary margin-top 2px
    e.g. "42 pages · Apr 10" or "Processing..."

Hover state:
  background: surface-overlay
  border-color: border-strong
  transition: all 150ms ease
```

**Feature card** (summary, quiz, practice — result display)
```
background: surface-card
border: 1px border-default
border-radius: 16px
padding: 20px (mobile), 24px (desktop)

Has: section header, content area, action footer
Content area renders react-markdown with prose styles
```

**Stat card** (quota meter, score display)
```
background: surface-subtle
border: none
border-radius: 10px
padding: 12px 16px

Structure:
  [label text-xs text-secondary]
  [value text-xl font-semibold]
  [progress bar or sub-label]
```

### Buttons

```
Primary (CTA — generate summary, start quiz, upgrade):
  bg: brand-500
  text: white, text-sm font-medium
  hover: brand-600
  active: brand-700
  border-radius: 8px
  height: 40px mobile, 36px desktop
  padding: 0 16px

Secondary (cancel, back, secondary actions):
  bg: surface-subtle
  text: text-primary, text-sm font-medium
  border: 1px border-default
  hover: surface-card with border-strong
  border-radius: 8px
  height: 40px mobile, 36px desktop

Ghost (inline actions, settings):
  bg: transparent
  text: text-secondary
  hover: surface-overlay
  no border
  border-radius: 6px

Destructive (delete document):
  bg: danger-100
  text: danger-800, text-sm font-medium
  hover: danger-500 bg, white text
  border-radius: 8px

Icon button (close, expand, edit):
  size: 32px × 32px
  border-radius: 6px
  icon: 16px
  hover: surface-subtle
```

### Badges / Status Chips

```
Document status:
  pending:    bg: surface-subtle    text: text-tertiary
  processing: bg: brand-100        text: brand-800    (with spinner)
  ready:      bg: success-100      text: success-800
  failed:     bg: danger-100       text: danger-800

Tier badge:
  free:  bg: surface-subtle   text: text-secondary   "Free"
  pro:   bg: accent-100       text: accent-800        "Pro"  (amber)

Question type badge (quiz):
  mcq:          bg: brand-100   text: brand-800
  true_false:   bg: #F0FDF4     text: #166534
  identification: bg: #FFF7ED  text: #9A3412
  multi_select: bg: #F5F3FF    text: #5B21B6
  ordering:     bg: #F0F9FF    text: #0C4A6E

All badges:
  font-size: 11px
  font-weight: 500
  padding: 2px 8px
  border-radius: 999px (pill)
  letter-spacing: 0.01em
```

### Progress / Quota Meters

```
Structure:
  [feature name text-sm]     [count text-sm font-medium]
  [progress bar full width]
  [reset time text-xs text-tertiary]

Progress bar:
  height: 4px
  background track: border-default
  fill color:
    0–70%:  brand-500
    70–90%: accent-500 (amber — caution)
    90–100%: danger-500 (red — near limit)
  border-radius: 999px
  transition: width 300ms ease
```

### Quiz Components

**Question card:**
```
border-radius: 16px
padding: 18px
border: 1px border-default
background: surface-card

Header (flex, space-between):
  Left: question type badge (pill, brand-100 bg, brand-800 text, brand-200 border)
  Right: dot-and-pill progress indicator
    Completed questions: 6px circle, brand-500 fill
    Current question:    6px × 16px pill, brand-500 fill
    Future questions:    6px circle, border-default fill
    gap: 4px between dots

Question text:
  text-sm font-medium text-primary
  line-height: 1.6
  margin-top 12px, margin-bottom 14px

Answer options:
  gap: 7px between options
  Each option is a flex row (align-items: center, gap: 10px):

    Letter badge (left):
      22px × 22px, border-radius: 6px
      background: surface-subtle, border: 1px border-default
      font-size: 11px font-weight 600, color: text-secondary

    Option text: text-sm text-primary

  States:
    default:  border: 1px border-default, bg: surface-card
    hover:    border: 1px border-strong, bg: surface-overlay
    selected: border: 1.5px solid brand-500, bg: rgba(99,102,241,0.05)
              letter badge → bg: brand-500, border: brand-500, text: white
    correct:  border: 1.5px solid success-500, bg: rgba(16,185,129,0.05)
              letter badge → bg: success-500, border: success-500, text: white
    wrong:    border: 1.5px solid danger-500, bg: rgba(239,68,68,0.05)
              letter badge → bg: danger-500, border: danger-500, text: white

  Transition: all 150ms ease on all option state changes

Identification input:
  full width, height: 44px
  border: 1px border-default, border-radius: 8px
  padding: 0 12px, text-sm
  focus: border-brand-500, box-shadow: 0 0 0 3px rgba(99,102,241,0.15)

Ordering items (draggable, @dnd-kit/core):
  padding: 12px 14px
  border: 1px border-default, border-radius: 8px
  background: surface-card, cursor: grab
  display: flex, align-items: center, gap: 10px
  GripVertical icon: 16px, text-tertiary, left side
  active drag:
    border: 1px solid brand-400
    box-shadow: 0 4px 12px rgba(99,102,241,0.15)
    cursor: grabbing
```

**Score reveal:**
```
Card layout — two sections separated by border

Top section (score display):
  background: linear-gradient(135deg, rgba(16,185,129,0.06) 0%, rgba(99,102,241,0.04) 100%)
  padding: 24px 20px, text-align: center
  border-bottom: 1px border-default

  Score ring:
    80px × 80px circle
    background: rgba(semantic-color, 0.1)  ← color matches score tier
    border: 2px solid rgba(semantic-color, 0.3)
    margin: 0 auto 10px

    Score number inside ring: 28px font-bold
      70%+:   success-500
      40–69%: accent-500 (amber)
      <40%:   danger-500
    "score" label below number: 10px, same color, opacity 0.8

  Contextual title (below ring):
    70%+:   "Great work — keep it up"
    40–69%: "Good progress — review weak areas"
    <40%:   "Keep going — practice makes perfect"
    font-size: 14px font-weight 600 text-primary

  Subtitle: "X of Y correct · [Document name]"
    font-size: 12px text-tertiary

Bottom section (per-topic breakdown):
  padding: 14px 18px, gap: 10px between topics

  Each topic row:
    [topic name text-sm font-medium text-primary]
    [accuracy % text-sm font-weight 600, right-aligned]
      strong (≥70%): success-500
      weak (<70%):   accent-500
    [3px progress bar below: success fill or amber fill]

Score number animates: counts up from 0 to final value over 800ms
  Use requestAnimationFrame, easeOutQuart easing
```

### Weak Areas Display

```
Each weak topic — full card (not left-border row):
  background: surface-card
  border: 1px border-default
  border-radius: 12px
  padding: 14px 16px
  display: flex, align-items: center, gap: 12px
  margin-bottom: 8px

  Icon ring (left):
    36px × 36px, border-radius: 10px
    background: rgba(245,158,11,0.1)
    border: 1px solid rgba(245,158,11,0.2)
    Target icon, 18px, accent-500

  Content (flex: 1):
    Topic name: text-sm font-medium text-primary, margin-bottom 4px
    Progress bar: 3px height, accent-500 fill on border-default track
    Stat line: text-xs text-tertiary  e.g. "8 attempts across 3 quizzes"

  Percentage (right, flex-shrink: 0):
    font-size: 16px font-weight 700, color: accent-500

Empty state (no weak areas yet):
  text-center, padding: 32px 20px
  Target icon: 32px, text-tertiary, margin-bottom 12px
  Title: "No weak areas yet" text-sm font-medium text-primary
  Body: "Complete a few quizzes to discover your gaps." text-xs text-tertiary
  No CTA button — this state is informational only
```

### Summary / Generated Content Display

```
Wrapper:
  max-width: layout-content (640px)
  margin: 0 auto

Card container:
  background: surface-card
  border: 1px border-default
  border-radius: 16px
  overflow: hidden

Card header (sticky on scroll):
  padding: 14px 18px
  border-bottom: 1px border-default
  display: flex, justify-content: space-between, align-items: center
  Document title: text-sm font-medium text-primary
  Format pill badge: bg brand-100, border brand-200, text brand-500
    text-xs font-medium, border-radius: 999px, padding: 3px 10px

Prose overrides (tailwind typography @tailwindcss/typography):
  Wrapper class: prose prose-sm max-w-none

  h2: font-size 15px font-weight 600 text-primary, margin-top 20px
    Left bar marker (::before pseudo):
      width: 3px, height: 16px, background: brand-500
      border-radius: 999px, flex-shrink: 0
      display: inline-block, margin-right: 8px, vertical-align: middle

  h3: text-sm font-semibold text-secondary, margin-top 14px
  p:  text-sm, line-height: 1.75, color: text-primary
  li: text-sm, line-height: 1.75
  strong: font-medium (500, not 600/700)
  code: font-mono text-xs, bg: surface-subtle, padding: 2px 6px, border-radius: 4px

Concept callout block (injected by AI where a key concept exists):
  background: rgba(99,102,241,0.05)
  border: 1px solid rgba(99,102,241,0.15)
  border-radius: 10px
  padding: 12px 14px
  margin: 12px 0

  Label: "Key Concept"
    font-size: 10px font-weight 600 letter-spacing 0.06em uppercase
    color: brand-500, margin-bottom 6px

  Body: text-sm text-primary line-height 1.6

MermaidJS diagram wrapper:
  background: surface-subtle
  border: 1px border-default
  border-radius: 10px
  padding: 14px
  margin: 16px 0
  overflow-x: auto

  Label above: "Visual overview"
    font-size: 10px font-weight 600 uppercase letter-spacing 0.06em
    color: text-tertiary, margin-bottom 10px

  Silent failure: if render throws, wrapper renders nothing (no empty box)
```

### Chat Interface

```
Outer card:
  background: surface-card
  border: 1px border-default
  border-radius: 16px
  overflow: hidden
  display: flex, flex-direction: column

Chat header (not scrollable):
  padding: 12px 16px
  border-bottom: 1px border-default
  display: flex, align-items: center, gap: 8px

  Status dot: 8px circle, background: success-500
  Title: "Chat with your notes" text-sm font-medium text-primary
  Document context chip (right, margin-left: auto):
    background: surface-subtle, border: 1px border-default
    border-radius: 6px, padding: 2px 8px
    font-size: 11px text-tertiary
    FileText icon 12px left of text

Message thread (scrollable, flex: 1):
  padding: 14px 16px, gap: 12px, display: flex, flex-direction: column

  User message:
    align: flex-end (margin-left: auto)
    bubble: bg brand-500, text white
    border-radius: 16px 16px 4px 16px
    padding: 9px 13px, font-size: 13px, line-height: 1.5
    max-width: 78%

  Thinking state (shown while awaiting first token):
    display: flex, align-items: center, gap: 8px, padding: 6px 0

    Three dots:
      6px circles, brand-500 fill
      opacity: 0.4 / 0.6 / 0.9 (left to right)
      animate: pulse stagger (each dot delays 150ms from previous)
      animation: 1.2s ease-in-out infinite

    Label: "Searching your notes..." text-xs text-tertiary
    This state is REQUIRED — never show an empty waiting state

  Assistant message:
    display: flex, flex-direction: column, gap: 6px
    max-width: 92%

    Body text: text-sm line-height 1.65 text-primary
    Renders react-markdown (prose, no card background)

    Key-point callout (optional — for the single most important statement):
      background: rgba(99,102,241,0.08)
      border-left: 2.5px solid brand-500
      border-radius: 0 6px 6px 0
      padding: 6px 10px
      font-size: 12px text-secondary line-height 1.6
      margin-top: 4px

    Citation pills (row, gap: 6px, flex-wrap):
      background: surface-subtle, border: 1px border-default
      border-radius: 6px, padding: 3px 9px
      display: inline-flex, align-items: center, gap: 4px
      FileText icon: 11px, text-tertiary
      Text: "[Document Title] · p.XX" font-size: 11px text-secondary

Input bar (fixed bottom on mobile, sticky on desktop):
  background: surface-card
  border-top: 1px border-default
  padding: 10px 12px
  display: flex, align-items: flex-end, gap: 8px

  Textarea:
    flex: 1
    border: 1px border-default, border-radius: 20px
    padding: 9px 14px, font-size: 13px
    background: surface-subtle, resize: none
    max-height: 120px, line-height: 1.4
    Placeholder: "Ask anything about your notes..."
    focus: border-brand-400, no extra box-shadow (keep it subtle)

  Send button (circle):
    34px × 34px, border-radius: 50%, border: none
    Empty state: background surface-subtle, ArrowUp icon text-tertiary
    Has-text state: background brand-500, ArrowUp icon white
    Transition: background 150ms ease
```

### Onboarding / Settings Cards

```
Option card (format selector, style selector):
  background: surface-card
  border: 1.5px solid border-default
  border-radius: 14px
  padding: 16px
  display: flex, gap: 12px, align-items: flex-start
  cursor: pointer, position: relative
  transition: all 150ms ease

  States:
    default:  border: 1.5px solid border-default
    hover:    border: 1.5px solid border-strong, bg: surface-overlay
    selected: border: 1.5px solid brand-500, bg: rgba(99,102,241,0.04)

  Icon box (left, flex-shrink: 0):
    38px × 38px, border-radius: 10px
    default:  background: rgba(99,102,241,0.1)
    selected: background: rgba(99,102,241,0.15)
    icon: 20px, brand-400

  Body (flex: 1):
    Title: text-sm font-semibold text-primary, margin-bottom 3px
    Description: text-xs text-secondary, line-height 1.5, margin-bottom 8px

    Preview snippet:
      background: surface-subtle, border-radius: 6px
      padding: 7px 9px, font-size: 11px text-tertiary
      line-height: 1.6, font-family: JetBrains Mono (monospace)
      Shows real example of what that format looks like
      This is REQUIRED — never show option cards without preview snippets

  Checkmark badge (top-right corner, only when selected):
    position: absolute, top: 12px, right: 12px
    18px × 18px circle, background: brand-500
    Check icon: 10px, white
    transition: opacity 150ms ease (fade in on select)
```

### Landing Page Components

**Gradient text heading (hero):**
```
  bg-gradient-to-r from-brand-500 via-brand-400 to-brand-600
  bg-clip-text text-transparent
  font-weight: 700 (exception to the 500 rule — landing only)
  Size: text-5xl mobile, text-7xl tablet, text-8xl+ desktop
  Optional: subtle glow behind text via blurred gradient div
```

**Animated underline (hero heading accent):**
```
  height: 3–4px
  background: linear-gradient(to right, brand-500, brand-400)
  border-radius: 999px
  Animation: width 0→100% over 1s, easeOut, delay 0.5s after heading appears
```

**Floating bubbles (ambient background):**
```
  Large blurred circles (64–256px) with low opacity (0.04–0.10)
  Colors: brand-500/10, accent-500/8, brand-400/8
  Animation: slow drift (18–22s loop), translateX/Y ±20–30px, scale 0.9–1.15
  position: absolute, pointer-events: none
  Apply ONLY to marketing pages — never in app shell
```

**Shimmer button (CTA hover effect):**
```
  Base: standard primary button (bg-brand-500, text-white)
  Overlay: linear-gradient(to right, transparent, white/20, transparent)
  Animation: translateX(-100% → 100%) on hover, duration 600ms, ease-out
  Trigger: group-hover on parent button
```

**Mock device frame (browser chrome for demo UIs):**
```
  Container:
    border: 1px border-default
    border-radius: 12px (outer), 0 (inner content top if chrome present)
    background: surface-card
    box-shadow: large (shadow-2xl or equivalent)
  
  Browser chrome (optional top bar):
    height: 44px
    background: surface-subtle with 50% opacity
    border-bottom: 1px border-default
    Traffic lights: 3 circles (12px), danger-500, warning-500, success-500
    URL bar: centered, surface-subtle bg, border-default border, rounded-md
    
  Content area:
    padding: 16–24px
    Renders mock UI components inside
```

---

## Motion & Interaction

```
Transition timing (all use ease, never linear):
  Color / border change:  150ms ease
  Background change:      150ms ease
  Size / scale:           200ms ease
  Panel slide in:         250ms ease
  Page transition:        200ms fade (opacity 0→1)

Philosophy: animation communicates state, never entertains.
Students are task-focused. No spring physics, no bounce, no delay chains.

Loading states:
  Skeleton:
    animate-pulse, background: brand-100 (light) / surface-subtle (dark)
    border-radius matches the element it replaces
    Never show skeleton for < 300ms — use a delay before showing

  Spinner:
    brand-500 stroke, stroke-width 2, 20px circle, 1 turn/second
    Always paired with a text label below it

  SSE progress bar (upload/chain processing):
    Full width below page or card header
    height: 2px, background: brand-500
    Indeterminate animation: shimmer left→right
    Replaced by determinate bar once pct% is available from SSE event

  Processing status card (file being embedded):
    Gradient progress bar fill: brand-500 → brand-400 (linear-gradient 90deg)
    Glowing leading edge: white blur 2px, position absolute at right of fill
    Step label updates in real time from SSE: "Extracting..." → "Chunking..." → "Embedding..."

Quiz micro-interactions:
  Option selected:
    Border transitions to brand-500 in 150ms
    Background fades to rgba(99,102,241,0.05) in 150ms
    Letter badge fills with brand-500 in 150ms

  Correct answer revealed:
    Border → success-500, bg → rgba(16,185,129,0.05): 150ms
    Letter badge → success-500: 150ms
    Correct: no animation beyond color (keep it clean)

  Wrong answer revealed:
    Border → danger-500, bg → rgba(239,68,68,0.05): 150ms
    Letter badge → danger-500: 150ms
    Shake animation: translateX(-4px → 4px → -2px → 0), 3 keyframes, 300ms total

  Score number count-up:
    0 → final value over 800ms
    Easing: easeOutQuart (fast start, slow end)
    Use requestAnimationFrame
    Color starts text-primary, transitions to semantic color when complete

  Thinking dots (chat):
    Three 6px dots, brand-500, pulsing opacity
    Dot 1: 0ms delay, Dot 2: 150ms delay, Dot 3: 300ms delay
    Each pulse: 0.4 → 0.9 → 0.4 opacity, 1.2s ease-in-out infinite

Practice / milestone moments:
  confetti: ONLY at 90%+ quiz score
  Subtle scale: card scales 1.0 → 1.01 → 1.0 over 400ms on completion
  Never animate on every action — reserve for genuine achievements
```

### Marketing vs. App Animation Boundary

Clarift has two distinct animation contexts. The rules above apply to **app pages**. Landing/marketing pages have different permission:

**Marketing pages (`/`, `/login`, `/onboarding`) — EXPRESSIVE motion allowed:**
- Ambient floating elements (bubbles, gradients)
- Staggered entrance animations (word-by-word reveals, cascading fades)
- Gradient text and animated underlines
- Decorative shimmer effects on CTAs
- Scroll-driven transitions with directional motion (slide + scale)
- Purpose: create energy, communicate product personality, drive conversion

**App pages (`/dashboard`, `/documents`, `/quizzes`, `/chat`, etc.) — FUNCTIONAL motion only:**
- State changes (loading → loaded, selected → correct/wrong)
- Micro-interactions (button press, option select, tab switch)
- Progress indicators (SSE bars, skeletons, spinners)
- Score reveals and weak-area highlights
- Purpose: communicate state, reduce perceived wait time, guide attention
- NO ambient animation, NO decorative motion, NO entertainment

**Rule of thumb:** If a student is actively working (studying, quizzing, chatting), motion must serve a task. If a student is deciding whether to sign up, motion can sell the product.

---

## Dark Mode Rules

- Dark mode is system preference driven (`prefers-color-scheme`)
- Both modes ship on day one via Tailwind `dark:` variants
- Indigo reads as premium in both modes — this is why it was chosen over amber as primary
- Dark mode page bg has indigo undertone (#0F0E1A) — not pure black, not gray
- Cards in dark mode sit at #1A1929 — enough contrast against page bg without harsh edges
- Never use pure white (#FFFFFF) text in dark mode — use --text-primary (#F0EFFF) which has a slight warmth

---

## Mobile-First Breakpoints

```
Default (mobile): 0px–767px
md (tablet/desktop): 768px+

Mobile-specific:
  Bottom navigation bar (56px fixed)
  Full-width cards, no sidebar
  16px horizontal page padding
  Stacked layouts (no side-by-side)
  44px minimum touch targets for all interactive elements

Desktop additions (md+):
  Left sidebar 240px fixed
  Content area max-width 640px, centered in remaining space
  24px horizontal page padding
  Hover states on all interactive elements
  Keyboard shortcuts (optional, post-MVP)
```

## Ambient Depth

The design is flat but not lifeless. Two subtle techniques add tactile quality without using gradients in UI chrome:

```
Page background noise texture:
  Applied to --surface-page only (never to cards)
  CSS: background-image: url("data:image/svg+xml,...")  (SVG noise)
  opacity: 0.025 (light mode), 0.015 (dark mode)
  This is barely perceptible — the goal is warmth, not texture

Upload zone radial glow:
  rgba(99,102,241,0.06) at top center, fading to transparent
  Applied only to the upload drop zone and landing page hero
  Not applied to cards, inputs, or navigation elements

Score ring glow (on reveal):
  box-shadow: 0 0 0 6px rgba(semantic-color, 0.08)
  Only on the score ring, only after animation completes
  Reinforces the achievement moment without being garish

All other surfaces: completely flat. No shadows, no blurs.
```

---

## Page-Specific Design Notes

### Dashboard
- Document list as cards (not a table)
- Empty state: large centered illustration area (SVG, brand colors), single CTA button
- Quota meters in a 2-column grid at top (mobile: stacked)
- No data table — cards only, consistent with mobile-first

### Document → Summary View
- Full-width reading experience, max-width 640px
- Sticky "Generate Quiz" CTA at bottom (mobile: fixed bar, desktop: sticky sidebar button)
- MermaidJS diagram renders in-flow between sections when present
- Format badge shown top of content

### Quiz Runner
- One question visible at a time on mobile
- Progress indicator top: "Question 3 of 10" with thin progress bar
- No back button (intentional — mimics exam conditions)
- Submit button only appears after answer selected

### Weak Areas
- Empty state is encouraging not alarming: "No weak areas yet — take more quizzes to see your gaps"
- Amber color throughout (not red) — weak areas are opportunities, not failures
- "Practice All Weak Topics" primary CTA at top

### Settings
- Simple stacked form, no tabs
- Each setting group has a label, description, and control
- Character counter for custom instructions: turns amber at 400/500, red at 480/500

---

## Iconography

**Library:** Lucide React (already in shadcn/ui ecosystem)  
**Size:** 20px default in nav, 16px in dense UI, 24px in empty states  
**Stroke width:** 1.5 (never 1, never 2 — 1.5 is the Lucide sweet spot at small sizes)  
**Color:** Inherits from text color — never hardcode icon color separately from its label

Key icons:
```
Upload / Ingest:    Upload, FileText, FilePlus
Summary:            BookOpen, AlignLeft, Sparkles
Quiz:               CheckSquare, HelpCircle, ListChecks
Practice:           Target, Dumbbell, Zap
Weak areas:         AlertTriangle, TrendingDown (amber color)
Chat:               MessageSquare, Bot
Settings:           Settings2, SlidersHorizontal
Pro / Upgrade:      Crown, Zap (amber color)
Correct:            CheckCircle (success color)
Incorrect:          XCircle (danger color)
```

---

## Copywriting Tone

- **Warm, direct, never condescending.** The user is stressed — don't add friction.
- **Filipino-aware but not patronizing.** No forced Tagalog. Natural English.
- **Progress-oriented.** "3 weak areas to work on" not "3 areas where you failed"
- **Quota messaging:** "3 of 3 summaries used today. Resets at midnight." — never "You've hit your limit."
- **Error messages:** Explain what happened and what to do next. Never "An error occurred."
- **Empty states:** Always include what the user should do next. Never just "Nothing here yet."

Example copy patterns:
```
Upload CTA:          "Drop your notes here, or click to upload"
Summary loading:     "Building your study guide..."
Quiz empty:          "Upload and summarize a document first, then generate a quiz from it."
Weak areas empty:    "Complete a few quizzes to discover your weak spots."
Quota warning:       "1 summary left today — upgrade to Pro for 10/day."
Pro badge:           "Pro"  (not "PRO" or "Premium")
```

---

## shadcn/ui Component Overrides

These components need style overrides to match Clarift's design:

```tsx
// globals.css or component-level

// Card — add brand surface tint
.card { background: hsl(var(--card)); border-color: var(--border-default); }

// Button primary — override to brand-500
.btn-primary { background: #6366F1; }
.btn-primary:hover { background: #4F46E5; }

// Progress — override color
.progress-indicator { background: #6366F1; }

// Badge — use Clarift pill style
.badge { border-radius: 999px; font-size: 11px; font-weight: 500; }

// Input — match border and focus ring
.input:focus { border-color: #6366F1; box-shadow: 0 0 0 3px rgba(99,102,241,0.15); }
```

---

## Files to Create or Modify

```
frontend/
├── src/
│   ├── app/
│   │   └── globals.css          ← CSS custom properties (all color tokens)
│   ├── lib/
│   │   └── fonts.ts             ← Inter + JetBrains Mono config
│   └── components/
│       └── ui/                  ← shadcn overrides applied here
├── tailwind.config.ts           ← brand + accent color extension
└── clarift-docs/
    └── design.md                ← this file (source of truth)
```

---

## What AI Agents Must NOT Do

- Never use generic blue (#3B82F6 Tailwind blue-500) — always brand-500 (#6366F1)
- Never use pure black (#000000) for text — always text-primary with indigo undertone
- Never hardcode colors — always reference CSS variables or Tailwind brand tokens
- Never use font-weight 700 in navigation or card chrome — only in score number callouts
- Never design desktop-first and "make it mobile" — always start at 390px
- Never use red for weak areas — amber only. Red is for errors and wrong answers only.
- Never use gradients in UI chrome — flat surfaces only (upload zone and landing hero are exceptions)
- Never show a loading spinner alone — always pair with a descriptive text label
- Never show a plain textarea input for chat — always use the rounded pill style with circle send button
- Never use plain text option buttons for quiz — always use the letter-badge variant (A/B/C/D)
- Never build option cards without preview snippets — the snippet is required, not optional
- Never show the thinking state as just "..." — use the three-dot pulse animation with "Searching your notes..." label
- Never apply noise texture to cards — only to the page background surface
- Never use @dnd-kit without the GripVertical icon for ordering questions — users need a visible drag handle
- Never animate on every user action — reserve micro-celebrations for genuine achievements (90%+ score)