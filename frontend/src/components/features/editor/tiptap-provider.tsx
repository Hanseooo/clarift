"use client";

import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Markdown from "@tiptap/markdown";
import Table from "@tiptap/extension-table";
import TableRow from "@tiptap/extension-table-row";
import TableCell from "@tiptap/extension-table-cell";
import TableHeader from "@tiptap/extension-table-header";
import TaskList from "@tiptap/extension-task-list";
import TaskItem from "@tiptap/extension-task-item";
import Link from "@tiptap/extension-link";
import { marked } from "marked";

import { MathInline, MathBlock } from "./math-extension";
import { AlertNode } from "./alert-extension";
import { SlashCommand } from "./slash-command";

const extensions = [
  StarterKit.configure({
    heading: { levels: [1, 2, 3] },
  }),
  Markdown.configure({
    html: false,
    transformPastedText: true,
    transformCopiedText: true,
  }),
  Table.configure({ resizable: true }),
  TableRow,
  TableCell,
  TableHeader,
  TaskList,
  TaskItem.configure({ nested: true }),
  Link.configure({ openOnClick: false }),
  MathInline,
  MathBlock,
  AlertNode,
  SlashCommand,
];

type TiptapProviderProps = {
  initialContent: string;
  children: (editor: any) => React.ReactNode;
};

export function TiptapProvider({ initialContent, children }: TiptapProviderProps) {
  const htmlContent = marked.parse(initialContent || "", { async: false }) as string;
  
  const editor = useEditor({
    extensions,
    content: htmlContent,
    immediatelyRender: false,
  });

  if (!editor) {
    return <div className="min-h-[300px] rounded-xl border bg-surface-card" />;
  }

  return (
    <div className="space-y-3">
      {children(editor)}
      <div className="min-h-[300px] rounded-xl border border-border-default bg-surface-card p-4">
        <EditorContent editor={editor} className="prose-brand max-w-none" />
      </div>
    </div>
  );
}
