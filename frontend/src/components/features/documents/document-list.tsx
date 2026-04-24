import { FileText } from "lucide-react"
import { DocumentCard } from "./document-card"

interface Document {
  id: string
  title: string
  status: "pending" | "processing" | "ready" | "failed"
  mimeType: string
  createdAt: Date | string
}

interface DocumentListProps {
  documents: Document[]
}

export function DocumentList({ documents }: DocumentListProps) {
  if (documents.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="size-12 rounded-xl bg-surface-subtle flex items-center justify-center mx-auto mb-3">
          <FileText className="size-6 text-text-tertiary" />
        </div>
        <h3 className="text-sm font-medium text-text-primary mb-1">
          No documents yet
        </h3>
        <p className="text-xs text-text-tertiary">
          Upload your first PDF to get started
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-2">
      {documents.map((doc) => (
        <DocumentCard
          key={doc.id}
          id={doc.id}
          title={doc.title}
          status={doc.status as "pending" | "processing" | "ready" | "failed"}
          createdAt={doc.createdAt}
        />
      ))}
    </div>
  )
}
