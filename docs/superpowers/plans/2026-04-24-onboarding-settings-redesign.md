# Onboarding & Settings Redesign Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Redesign onboarding and settings pages with shared `OptionCard` components featuring preview snippets, character counters, and full dark mode support per `design.md`. Move settings route from `/dashboard/settings` to `/settings`.

**Architecture:** A shared `OptionCard` component enforces design system consistency. Onboarding is a single-page stacked form. Settings reuses the same form layout with a theme preference section. Both are fully responsive with mobile-first spacing.

**Tech Stack:** Next.js 15 (App Router), TypeScript, Tailwind CSS v4, shadcn/ui, next-themes

**Reference:** `docs/dev/design.md` — Section "Onboarding / Settings Cards", "Dark Mode Rules", "Component Specifications"

---

## File Structure

| File | Action | Responsibility |
|---|---|---|
| `frontend/src/components/features/onboarding/option-card.tsx` | Create | Shared option selector card with icon, preview snippet, checkmark |
| `frontend/src/components/features/onboarding/onboarding-form.tsx` | Replace | Single-page stacked form using OptionCards |
| `frontend/src/app/onboarding/page.tsx` | Modify | Layout wrapper for onboarding |
| `frontend/src/app/(app)/settings/page.tsx` | Create | New settings page at `/settings` |
| `frontend/src/app/(app)/settings/client.tsx` | Create | Settings client with theme toggle |
| `frontend/src/app/(app)/dashboard/settings/page.tsx` | Delete | Old settings location |
| `frontend/src/app/(app)/dashboard/settings/client.tsx` | Delete | Old settings client |
| `frontend/src/components/theme-settings.tsx` | Modify | Reusable theme preference section |
| `frontend/src/components/app-shell-desktop.tsx` | Modify | Update Settings route from `/dashboard/settings` to `/settings` |
| `frontend/src/components/app-shell-mobile.tsx` | Modify | Update Settings route from `/dashboard/settings` to `/settings` |
| `frontend/src/middleware.ts` | Verify | Ensure `/settings` is protected |

---

## Chunk 1: Shared Option Card Component

### Task 1: Create OptionCard component

**Files:**
- Create: `frontend/src/components/features/onboarding/option-card.tsx`

- [ ] **Step 1: Create OptionCard**

```tsx
"use client"

import { cn } from "@/lib/utils"
import { Check } from "lucide-react"

interface OptionCardProps {
  icon: React.ReactNode
  title: string
  description: string
  preview: string
  selected: boolean
  onClick: () => void
  className?: string
}

export function OptionCard({
  icon,
  title,
  description,
  preview,
  selected,
  onClick,
  className,
}: OptionCardProps) {
  return (
    <div
      role="radio"
      aria-checked={selected}
      tabIndex={0}
      onClick={onClick}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault()
          onClick()
        }
      }}
      className={cn(
        "bg-surface-card border-[1.5px] border-border-default rounded-[14px] p-4 cursor-pointer transition-colors-fast relative",
        "hover:border-border-strong hover:bg-surface-overlay",
        selected && "border-brand-500 bg-brand-500/4",
        className
      )}
    >
      {/* Checkmark */}
      <div
        className={cn(
          "absolute top-3 right-3 size-[18px] rounded-full bg-brand-500 flex items-center justify-center transition-opacity duration-150",
          selected ? "opacity-100" : "opacity-0"
        )}
      >
        <Check className="size-[10px] text-white" />
      </div>

      <div className="flex gap-3">
        {/* Icon */}
        <div
          className={cn(
            "size-[38px] rounded-xl flex items-center justify-center flex-shrink-0 transition-colors-fast",
            selected ? "bg-brand-500/15" : "bg-brand-500/10"
          )}
        >
          {icon}
        </div>

        {/* Body */}
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-semibold text-text-primary mb-0.5">
            {title}
          </h3>
          <p className="text-xs text-text-secondary leading-relaxed mb-2">
            {description}
          </p>

          {/* Preview snippet — REQUIRED per design.md */}
          <div className="bg-surface-subtle rounded-md p-2 text-[11px] text-text-tertiary leading-relaxed font-mono">
            {preview}
          </div>
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/components/features/onboarding/option-card.tsx
git commit -m "feat(frontend): add OptionCard component with preview snippets"
```

