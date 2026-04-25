"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import {
  LayoutDashboard,
  FileText,
  BookOpen,
  Target,
  MessageSquare,
} from "lucide-react"

const routes = [
  { name: "Dashboard", path: "/dashboard", icon: LayoutDashboard },
  { name: "Documents", path: "/documents", icon: FileText },
  { name: "Summaries", path: "/summaries", icon: BookOpen },
  { name: "Practice", path: "/practice", icon: Target },
  { name: "Chat", path: "/chat", icon: MessageSquare },
]

export function AppShellMobile() {
  const pathname = usePathname()

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 h-[56px] border-t border-border-default bg-surface-card/95 backdrop-blur supports-[backdrop-filter]:bg-surface-card/60"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <div className="flex items-center justify-around h-full">
        {routes.map((route) => {
          const Icon = route.icon
          const isActive = pathname.startsWith(route.path)
          return (
            <Link
              key={route.path}
              href={route.path}
              className={cn(
                "relative flex flex-col items-center justify-center gap-0.5 min-w-[44px] min-h-[44px] transition-colors-fast",
                isActive ? "text-brand-500" : "text-text-tertiary"
              )}
            >
              {/* Active indicator dot */}
              {isActive && (
                <span className="absolute -top-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-brand-500" />
              )}
              <Icon className="size-[22px] stroke-[1.5]" />
              <span className="text-[11px] font-medium">{route.name}</span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
