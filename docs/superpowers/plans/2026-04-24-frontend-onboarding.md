# Onboarding Implementation Plan

> **For agentic workers:** REQUIRED: Use superproperties:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Redesign the onboarding page as a single-page stacked form with brand-styled controls for education level, output formats, explanation styles, and custom instructions. Clean, minimal, no multi-step wizard.

**Architecture:** Server Component page fetches any existing preferences (for returning users). Client component handles form state, validation, and submission via Server Action. Reuses `<Card>` (option variant), `<Badge>`, and `<Button>` from foundation.

**Tech Stack:** Next.js 15 (App Router), TypeScript, Tailwind CSS v4, Lucide React

---

## File Structure

| File | Action | Responsibility |
|---|---|---|
| `frontend/src/app/onboarding/page.tsx` | Replace | Onboarding page (Server Component) |
| `frontend/src/components/features/onboarding/onboarding-form.tsx` | Replace | Single-page stacked form client component |
| `frontend/src/components/features/onboarding/option-card.tsx` | Create | Reusable option selector card with preview snippet |

---

## Chunk 1: Option Card Component

### Task 1: Create option card component

**Files:**
- Create: `frontend/src/components/features/onboarding/option-card.tsx`

- [ ] **Step 1: Create option card**

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

          {/* Preview snippet */}
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
git commit -m "feat(frontend): add option card with preview snippet"
```

---

## Chunk 2: Onboarding Form

### Task 2: Update onboarding form

**Files:**
- Modify: `frontend/src/components/features/onboarding/onboarding-form.tsx`

- [ ] **Step 1: Read current onboarding form**

Read the file to understand existing field structure and Server Action integration.

- [ ] **Step 2: Replace with redesigned form**

```tsx
"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { BookOpen, AlignLeft, ListChecks, Lightbulb } from "lucide-react"
import { Button } from "@/components/ui/button"
import { OptionCard } from "./option-card"
import { updateUserPreferences } from "@/app/actions/user"

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
    if (!educationLevel) {
      setError("Please select your education level")
      return
    }
    setError(null)
    setIsSubmitting(true)

    try {
      await updateUserPreferences({
        education_level: educationLevel,
        output_formats: outputFormats.length > 0 ? outputFormats : ["bullet"],
        explanation_styles: explanationStyles.length > 0 ? explanationStyles : ["examples"],
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
          We'll use these preferences for all your summaries and quizzes. You can change them later.
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
          {outputFormats.map((format) => {
            const option = outputFormats.find((o) => o.value === format)
            if (!option) return null
            return (
              <OptionCard
                key={option.value}
                icon={option.icon}
                title={option.title}
                description={option.description}
                preview={option.preview}
                selected={outputFormats.includes(option.value)}
                onClick={() =>
                  setOutputFormats(toggleArray(outputFormats, option.value))
                }
              />
            )
          })}
        </div>
      </fieldset>

      {/* Explanation styles */}
      <fieldset>
        <legend className="text-sm font-medium text-text-primary mb-3">
          How should concepts be explained?
        </legend>
        <div className="space-y-2">
          {explanationStyles.map((style) => {
            const option = explanationStyles.find((o) => o.value === style)
            if (!option) return null
            return (
              <OptionCard
                key={option.value}
                icon={option.icon}
                title={option.title}
                description={option.description}
                preview={option.preview}
                selected={explanationStyles.includes(option.value)}
                onClick={() =>
                  setExplanationStyles(toggleArray(explanationStyles, option.value))
                }
              />
            )
          })}
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
      <Button type="submit" variant="default" disabled={isSubmitting}>
        {isSubmitting ? "Saving..." : "Start Studying"}
      </Button>
    </form>
  )
}
```

- [ ] **Step 3: Commit**

```bash
git add frontend/src/components/features/onboarding/onboarding-form.tsx
git commit -m "feat(frontend): redesign onboarding form with option cards"
```

---

## Chunk 3: Onboarding Page

### Task 3: Update onboarding page

**Files:**
- Modify: `frontend/src/app/onboarding/page.tsx`

- [ ] **Step 1: Read current onboarding page**

Read the file to understand data fetching logic.

- [ ] **Step 2: Update page to pass existing preferences**

Ensure the page fetches existing user preferences (if any) and passes them as `initialData` to the form. This allows returning users to see their current selections.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/app/onboarding/page.tsx
git commit -m "feat(frontend): update onboarding page with prefetched data"
```

---

## Chunk 4: Verification

### Task 4: Run tests and lint

- [ ] **Step 1: Run lint**

Run: `pnpm run lint` in `frontend/`
Expected: No errors

### Task 5: Verify dev server

- [ ] **Step 1: Start dev server**

Run: `pnpm run dev` in `frontend/`

- [ ] **Step 2: Verify onboarding**

Navigate to `/onboarding` and verify:
- Page title "How do you want to study?"
- Education level section with 5 option cards
- Output formats section with 3 option cards (multi-select)
- Explanation styles section with 3 option cards (multi-select)
- Custom instructions textarea with character counter
- Character counter turns amber at 400/500, red at 480/500
- Submit button disabled until education level selected
- On submit: saves preferences, redirects to `/dashboard`
- All option cards have preview snippets
- Selected cards show checkmark + brand border

- [ ] **Step 3: Verify mobile**

Resize to 390px and verify:
- Option cards full width
- Textarea full width
- Touch targets >= 44px
- Scrollable without horizontal overflow

### Task 6: Final commit

- [ ] **Step 1: Commit all remaining changes**

```bash
git add -A
git commit -m "feat(frontend): complete onboarding redesign"
```

---

**Plan complete.** Ready to execute?
