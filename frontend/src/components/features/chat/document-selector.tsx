"use client";

type DocumentOption = {
  id: string;
  title: string;
};

type DocumentSelectorProps = {
  documents: DocumentOption[];
  selectedIds: string[];
  onToggle: (id: string) => void;
};

export function DocumentSelector({ documents, selectedIds, onToggle }: DocumentSelectorProps) {
  return (
    <section className="rounded-2xl border border-border bg-card p-4 space-y-3">
      <h2 className="text-lg font-semibold text-foreground">Select Documents</h2>
      {documents.length ? (
        <ul className="space-y-2">
          {documents.map((document) => (
            <li key={document.id} className="rounded-xl border border-border p-2">
              <label className="flex items-center gap-2 text-sm text-foreground">
                <input
                  checked={selectedIds.includes(document.id)}
                  type="checkbox"
                  onChange={() => onToggle(document.id)}
                />
                <span>{document.title}</span>
              </label>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-muted-foreground">No documents available yet.</p>
      )}
    </section>
  );
}
