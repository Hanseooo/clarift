import Link from "next/link";
import { BookOpen } from "lucide-react";

interface Summary {
  id: string;
  title: string | null;
  format: string;
  created_at: string;
}

interface RecentSummariesProps {
  summaries: Summary[];
}

export function RecentSummaries({ summaries }: RecentSummariesProps) {
  const hasSummaries = summaries.length > 0;

  return (
    <section>
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-medium text-text-secondary uppercase tracking-wide">
          Recent Summaries
        </h2>
        {hasSummaries && (
          <Link
            href="/summaries"
            className="text-xs text-brand-500 hover:text-brand-600 font-medium"
          >
            View all
          </Link>
        )}
      </div>

      {hasSummaries ? (
        <div className="space-y-2">
          {summaries.map((summary) => (
            <Link
              key={summary.id}
              href={`/summaries/${summary.id}`}
              className="group bg-surface-card border border-border-default rounded-xl p-4 flex items-center gap-3 hover:bg-surface-overlay hover:border-border-strong transition-colors-fast"
            >
              <div className="size-9 rounded-lg bg-brand-100 flex items-center justify-center flex-shrink-0">
                <BookOpen className="size-[18px] text-brand-400" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-text-primary truncate">
                  {summary.title || "Untitled summary"}
                </p>
                <p className="text-xs text-text-tertiary mt-0.5">
                  <span className="inline-flex items-center rounded-full bg-brand-100 px-2 py-0.5 text-[11px] font-medium text-brand-800 mr-2">
                    {summary.format}
                  </span>
                  {new Date(summary.created_at).toLocaleDateString("en-PH", {
                    month: "short",
                    day: "numeric",
                  })}
                </p>
              </div>
            </Link>
          ))}
        </div>
      ) : (
        <div className="text-center py-8 bg-surface-subtle rounded-xl">
          <BookOpen className="size-8 text-text-tertiary mx-auto mb-2" />
          <p className="text-sm text-text-secondary">No summaries yet</p>
          <Link
            href="/documents"
            className="text-xs text-brand-500 hover:text-brand-600 font-medium mt-1 inline-block"
          >
            Upload notes to get started &rarr;
          </Link>
        </div>
      )}
    </section>
  );
}
