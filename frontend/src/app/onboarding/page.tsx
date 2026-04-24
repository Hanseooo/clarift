import { OnboardingForm } from "@/components/features/onboarding/onboarding-form"

export const metadata = {
  title: "Onboarding - Clarift",
  description: "Set up your study preferences",
}

export default function OnboardingPage() {
  return (
    <div className="min-h-screen bg-surface-page flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-[640px] space-y-6">
        <div className="text-center">
          <h1 className="text-xl font-semibold text-text-primary">
            Welcome to Clarift
          </h1>
          <p className="text-sm text-text-secondary mt-1">
            Let&apos;s personalize your study engine.
          </p>
        </div>
        <OnboardingForm />
      </div>
    </div>
  )
}
