import { render, screen, fireEvent } from "@testing-library/react"
import { TextViewer } from "../text-viewer"

describe("TextViewer", () => {
  it("renders content with line numbers", () => {
    render(<TextViewer content={`Line 1
Line 2`} />)
    expect(screen.getByText("Line 1")).toBeInTheDocument()
    expect(screen.getByText("1")).toBeInTheDocument()
    expect(screen.getByText("2")).toBeInTheDocument()
  })

  it("toggles word wrap", () => {
    render(<TextViewer content="test" />)
    const wrapBtn = screen.getByRole("button", { name: /wrap/i })
    fireEvent.click(wrapBtn)
    expect(wrapBtn).toHaveAttribute("aria-pressed", "false")
  })
})
