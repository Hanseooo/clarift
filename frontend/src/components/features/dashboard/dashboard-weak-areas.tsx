import Link from "next/link";
import { Target } from "lucide-react";

interface WeakArea {
  topic: string;
  accuracy: number;
}

interface DashboardWeakAreasProps {
  weakAreas: WeakArea[];
}

export function DashboardWeakAreas({ weakAreas }: DashboardWeakAreasProps) {
  const hasWeakAreas = weakAreas.length > 0;
  const displayAreas = weakAreas.slice(0, 3);

  return (
    <section>
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-medium text-text-secondary uppercase tracking-wide">
          Weak Areas
        </h2>
        {hasWeakAreas && (
          <Link
            href="/practice"
            className="text-xs text-brand-500 hover:text-brand-600 font-medium"
          >
            View all
          </Link>
        )}
      </div>

      {hasWeakAreas ? (
        <div className="space-y-2">
          {displayAreas.map((area) => (
            <div
              key={area.topic}
              className="bg-surface-card border border-border-default rounded-xl p-3 flex items-center gap-3"
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-1">
                  <p className="text-sm font-medium text-text-primary truncate">
                    {area.topic}
                  </p>
                  <span className="text-sm font-semibold text-accent-500 flex-shrink-0 ml-2">
                    {area.accuracy}%
                  </span>
                </div>
                <div className="h-[3px] w-full bg-border-default rounded-full overflow-hidden">
                  <div
                    className="h-full bg-accent-500 rounded-full"
                    style={{ width: `${area.accuracy}%` }}
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-8 bg-surface-subtle rounded-xl">
          <Target className="size-8 text-text-tertiary mx-auto mb-2" />
          <p className="text-sm text-text-secondary">No weak areas yet</p>
          <p className="text-xs text-text-tertiary mt-1">
            Complete a few quizzes to discover your gaps.
          </p>
        </div>
      )}
    </section>
  );
}
