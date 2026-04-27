"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import {
  BookOpen,
  AlignLeft,
  Type,
  HelpCircle,
  Layers,
  FileText,
  Lightbulb,
  Zap,
  MessageCircle,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { OptionCard } from "./option-card"
import { updateUserPreferences } from "@/app/actions/user"
import { cn } from "@/lib/utils"
import {
  OUTPUT_FORMAT_OPTIONS,
  EXPLANATION_STYLE_OPTIONS,
} from "@/lib/preference-options"

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
    value: "High School",
    title: "High School",
    description: "Foundational subjects and exam preparation",
    preview: "• Key terms and definitions\n• Summary points\n• Practice questions",
    icon: <BookOpen className="size-5 text-brand-400" />,
  },
  {
    value: "College Undergraduate",
    title: "College Undergraduate",
    description: "Degree-level coursework and midterms",
    preview: "• Chapter overviews\n• Critical analysis\n• Reference summaries",
    icon: <BookOpen className="size-5 text-brand-400" />,
  },
  {
    value: "College Graduate",
    title: "College Graduate",
    description: "Advanced topics, theses, and research",
    preview: "• Literature reviews\n• Methodology notes\n• Research findings",
    icon: <BookOpen className="size-5 text-brand-400" />,
  },
  {
    value: "Postgraduate",
    title: "Postgraduate",
    description: "Specialized and professional studies",
    preview: "• Case study breakdowns\n• Advanced concepts\n• Research synthesis",
    icon: <BookOpen className="size-5 text-brand-400" />,
  },
  {
    value: "Other",
    title: "Other",
    description: "Professional certs or personal learning",
    preview: "• Adapts to your content automatically",
    icon: <BookOpen className="size-5 text-brand-400" />,
  },
]

const outputFormatIcons: Record<string, React.ReactNode> = {
  bullet_points: <AlignLeft className="size-5 text-brand-400" />,
  paragraphs: <Type className="size-5 text-brand-400" />,
  q_and_a: <HelpCircle className="size-5 text-brand-400" />,
  examples: <Layers className="size-5 text-brand-400" />,
  tables: <FileText className="size-5 text-brand-400" />,
  step_by_step: <BookOpen className="size-5 text-brand-400" />,
};

const explanationStyleIcons: Record<string, React.ReactNode> = {
  simple_direct: <Lightbulb className="size-5 text-brand-400" />,
  detailed_academic: <BookOpen className="size-5 text-brand-400" />,
  analogy_based: <Zap className="size-5 text-brand-400" />,
  socratic: <MessageCircle className="size-5 text-brand-400" />,
  eli5: <HelpCircle className="size-5 text-brand-400" />,
  mental_models: <AlignLeft className="size-5 text-brand-400" />,
};

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
        output_formats: selectedFormats.length > 0 ? selectedFormats : ["bullet_points"],
        explanation_styles: selectedStyles.length > 0 ? selectedStyles : ["simple_direct"],
        custom_instructions: customInstructions || undefined,
      })
      onSuccess?.()
      router.push("/dashboard")
      router.refresh()
    } catch {
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
          What is your education level?
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
          {OUTPUT_FORMAT_OPTIONS.map((option) => (
            <OptionCard
              key={option.value}
              icon={outputFormatIcons[option.value]}
              title={option.label}
              description={option.description}
              preview=""
              selected={selectedFormats.includes(option.value)}
              onClick={() => setSelectedFormats((prev) => toggleArray(prev, option.value))}
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
          {EXPLANATION_STYLE_OPTIONS.map((option) => (
            <OptionCard
              key={option.value}
              icon={explanationStyleIcons[option.value]}
              title={option.label}
              description={option.description}
              preview=""
              selected={selectedStyles.includes(option.value)}
              onClick={() => setSelectedStyles((prev) => toggleArray(prev, option.value))}
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
        {isSubmitting ? "Saving..." : "Save Preferences"}
      </Button>
    </form>
  )
}
