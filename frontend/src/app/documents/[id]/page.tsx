import { auth, currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { db } from "@/db";
import { documents, users } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { Loader2 } from "lucide-react";
import { GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

import { Button } from "@/components/ui/button";
import { DeleteDocumentButton } from "@/components/features/documents/delete-document-button";
import { r2Client } from "@/lib/r2";

interface DocumentPageProps {
  params: Promise<{ id: string }>;
}

export default async function DocumentPage({ params }: DocumentPageProps) {
  const { id } = await params;

  const clerkUser = await currentUser();
  if (!clerkUser) {
    redirect("/login");
  }

  const { userId: clerkUserId } = await auth();
  if (!clerkUserId) {
    redirect("/login");
  }

  const user = await db.query.users.findFirst({
    where: eq(users.clerkUserId, clerkUserId),
  });

  if (!user) {
    redirect("/onboarding");
  }

  const document = await db.query.documents.findFirst({
    where: and(eq(documents.id, id), eq(documents.userId, user.id)),
  });

  if (!document) {
    redirect("/documents");
  }

  const isProcessing =
    document.status === "pending" || document.status === "processing";

  const isViewable =
    document.status === "ready" || document.status === "completed";

  let documentUrl: string | undefined;
  if (isViewable) {
    const command = new GetObjectCommand({
      Bucket: process.env.R2_BUCKET_NAME!,
      Key: document.r2Key,
    });
    documentUrl = await getSignedUrl(r2Client, command, { expiresIn: 3600 });
  }

  return (
    <main className="min-h-screen bg-background p-4 md:p-6 lg:p-8">
      <div className="mx-auto max-w-7xl h-[calc(100vh-6rem)]">
        {/* Desktop: Split-pane view */}
        <div className="hidden lg:grid lg:h-full lg:grid-cols-[320px_1fr] lg:gap-6">
          {/* Left sidebar: metadata and actions */}
          <aside className="flex flex-col gap-6 overflow-y-auto">
            <div className="space-y-4 rounded-xl border border-border bg-card p-5">
              <div className="space-y-2">
                <h1 className="text-xl font-semibold text-foreground">
                  {document.title}
                </h1>
                <span
                  className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                    isViewable
                      ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100"
                      : document.status === "processing"
                        ? "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-100"
                        : document.status === "failed"
                          ? "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-100"
                          : "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-100"
                  }`}
                >
                  {document.status}
                </span>
              </div>
            </div>

            <div className="space-y-3">
              <h2 className="text-sm font-medium text-muted-foreground">
                Actions
              </h2>
              <div className="grid grid-cols-1 gap-2">
                <Button variant="outline" disabled={isProcessing}>
                  Generate Summary
                </Button>
                <Button variant="outline" disabled={isProcessing}>
                  Take Quiz
                </Button>
                <DeleteDocumentButton documentId={document.id} />
              </div>
            </div>

            <div className="mt-auto space-y-3">
              <h2 className="text-sm font-medium text-muted-foreground">
                Preview
              </h2>
              <Button
                variant="outline"
                className="w-full"
                disabled={!documentUrl}
                asChild
              >
                <a href={documentUrl ?? "#"} target="_blank" rel="noopener noreferrer">
                  Open Fullscreen
                </a>
              </Button>
            </div>
          </aside>

          {/* Right: document viewer */}
          <div className="relative overflow-hidden rounded-xl border border-border bg-card">
            {isProcessing ? (
              <div className="flex h-full items-center justify-center">
                <div className="flex flex-col items-center gap-3 text-center">
                  <Loader2 className="size-10 animate-spin text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">
                    Processing Document...
                  </p>
                </div>
              </div>
            ) : document.status === "failed" ? (
              <div className="flex h-full items-center justify-center">
                <div className="flex flex-col items-center gap-3 text-center">
                  <p className="text-sm text-destructive">
                    Document processing failed. Please re-upload.
                  </p>
                </div>
              </div>
            ) : (
              <iframe
                src={documentUrl}
                className="h-full w-full rounded-lg"
                title={document.title}
              />
            )}
          </div>
        </div>

        {/* Mobile: stacked layout */}
        <div className="lg:hidden space-y-4">
          <div className="rounded-xl border border-border bg-card p-5">
            <div className="space-y-3">
              <div>
                <h1 className="text-xl font-semibold text-foreground">
                  {document.title}
                </h1>
                <span
                  className={`mt-2 inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                    isViewable
                      ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100"
                      : document.status === "processing"
                        ? "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-100"
                        : document.status === "failed"
                          ? "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-100"
                          : "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-100"
                  }`}
                >
                  {document.status}
                </span>
              </div>

              <div className="flex flex-wrap gap-2">
                <Button size="sm" variant="outline" disabled={isProcessing}>
                  Generate Summary
                </Button>
                <Button size="sm" variant="outline" disabled={isProcessing}>
                  Take Quiz
                </Button>
                <DeleteDocumentButton documentId={document.id} />
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-border bg-card p-4">
            {isProcessing ? (
              <div className="flex h-48 items-center justify-center">
                <div className="flex flex-col items-center gap-3 text-center">
                  <Loader2 className="size-8 animate-spin text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">
                    Processing Document...
                  </p>
                </div>
              </div>
            ) : document.status === "failed" ? (
              <div className="flex h-48 items-center justify-center">
                <div className="flex flex-col items-center gap-3 text-center">
                  <p className="text-sm text-destructive">
                    Document processing failed. Please re-upload.
                  </p>
                </div>
              </div>
            ) : (
              <Button
                className="h-12 w-full text-base"
                asChild
              >
                <a
                  href={documentUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  View Fullscreen Document
                </a>
              </Button>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}