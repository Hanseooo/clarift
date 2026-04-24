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

const outputFormats = [
  {
    value: "Bullet Points",
    title: "Bullet Points",
    description: "Quick, scannable key concepts",
    preview: "• Concept A\n• Concept B\n• Concept C",
    icon: <AlignLeft className="size-5 text-brand-400" />,
  },
  {
    value: "Paragraphs",
    title: "Paragraphs",
    description: "Flowing prose with clear transitions",
    preview: "The concept of X is defined as...\nThis relates to Y because...",
    icon: <Type className="size-5 text-brand-400" />,
  },
  {
    value: "Q&A",
    title: "Q&A",
    description: "Question and answer format for active recall",
    preview: "Q: What is X?\nA: X is defined as...",
    icon: <HelpCircle className="size-5 text-brand-400" />,
  },
  {
    value: "Flashcards",
    title: "Flashcards",
    description: "Front and back cards for spaced repetition",
    preview: "Front: Term/Question\nBack: Definition/Answer",
    icon: <Layers className="size-5 text-brand-400" />,
  },
  {
    value: "Summaries",
    title: "Summaries",
    description: "Condensed overview of key material",
    preview: "Overview of main topics\nKey conclusions",
    icon: <FileText className="size-5 text-brand-400" />,
  },
]

const explanationStyles = [
  {
    value: "Simple & Direct",
    title: "Simple & Direct",
    description: "Plain language, no fluff",
    preview: "X means Y. It works by...",
    icon: <Lightbulb className="size-5 text-brand-400" />,
  },
  {
    value: "Detailed & Academic",
    title: "Detailed & Academic",
    description: "In-depth with technical terminology",
    preview: "According to [theory], X demonstrates...",
    icon: <BookOpen className="size-5 text-brand-400" />,
  },
  {
    value: "Analogy-based",
    title: "Analogy-based",
    description: "Compare complex ideas to familiar things",
    preview: "Think of it like...",
    icon: <Zap className="size-5 text-brand-400" />,
  },
  {
    value: "Socratic (Ask me questions)",
    title: "Socratic",
    description: "Learn through guided questioning",
    preview: "What would happen if...\nWhy does X behave this way?",
    icon: <MessageCircle className="size-5 text-brand-400" />,
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
        output_formats: selectedFormats.length > 0 ? selectedFormats : ["Bullet Points"],
        explanation_styles: selectedStyles.length > 0 ? selectedStyles : ["Simple & Direct"],
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
