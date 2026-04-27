"use client"

import { motion } from "framer-motion"
import { FileText, BookOpen, CheckSquare, Target, Dumbbell } from "lucide-react"
import { MockDeviceFrame } from "./mock-device-frame"

function LetterBadge({ letter, variant = "default" }: { letter: string; variant?: "default" | "selected" }) {
  if (variant === "selected") {
    return (
      <span className="inline-flex h-[22px] w-[22px] shrink-0 items-center justify-center rounded-md bg-brand-500 border border-brand-500 text-[11px] font-semibold text-white">
        {letter}
      </span>
    )
  }
  return (
    <span className="inline-flex h-[22px] w-[22px] shrink-0 items-center justify-center rounded-md border border-border-default bg-surface-subtle text-[11px] font-semibold text-text-secondary">
      {letter}
    </span>
  )
}

function MockDocuments() {
  const docs = [
    { name: "Anatomy_Study_Guide.pdf", pages: "45 pages", status: "ready" as const },
    { name: "Pathology_Notes.txt", pages: "Processing...", status: "processing" as const },
    { name: "Physiology_Cards.png", pages: "12 pages", status: "ready" as const },
  ]

  return (
    <div className="w-full space-y-2.5">
      {docs.map((doc) => (
        <div key={doc.name} className="flex items-center gap-3 p-3 rounded-xl border border-border-default bg-surface-card">
          <div className="size-9 rounded-lg bg-brand-100 flex items-center justify-center flex-shrink-0">
            <FileText className="size-[18px] text-brand-400" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-text-primary truncate">{doc.name}</p>
            <p className="text-xs text-text-tertiary">{doc.pages}</p>
          </div>
          {doc.status === "ready" ? (
            <span className="rounded-full bg-success-100 px-2 py-0.5 text-[11px] font-medium text-success-800">Ready</span>
          ) : (
            <span className="rounded-full bg-brand-100 px-2 py-0.5 text-[11px] font-medium text-brand-800">Processing</span>
          )}
        </div>
      ))}
    </div>
  )
}

function MockSummary() {
  return (
    <div className="w-full space-y-3">
      <div className="flex items-center gap-2">
        <h3 className="text-sm font-semibold text-text-primary">Summary</h3>
        <span className="rounded-full border border-brand-500/30 bg-brand-500/10 px-2 py-0.5 text-[11px] font-medium text-brand-500">Outline</span>
      </div>
      <div className="space-y-2">
        <div className="h-2 w-full rounded-full bg-surface-subtle" />
        <div className="h-2 w-5/6 rounded-full bg-surface-subtle" />
        <div className="h-2 w-4/5 rounded-full bg-surface-subtle" />
        <div className="h-2 w-full rounded-full bg-surface-subtle" />
      </div>
      {/* Key Concept callout */}
      <div className="rounded-xl border border-brand-500/15 bg-brand-500/[0.04] p-3">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-brand-500 mb-1.5">Key Formula</p>
        <div className="space-y-1.5">
          <div className="h-2 w-full rounded-full bg-surface-subtle" />
          <div className="h-2 w-4/5 rounded-full bg-surface-subtle" />
        </div>
      </div>
    </div>
  )
}

function MockQuizResults() {
  const topics = [
    { name: "Data Structures", accuracy: 85 },
    { name: "Algorithms", accuracy: 45 },
    { name: "Computer Networks", accuracy: 60 },
  ]

  return (
    <div className="w-full space-y-3">
      {/* Score ring */}
      <div className="text-center pb-3 border-b border-border-default">
        <div className="w-16 h-16 rounded-full mx-auto mb-2 flex flex-col items-center justify-center bg-success-500/10 border-2 border-success-500/30">
          <span className="text-xl font-bold text-success-500">85%</span>
          <span className="text-[10px] text-success-500/80">score</span>
        </div>
        <p className="text-xs font-semibold text-text-primary">Great work — keep it up</p>
      </div>
      {/* Topic bars */}
      <div className="space-y-2">
        {topics.map((topic) => (
          <div key={topic.name} className="space-y-1">
            <div className="flex justify-between text-xs">
              <span className="text-text-primary font-medium">{topic.name}</span>
              <span className={`font-semibold ${topic.accuracy >= 70 ? "text-success-500" : "text-accent-500"}`}>{topic.accuracy}%</span>
            </div>
            <div className="h-[3px] w-full bg-border-default rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full ${topic.accuracy >= 70 ? "bg-success-500" : "bg-accent-500"}`}
                style={{ width: `${topic.accuracy}%` }}
              />
            </div>
          </div>
        ))}
      </div>
      {/* Weak area */}
      <div className="flex items-center gap-2.5 p-2.5 rounded-xl border border-border-default bg-surface-card">
        <div className="size-8 rounded-[10px] bg-accent-500/10 border border-accent-500/20 flex items-center justify-center flex-shrink-0">
          <Target className="size-4 text-accent-500" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs font-medium text-text-primary">Algorithms</p>
          <p className="text-[10px] text-text-tertiary">8 attempts across 3 quizzes</p>
        </div>
        <span className="text-sm font-bold text-accent-500">45%</span>
      </div>
    </div>
  )
}

