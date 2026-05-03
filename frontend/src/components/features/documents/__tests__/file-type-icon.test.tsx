import { render, screen } from "@testing-library/react"
import { describe, it, expect } from "vitest"
import { FileTypeIcon, getFileLabel } from "../file-type-icon"

describe("FileTypeIcon", () => {
  it("renders PDF icon", () => {
    render(<FileTypeIcon mimeType="application/pdf" data-testid="icon" />)
    expect(screen.getByTestId("icon")).toBeInTheDocument()
  })

  it("renders fallback for unknown mime type", () => {
    render(<FileTypeIcon mimeType="unknown/type" data-testid="icon" />)
    expect(screen.getByTestId("icon")).toBeInTheDocument()
  })
})

describe("getFileLabel", () => {
  it("returns correct labels", () => {
    expect(getFileLabel("application/pdf")).toBe("PDF")
    expect(getFileLabel("text/markdown")).toBe("MD")
    expect(getFileLabel("unknown")).toBe("DOC")
  })
})
