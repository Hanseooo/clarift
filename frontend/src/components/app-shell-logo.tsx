import Image from "next/image"
import Link from "next/link"
import { cn } from "@/lib/utils"

interface AppShellLogoProps {
  showLabel?: boolean
  className?: string
}

export function AppShellLogo({ showLabel = true, className }: AppShellLogoProps) {
  return (
    <Link href="/dashboard" className={cn("flex items-center gap-2", className)}>
      <Image
        src="/clarift-logo.png"
        alt="Clarift"
        width={32}
        height={32}
        className="size-8 rounded-lg object-contain"
        priority
      />
      {showLabel && (
        <span className="font-semibold text-lg text-text-primary">Clarift</span>
      )}
    </Link>
  )
}
