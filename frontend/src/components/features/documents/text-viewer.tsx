"use client"

import { useState } from "react"
import { WrapText, Copy, Check } from "lucide-react"

interface TextViewerProps {
  content: string
}

export function TextViewer({ content }: TextViewerProps) {
  const [wrap, setWrap] = useState(true)
  const [copied, setCopied] = useState(false)

  const handleCopy = async () => {
    await navigator.clipboard.writeText(content)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const lines = content.split("\n")

  return (
    <div className="relative">
      {/* Toolbar */}
      <div className="flex items-center justify-end gap-2 mb-3">
        <button
          onClick={() => setWrap((w) => !w)}
          className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${
            wrap
              ? "bg-brand-100 text-brand-700"
              : "bg-surface-subtle text-text-secondary hover:bg-surface-overlay"
          }`}
          aria-pressed={wrap}
        >
          <WrapText size={14} />
          Wrap
        </button>
        <button
          onClick={handleCopy}
          className="flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium bg-surface-subtle text-text-secondary hover:bg-surface-overlay transition-colors"
        >
          {copied ? <Check size={14} className="text-success-500" /> : <Copy size={14} />}
          {copied ? "Copied" : "Copy"}
        </button>
      </div>

      {/* Text content */}
      <div className="overflow-x-auto">
        <table
          className={`font-mono text-sm text-primary leading-relaxed w-full ${
            wrap ? "whitespace-pre-wrap break-words" : "whitespace-pre"
          }`}
        >
          <tbody>
            {lines.map((line, i) => (
              <tr key={i}>
                <td className="text-xs text-text-tertiary select-none pr-4 text-right w-10 align-top">
                  {i + 1}
                </td>
                <td className="align-top">{line || " "}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
