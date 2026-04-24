"use client"

import { useTheme } from "next-themes"
import { Monitor, Sun, Moon } from "lucide-react"
import { useSyncExternalStore } from "react"
import { cn } from "@/lib/utils"

function useMounted() {
  return useSyncExternalStore(
    () => () => {},
    () => true,
    () => false
  )
}

const themes = [
  { value: "system", label: "System", icon: Monitor },
  { value: "light", label: "Light", icon: Sun },
  { value: "dark", label: "Dark", icon: Moon },
] as const

export function ThemeSettings() {
  const { theme, setTheme } = useTheme()
  const mounted = useMounted()

  if (!mounted) {
    return (
      <div className="space-y-4">
        <div>
          <h3 className="text-lg font-medium text-text-primary">Appearance</h3>
          <p className="text-sm text-text-secondary mt-1">
            Choose your preferred theme for the Clarift interface.
          </p>
        </div>
        <div className="grid grid-cols-3 gap-3">
          {themes.map((t) => {
            const Icon = t.icon
            return (
              <div
                key={t.value}
                className="flex flex-col items-center gap-2 rounded-lg border border-border-default bg-surface-card p-4"
              >
                <Icon className="size-5 text-text-secondary" />
                <span className="text-sm font-medium text-text-secondary">{t.label}</span>
              </div>
            )
          })}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-lg font-medium text-text-primary">Appearance</h3>
        <p className="text-sm text-text-secondary mt-1">
          Choose your preferred theme for the Clarift interface.
        </p>
      </div>

      <div className="grid grid-cols-3 gap-3">
        {themes.map((t) => {
          const Icon = t.icon
          const isActive = theme === t.value

          return (
            <button
              key={t.value}
              onClick={() => setTheme(t.value)}
              className={cn(
                "flex flex-col items-center gap-2 rounded-lg border p-4 transition-colors-fast",
                isActive
                  ? "border-brand-500 bg-brand-500/10"
                  : "border-border-default bg-surface-card hover:bg-surface-overlay"
              )}
            >
              <Icon className={cn("size-5", isActive ? "text-brand-500" : "text-text-secondary")} />
              <span className={cn("text-sm font-medium", isActive ? "text-brand-500" : "text-text-secondary")}>
                {t.label}
              </span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