---

## Chunk 2: Onboarding Form Redesign

### Task 2: Replace onboarding form

**Files:**
- Modify: `frontend/src/components/features/onboarding/onboarding-form.tsx`

- [ ] **Step 1: Read current onboarding form**

Read to understand existing Server Action integration (`updateUserPreferences`).

- [ ] **Step 2: Replace with redesigned form**

```tsx
"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { BookOpen, AlignLeft, ListChecks, Lightbulb } from "lucide-react"
import { Button } from "@/components/ui/button"
import { OptionCard } from "./option-card"
import { updateUserPreferences } from "@/app/actions/user"
import { cn } from "@/lib/utils"

interface OnboardingFormProps {
  initialData?: {
    education_level?: string
    output_formats?: string[]
    explanation_styles?: string[]
    custom_instructions?: string
  }
  onSuccess?: () => void
}

const educationLevels = [
  {
    value: "nursing",
    title: "Nursing",
    description: "Board exam prep for nursing students",
    preview: "NCLEX-style questions, clinical scenarios",
    icon: <BookOpen className="size-5 text-brand-400" />,
  },
  {
    value: "engineering",
    title: "Engineering",
    description: "Board exam prep for engineering students",
    preview: "Problem-solving, calculations, diagrams",
    icon: <BookOpen className="size-5 text-brand-400" />,
  },
  {
    value: "medicine",
    title: "Medicine",
    description: "Board exam prep for medical students",
    preview: "Case studies, diagnoses, pharmacology",
    icon: <BookOpen className="size-5 text-brand-400" />,
  },
  {
    value: "accountancy",
    title: "Accountancy (CPA)",
    description: "Board exam prep for accounting students",
    preview: "Financial statements, tax law, auditing",
    icon: <BookOpen className="size-5 text-brand-400" />,
  },
  {
    value: "other",
    title: "Other",
    description: "General study material processing",
    preview: "Adapts to your content automatically",
    icon: <BookOpen className="size-5 text-brand-400" />,
  },
]

const outputFormats = [
  {
    value: "bullet",
    title: "Bullet Points",
    description: "Quick, scannable key concepts",
    preview: "• Concept A\n• Concept B\n• Concept C",
    icon: <AlignLeft className="size-5 text-brand-400" />,
  },
  {
    value: "outline",
    title: "Outline",
    description: "Hierarchical structure with sections",
    preview: "I. Main Topic\n  A. Subtopic\n    1. Detail",
    icon: <ListChecks className="size-5 text-brand-400" />,
  },
  {
    value: "paragraph",
    title: "Paragraph",
    description: "Flowing prose with clear transitions",
    preview: "The concept of X is defined as...\nThis relates to Y because...",
    icon: <Lightbulb className="size-5 text-brand-400" />,
  },
]

const explanationStyles = [
  {
    value: "examples",
    title: "With Examples",
    description: "Real-world examples for each concept",
    preview: "e.g., In a clinical setting...",
    icon: <Lightbulb className="size-5 text-brand-400" />,
  },
  {
    value: "analogies",
    title: "With Analogies",
    description: "Compare complex ideas to familiar things",
    preview: "Think of it like...",
    icon: <Lightbulb className="size-5 text-brand-400" />,
  },
  {
    value: "step_by_step",
    title: "Step-by-Step",
    description: "Break down processes into steps",
    preview: "Step 1: Identify...\nStep 2: Analyze...",
    icon: <ListChecks className="size-5 text-brand-400" />,
  },
]

export function OnboardingForm({ initialData, onSuccess }: OnboardingFormProps) {
  const router = useRouter()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [educationLevel, setEducationLevel] = useState(
    initialData?.education_level || ""
  )
  const [selectedFormats, setSelectedFormats] = useState<string[]>(
    initialData?.output_formats || []
  )
  const [selectedStyles, setSelectedStyles] = useState<string[]>(
    initialData?.explanation_styles || []
  )
  const [customInstructions, setCustomInstructions] = useState(
    initialData?.custom_instructions || ""
  )

  const toggleArray = (arr: string[], value: string) =>
    arr.includes(value) ? arr.filter((v) => v !== value) : [...arr, value]

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!educationLevel) {
      setError("Please select your education level")
      return
    }
    setError(null)
    setIsSubmitting(true)

    try {
      await updateUserPreferences({
        education_level: educationLevel,
        output_formats: selectedFormats.length > 0 ? selectedFormats : ["bullet"],
        explanation_styles: selectedStyles.length > 0 ? selectedStyles : ["examples"],
        custom_instructions: customInstructions || undefined,
      })
      onSuccess?.()
      router.push("/dashboard")
      router.refresh()
    } catch (err) {
      setError("Failed to save preferences. Please try again.")
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-8 max-w-[640px]">
      {/* Page header */}
      <div>
        <h1 className="text-xl font-semibold text-text-primary">
          How do you want to study?
        </h1>
        <p className="text-sm text-text-secondary mt-1">
          We&apos;ll use these preferences for all your summaries and quizzes. You can change them later.
        </p>
      </div>

      {/* Education level */}
      <fieldset>
        <legend className="text-sm font-medium text-text-primary mb-3">
          What are you studying for?
        </legend>
        <div className="space-y-2" role="radiogroup">
          {educationLevels.map((level) => (
            <OptionCard
              key={level.value}
              icon={level.icon}
              title={level.title}
              description={level.description}
              preview={level.preview}
              selected={educationLevel === level.value}
              onClick={() => setEducationLevel(level.value)}
            />
          ))}
        </div>
      </fieldset>

      {/* Output formats */}
      <fieldset>
        <legend className="text-sm font-medium text-text-primary mb-3">
          How should summaries look?
        </legend>
        <div className="space-y-2">
          {outputFormats.map((format) => (
            <OptionCard
              key={format.value}
              icon={format.icon}
              title={format.title}
              description={format.description}
              preview={format.preview}
              selected={selectedFormats.includes(format.value)}
              onClick={() => setSelectedFormats((prev) => toggleArray(prev, format.value))}
            />
          ))}
        </div>
      </fieldset>

      {/* Explanation styles */}
      <fieldset>
        <legend className="text-sm font-medium text-text-primary mb-3">
          How should concepts be explained?
        </legend>
        <div className="space-y-2">
          {explanationStyles.map((style) => (
            <OptionCard
              key={style.value}
              icon={style.icon}
              title={style.title}
              description={style.description}
              preview={style.preview}
              selected={selectedStyles.includes(style.value)}
              onClick={() => setSelectedStyles((prev) => toggleArray(prev, style.value))}
            />
          ))}
        </div>
      </fieldset>

      {/* Custom instructions */}
      <fieldset>
        <legend className="text-sm font-medium text-text-primary mb-3">
          Custom instructions (optional)
        </legend>
        <textarea
          value={customInstructions}
          onChange={(e) => setCustomInstructions(e.target.value)}
          placeholder="e.g., Focus on pharmacology, skip anatomy diagrams..."
          maxLength={500}
          rows={4}
          className="w-full p-3 text-sm bg-surface-subtle border border-border-default rounded-lg focus:border-brand-500 focus:ring-2 focus:ring-brand-500/15 transition-colors-fast text-text-primary placeholder:text-text-tertiary resize-none"
        />
        <div className="flex justify-end mt-1">
          <span
            className={cn(
              "text-xs",
              customInstructions.length >= 480
                ? "text-danger-500"
                : customInstructions.length >= 400
                ? "text-accent-500"
                : "text-text-tertiary"
            )}
          >
            {customInstructions.length}/500
          </span>
        </div>
      </fieldset>

      {/* Error */}
      {error && (
        <p className="text-sm text-danger-500">{error}</p>
      )}

      {/* Submit */}
      <Button type="submit" variant="default" disabled={isSubmitting} className="w-full md:w-auto">
        {isSubmitting ? "Saving..." : "Start Studying"}
      </Button>
    </form>
  )
}
```

