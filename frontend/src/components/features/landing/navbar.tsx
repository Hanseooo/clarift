"use client"

import Link from "next/link"
import { AppShellLogo } from "@/components/app-shell-logo"
import { Button } from "@/components/ui/button"

export function LandingNavbar() {
  return (
    <nav className="fixed top-0 left-0 right-0 z-50 border-b border-border-default bg-surface-page/80 backdrop-blur supports-[backdrop-filter]:bg-surface-page/60">
      <div className="max-w-[768px] mx-auto px-4 h-14 flex items-center justify-between">
        <AppShellLogo />
        <Link href="/sign-in">
          <Button variant="default" size="sm">
            Get Started
          </Button>
        </Link>
      </div>
    </nav>
  )
}
