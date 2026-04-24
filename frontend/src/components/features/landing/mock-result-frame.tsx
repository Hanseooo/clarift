"use client"

function LetterBadge({
  letter,
  variant = "default",
}: {
  letter: string
  variant?: "default" | "correct"
}) {
  if (variant === "correct") {
    return (
      <span className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-success-500 text-xs font-semibold text-white">
        {letter}
      </span>
    )
  }
  return (
    <span className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-md border border-border-default bg-surface-card text-xs font-medium text-text-secondary">
      {letter}
    </span>
  )
}

export function MockResultFrame() {
  return (
    <div className="flex w-full flex-col gap-4 md:flex-row">
      {/* Left panel — Summary */}
      <div className="flex-1 rounded-2xl border border-border-default bg-surface-card p-5 shadow-sm">
        <div className="mb-4 flex items-center gap-2">
          <h3 className="text-sm font-semibold text-text-primary">Summary</h3>
          <span className="rounded-full border border-brand-500/30 bg-brand-500/10 px-2 py-0.5 text-xs font-medium text-brand-500">
            Outline
          </span>
        </div>
        <div className="flex flex-col gap-3">
          <div className="h-2 w-full rounded-full bg-surface-subtle" />
          <div className="h-2 w-5/6 rounded-full bg-surface-subtle" />
          <div className="h-2 w-4/5 rounded-full bg-surface-subtle" />
          <div className="h-2 w-full rounded-full bg-surface-subtle" />
          <div className="h-2 w-3/4 rounded-full bg-surface-subtle" />
          <div className="flex items-center gap-2">
            <div className="h-2 w-1 rounded-full bg-brand-500" />
            <div className="h-2 flex-1 rounded-full bg-surface-subtle" />
          </div>
          <div className="h-2 w-5/6 rounded-full bg-surface-subtle" />
        </div>
      </div>

      {/* Right panel — Quiz */}
      <div className="flex-1 rounded-2xl border border-border-default bg-surface-card p-5 shadow-sm">
        <div className="mb-4 flex items-center gap-2">
          <h3 className="text-sm font-semibold text-text-primary">Quiz</h3>
          <span className="rounded-full bg-brand-500/10 px-2 py-0.5 text-xs font-medium text-brand-400">
            MCQ
          </span>
        </div>
        <p className="mb-4 text-sm text-text-primary">
          What is the primary function of the renal system?
        </p>
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-3 rounded-lg border border-success-500 bg-success-500/5 p-3">
            <LetterBadge letter="A" variant="correct" />
            <span className="text-sm text-text-primary">
              Filter blood and produce urine
            </span>
          </div>
          <div className="flex items-center gap-3 rounded-lg border border-border-default bg-surface-card p-3">
            <LetterBadge letter="B" />
            <span className="text-sm text-text-primary">
              Regulate body temperature
            </span>
          </div>
          <div className="flex items-center gap-3 rounded-lg border border-border-default bg-surface-card p-3">
            <LetterBadge letter="C" />
            <span className="text-sm text-text-primary">
              Produce red blood cells
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}