- [ ] **Step 3: Update onboarding page layout**

Modify `frontend/src/app/onboarding/page.tsx`:

```tsx
import { OnboardingForm } from "@/components/features/onboarding/onboarding-form"

export const metadata = {
  title: "Onboarding - Clarift",
  description: "Set up your study preferences",
}

export default function OnboardingPage() {
  return (
    <div className="min-h-screen bg-surface-page flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-[640px]">
        <OnboardingForm />
      </div>
    </div>
  )
}
```

- [ ] **Step 4: Commit**

```bash
git add frontend/src/components/features/onboarding/onboarding-form.tsx frontend/src/app/onboarding/page.tsx
git commit -m "feat(frontend): redesign onboarding with OptionCards and character counter"
```

---

## Chunk 3: Settings Page at `/settings`

### Task 3: Create new settings page

**Files:**
- Create: `frontend/src/app/(app)/settings/page.tsx`
- Create: `frontend/src/app/(app)/settings/client.tsx`
- Delete: `frontend/src/app/(app)/dashboard/settings/page.tsx`
- Delete: `frontend/src/app/(app)/dashboard/settings/client.tsx`

- [ ] **Step 1: Create settings client**

```tsx
"use client"

import { useState } from "react"
import { OnboardingForm } from "@/components/features/onboarding/onboarding-form"
import { ThemeSettings } from "@/components/theme-settings"

interface SettingsClientProps {
  preferences: {
    education_level?: string
    output_formats?: string[]
    explanation_styles?: string[]
    custom_instructions?: string
  }
}

export function SettingsClient({ preferences }: SettingsClientProps) {
  const [showSuccess, setShowSuccess] = useState(false)

  return (
    <div className="space-y-8 max-w-[640px]">
      {/* Page header */}
      <div>
        <h1 className="text-xl font-semibold text-text-primary">
          Settings
        </h1>
        <p className="text-sm text-text-secondary mt-1">
          Manage your study preferences and appearance
        </p>
      </div>

      {/* Theme section */}
      <section>
        <h2 className="text-sm font-medium text-text-primary mb-3">
          Appearance
        </h2>
        <ThemeSettings />
      </section>

      <div className="border-t border-border-default pt-8">
        <h2 className="text-sm font-medium text-text-primary mb-3">
          Study Preferences
        </h2>
        {showSuccess && (
          <div className="mb-4 p-3 text-sm text-success-800 bg-success-100 rounded-md">
            Preferences saved successfully!
          </div>
        )}
        <OnboardingForm
          initialData={preferences}
          onSuccess={() => {
            setShowSuccess(true)
            setTimeout(() => setShowSuccess(false), 3000)
          }}
        />
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Create settings page (Server Component)**

```tsx
import { auth } from "@clerk/nextjs/server"
import { redirect } from "next/navigation"
import { db } from "@/db"
import { eq } from "drizzle-orm"
import { users } from "@/db/schema"
import { SettingsClient } from "./client"

