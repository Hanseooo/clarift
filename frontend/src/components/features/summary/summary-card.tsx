import Link from "next/link";
import { BookOpen, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { RenameTitle } from "@/components/features/rename-title";
import { updateSummaryTitle, deleteSummary } from "@/app/actions/summaries";
import { SwipeCard } from "@/components/ui/swipe-card";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

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

  const handleDelete = async () => {
    await deleteSummary(id);
  };

  const handleUpdateTitle = async (summaryId: string, newTitle: string) => {
    await updateSummaryTitle(summaryId, newTitle);
  };

  const cardContent = (
    <div className="group bg-surface-card border border-border-default rounded-xl p-4 flex items-center gap-3 hover:bg-surface-overlay hover:border-border-strong transition-colors-fast">
      {/* Icon box */}
      <div className="size-9 rounded-lg bg-brand-100 flex items-center justify-center flex-shrink-0">
        <BookOpen className="size-[18px] text-brand-400" />
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <Link
          href={`/summaries/${id}`}
          className="text-sm font-medium text-text-primary hover:text-brand-500 transition-colors-fast truncate block"
        >
          <RenameTitle
            id={id}
            currentTitle={displayTitle}
            onSave={handleUpdateTitle}
          />
        </Link>
        <p className="text-xs text-text-tertiary mt-0.5">
          {dateStr}
        </p>
      </div>

      {/* Title badge + Delete */}
      <div className="flex items-center gap-2 flex-shrink-0">
        <Badge
          variant="secondary"
          className={cn(
            "text-[11px] font-medium bg-brand-100 text-brand-800 hover:bg-brand-100"
          )}
        >
          Summary
        </Badge>
        
        {/* Desktop delete button */}
        <div className="hidden md:block opacity-0 group-hover:opacity-100 transition-opacity">
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <button
                className="p-1.5 text-text-secondary hover:text-danger-500 transition-colors rounded-md hover:bg-surface-subtle"
                aria-label="Delete summary"
              >
                <Trash2 className="size-4" />
              </button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete Summary</AlertDialogTitle>
                <AlertDialogDescription>
                  Delete this summary?
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  onClick={handleDelete}
                  className="bg-danger-500 hover:bg-danger-600"
                >
                  Delete
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>
    </div>
  );

  return (
    <SwipeCard
      onDelete={handleDelete}
      deleteConfirmation="Delete this summary?"
    >
      {cardContent}
    </SwipeCard>
  );
}
