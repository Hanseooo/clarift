import { render, screen } from "@testing-library/react"
import { describe, it, expect } from "vitest"
import { Progress } from "./progress"

describe("Progress", () => {
  it("renders with default value", () => {
    render(<Progress value={50} />)
    const bar = screen.getByRole("progressbar")
    expect(bar).toHaveAttribute("aria-valuenow", "50")
  })

  it("applies brand color for 0-70%", () => {
    render(<Progress value={50} />)
    const indicator = document.querySelector("[data-progress-indicator]")
    expect(indicator).toHaveClass("bg-brand-500")
  })

  it("applies amber color for 70-90%", () => {
    render(<Progress value={80} />)
    const indicator = document.querySelector("[data-progress-indicator]")
    expect(indicator).toHaveClass("bg-accent-500")
  })

  it("applies danger color for 90-100%", () => {
    render(<Progress value={95} />)
    const indicator = document.querySelector("[data-progress-indicator]")
    expect(indicator).toHaveClass("bg-danger-500")
  })
})