export default async function SettingsPage() {
  const { userId } = await auth()

  if (!userId) {
    redirect("/login")
  }

  const user = await db.query.users.findFirst({
    where: eq(users.clerkUserId, userId),
  })

  if (!user) {
    redirect("/onboarding")
  }

  const preferences = user.userPreferences as {
    education_level?: string
    output_formats?: string[]
    explanation_styles?: string[]
    custom_instructions?: string
  }

  return <SettingsClient preferences={preferences} />
}
```

- [ ] **Step 3: Delete old settings files**

```bash
rm frontend/src/app/\(app\)/dashboard/settings/page.tsx
rm frontend/src/app/\(app\)/dashboard/settings/client.tsx
rmdir frontend/src/app/\(app\)/dashboard/settings/
```

- [ ] **Step 4: Commit**

```bash
git add frontend/src/app/\(app\)/settings/
git rm -r frontend/src/app/\(app\)/dashboard/settings/
git commit -m "feat(frontend): move settings to /settings with appearance section"
```

---

## Chunk 4: Navigation Updates

### Task 4: Update app shell routes

**Files:**
- Modify: `frontend/src/components/app-shell-desktop.tsx`
- Modify: `frontend/src/components/app-shell-mobile.tsx`

- [ ] **Step 1: Update desktop sidebar**

Change the Settings route from `/dashboard/settings` to `/settings`:

```tsx
{ name: "Settings", path: "/settings", icon: Settings2 },
```

- [ ] **Step 2: Update mobile bottom nav**

Same change:

```tsx
{ name: "Settings", path: "/settings", icon: Settings2 },
```

- [ ] **Step 3: Commit**

```bash
git add frontend/src/components/app-shell-desktop.tsx frontend/src/components/app-shell-mobile.tsx
git commit -m "fix(frontend): update nav routes for /settings"
```

---

## Chunk 5: Theme Settings Polish

### Task 5: Update ThemeSettings component

**Files:**
- Modify: `frontend/src/components/theme-settings.tsx`

- [ ] **Step 1: Read current theme-settings.tsx**

Read to understand current implementation.

- [ ] **Step 2: Ensure it uses design tokens**

Replace any hardcoded colors with brand tokens. Ensure the radio/select options for System/Light/Dark use `OptionCard` styling if applicable, or at minimum use `border-border-default`, `bg-surface-card`, `text-text-primary`.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/components/theme-settings.tsx
git commit -m "fix(frontend): theme settings uses design tokens"
```

