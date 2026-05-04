"use client"

import { FileText, FileCode, FileType, Presentation, type LucideIcon } from "lucide-react"

const ICON_MAP: Record<string, LucideIcon> = {
  "application/pdf": FileText,
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": FileText,
  "application/vnd.openxmlformats-officedocument.presentationml.presentation": Presentation,
  "text/markdown": FileCode,
  "text/plain": FileType,
}

interface FileTypeIconProps extends React.SVGProps<SVGSVGElement> {
  mimeType: string
  className?: string
  size?: number
}

export function FileTypeIcon({ mimeType, className, size = 18, ...props }: FileTypeIconProps) {
  const Icon = ICON_MAP[mimeType] || FileText
  return <Icon size={size} className={className} {...props} />
}

export function getFileLabel(mimeType: string): string {
  const labels: Record<string, string> = {
    "application/pdf": "PDF",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "DOCX",
    "application/vnd.openxmlformats-officedocument.presentationml.presentation": "PPTX",
    "text/markdown": "MD",
    "text/plain": "TXT",
  }
  return labels[mimeType] || "DOC"
}
