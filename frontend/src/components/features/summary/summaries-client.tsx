"use client";

import { useState } from "react";
import { Search } from "lucide-react";
import { SummaryCard } from "./summary-card";

interface SummaryItem {
  id: string;
  document_id: string;
  format: string;
  content: string;
  diagram_syntax: string | null;
  diagram_type: string | null;
  quiz_type_flags: Record<string, boolean> | null;
  created_at: string;
}

interface SummariesClientProps {
  summaries: SummaryItem[];
}

export function SummariesClient({ summaries }: SummariesClientProps) {
  const [search, setSearch] = useState("");

  const filtered = summaries.filter((summary) =>
    summary.format.toLowerCase().includes(search.toLowerCase()) ||
    summary.document_id.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div>
        <h1 className="text-xl font-semibold text-text-primary">Summaries</h1>
        <p className="text-sm text-text-secondary mt-1">
          Review and manage your generated study summaries
        </p>
      </div>

      {/* Search */}
      {summaries.length > 3 && (
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-text-tertiary" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search summaries..."
            className="w-full h-10 pl-9 pr-4 text-sm bg-surface-subtle border border-border-default rounded-lg focus:border-brand-500 focus:ring-2 focus:ring-brand-500/15 transition-colors-fast text-text-primary placeholder:text-text-tertiary"
          />
        </div>
      )}

      {/* Summary list */}
      {filtered.length > 0 ? (
        <div className="space-y-2">
          {filtered.map((summary) => (
            <SummaryCard
              key={summary.id}
              id={summary.id}
              documentId={summary.document_id}
              format={summary.format}
              createdAt={summary.created_at}
            />
          ))}
        </div>
      ) : (
        <div className="text-center py-12">
          <div className="size-12 rounded-xl bg-surface-subtle flex items-center justify-center mx-auto mb-3">
            <Search className="size-6 text-text-tertiary" />
          </div>
          <h3 className="text-sm font-medium text-text-primary mb-1">
            {summaries.length === 0 ? "No summaries yet" : "No matches found"}
          </h3>
          <p className="text-xs text-text-tertiary">
            {summaries.length === 0
              ? "Generate your first summary from a document"
              : "Try a different search term"}
          </p>
        </div>
      )}
    </div>
  );
}
