import { Target } from "lucide-react";

interface WeakTopic {
  topic: string;
  accuracy: number;
}

interface WeakTopicsListProps {
  topics: WeakTopic[];
}

export function WeakTopicsList({ topics }: WeakTopicsListProps) {
  if (topics.length === 0) {
    return (
      <div className="text-center py-8 px-5">
        <Target className="size-8 text-text-tertiary mx-auto mb-3" />
        <p className="text-sm font-medium text-text-primary mb-1">
          No weak areas yet
        </p>
        <p className="text-xs text-text-tertiary">
          Complete a few quizzes to discover your gaps.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {topics.map((topic) => (
        <div
          key={topic.topic}
          className="bg-surface-card border border-border-default rounded-xl p-3.5 flex items-center gap-3"
        >
          {/* Icon ring */}
          <div
            className="size-9 rounded-[10px] flex items-center justify-center flex-shrink-0"
            style={{
              background: "rgba(245,158,11,0.1)",
              border: "1px solid rgba(245,158,11,0.2)",
            }}
          >
            <Target className="size-[18px] text-accent-500" />
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-text-primary mb-1 truncate">
              {topic.topic}
            </p>
            <div className="h-[3px] w-full bg-border-default rounded-full overflow-hidden">
              <div
                className="h-full bg-accent-500 rounded-full"
                style={{ width: `${topic.accuracy}%` }}
              />
            </div>
          </div>

          {/* Percentage */}
          <span className="text-base font-bold text-accent-500 flex-shrink-0">
            {topic.accuracy}%
          </span>
        </div>
      ))}
    </div>
  );
}
