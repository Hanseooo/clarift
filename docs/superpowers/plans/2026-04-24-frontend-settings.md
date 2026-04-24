# Settings Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Redesign the settings page as a simple stacked form with label, description, and control for each setting group. Character counter for custom instructions turns amber at 400/500, red at 480/500.

**Architecture:** Server Component page fetches user preferences. Client component handles form state and submission. Reuses `<OptionCard>` from onboarding for format/style selectors, `<Button>`, and `<Badge>` from foundation.

**Tech Stack:** Next.js 15 (App Router), TypeScript, Tailwind CSS v4, Lucide React

---

## File Structure

| File | Action | Responsibility |
|---|---|---|
| `frontend/src/app/(app)/dashboard/settings/page.tsx` | Replace | Settings page (Server Component) |
| `frontend/src/app/(app)/dashboard/settings/client.tsx` | Replace | Settings client component |

---

## Chunk 1: Settings Client

### Task 1: Update settings client

**Files:**
- Modify: `frontend/src/app/(app)/dashboard/settings/client.tsx`

- [ ] **Step 1: Read current settings client**

Read the file to understand existing form structure.

- [ ] **Step 2: Replace with redesigned client**

```tsx
"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { OptionCard } from "@/components/features/onboarding/option-card"
import { updateUserPreferences } from "@/app/actions/user"
import { BookOpen, AlignLeft, ListChecks, Lightbulb } from "lucide-react"
import { cn } from "@/lib/utils"

interface SettingsClientProps {
  initialData: {
    education_level?: string
    output_formats?: string[]
    explanation_styles?: string[]
    custom_instructions?: string
  }
}

const educationLevels = [
  { value: "nursing", title: "Nursing", icon: <BookOpen className="size-5 text-brand-400" /> },
  { value: "engineering", title: "Engineering", icon: <BookOpen className="size-5 text-brand-400" /> },
  { value: "medicine", title: "Medicine", icon: <BookOpen className="size-5 text-brand-400" /> },
  { value: "accountancy", title: "Accountancy (CPA)", icon: <BookOpen className="size-5 text-brand-400" /> },
  { value: "other", title: "Other", icon: <BookOpen className="size-5 text-brand-400" /> },
]

const outputFormats = [
  { value: "bullet", title: "Bullet Points", icon: <AlignLeft className="size-5 text-brand-400" /> },
  { value: "outline", title: "Outline", icon: <ListChecks className="size-5 text-brand-400" /> },
  { value: "paragraph", title: "Paragraph", icon: <Lightbulb className="size-5 text-brand-400" /> },
]

const explanationStyles = [
  { value: "examples", title: "With Examples", icon: <Lightbulb className="size-5 text-brand-400" /> },
  { value: "analogies", title: "With Analogies", icon: <Lightbulb className="size-5 text-brand-400" /> },
  { value: "step_by_step", title: "Step-by-Step", icon: <ListChecks className="size-5 text-brand-400" /> },
]

export function SettingsClient({ initialData }: SettingsClientProps) {
  const router = useRouter()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const [educationLevel, setEducationLevel] = useState(
    initialData?.education_level || ""
  )
  const [outputFormats, setOutputFormats] = useState<string[]>(
    initialData?.output_formats || []
  )
  const [explanationStyles, setExplanationStyles] = useState<string[]>(
    initialData?.explanation_styles || []
  )
  const [customInstructions, setCustomInstructions] = useState(
    initialData?.custom_instructions || ""
  )

  const toggleArray = (arr: string[], value: string) =>
    arr.includes(value) ? arr.filter((v) => v !== value) : [...arr, value]

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setSuccess(false)
    setIsSubmitting(true)

    try {
      await updateUserPreferences({
        education_level: educationLevel || undefined,
        output_formats: outputFormats.length > 0 ? outputFormats : undefined,
        explanation_styles: explanationStyles.length > 0 ? explanationStyles : undefined,
        custom_instructions: customInstructions || undefined,
      })
      setSuccess(true)
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
          Settings
        </h1>
        <p className="text-sm text-text-secondary mt-1">
          Manage your study preferences
        </p>
      </div>

      {/* Education level */}
      <fieldset>
        <legend className="text-sm font-medium text-text-primary mb-1">
          Education Level
        </legend>
        <p className="text-xs text-text-tertiary mb-3">
          What board exam are you preparing for?
        </p>
        <div className="space-y-2">
          {educationLevels.map((level) => (
            <OptionCard
              key={level.value}
              icon={level.icon}
              title={level.title}
              description=""
              preview=""
              selected={educationLevel === level.value}
              onClick={() => setEducationLevel(level.value)}
            />
          ))}
        </div>
      </fieldset>

      {/* Output formats */}
      <fieldset>
        <legend className="text-sm font-medium text-text-primary mb-1">
          Summary Format
        </legend>
        <p className="text-xs text-text-tertiary mb-3">
          How should your summaries be structured?
        </p>
        <div className="space-y-2">
          {outputFormats.map((format) => (
            <OptionCard
              key={format.value}
              icon={format.icon}
              title={format.title}
              description=""
              preview=""
              selected={outputFormats.includes(format.value)}
              onClick={() =>
                setOutputFormats(toggleArray(outputFormats, format.value))
              }
            />
          ))}
        </div>
      </fieldset>

      {/* Explanation styles */}
      <fieldset>
        <legend className="text-sm font-medium text-text-primary mb-1">
          Explanation Style
        </legend>
        <p className="text-xs text-text-tertiary mb-3">
          How should concepts be explained?
        </p>
        <div className="space-y-2">
          {explanationStyles.map((style) => (
            <OptionCard
              key={style.value}
              icon={style.icon}
              title={style.title}
              description=""
              preview=""
              selected={explanationStyles.includes(style.value)}
              onClick={() =>
                setExplanationStyles(toggleArray(explanationStyles, style.value))
              }
            />
          ))}
        </div>
      </fieldset>

      {/* Custom instructions */}
      <fieldset>
        <legend className="text-sm font-medium text-text-primary mb-1">
          Custom Instructions
        </legend>
        <p className="text-xs text-text-tertiary mb-3">
          Add any specific preferences for AI generation
        </p>
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

      {/* Messages */}
      {error && (
        <p className="text-sm text-danger-500">{error}</p>
      )}
      {success && (
        <p className="text-sm text-success-500">Preferences saved successfully</p>
      )}

      {/* Submit */}
      <Button type="submit" variant="default" disabled={isSubmitting}>
        {isSubmitting ? "Saving..." : "Save Preferences"}
      </Button>
    </form>
  )
}
```

