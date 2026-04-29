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
})
