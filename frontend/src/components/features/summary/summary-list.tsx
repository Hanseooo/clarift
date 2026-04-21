"use client";

import { useMemo, useState } from "react";

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
              <li key={summary.id}>
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
                  <p className="text-xs text-muted-foreground">{new Date(summary.created_at).toLocaleString()}</p>
                </button>
              </li>
            );
          })}
        </ul>

        {selectedSummary ? (
          <article className="space-y-4">
            <header className="space-y-1">
              <h3 className="text-lg font-semibold text-foreground">Summary Detail</h3>
              <p className="text-sm text-muted-foreground">Document: {selectedSummary.document_id}</p>
            </header>

            <div className="rounded-xl border border-border bg-background p-4">
              <pre className="whitespace-pre-wrap break-words text-sm text-foreground">
                {selectedSummary.content || "Summary is still being generated..."}
              </pre>
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
