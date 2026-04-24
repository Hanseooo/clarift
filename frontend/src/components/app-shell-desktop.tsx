"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { UserButton } from "@clerk/nextjs"
import { cn } from "@/lib/utils"
import {
  LayoutDashboard,
  FileText,
  BookOpen,
  Target,
  MessageSquare,
} from "lucide-react"
import { AppShellLogo } from "./app-shell-logo"
import { ThemeToggle } from "./theme-toggle"

const routes = [
  { name: "Dashboard", path: "/dashboard", icon: LayoutDashboard },
  { name: "Documents", path: "/documents", icon: FileText },
  { name: "Summaries", path: "/summaries", icon: BookOpen },
  { name: "Practice", path: "/practice", icon: Target },
  { name: "Chat", path: "/chat", icon: MessageSquare },
]

export function AppShellDesktop() {
  const pathname = usePathname()

  return (
    <aside className="hidden md:flex md:flex-col md:fixed md:inset-y-0 md:w-[240px] md:border-r md:border-border-default md:bg-surface-card md:z-40">
      {/* Logo */}
      <div className="h-14 flex items-center px-4 border-b border-border-default">
        <AppShellLogo />
      </div>

      {/* Nav items */}
      <nav className="flex-1 py-4 px-3 space-y-1">
        {routes.map((route) => {
          const Icon = route.icon
          const isActive = pathname.startsWith(route.path)
          return (
            <Link
              key={route.path}
              href={route.path}
              className={cn(
                "flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors-fast",
                isActive
                  ? "text-brand-500"
                  : "text-text-tertiary hover:text-text-primary hover:bg-surface-overlay"
              )}
            >
              <Icon className="size-[22px] stroke-[1.5]" />
              {route.name}
            </Link>
          )
        })}
      </nav>

      {/* User button */}
      <div className="p-3 border-t border-border-default flex items-center justify-between">
        <UserButton />
        <ThemeToggle />
      </div>
    </aside>
  )
}
