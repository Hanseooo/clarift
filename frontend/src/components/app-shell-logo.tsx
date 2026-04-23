import Link from "next/link"
import { cn } from "@/lib/utils"

interface AppShellLogoProps {
  showLabel?: boolean
  className?: string
}

export function AppShellLogo({ showLabel = true, className }: AppShellLogoProps) {
  return (
    <Link href="/dashboard" className={cn("flex items-center gap-2", className)}>
      <div className="size-8 rounded-lg bg-brand-500 text-white flex items-center justify-center font-bold text-xl">
        C
      </div>
      {showLabel && (
        <span className="font-semibold text-lg text-text-primary">Clarift</span>
      )}
    </Link>
  )
}