function MockPracticeDrill() {
  return (
    <div className="w-full space-y-3">
      <div className="flex items-center justify-between">
        <span className="rounded-full border border-brand-500/30 bg-brand-500/10 px-2 py-0.5 text-[11px] font-medium text-brand-500">MCQ</span>
        <div className="flex gap-1">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className={`w-1.5 h-1.5 rounded-full ${i <= 2 ? "bg-brand-500" : "bg-border-default"}`} />
          ))}
        </div>
      </div>
      <p className="text-sm font-medium text-text-primary leading-relaxed">
        Calculate the output voltage of an op-amp inverting amplifier with R1=10kΩ and Rf=47kΩ when Vin=0.5V?
      </p>
      <div className="space-y-1.5">
        <div className="flex items-center gap-2.5 rounded-lg border border-brand-500 bg-brand-500/5 p-2.5">
          <LetterBadge letter="A" variant="selected" />
          <span className="text-sm text-text-primary">-2.35V</span>
        </div>
        <div className="flex items-center gap-2.5 rounded-lg border border-border-default bg-surface-card p-2.5">
          <LetterBadge letter="B" />
          <span className="text-sm text-text-primary">+2.35V</span>
        </div>
        <div className="flex items-center gap-2.5 rounded-lg border border-border-default bg-surface-card p-2.5">
          <LetterBadge letter="C" />
          <span className="text-sm text-text-primary">-0.5V</span>
        </div>
      </div>
    </div>
  )
}

const showcases = [
  {
    icon: FileText,
    title: "All your materials in one place",
    description: "Upload PDFs. Track processing status and access everything from your document library.",
    mock: <MockDocuments />,
  },
  {
    icon: BookOpen,
    title: "Structured summaries with key concepts",
    description: "AI extracts what matters and formats it for studying. Key concepts are highlighted so you never miss the important details.",
    mock: <MockSummary />,
  },
  {
    icon: CheckSquare,
    title: "See your progress after every quiz",
    description: "Get your score, topic breakdown, and identify weak areas instantly. Know exactly where to focus your next study session.",
    mock: <MockQuizResults />,
  },
  {
    icon: Dumbbell,
    title: "Targeted practice for weak areas",
    description: "Drill down on topics you struggle with. Personalized questions adapt to your knowledge gaps for efficient studying.",
    mock: <MockPracticeDrill />,
  },
]

export function FeatureShowcase() {
  return (
    <section className="py-20 md:py-28 px-4 bg-surface-subtle">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-14">
          <h2 className="text-xl md:text-2xl font-semibold text-text-primary">
            Everything you need to study effectively
          </h2>
          <p className="mt-2 text-sm text-text-secondary">
            From upload to mastery, Clarift guides you through the entire learning process.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8">
          {showcases.map((feature, index) => {
            const Icon = feature.icon
            return (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-50px" }}
                transition={{ duration: 0.5, delay: index * 0.1, ease: "easeOut" }}
              >
                <MockDeviceFrame className="w-full">
                  {feature.mock}
                </MockDeviceFrame>
                <div className="mt-4 flex items-start gap-3 px-1">
                  <div className="size-8 rounded-lg bg-brand-500/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <Icon className="size-4 text-brand-400" />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-text-primary">{feature.title}</h3>
                    <p className="text-xs text-text-secondary leading-relaxed mt-0.5">{feature.description}</p>
                  </div>
                </div>
              </motion.div>
            )
          })}
        </div>
      </div>
    </section>
  )
}
