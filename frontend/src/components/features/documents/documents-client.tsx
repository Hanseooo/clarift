"use client"

import { useState, useEffect, useCallback } from "react"
import { useAuth } from "@clerk/nextjs"
import { UploadDropzone } from "@/components/upload-dropzone"
import { SSEProgress } from "@/components/ui/sse-progress"
import { DocumentList } from "./document-list"
import { DocumentSearch } from "./document-search"

interface Document {
  id: string
  title: string
  status: "pending" | "processing" | "ready" | "failed"
  mimeType: string
  createdAt: Date | string
}

interface DocumentsClientProps {
  documents: Document[]
}

interface ActiveJob {
  documentId: string
}

export function DocumentsClient({ documents }: DocumentsClientProps) {
  const { getToken } = useAuth()
  const [search, setSearch] = useState("")
  const [activeJobs, setActiveJobs] = useState<Record<string, ActiveJob>>({})

  const filtered = documents.filter((doc) =>
    doc.title.toLowerCase().includes(search.toLowerCase())
  )

  const handleUploadSuccess = useCallback(
    (data: { document_id: string; job_id: string; message: string }) => {
      setActiveJobs((prev) => ({ ...prev, [data.job_id]: { documentId: data.document_id } }))
    },
    []
  )

  const handleJobComplete = useCallback((jobId: string) => {
    setActiveJobs((prev) => {
      const next = { ...prev }
      delete next[jobId]
      return next
    })
  }, [])

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div>
        <h1 className="text-xl font-semibold text-text-primary">Documents</h1>
        <p className="text-sm text-text-secondary mt-1">
          Upload and manage your study materials
        </p>
      </div>

      {/* Upload zone */}
      <UploadDropzone onUploadSuccess={handleUploadSuccess} />

      {/* Active jobs */}
      {Object.keys(activeJobs).length > 0 && (
        <div className="space-y-3">
          {Object.entries(activeJobs).map(([jobId]) => (
            <SSEProgress
              key={jobId}
              jobId={jobId}
              getToken={getToken}
              onComplete={() => handleJobComplete(jobId)}
              onError={() => handleJobComplete(jobId)}
            />
          ))}
        </div>
      )}

      {/* Search */}
      {documents.length > 3 && (
        <DocumentSearch value={search} onChange={setSearch} />
      )}

      {/* Document list */}
      <DocumentList documents={filtered} />
    </div>
  )
}
