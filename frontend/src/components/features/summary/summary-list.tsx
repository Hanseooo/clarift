"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { RichMarkdown } from "@/components/ui/rich-markdown";

type SummaryItem = {
  id: string;
  document_id: string;
  format: string;
  content: string;
  diagram_syntax: string | null;
  diagram_type: string | null;
  quiz_type_flags: Record<string, boolean> | null;
  created_at: string;
};

type SummaryListProps = {
  summaries: SummaryItem[];
  initialSelectedId?: string;
};

export function SummaryList({ summaries, initialSelectedId }: SummaryListProps) {
  const firstSummaryId = summaries[0]?.id;
  const [selectedSummaryId, setSelectedSummaryId] = useState(initialSelectedId ?? firstSummaryId ?? "");

  const selectedSummary = useMemo(() => {
    return summaries.find((summary) => summary.id === selectedSummaryId) ?? summaries[0] ?? null;
  }, [summaries, selectedSummaryId]);

  if (!summaries.length) {
    return (
      <section className="rounded-2xl border border-border bg-card p-5">
        <p className="text-sm text-muted-foreground">
          No summaries yet. Generate your first summary to get started.
        </p>
      </section>
    );
  }

  return (
    <section className="rounded-2xl border border-border bg-card p-5 space-y-4">
      <h2 className="text-xl font-semibold text-foreground">Your Summaries</h2>

      <div className="grid gap-4 lg:grid-cols-[260px_minmax(0,1fr)]">
        <ul className="space-y-2">
           {summaries.map((summary) => {
            const isActive = summary.id === selectedSummary?.id;
            return (
              <li key={summary.id} className="relative">
                <button
                  className={`w-full rounded-xl border p-3 text-left transition-colors ${
                    isActive
                      ? "border-primary bg-primary/5"
                      : "border-border hover:bg-secondary/40"
                  }`}
                  onClick={() => setSelectedSummaryId(summary.id)}
                  type="button"
                >
                  <p className="font-medium text-foreground">{summary.format} summary</p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(summary.created_at).toLocaleString('en-US', {
                      year: 'numeric',
                      month: 'short',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                      timeZone: 'UTC'
                    })}
                  </p>
                </button>
                <Button
                  variant="ghost"
                  size="icon-xs"
                  className="absolute right-2 top-2"
                  asChild
                >
                  <Link href={`/summaries/${summary.id}`}>
                    <ExternalLink className="h-3 w-3" />
                  </Link>
                </Button>
              </li>
            );
          })}
        </ul>

           {selectedSummary ? (
          <article className="space-y-4">
            <header className="space-y-2">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-foreground">Summary Detail</h3>
                <Button variant="outline" size="sm" asChild>
                  <Link href={`/summaries/${selectedSummary.id}`} className="inline-flex items-center gap-1">
                    <ExternalLink className="h-3 w-3" />
                    View Full Details
                  </Link>
                </Button>
              </div>
              <p className="text-sm text-muted-foreground">Document: {selectedSummary.document_id}</p>
            </header>

            <div className="rounded-xl border border-border bg-background p-4">
               <div className="prose prose-sm dark:prose-invert max-w-none">
                <RichMarkdown
                  content={selectedSummary.content || "Summary is still being generated..."}
                />
              </div>
            </div>

            {selectedSummary.diagram_syntax ? (
              <div className="rounded-xl border border-border bg-background p-4">
                <p className="text-sm font-medium text-foreground">
                  Diagram ({selectedSummary.diagram_type ?? "unknown"})
                </p>
                <pre className="mt-2 whitespace-pre-wrap break-words text-xs text-muted-foreground">
                  {selectedSummary.diagram_syntax}
                </pre>
              </div>
            ) : null}

            {selectedSummary.quiz_type_flags ? (
              <div className="rounded-xl border border-border bg-background p-4">
                <p className="text-sm font-medium text-foreground">Quiz Type Flags</p>
                <pre className="mt-2 text-xs text-muted-foreground">
                  {JSON.stringify(selectedSummary.quiz_type_flags, null, 2)}
                </pre>
              </div>
            ) : null}
          </article>
        ) : null}
      </div>
    </section>
  );
}
