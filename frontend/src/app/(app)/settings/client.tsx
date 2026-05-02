"use client"

import { useState } from "react"
import { useClerk } from "@clerk/nextjs"
import { OnboardingForm } from "@/components/features/onboarding/onboarding-form"
import { ThemeSettings } from "@/components/theme-settings"
import { Button } from "@/components/ui/button"
import { LogOut } from "lucide-react"

interface SettingsClientProps {
  preferences: {
    education_level?: string
    output_formats?: string[]
    explanation_styles?: string[]
    custom_instructions?: string
    chat_settings?: {
      mode?: "strict_rag" | "tutor" | "socratic"
      persona?: "default" | "encouraging" | "direct" | "witty" | "patient"
    }
  }
}

export function SettingsClient({ preferences }: SettingsClientProps) {
  const [showSuccess, setShowSuccess] = useState(false)
  const { signOut } = useClerk()

  return (
    <div className="space-y-8 max-w-[640px] mx-auto">
      {/* Page header */}
      <div>
        <h1 className="text-xl font-semibold text-text-primary">
          Settings
        </h1>
        <p className="text-sm text-text-secondary mt-1">
          Manage your study preferences and appearance
        </p>
      </div>

      {/* Theme section */}
      <section>
        <h2 className="text-sm font-medium text-text-primary mb-3">
          Appearance
        </h2>
        <ThemeSettings />
      </section>

      <div className="border-t border-border-default pt-8">
        <h2 className="text-sm font-medium text-text-primary mb-3">
          Study Preferences
        </h2>
        {showSuccess && (
          <div className="mb-4 p-3 text-sm text-success-800 bg-success-100 rounded-md">
            Preferences saved successfully!
          </div>
        )}
        <OnboardingForm
          initialData={preferences}
          onSuccess={() => {
            setShowSuccess(true)
            setTimeout(() => setShowSuccess(false), 3000)
          }}
        />
      </div>

      <div className="pt-6 border-t border-border-default">
        <Button
          variant="destructive"
          onClick={() => signOut({ redirectUrl: "/login" })}
          className="w-full"
        >
          <LogOut className="w-4 h-4 mr-2" />
          Sign out
        </Button>
      </div>
    </div>
  )
}
