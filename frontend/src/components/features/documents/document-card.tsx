import Link from "next/link"
import { FileText } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { DeleteDocumentButton } from "./delete-document-button"

interface DocumentCardProps {
  id: string
  title: string
  status: "pending" | "processing" | "ready" | "failed"
  createdAt: Date | string
  showDelete?: boolean
}

export function DocumentCard({ id, title, status, createdAt, showDelete = true }: DocumentCardProps) {
  const dateStr = typeof createdAt === "string"
    ? createdAt
    : createdAt.toLocaleDateString("en-PH", { month: "short", day: "numeric" })

  return (
    <div className="group bg-surface-card border border-border-default rounded-xl p-4 flex items-center gap-3 hover:bg-surface-overlay hover:border-border-strong transition-colors-fast">
      {/* Icon box */}
      <div className="size-9 rounded-lg bg-brand-100 flex items-center justify-center flex-shrink-0">
        <FileText className="size-[18px] text-brand-400" />
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <Link
          href={`/documents/${id}`}
          className="text-sm font-medium text-text-primary hover:text-brand-500 transition-colors-fast truncate block"
        >
          {title}
        </Link>
        <p className="text-xs text-text-tertiary mt-0.5">
          {dateStr}
        </p>
      </div>

      {/* Status + Actions */}
      <div className="flex items-center gap-2 flex-shrink-0">
        <Badge variant={status}>
          {status}
        </Badge>
        {showDelete && (
          <div className="opacity-0 group-hover:opacity-100 transition-opacity">
            <DeleteDocumentButton documentId={id} />
          </div>
        )}
      </div>
    </div>
  )
}
