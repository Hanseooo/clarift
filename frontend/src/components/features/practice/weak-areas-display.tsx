"use client";

type WeakAreaItem = {
  topic: string;
  accuracy: number;
  attempts: number;
  quiz_count: number;
};

type WeakAreasDisplayProps = {
  weakAreas: WeakAreaItem[];
  selectedTopics: string[];
  onToggleTopic: (topic: string) => void;
};

export function WeakAreasDisplay({
  weakAreas,
  selectedTopics,
  onToggleTopic,
}: WeakAreasDisplayProps) {
  if (!weakAreas.length) {
    return (
      <section className="rounded-2xl border border-border bg-card p-5">
        <p className="text-sm text-muted-foreground">No weak areas detected yet.</p>
      </section>
    );
  }

  return (
    <section className="rounded-2xl border border-border bg-card p-5 space-y-3">
      <h2 className="text-xl font-semibold text-foreground">Weak Areas</h2>
      {weakAreas.map((item) => {
        const selected = selectedTopics.includes(item.topic);
        return (
          <label key={item.topic} className="block rounded-xl border border-border p-3 space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <input
                  checked={selected}
                  type="checkbox"
                  onChange={() => onToggleTopic(item.topic)}
                />
                <span className="font-medium text-foreground">{item.topic}</span>
              </div>
              <span className="text-xs text-muted-foreground">{item.attempts} attempts</span>
            </div>
            <div className="h-2 w-full rounded-full bg-accent-100">
              <div
                className="h-2 rounded-full bg-accent-500"
                style={{ width: `${Math.max(0, Math.min(100, item.accuracy))}%` }}
              />
            </div>
            <p className="text-xs text-accent-800">Accuracy {item.accuracy}%</p>
          </label>
        );
      })}
    </section>
  );
}
