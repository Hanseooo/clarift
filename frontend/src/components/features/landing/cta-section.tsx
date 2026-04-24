import Link from "next/link"
import { Button } from "@/components/ui/button"

export function CTASection() {
  return (
    <section className="py-12 md:py-16 px-4">
      <div className="mx-auto max-w-[640px] text-center space-y-4">
        <h2 className="text-xl md:text-2xl font-semibold text-text-primary">
          Ready to study smarter?
        </h2>
        <Button variant="default" size="lg" asChild>
          <Link href="/sign-in">Start Studying — It&apos;s Free</Link>
        </Button>
        <p className="text-xs text-text-tertiary">
          No credit card required. 3 summaries/day free.
        </p>
      </div>
    </section>
  )
}