- [ ] **Step 3: Commit**

```bash
git add frontend/src/app/\(app\)/dashboard/settings/client.tsx
git commit -m "feat(frontend): redesign settings page as stacked form"
```

---

## Chunk 2: Settings Page

### Task 2: Update settings page

**Files:**
- Modify: `frontend/src/app/(app)/dashboard/settings/page.tsx`

- [ ] **Step 1: Read current settings page**

Read the file to understand data fetching.

- [ ] **Step 2: Update page**

```tsx
export default async function SettingsPage() {
  // Fetch user preferences from DB
  return <SettingsClient initialData={preferences} />
}
```

- [ ] **Step 3: Commit**

```bash
git add frontend/src/app/\(app\)/dashboard/settings/page.tsx
git commit -m "feat(frontend): update settings page with prefetched data"
```

---

## Chunk 3: Verification

### Task 3: Run tests and lint

- [ ] **Step 1: Run lint**

Run: `pnpm run lint` in `frontend/`
Expected: No errors

### Task 4: Verify dev server

- [ ] **Step 1: Start dev server**

Run: `pnpm run dev` in `frontend/`

- [ ] **Step 2: Verify settings**

Navigate to `/dashboard/settings` and verify:
- Page title "Settings"
- Education level section with option cards
- Summary format section with option cards (multi-select)
- Explanation style section with option cards (multi-select)
- Custom instructions textarea with character counter
- Character counter turns amber at 400/500, red at 480/500
- Save button shows loading state while saving
- Success message shown after save
- Error message shown on failure

- [ ] **Step 3: Verify mobile**

Resize to 390px and verify:
- All sections stacked vertically
- Textarea full width
- Touch targets >= 44px

### Task 5: Final commit

- [ ] **Step 1: Commit all remaining changes**

```bash
git add -A
git commit -m "feat(frontend): complete settings redesign"
```

---

**Plan complete.** Ready to execute?
