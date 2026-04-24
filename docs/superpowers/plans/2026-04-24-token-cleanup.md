# Token Cleanup Plan

> **For agentic workers:** Use superpowers:subagent-driven-development or superpowers:executing-plans. Steps use checkbox (`- [ ]`) syntax.

**Goal:** Eliminate all non-brand Tailwind colors (`zinc-*`, `green-*`, `blue-*`, `gray-*`, `yellow-*`) and replace them with Clarift design tokens. Ensure 100% token consistency across the frontend.

**Why:** Token drift causes dark mode breakage, visual inconsistency, and makes the design system unmaintainable. Pages using raw Tailwind colors will look wrong when dark mode activates.

**Scope:** All `.tsx` and `.css` files in `frontend/src/`

---

## Color Mapping Reference

| ❌ Remove | ✅ Replace With | Context |
|---|---|---|
| `zinc-50` / `zinc-100` | `surface-page` / `surface-subtle` | Page backgrounds |
| `zinc-900` / `zinc-950` | `text-primary` | Text (dark mode) |
| `zinc-200` / `zinc-300` | `border-default` | Borders |
| `zinc-400` / `zinc-500` | `text-secondary` / `text-tertiary` | Muted text |
| `green-100` / `green-50` | `success-100` | Success backgrounds |
| `green-500` / `green-600` | `success-500` | Success indicators |
| `green-700` / `green-800` | `success-800` | Success text |
| `green-900` / `green-950` | `success-900` | Dark mode success |
| `blue-100` / `blue-50` | `brand-100` | Brand backgrounds |
| `blue-500` / `blue-600` | `brand-500` | Brand indicators |
| `blue-700` / `blue-800` | `brand-800` | Brand text |
| `red-100` / `red-50` | `danger-100` | Error backgrounds |
| `red-500` / `red-600` | `danger-500` | Error indicators |
| `red-800` / `red-900` | `danger-800` | Error text |
| `yellow-100` / `yellow-50` | `warning-100` / `accent-100` | Warning backgrounds |
| `yellow-500` / `yellow-600` | `warning-500` / `accent-500` | Warning indicators |
| `gray-100` / `gray-200` | `surface-subtle` | Neutral backgrounds |
| `gray-500` / `gray-600` | `text-secondary` | Neutral text |
| `purple-50` / `purple-100` | `brand-100` | Purple → brand indigo |
| `sky-50` / `sky-100` | `brand-50` | Sky → brand indigo |
| `orange-50` / `orange-100` | `accent-100` | Orange → amber accent |

---

## Chunk 1: Audit

### Task 1: Find all non-brand colors

**Command:**
```bash
cd frontend/src
grep -r -n "zinc-\|green-\|blue-\|gray-\|yellow-\|red-\|purple-\|sky-\|orange-" --include="*.tsx" --include="*.css" --include="*.ts" | grep -v "node_modules" | sort
```

- [ ] **Step 1: Run audit command**

Run the grep command above.

- [ ] **Step 2: Categorize findings**

Group results by file and severity:
- **Critical**: Files that will break dark mode (onboarding, settings, documents)
- **Moderate**: Files with minor drift (badges, icons)
- **Low**: Comments or unused code

- [ ] **Step 3: Save audit results**

Save output to `frontend/TOKEN_AUDIT.md` for reference during cleanup.

---

## Chunk 2: Critical Fixes

### Task 2: Fix onboarding pages

**Files:**
- `frontend/src/app/onboarding/page.tsx`
- `frontend/src/app/onboarding/*.tsx` (all onboarding components)

- [ ] **Step 1: Replace zinc colors**

Use the mapping table above. Common replacements:
- Page bg: `bg-zinc-50 dark:bg-zinc-950` → `bg-surface-page`
- Text: `text-zinc-900 dark:text-zinc-50` → `text-text-primary`
- Border: `border-zinc-200 dark:border-zinc-800` → `border-border-default`
- Focus ring: `focus:ring-zinc-900 dark:focus:ring-zinc-50` → `focus:ring-brand-500`

- [ ] **Step 2: Verify dark mode**

