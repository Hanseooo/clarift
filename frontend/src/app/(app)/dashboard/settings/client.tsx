"use client";

import { useState } from "react";
import { OnboardingForm } from "@/components/features/onboarding/onboarding-form";

export function SettingsClient({
  preferences,
}: {
  preferences: {
    education_level?: string;
    output_formats?: string[];
    explanation_styles?: string[];
    custom_instructions?: string;
  };
}) {
  const [showSuccessToast, setShowSuccessToast] = useState(false);

  return (
    <div>
      {showSuccessToast && (
        <div className="mb-4 p-4 text-sm text-green-700 bg-green-100 rounded-md dark:bg-green-900/30 dark:text-green-400">
          Preferences saved successfully!
        </div>
      )}
      <OnboardingForm
        initialData={preferences}
        onSuccess={() => {
          setShowSuccessToast(true);
          setTimeout(() => setShowSuccessToast(false), 3000);
        }}
      />
    </div>
  );
}
