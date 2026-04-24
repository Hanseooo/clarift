import { auth, currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { notFound } from "next/navigation";
import { Edit, Eye, ArrowLeft } from "lucide-react";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { PaginatedReader } from "@/components/features/summary/paginated-reader";
import { MarkdownEditor } from "@/components/features/editor/markdown-editor";
import { updateSummaryContent } from "@/app/actions/summaries";
import { createAuthenticatedClient } from "@/lib/api";

type SummaryDetailPageProps = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ edit?: string }>;
};

export default async function SummaryDetailPage({
  params,
  searchParams,
}: SummaryDetailPageProps) {
  const user = await currentUser();
  if (!user) {
    redirect("/login");
  }

  const session = await auth();
  const token = await session.getToken();
  if (!token) {
    redirect("/login");
  }

  const { id } = await params;
  const { edit } = await searchParams;
  const isEditing = edit === "true";

  const apiClient = createAuthenticatedClient(token);
  const response = await apiClient.GET("/api/v1/summaries/{summary_id}", {
    params: { path: { summary_id: id } },
  });

  if (response.error || !response.data) {
    notFound();
  }

  const summary = response.data;

  async function handleSave(content: string) {
    "use server";
    const result = await updateSummaryContent(id, content);
    if (result.success) {
      redirect(`/summaries/${id}`);
    }
  }

  return (
    <div className="max-w-4xl space-y-6">
        <header className="space-y-4">
          <div className="flex items-center gap-4">
            <Button variant="outline" size="sm" asChild>
              <Link href="/summaries">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Summaries
              </Link>
            </Button>
            <div className="flex-1">
              <h1 className="text-3xl font-semibold text-foreground">
                Summary Detail
              </h1>
              <p className="text-sm text-muted-foreground">
                Document: {summary.document_id} • Format: {summary.format}
              </p>
            </div>
            <Button
              variant={isEditing ? "default" : "outline"}
              size="sm"
              asChild
            >
              <Link
                href={isEditing ? `/summaries/${id}` : `/summaries/${id}?edit=true`}
              >
                {isEditing ? (
                  <>
                    <Eye className="mr-2 h-4 w-4" />
                    Read Mode
                  </>
                ) : (
                  <>
                    <Edit className="mr-2 h-4 w-4" />
                    Edit Mode
                  </>
                )}
              </Link>
            </Button>
          </div>
        </header>

        {isEditing ? (
          <MarkdownEditor
            initialContent={summary.content}
            onSave={handleSave}
            onCancel={() => redirect(`/summaries/${id}`)}
          />
        ) : (
          <PaginatedReader content={summary.content} />
        )}

        {summary.diagram_syntax && (
          <div className="rounded-xl border border-border bg-background p-6">
            <h3 className="mb-4 text-lg font-semibold text-foreground">
              Diagram ({summary.diagram_type ?? "unknown"})
            </h3>
            <pre className="whitespace-pre-wrap break-words rounded-lg bg-muted p-4 text-sm">
              {summary.diagram_syntax}
            </pre>
          </div>
        )}

        {summary.quiz_type_flags && (
          <div className="rounded-xl border border-border bg-background p-6">
            <h3 className="mb-4 text-lg font-semibold text-foreground">
              Quiz Type Flags
            </h3>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              {Object.entries(summary.quiz_type_flags).map(([key, value]) => (
                <div
                  key={key}
                  className={`rounded-lg border p-3 text-center ${
                    value
                      ? "border-success-500 bg-success-100"
                      : "border-border bg-muted"
                  }`}
                >
                  <p className="text-sm font-medium capitalize">
                    {key.replace(/_/g, " ")}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {value ? "Available" : "Not available"}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}
    </div>
  );
}
