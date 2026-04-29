"use client"

import { AppShellLogo } from "@/components/app-shell-logo"
import { ThemeToggle } from "@/components/theme-toggle"

export function LandingNavbar() {
  return (
    <nav className="fixed top-0 left-0 right-0 z-50 border-b border-border-default/50 bg-surface-page/70 backdrop-blur-xl supports-[backdrop-filter]:bg-surface-page/50">
      <div className="max-w-[960px] mx-auto px-4 h-14 flex items-center justify-between">
        <AppShellLogo />
        <div className="flex items-center gap-2">
          <ThemeToggle />
        </div>
      </div>
    </nav>
  )
}
