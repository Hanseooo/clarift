"use client";

"use client";

import { useState } from "react";
import Link from "next/link";
import MDEditor from "@uiw/react-md-editor";
import { Save, X } from "lucide-react";
import { Button } from "@/components/ui/button";

type MarkdownEditorProps = {
  initialContent: string;
  onSave: (content: string) => Promise<void>;
  onCancelHref?: string;
};

export function MarkdownEditor({
  initialContent,
  onSave,
  onCancelHref,
}: MarkdownEditorProps) {
  const [content, setContent] = useState(initialContent);
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await onSave(content);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-text-primary">Edit Summary</h3>
        <div className="flex items-center gap-2">
          {onCancelHref && (
            <Button
              variant="outline"
              disabled={isSaving}
              type="button"
              asChild
            >
              <Link href={onCancelHref}>
                <X className="mr-2 h-4 w-4" />
                Cancel
              </Link>
            </Button>
          )}
          <Button
            onClick={handleSave}
            disabled={isSaving}
            type="button"
            className="inline-flex items-center gap-2"
          >
            <Save className="h-4 w-4" />
            {isSaving ? "Saving..." : "Save"}
          </Button>
        </div>
      </div>

      <div className="rounded-xl border border-border-default bg-surface-card overflow-hidden">
        <MDEditor
          value={content}
          onChange={(value) => setContent(value || "")}
          height={500}
          preview="live"
          visibleDragbar={false}
          className="[&_.w-md-editor]:border-0 [&_.w-md-editor]:rounded-none"
        />
      </div>

      <div className="text-xs text-text-tertiary">
        <p>
          • Use Markdown syntax for formatting (headers, lists, bold, italic,
          etc.)
        </p>
        <p>• Use LaTeX with $inline$ or $$block$$ for math equations</p>
        <p>• Use &gt; [!NOTE] for callout boxes</p>
        <p>• Use ## for section headers (these create pagination breaks)</p>
      </div>
    </div>
  );
}
