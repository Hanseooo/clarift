import { auth, currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { notFound } from "next/navigation";
import { Edit, Eye, ArrowLeft, GraduationCap } from "lucide-react";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PaginatedReader } from "@/components/features/summary/paginated-reader";
import { TiptapEditor } from "@/components/dynamic-imports";
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

  return (
    <div className="max-w-[640px] mx-auto space-y-6">
      {/* Sticky header */}
      <header className="sticky top-0 z-10 bg-surface-page/95 backdrop-blur supports-[backdrop-filter]:bg-surface-page/80 py-3 -mx-4 px-4 border-b border-border-default/50">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" asChild className="h-8 px-2">
            <Link href="/summaries">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div className="flex-1 min-w-0">
            <h1 className="text-sm font-medium text-text-primary truncate">
              Summary
            </h1>
          </div>
          <Badge
            variant="secondary"
            className="text-[11px] font-medium bg-brand-100 text-brand-800 hover:bg-brand-100"
          >
            Summary
          </Badge>
          <Button
            variant={isEditing ? "default" : "ghost"}
            size="sm"
            asChild
            className="h-8 px-2"
          >
            <Link
              href={isEditing ? `/summaries/${id}` : `/summaries/${id}?edit=true`}
            >
              {isEditing ? (
                <Eye className="h-4 w-4" />
              ) : (
                <Edit className="h-4 w-4" />
              )}
            </Link>
          </Button>
        </div>
      </header>

      {/* Content */}
      <div className="space-y-6">
        {isEditing ? (
          <TiptapEditor
            initialContent={summary.content}
            summaryId={id}
          />
        ) : (
          <PaginatedReader content={summary.content} />
        )}

        {/* Quiz type flags */}
        {typeof summary.quiz_type_flags === 'object' && summary.quiz_type_flags !== null ? (
          <div className="bg-surface-card border border-border-default rounded-2xl p-5 space-y-4">
            <h3 className="text-sm font-medium text-text-secondary uppercase tracking-wide">
              Quiz Types Available
            </h3>
            <div className="grid grid-cols-2 gap-2">
              {Object.entries(summary.quiz_type_flags as Record<string, boolean>).map(([key, value]) => (
                <div
                  key={key}
                  className={`rounded-lg border p-2.5 text-center transition-colors ${
                    value
                      ? "border-success-500/30 bg-success-100"
                      : "border-border-default bg-surface-subtle"
                  }`}
                >
                  <p className={`text-xs font-medium capitalize ${
                    value ? "text-success-800" : "text-text-tertiary"
                  }`}>
                    {key.replace(/_/g, " ")}
                  </p>
                </div>
              ))}
            </div>
          </div>
        ) : null}
      </div>

      {/* Generate quiz CTA */}
      <div className="sticky bottom-0 py-3 -mx-4 px-4 bg-surface-page/95 backdrop-blur supports-[backdrop-filter]:bg-surface-page/80 border-t border-border-default/50">
        <Button className="w-full h-11 bg-brand-500 hover:bg-brand-600 text-white text-sm font-medium rounded-xl" asChild>
          <Link href={`/quizzes/new?summary_id=${id}`}>
            <GraduationCap className="mr-2 h-4 w-4" />
            Generate Quiz from Summary
          </Link>
        </Button>
      </div>
    </div>
  );
}
