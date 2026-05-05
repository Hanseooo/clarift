"use client"

import { FileDown } from "lucide-react"
import { FileTypeIcon, getFileLabel } from "./file-type-icon"

interface DocumentViewerShellProps {
  title: string
  mimeType: string
  children: React.ReactNode
  downloadUrl?: string
  fullWidth?: boolean
}

export function DocumentViewerShell({
  title,
  mimeType,
  children,
  downloadUrl,
  fullWidth = false,
}: DocumentViewerShellProps) {
  return (
    <div className={fullWidth ? "w-full" : "max-w-[640px] mx-auto"}>
      <div className="bg-surface-card border border-border-default rounded-2xl overflow-hidden">
        {/* Sticky header */}
        <div className="sticky top-0 z-10 bg-surface-card px-[18px] py-3.5 border-b border-border-default flex items-center justify-between">
          <div className="flex items-center gap-2 min-w-0">
            <FileTypeIcon mimeType={mimeType} size={16} className="text-brand-400 shrink-0" />
            <span className="text-sm font-medium text-text-primary truncate">{title}</span>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <span className="bg-brand-100 border border-brand-200 text-brand-500 text-xs font-medium rounded-full px-2.5 py-0.5">
              {getFileLabel(mimeType)}
            </span>
            {downloadUrl && (
              <a
                href={downloadUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="p-1.5 rounded-md hover:bg-surface-subtle transition-colors"
                aria-label="Download original file"
              >
                <FileDown size={16} className="text-text-secondary" />
              </a>
            )}
          </div>
        </div>

        {/* Content */}
        <div className="p-5 md:p-6 min-h-[400px]">{children}</div>
      </div>
    </div>
  )
}
