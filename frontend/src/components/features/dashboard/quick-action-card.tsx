import Link from "next/link"
import { cn } from "@/lib/utils"

interface QuickActionCardProps {
  href: string
  icon: React.ReactNode
  label: string
  description: string
  className?: string
}

export function QuickActionCard({ href, icon, label, description, className }: QuickActionCardProps) {
  return (
    <Link
      href={href}
      className={cn(
        "block bg-surface-card border border-border-default rounded-xl p-4",
        "hover:border-border-strong hover:bg-surface-overlay transition-colors-fast",
        className
      )}
    >
      <div className="flex items-center gap-3">
        <div className="size-10 rounded-lg bg-brand-500/10 flex items-center justify-center flex-shrink-0">
          {icon}
        </div>
        <div>
          <h3 className="text-sm font-medium text-text-primary">{label}</h3>
          <p className="text-xs text-text-tertiary">{description}</p>
        </div>
      </div>
    </Link>
  )
}
