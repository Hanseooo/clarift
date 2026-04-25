import { BookOpen } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { RenameTitle } from "@/components/features/rename-title";
import { updateSummaryTitle } from "@/app/actions/summaries";

interface SummaryCardProps {
  id: string;
  documentId: string;
  title: string | null;
  createdAt: string;
}

export function SummaryCard({ id, title, createdAt }: SummaryCardProps) {
  const dateStr = new Date(createdAt).toLocaleDateString("en-PH", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  const displayTitle = title ?? "Untitled summary";

  return (
    <div className="group bg-surface-card border border-border-default rounded-xl p-4 flex items-center gap-3 hover:bg-surface-overlay hover:border-border-strong transition-colors-fast">
      {/* Icon box */}
      <div className="size-9 rounded-lg bg-brand-100 flex items-center justify-center flex-shrink-0">
        <BookOpen className="size-[18px] text-brand-400" />
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <RenameTitle
          id={id}
          currentTitle={displayTitle}
          onSave={updateSummaryTitle}
        />
        <p className="text-xs text-text-tertiary mt-0.5">
          {dateStr}
        </p>
      </div>

      {/* Title badge */}
      <div className="flex-shrink-0">
        <Badge
          variant="secondary"
          className={cn(
            "text-[11px] font-medium bg-brand-100 text-brand-800 hover:bg-brand-100"
          )}
        >
          Summary
        </Badge>
      </div>
    </div>
  );
}