---

## Chunk 6: Verification

### Task 6: Run tests and lint

- [ ] **Step 1: Run lint**

Run: `pnpm run lint` in `frontend/`
Expected: No errors

- [ ] **Step 2: Run tests**

Run: `pnpm run test:run` in `frontend/`
Expected: All tests pass

### Task 7: Verify dev server

- [ ] **Step 1: Start dev server**

Run: `pnpm run dev` in `frontend/`

- [ ] **Step 2: Verify onboarding**

Navigate to `/onboarding` and verify:
- Page shows "How do you want to study?"
- Education level: 5 OptionCards with preview snippets
- Summary format: 3 OptionCards (multi-select, checkmarks appear)
- Explanation style: 3 OptionCards (multi-select)
- Custom instructions textarea with 500-character counter
- Counter turns amber at 400+, red at 480+
- Submit disabled until education level selected
- On submit: redirects to `/dashboard`
- All cards have hover states
- Selected cards show brand border + checkmark

- [ ] **Step 3: Verify settings**

Navigate to `/settings` and verify:
- Page title "Settings"
- Appearance section with theme toggle
- Study Preferences section with same OptionCards as onboarding
- Success toast appears after save
- Character counter works

- [ ] **Step 4: Verify mobile**

Resize to 390px and verify:
- OptionCards full width, no horizontal overflow
- Textarea full width
- Touch targets >= 44px
- Bottom nav "Settings" links to `/settings`

- [ ] **Step 5: Verify dark mode**

Toggle dark mode and verify:
- All OptionCards switch to dark surface colors
- Preview snippets readable
- Checkmark visible
- Textarea border visible
- No light-colored leaks

- [ ] **Step 6: Final commit**

```bash
git add -A
git commit -m "feat(frontend): complete onboarding and settings redesign"
```

---

## Notes

- The `OnboardingForm` is designed to be reused in both contexts. The `onSuccess` prop allows Settings to show a toast without redirecting.
- `OptionCard` enforces the preview snippet rule from `design.md`: "Never build option cards without preview snippets."
- Mobile bottom nav already exists and works — only the route path needs updating.
- The old `/dashboard/settings` route is intentionally removed to avoid duplication.

---

**Plan complete and saved to `docs/superpowers/plans/2026-04-24-onboarding-settings-redesign.md`. Ready to execute?**
