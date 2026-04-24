"use client"

import Link from "next/link"
import { AppShellLogo } from "@/components/app-shell-logo"
import { Button } from "@/components/ui/button"

export function LandingNavbar() {
  return (
    <nav className="fixed top-0 left-0 right-0 z-50 border-b border-border-default/50 bg-surface-page/70 backdrop-blur-xl supports-[backdrop-filter]:bg-surface-page/50">
      <div className="max-w-[960px] mx-auto px-4 h-14 flex items-center justify-between">
        <AppShellLogo />
        <Link href="/login">
          <Button
            variant="default"
            size="sm"
            className="rounded-lg h-9 px-4"
          >
            Get Started
          </Button>
        </Link>
      </div>
    </nav>
  )
}
