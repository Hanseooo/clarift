import { BookOpen, GraduationCap, Target, MessageSquare } from "lucide-react";
import { cn } from "@/lib/utils";

interface QuotaDisplayProps {
  feature: "summaries" | "quizzes" | "practice" | "chat";
  used: number;
  limit: number;
  resetAt?: string;
}

const featureConfig = {
  summaries: { label: "Summaries", icon: BookOpen },
  quizzes: { label: "Quizzes", icon: GraduationCap },
  practice: { label: "Practice", icon: Target },
  chat: { label: "Chat", icon: MessageSquare },
};

export function QuotaDisplay({ feature, used, limit, resetAt }: QuotaDisplayProps) {
  const config = featureConfig[feature];
  const Icon = config.icon;
  const percentage = limit > 0 ? Math.min((used / limit) * 100, 100) : 0;

  const getBarColor = () => {
    if (percentage >= 90) return "bg-danger-500";
    if (percentage >= 70) return "bg-accent-500";
    return "bg-brand-500";
  };

  const formatResetTime = (resetAt?: string) => {
    if (!resetAt) return null;
    const date = new Date(resetAt);
    return date.toLocaleTimeString("en-PH", { hour: "numeric", minute: "2-digit" });
  };

  return (
    <div className="bg-surface-subtle rounded-lg px-4 py-3 flex items-center gap-3">
      <Icon className="size-4 text-brand-500 flex-shrink-0" />
      <div className="flex-1 min-w-0">
        <div className="flex items-center mb-1.5">
          <span className="text-sm text-text-secondary">
            {used} of {limit} {config.label.toLowerCase()} used today
          </span>
        </div>
        <div className="h-1.5 bg-border-default rounded-full overflow-hidden">
          <div
            role="progressbar"
            aria-valuenow={used}
            aria-valuemin={0}
            aria-valuemax={limit}
            aria-label={`${config.label} quota`}
            className={cn("h-full rounded-full transition-all duration-300", getBarColor())}
            style={{ width: `${percentage}%` }}
          />
        </div>
      </div>
      {resetAt && (
        <span className="text-xs text-text-tertiary flex-shrink-0">
          Resets at {formatResetTime(resetAt)}
        </span>
      )}
    </div>
  );
}
