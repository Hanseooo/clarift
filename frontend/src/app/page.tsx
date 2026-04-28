import type { Metadata } from "next"
import { LandingNavbar } from "@/components/features/landing/navbar"
import { HeroSection } from "@/components/features/landing/hero-section"
import { ScrollReveal } from "@/components/features/landing/scroll-reveal"
import { FeatureShowcase } from "@/components/features/landing/feature-showcase"
import { CTASection } from "@/components/features/landing/cta-section"
import { LandingFooter } from "@/components/features/landing/landing-footer"

export const metadata: Metadata = {
  title: "Clarift - AI-Powered Study Engine",
  description:
    "Clarift helps Filipino students learn faster with AI summaries, quizzes, and personalized practice. Upload your notes and start studying smarter.",
}

export default function LandingPage() {
  const structuredData = {
    "@context": "https://schema.org",
    "@type": "WebApplication",
    name: "Clarift",
    description:
      "AI-powered study engine for Filipino students. Smart summaries, quizzes, and personalized practice.",
    url: process.env.NEXT_PUBLIC_APP_URL || "https://clarift.app",
    applicationCategory: "EducationApplication",
    operatingSystem: "Any",
    offers: {
      "@type": "Offer",
      price: "0",
      priceCurrency: "PHP",
    },
    creator: {
      "@type": "Person",
      name: "Hanseo",
      url: "https://hanseooo.vercel.app/",
    },
  }

  return (
    <div className="min-h-screen bg-surface-page">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
      />
      <LandingNavbar />
      <HeroSection />
      <ScrollReveal />
      <FeatureShowcase />
      <CTASection />
      <LandingFooter />
    </div>
  )
}
