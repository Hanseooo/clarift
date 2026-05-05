import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { db } from "@/db";
import { documents, users } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { Loader2, ArrowLeft, FileText, ExternalLink, BookOpen, GraduationCap } from "lucide-react";
import { GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { DeleteDocumentButton } from "@/components/features/documents/delete-document-button";
import { DocumentViewerShell } from "@/components/features/documents/document-viewer-shell";
import { MarkdownViewer } from "@/components/features/documents/markdown-viewer";
import { TextViewer } from "@/components/features/documents/text-viewer";
import { SlideViewer } from "@/components/features/documents/slide-viewer";
import { r2Client } from "@/lib/r2";
import { cn } from "@/lib/utils";

interface DocumentPageProps {
  params: Promise<{ id: string }>;
}

function StatusBadge({ status }: { status: string }) {
  const configs: Record<string, { label: string; className: string }> = {
    pending: {
      label: "Pending",
      className: "bg-surface-subtle text-text-tertiary",
    },
    processing: {
      label: "Processing",
      className: "bg-brand-100 text-brand-800",
    },
    ready: {
      label: "Ready",
      className: "bg-success-100 text-success-800",
    },
    completed: {
      label: "Ready",
      className: "bg-success-100 text-success-800",
    },
    failed: {
      label: "Failed",
      className: "bg-danger-100 text-danger-800",
    },
  };

  const config = configs[status] || configs.pending;

  return (
    <Badge
      variant="secondary"
      className={cn("text-[11px] font-medium", config.className)}
    >
      {status === "processing" && (
        <Loader2 className="size-3 mr-1 animate-spin" />
      )}
      {config.label}
    </Badge>
  );
}

function DocumentViewer({
  document,
  documentUrl,
}: {
  document: typeof documents.$inferSelect;
  documentUrl?: string;
}) {
  const { status, mimeType, title, extractedText } = document;
  const isProcessing = status === "pending" || status === "processing";

  if (isProcessing) {
    return (
      <div className="flex h-full min-h-[400px] md:min-h-[600px] items-center justify-center">
        <div className="flex flex-col items-center gap-3 text-center">
          <Loader2 className="size-10 animate-spin text-brand-500" />
          <p className="text-sm text-text-secondary">
            Processing your document...
          </p>
          <p className="text-xs text-text-tertiary">
            This may take a minute or two
          </p>
        </div>
      </div>
    );
  }

  if (status === "failed") {
    return (
      <div className="flex h-full min-h-[400px] md:min-h-[600px] items-center justify-center">
        <div className="flex flex-col items-center gap-3 text-center">
          <div className="size-12 rounded-xl bg-danger-100 flex items-center justify-center">
            <FileText className="size-6 text-danger-500" />
          </div>
          <h3 className="text-sm font-medium text-text-primary">
            Processing failed
          </h3>
          <p className="text-xs text-text-tertiary max-w-[240px]">
            Something went wrong while processing this document. Try uploading it again.
          </p>
        </div>
      </div>
    );
  }

  const shellProps = {
    title,
    mimeType,
    downloadUrl: documentUrl,
  };

  switch (mimeType) {
    case "application/pdf":
      return (
        <>
          {/* Desktop: iframe inline */}
          <div className="hidden lg:block h-full">
            <DocumentViewerShell {...shellProps} fullWidth>
              <div className="-m-5 md:-m-6">
                <iframe
                  src={documentUrl}
                  className="w-full h-full min-h-[600px]"
                  title={title}
                />
              </div>
            </DocumentViewerShell>
          </div>
          {/* Mobile: open fullscreen button */}
          <div className="lg:hidden">
            <DocumentViewerShell {...shellProps}>
              <div className="flex flex-col items-center justify-center gap-4 min-h-[400px]">
                <FileText className="size-12 text-brand-400" />
                <p className="text-sm text-text-secondary text-center">
                  PDF preview is best viewed in fullscreen
                </p>
                <Button
                  className="w-full h-11 bg-brand-500 hover:bg-brand-600 text-white text-sm font-medium rounded-xl"
                  asChild
                >
                  <a
                    href={documentUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <ExternalLink className="mr-2 size-4" />
                    View Fullscreen Document
                  </a>
                </Button>
              </div>
            </DocumentViewerShell>
          </div>
        </>
      );

    case "text/markdown":
    case "application/vnd.openxmlformats-officedocument.wordprocessingml.document":
      return (
        <DocumentViewerShell {...shellProps}>
          <MarkdownViewer content={extractedText || "No content available"} />
        </DocumentViewerShell>
      );

    case "text/plain":
      return (
        <DocumentViewerShell {...shellProps}>
          <TextViewer content={extractedText || "No content available"} />
        </DocumentViewerShell>
      );

    case "application/vnd.openxmlformats-officedocument.presentationml.presentation":
      return (
        <DocumentViewerShell {...shellProps}>
          <SlideViewer content={extractedText || "No content available"} />
        </DocumentViewerShell>
      );

    default:
      return (
        <DocumentViewerShell {...shellProps}>
          <p className="text-sm text-text-secondary">Preview not available for this file type.</p>
        </DocumentViewerShell>
      );
  }
}

export default async function DocumentPage({ params }: DocumentPageProps) {
  const { id } = await params;

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

  const isViewable = document.status === "ready";

  let documentUrl: string | undefined;
  if (isViewable) {
    const command = new GetObjectCommand({
      Bucket: process.env.R2_BUCKET_NAME!,
      Key: document.r2Key,
    });
    documentUrl = await getSignedUrl(r2Client, command, { expiresIn: 3600 });
  }

  return (
    <div className="space-y-6">
      {/* Sticky header */}
      <header className="sticky top-0 z-10 bg-surface-page/95 backdrop-blur supports-[backdrop-filter]:bg-surface-page/80 py-3 -mx-4 px-4 border-b border-border-default/50">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" asChild className="h-8 px-2">
            <Link href="/documents">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div className="flex-1 min-w-0">
            <h1 className="text-sm font-medium text-text-primary truncate" title={document.title}>
              {document.title}
            </h1>
          </div>
          <StatusBadge status={document.status} />
        </div>
      </header>

      {/* Desktop: Split-pane view */}
      <div className="hidden lg:grid lg:grid-cols-[280px_1fr] lg:gap-6">
        {/* Left sidebar: metadata and actions */}
        <aside className="flex flex-col gap-4">
          <div className="bg-surface-card border border-border-default rounded-xl p-5 space-y-4">
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <div className="size-9 rounded-lg bg-brand-100 flex items-center justify-center flex-shrink-0">
                  <FileText className="size-[18px] text-brand-400" />
                </div>
                <h2 className="text-lg font-semibold text-text-primary leading-tight truncate min-w-0" title={document.title}>
                  {document.title}
                </h2>
              </div>
              <StatusBadge status={document.status} />
            </div>
          </div>

          <div className="bg-surface-card border border-border-default rounded-xl p-5 space-y-3">
            <h2 className="text-xs font-semibold text-text-tertiary uppercase tracking-wide">
              Actions
            </h2>
            <div className="grid grid-cols-1 gap-2">
              <Button
                variant="outline"
                disabled={isProcessing}
                className="w-full justify-start h-10"
                asChild
              >
                <Link href={`/summaries?document_id=${document.id}`}>
                  <BookOpen className="mr-2 size-4" />
                  Generate Summary
                </Link>
              </Button>
              <Button
                variant="outline"
                disabled={isProcessing}
                className="w-full justify-start h-10"
                asChild
              >
                <Link href={`/quizzes/new?document_id=${document.id}`}>
                  <GraduationCap className="mr-2 size-4" />
                  Generate Quiz
                </Link>
              </Button>
              <DeleteDocumentButton documentId={document.id} fullWidth />
            </div>
          </div>

          {isViewable && (
            <div className="bg-surface-card border border-border-default rounded-xl p-5 space-y-3">
              <h2 className="text-xs font-semibold text-text-tertiary uppercase tracking-wide">
                Preview
              </h2>
              <Button variant="outline" className="w-full h-10" asChild>
                <a
                  href={documentUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <ExternalLink className="mr-2 size-4" />
                  Open Fullscreen
                </a>
              </Button>
            </div>
          )}
        </aside>

        {/* Right: document viewer */}
        <div className="bg-surface-card border border-border-default rounded-xl overflow-hidden">
          <DocumentViewer document={document} documentUrl={documentUrl} />
        </div>
      </div>

      {/* Mobile: stacked layout */}
      <div className="lg:hidden space-y-4">
        <div className="bg-surface-card border border-border-default rounded-xl p-5 space-y-4">
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <div className="size-9 rounded-lg bg-brand-100 flex items-center justify-center flex-shrink-0">
                <FileText className="size-[18px] text-brand-400" />
              </div>
              <h2 className="text-lg font-semibold text-text-primary leading-tight truncate min-w-0" title={document.title}>
                {document.title}
              </h2>
            </div>
            <StatusBadge status={document.status} />
          </div>

          <div className="grid grid-cols-1 gap-2">
            <Button
              variant="outline"
              disabled={isProcessing}
              className="w-full justify-start h-10"
              asChild
            >
              <Link href={`/summaries?document_id=${document.id}`}>
                <BookOpen className="mr-2 size-4" />
                Generate Summary
              </Link>
            </Button>
            <Button
              variant="outline"
              disabled={isProcessing}
              className="w-full justify-start h-10"
              asChild
            >
              <Link href={`/quizzes/new?document_id=${document.id}`}>
                <GraduationCap className="mr-2 size-4" />
                Generate Quiz
              </Link>
            </Button>
            <DeleteDocumentButton documentId={document.id} fullWidth />
          </div>
        </div>

        <div className="bg-surface-card border border-border-default rounded-xl overflow-hidden">
          <DocumentViewer document={document} documentUrl={documentUrl} />
        </div>
      </div>
    </div>
  );
}
