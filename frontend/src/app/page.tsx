import { LandingNavbar } from "@/components/features/landing/navbar"
import { HeroSection } from "@/components/features/landing/hero-section"
import { ScrollReveal } from "@/components/features/landing/scroll-reveal"
import { FeatureShowcase } from "@/components/features/landing/feature-showcase"
import { CTASection } from "@/components/features/landing/cta-section"
import { LandingFooter } from "@/components/features/landing/landing-footer"

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-surface-page">
      <LandingNavbar />
      <HeroSection />
      <ScrollReveal />
      <FeatureShowcase />
      <CTASection />
      <LandingFooter />
    </div>
  )
}
