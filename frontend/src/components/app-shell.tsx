import { AppShellDesktop } from "./app-shell-desktop"
import { AppShellMobile } from "./app-shell-mobile"

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-surface-page">
      <AppShellDesktop />
      <AppShellMobile />
      {/* Content area */}
      <main className="md:ml-[240px] md:pb-0 pb-[56px]">
        <div className="max-w-[768px] mx-auto px-4 md:px-6 py-6 md:py-8">
          {children}
        </div>
      </main>
    </div>
  )
}
