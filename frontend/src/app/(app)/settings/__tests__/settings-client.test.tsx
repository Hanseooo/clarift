import { render, screen } from "@testing-library/react"
import { describe, it, expect, vi } from "vitest"

vi.mock("@clerk/nextjs", () => ({
  useClerk: () => ({ signOut: vi.fn() }),
  UserProfile: () => <div data-testid="user-profile" />,
}))

vi.mock("@/db", () => ({
  db: {},
}))

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), refresh: vi.fn() }),
}))

describe("SettingsClient", () => {
  it("renders a sign out button", async () => {
    const { SettingsClient } = await import("../client")
    render(<SettingsClient preferences={{}} />)
    expect(screen.getByRole("button", { name: /sign out/i })).toBeInTheDocument()
  })

  it("renders chat mode options", async () => {
    const { SettingsClient } = await import("../client")
    render(<SettingsClient preferences={{}} />)
    expect(screen.getByText("Tutor")).toBeInTheDocument()
    expect(screen.getByText("Strict Notes Only")).toBeInTheDocument()
    expect(screen.getByText("Chat Mode")).toBeInTheDocument()
  })

  it("renders chat persona options", async () => {
    const { SettingsClient } = await import("../client")
    render(<SettingsClient preferences={{}} />)
    expect(screen.getByText("Default")).toBeInTheDocument()
    expect(screen.getByText("Encouraging")).toBeInTheDocument()
    expect(screen.getByText("Direct")).toBeInTheDocument()
    expect(screen.getByText("Witty")).toBeInTheDocument()
    expect(screen.getByText("Patient")).toBeInTheDocument()
  })
})
