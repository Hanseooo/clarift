import { redirect } from "next/navigation"
import { currentUser } from "@clerk/nextjs/server"
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

  return <DocumentsClient documents={documents} />
}
