import { render, screen } from "@testing-library/react"
import { SlideViewer } from "../slide-viewer"

describe("SlideViewer", () => {
  it("parses and renders slide markers", () => {
    const content = "--- Slide 1 ---\nTitle A\n- bullet\n\n--- Slide 2 ---\nTitle B\n- bullet 2"
    render(<SlideViewer content={content} />)
    expect(screen.getByText("1")).toBeInTheDocument()
    expect(screen.getByText("Title A")).toBeInTheDocument()
    expect(screen.getByText("2")).toBeInTheDocument()
    expect(screen.getByText("Title B")).toBeInTheDocument()
  })

  it("falls back to single slide when no markers", () => {
    render(<SlideViewer content="Just some text" />)
    expect(screen.getByText("1")).toBeInTheDocument()
    expect(screen.getByText("Just some text")).toBeInTheDocument()
  })
})
