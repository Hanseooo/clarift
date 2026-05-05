"use client";

import { useState, useMemo } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { RichMarkdown } from "@/components/ui/rich-markdown";

type PaginatedReaderProps = {
  content: string;
};

export function PaginatedReader({ content }: PaginatedReaderProps) {
  const pages = useMemo(
    () => content.split(/(?=^##\s)/m).filter(Boolean),
    [content],
  );

  const [currentPage, setCurrentPage] = useState(0);
  const totalPages = pages.length;

  const goNext = () => {
    setCurrentPage((prev) => Math.min(prev + 1, totalPages - 1));
  };

  const goPrev = () => {
    setCurrentPage((prev) => Math.max(prev - 1, 0));
  };

  if (!content) {
    return (
      <div className="flex items-center justify-center py-16 text-muted-foreground">
        Summary is still being generated...
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="text-sm text-muted-foreground">
          Page {currentPage + 1} of {totalPages}
        </span>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={goPrev}
            disabled={currentPage === 0}
            className="inline-flex items-center gap-1 rounded-lg border border-border px-4 h-11 text-sm transition-colors hover:bg-secondary disabled:cursor-not-allowed disabled:opacity-40"
          >
            <ChevronLeft className="h-4 w-4" />
            Previous
          </button>
          <button
            type="button"
            onClick={goNext}
            disabled={currentPage === totalPages - 1}
            className="inline-flex items-center gap-1 rounded-lg border border-border px-4 h-11 text-sm transition-colors hover:bg-secondary disabled:cursor-not-allowed disabled:opacity-40"
          >
            Next
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className="min-h-[300px] rounded-xl border border-border bg-background p-6 overflow-hidden">
        <div className="prose-brand">
          <RichMarkdown content={pages[currentPage]} />
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-center gap-2">
        {pages.map((_, index) => (
          <button
            key={index}
            type="button"
            onClick={() => setCurrentPage(index)}
            className={`h-3 w-3 rounded-full transition-colors ${
              index === currentPage
                ? "bg-primary"
                : "bg-border hover:bg-muted-foreground/40"
            }`}
            aria-label={`Go to page ${index + 1}`}
          />
        ))}
      </div>
    </div>
  );
}
