import { AppShellDesktop } from "./app-shell-desktop"
import { AppShellMobile } from "./app-shell-mobile"
import { SwipeHint } from "@/components/ui/swipe-hint"

interface AppShellProps {
  children: React.ReactNode
  /** Max width for content area. Use "narrow" for focused flows (quiz attempt),
   *  "default" for standard app pages, "wide" for dashboards with side-by-side layouts.
   *  @default "default" */
  maxWidth?: "narrow" | "default" | "wide"
}

const maxWidthClasses = {
  narrow: "max-w-2xl",
  default: "max-w-6xl",
  wide: "max-w-7xl",
}

export function AppShell({ children, maxWidth = "default" }: AppShellProps) {
  return (
    <div className="min-h-screen bg-surface-page">
      <AppShellDesktop />
      <AppShellMobile />
      {/* Content area */}
      <main className="md:ml-[240px] md:pb-0 pb-[56px]">
        <div className={"mx-auto px-4 md:px-6 py-6 md:py-8 " + maxWidthClasses[maxWidth]}>
          {children}
        </div>
      </main>
      <SwipeHint />
    </div>
  )
}
