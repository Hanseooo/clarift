# Token Audit Results

**Date:** 2026-04-24
**Scope:** All `.tsx` and `.css` files in `frontend/src/`

## Summary

- **Total occurrences:** 12
- **Files affected:** 4
- **Severity:** Critical — dark mode breakage guaranteed on affected pages

## Findings by File

### Critical

1. **`components/ui/badge.tsx`** (lines 18-21)
   - `bg-green-50 text-green-800 dark:bg-green-900/20 dark:text-green-300`
   - `bg-orange-50 text-orange-800 dark:bg-orange-900/20 dark:text-orange-300`
   - `bg-purple-50 text-purple-800 dark:bg-purple-900/20 dark:text-purple-300`
   - `bg-sky-50 text-sky-800 dark:bg-sky-900/20 dark:text-sky-300`
   - **Impact:** Quiz type badges will look wrong in dark mode

2. **`components/features/generation/override-settings-modal.tsx`** (lines 159, 161, 178, 180, 195)
   - `border-zinc-300`, `text-zinc-900`, `focus:ring-zinc-900`
   - `text-zinc-700 dark:text-zinc-300`
   - `border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 focus:ring-zinc-900 dark:focus:ring-zinc-50`
   - **Impact:** Modal form elements use raw zinc; dark mode will break

3. **`app/(app)/quizzes/[id]/results/page.tsx`** (lines 94-101, 128-129)
   - `border-amber-300 bg-amber-50 dark:bg-amber-950/30 dark:border-amber-800`
   - `text-amber-800 dark:text-amber-200`
   - `border-amber-400 text-amber-900 hover:bg-amber-100 dark:border-amber-700 dark:text-amber-100 dark:hover:bg-amber-900`
   - `bg-green-50 text-green-900 dark:bg-green-950/30 dark:text-green-200`
   - `bg-red-50 text-red-900 dark:bg-red-950/30 dark:text-red-200`
   - **Impact:** Quiz results page completely broken in dark mode

4. **`app/(app)/summaries/[id]/page.tsx`** (line 131)
   - `border-green-500 bg-green-50 dark:bg-green-950/30`
   - **Impact:** Summary quiz flags broken in dark mode

## Missing Dark Mode Tokens (globals.css)

The `.dark` block in `globals.css` does **not** override the semantic token CSS variables:
- `--color-surface-page`
- `--color-surface-card`
- `--color-surface-subtle`
- `--color-border-default`
- `--color-text-primary`
- `--color-text-secondary`
- `--color-text-tertiary`
- `--color-success-*`
- `--color-danger-*`
- `--color-warning-*`
- `--color-accent-*`
- `--color-brand-*`

These are defined in `@theme inline` with light-mode values only, so they will not adapt in dark mode.

## Action Plan

1. Fix all 4 affected files using the mapping table
2. Add dark mode overrides for all semantic tokens in `globals.css`
3. Run lint and tests
4. Verify visually in both modes
