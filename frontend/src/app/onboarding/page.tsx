import { OnboardingForm } from "@/components/features/onboarding/onboarding-form";

export const metadata = {
  title: "Onboarding - Clarift",
  description: "Set up your study preferences",
};

export default function OnboardingPage() {
  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-xl">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-extrabold tracking-tight text-zinc-900 dark:text-zinc-50">
            Welcome to Clarift
          </h1>
          <p className="text-zinc-500 dark:text-zinc-400 mt-2">
            Let's personalize your study engine.
          </p>
        </div>
        <OnboardingForm />
      </div>
    </div>
  );
}
