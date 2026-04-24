import { OnboardingForm } from "@/components/features/onboarding/onboarding-form";

export const metadata = {
  title: "Onboarding - Clarift",
  description: "Set up your study preferences",
};

export default function OnboardingPage() {
  return (
    <div className="min-h-screen bg-surface-page flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-xl">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-extrabold tracking-tight text-text-primary">
            Welcome to Clarift
          </h1>
          <p className="text-text-secondary mt-2">
            Let&apos;s personalize your study engine.
          </p>
        </div>
        <OnboardingForm />
      </div>
    </div>
  );
}
