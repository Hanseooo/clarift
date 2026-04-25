import { redirect } from "next/navigation"
import { currentUser } from "@clerk/nextjs/server"
import { FileText } from "lucide-react"
import { DocumentsClient } from "@/components/features/documents/documents-client"
import { getDocuments } from "@/app/actions/documents"

export default async function DocumentsPage() {
  const user = await currentUser()
  if (!user) {
    redirect("/login")
  }

  const rawDocuments = await getDocuments()

  const documents = rawDocuments.map((doc) => ({
    ...doc,
    status: doc.status as "pending" | "processing" | "ready" | "failed",
  }))

  const documentCount = documents.length
  const documentLimit = 8 // Free tier lifetime limit

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-text-primary">Documents</h1>
        <p className="text-sm text-text-secondary mt-1">
          Manage your uploaded study materials
        </p>
      </div>

      {documentCount > 0 && (
        <div className="bg-surface-subtle rounded-lg px-4 py-3 flex items-center gap-3">
          <FileText className="size-4 text-brand-500" />
          <span className="text-sm text-text-secondary">
            {documentCount} of {documentLimit} documents uploaded
          </span>
          <div className="flex-1 h-1.5 bg-border-default rounded-full overflow-hidden">
            <div
              className="h-full bg-brand-500 rounded-full"
              style={{ width: `${Math.min((documentCount / documentLimit) * 100, 100)}%` }}
            />
          </div>
        </div>
      )}

      <DocumentsClient documents={documents} />
    </div>
  )
}
