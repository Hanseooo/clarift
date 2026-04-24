import Link from "next/link"
import { Button } from "@/components/ui/button"

export function CTASection() {
  return (
    <section className="relative py-20 md:py-28 px-4 overflow-hidden">
      {/* Subtle gradient background */}
      <div className="absolute inset-0 bg-gradient-to-b from-surface-page via-brand-500/[0.02] to-surface-page dark:via-brand-500/[0.05]" />
      
      <div className="relative z-10 mx-auto max-w-[640px] text-center space-y-6">
        <h2 className="text-2xl md:text-3xl font-bold text-text-primary">
          Ready to study smarter?
        </h2>
        <p className="text-base text-text-secondary max-w-md mx-auto">
          Try Clarift today and turn your notes into personalized summaries, quizzes, drills, and chat in seconds.
        </p>
        <div className="pt-2">
          <Button
            variant="default"
            size="lg"
            className="relative h-14 px-10 text-lg rounded-xl overflow-hidden group bg-brand-500 hover:bg-brand-600"
            asChild
          >
            <Link href="/login">
              <span className="relative z-10">Start Studying Free</span>
              <div className="absolute inset-0 -translate-x-full group-hover:animate-shimmer bg-gradient-to-r from-transparent via-text-on-brand/20 to-transparent" />
            </Link>
          </Button>
        </div>
        <p className="text-sm text-text-tertiary">
          No credit card required. 3 summaries/day free.
        </p>
      </div>
    </section>
  )
}
