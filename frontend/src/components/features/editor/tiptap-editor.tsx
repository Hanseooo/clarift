"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Editor } from "@tiptap/react";
import { Save, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { updateSummaryContent } from "@/app/actions/summaries";
import { TiptapProvider } from "./tiptap-provider";
import { TiptapToolbar } from "./tiptap-toolbar";

type TiptapEditorProps = {
  initialContent: string;
  summaryId: string;
};

export function TiptapEditor({ initialContent, summaryId }: TiptapEditorProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [saveError, setSaveError] = useState<string | null>(null);

  const handleSave = async (editor: Editor) => {
    setSaveError(null);
    startTransition(async () => {
      try {
        const markdown = editor.getMarkdown() || "";
        const result = await updateSummaryContent(summaryId, markdown);
        if (result.success) {
          router.push(`/summaries/${summaryId}`);
          router.refresh();
        } else {
          setSaveError(result.error || "Failed to save");
        }
      } catch (error) {
        setSaveError("An unexpected error occurred");
      }
    });
  };

  return (
    <div className="space-y-4">
      <TiptapProvider initialContent={initialContent}>
        {(editor) => (
          <>
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-text-primary">Edit Summary</h3>
              <div className="flex items-center gap-2">
                <Button variant="outline" type="button" asChild>
                  <Link href={`/summaries/${summaryId}`}>
                    <X className="mr-2 h-4 w-4" />
                    Cancel
                  </Link>
                </Button>
                <Button
                  type="button"
                  onClick={() => handleSave(editor)}
                  disabled={isPending}
                  className="inline-flex items-center gap-2"
                >
                  <Save className="h-4 w-4" />
                  {isPending ? "Saving..." : "Save"}
                </Button>
              </div>
            </div>

            {saveError && (
              <div className="rounded-lg border border-error-500 bg-error-100 px-4 py-3 text-sm text-error-800">
                {saveError}
              </div>
            )}

            <TiptapToolbar editor={editor} />
          </>
        )}
      </TiptapProvider>

      <div className="text-xs text-text-tertiary">
        <p>Use the toolbar or type / for slash commands</p>
        <p>LaTeX math is supported via the math buttons</p>
        <p>Headings (##) create pagination breaks in read mode</p>
      </div>
    </div>
  );
}