Toggle dark mode, check that onboarding page looks correct.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/app/onboarding/
git commit -m "fix(frontend): replace zinc colors with brand tokens in onboarding"
```

### Task 3: Fix settings pages

**Files:**
- `frontend/src/app/(app)/dashboard/settings/page.tsx`
- `frontend/src/app/(app)/dashboard/settings/*.tsx`

- [ ] **Step 1: Replace zinc colors**

Same replacements as onboarding.

- [ ] **Step 2: Commit**

```bash
git add frontend/src/app/(app)/dashboard/settings/
git commit -m "fix(frontend): replace zinc colors with brand tokens in settings"
```

### Task 4: Fix document pages

**Files:**
- `frontend/src/app/documents/[id]/page.tsx`
- `frontend/src/components/document-list.tsx` (if exists)
- `frontend/src/components/document-status-badge.tsx` (if exists)

- [ ] **Step 1: Replace arbitrary colors**

- `bg-green-100 text-green-800` → `bg-success-100 text-success-800`
- `bg-yellow-100` → `bg-warning-100`
- `bg-red-100 text-red-800` → `bg-danger-100 text-danger-800`
- `bg-gray-100` → `bg-surface-subtle text-text-secondary`
- Dark variants should be removed (tokens handle both modes)

- [ ] **Step 2: Commit**

```bash
git add frontend/src/app/documents/
git commit -m "fix(frontend): use semantic tokens for document status badges"
```

---

## Chunk 3: Dashboard & Components

### Task 5: Fix dashboard client

**Files:**
- `frontend/src/components/dashboard-client.tsx`

- [ ] **Step 1: Replace color drift**

- `bg-green-500/10 text-green-700` → `bg-success-100 text-success-800`
- `bg-blue-500/10 text-blue-700` → `bg-brand-100 text-brand-800`
- `bg-yellow-500/10 text-yellow-700` → `bg-accent-100 text-accent-800`

- [ ] **Step 2: Commit**

```bash
git add frontend/src/components/dashboard-client.tsx
git commit -m "fix(frontend): use semantic tokens in dashboard"
```

### Task 6: Fix quiz components

**Files:**
- `frontend/src/components/quiz/*.tsx` or `frontend/src/app/(app)/quizzes/**/*.tsx`

- [ ] **Step 1: Replace arbitrary colors**

- `bg-green-50` / `bg-green-900/20` → `bg-success-100` / remove dark variant
- `bg-red-50` / `bg-red-900/20` → `bg-danger-100` / remove dark variant
- `bg-yellow-50` → `bg-accent-100`
- `text-green-800` / `text-green-300` → `text-success-800`

- [ ] **Step 2: Commit**

```bash
git add frontend/src/components/quiz/ frontend/src/app/(app)/quizzes/
git commit -m "fix(frontend): use semantic tokens in quiz components"
```

---

## Chunk 4: Global CSS Verification

### Task 7: Verify globals.css completeness

**Files:**
- `frontend/src/app/globals.css`

- [ ] **Step 1: Check that all semantic tokens have dark mode overrides**

Verify `.dark` block contains:
- `--color-surface-page`
- `--color-surface-card`
- `--color-surface-subtle`
- `--color-border-default`
- `--color-text-primary`
- `--color-text-secondary`
- `--color-text-tertiary`
- All brand colors (already present, verify)
- All semantic colors (success, danger, warning)

- [ ] **Step 2: Check for missing tokens**

If any component references a token not defined in `.dark`, add it.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/app/globals.css
git commit -m "fix(frontend): ensure all tokens have dark mode overrides"
```

---

## Chunk 5: Final Verification

### Task 8: Run lint and tests

- [ ] **Step 1: Run lint**

```bash
pnpm run lint
```
Expected: No errors

- [ ] **Step 2: Run tests**

```bash
pnpm run test:run
```
Expected: All tests pass

### Task 9: Visual spot-check

- [ ] **Step 1: Check key pages in both modes**

Open each page and toggle dark mode:
- [ ] `/` landing page
- [ ] `/login`
- [ ] `/onboarding`
- [ ] `/dashboard`
- [ ] `/documents`
- [ ] `/quizzes`
- [ ] `/chat`
- [ ] `/dashboard/settings`

Look for:
- Any remaining light backgrounds in dark mode
- Any unreadable text (light on light or dark on dark)
- Missing borders or separators

### Task 10: Final commit

- [ ] **Step 1: Commit all remaining changes**

```bash
git add -A
git commit -m "refactor(frontend): complete token cleanup — all colors use design system"
```

---

## Prevention

After cleanup, add to `AGENTS.md` rules:

```
## Design Rule (NEW)
- **Never use raw Tailwind colors** (`zinc-*`, `green-*`, `blue-*`, `gray-*`, `yellow-*`, `red-*`, `purple-*`, `sky-*`, `orange-*`) in components.
- Always use Clarift design tokens: `brand-*`, `accent-*`, `success-*`, `danger-*`, `warning-*`, `surface-*`, `border-*`, `text-*`.
- Exception: `white` and `black` are allowed only for specific overlay/hack cases with justification.
```

---

**Plan complete.** Ready to execute?
