"use client";

import React from "react";
import { Editor } from "@tiptap/react";
import {
  Bold,
  Italic,
  Strikethrough,
  Code,
  Heading1,
  Heading2,
  Heading3,
  List,
  ListOrdered,
  CheckSquare,
  Quote,
  Minus,
  Link as LinkIcon,
  Table,
  Superscript,
  AlertCircle,
  Undo,
  Redo,
} from "lucide-react";
import { Button } from "@/components/ui/button";

type ToolbarProps = {
  editor: Editor;
};

export function TiptapToolbar({ editor }: ToolbarProps) {
  if (!editor) return null;

  const toggleLink = () => {
    const previousUrl = editor.getAttributes("link").href;
    const url = window.prompt("URL", previousUrl);
    if (url === null) return;
    if (url === "") {
      editor.chain().focus().extendMarkRange("link").unsetLink().run();
      return;
    }
    editor.chain().focus().extendMarkRange("link").setLink({ href: url }).run();
  };

  const insertTable = () => {
    editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run();
  };

  const insertMathInline = () => {
    editor.chain().focus().insertContent({ type: "mathInline", attrs: { latex: "x^2" } }).run();
  };

  const insertMathBlock = () => {
    editor.chain().focus().insertContent({ type: "mathBlock", attrs: { latex: "E = mc^2" } }).run();
  };

  const insertAlert = () => {
    editor.chain().focus().insertContent({ type: "alert", attrs: { type: "note" } }).run();
  };

  const toolbarButton = (
    onClick: () => void,
    isActive: boolean,
    icon: React.ReactNode,
    label: string
  ) => (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      onClick={onClick}
      className={`h-8 w-8 p-0 ${isActive ? "bg-brand-100 text-brand-800" : ""}`}
      title={label}
    >
      {icon}
    </Button>
  );

  return (
    <div className="flex flex-wrap items-center gap-1 rounded-lg border border-border-default bg-surface-card p-2">
      {/* History */}
      {toolbarButton(
        () => editor.chain().focus().undo().run(),
        false,
        <Undo className="h-4 w-4" />,
        "Undo"
      )}
      {toolbarButton(
        () => editor.chain().focus().redo().run(),
        false,
        <Redo className="h-4 w-4" />,
        "Redo"
      )}

      <div className="mx-1 h-4 w-px bg-border-default" />

      {/* Formatting */}
      {toolbarButton(
        () => editor.chain().focus().toggleBold().run(),
        editor.isActive("bold"),
        <Bold className="h-4 w-4" />,
        "Bold"
      )}
      {toolbarButton(
        () => editor.chain().focus().toggleItalic().run(),
        editor.isActive("italic"),
        <Italic className="h-4 w-4" />,
        "Italic"
      )}
      {toolbarButton(
        () => editor.chain().focus().toggleStrike().run(),
        editor.isActive("strike"),
        <Strikethrough className="h-4 w-4" />,
        "Strikethrough"
      )}
      {toolbarButton(
        () => editor.chain().focus().toggleCode().run(),
        editor.isActive("code"),
        <Code className="h-4 w-4" />,
        "Inline Code"
      )}

      <div className="mx-1 h-4 w-px bg-border-default" />

      {/* Headings */}
      {toolbarButton(
        () => editor.chain().focus().toggleHeading({ level: 1 }).run(),
        editor.isActive("heading", { level: 1 }),
        <Heading1 className="h-4 w-4" />,
        "Heading 1"
      )}
      {toolbarButton(
        () => editor.chain().focus().toggleHeading({ level: 2 }).run(),
        editor.isActive("heading", { level: 2 }),
        <Heading2 className="h-4 w-4" />,
        "Heading 2"
      )}
      {toolbarButton(
        () => editor.chain().focus().toggleHeading({ level: 3 }).run(),
        editor.isActive("heading", { level: 3 }),
        <Heading3 className="h-4 w-4" />,
        "Heading 3"
      )}

      <div className="mx-1 h-4 w-px bg-border-default" />

      {/* Lists */}
      {toolbarButton(
        () => editor.chain().focus().toggleBulletList().run(),
        editor.isActive("bulletList"),
        <List className="h-4 w-4" />,
        "Bullet List"
      )}
      {toolbarButton(
        () => editor.chain().focus().toggleOrderedList().run(),
        editor.isActive("orderedList"),
        <ListOrdered className="h-4 w-4" />,
        "Ordered List"
      )}
      {toolbarButton(
        () => editor.chain().focus().toggleTaskList().run(),
        editor.isActive("taskList"),
        <CheckSquare className="h-4 w-4" />,
        "Task List"
      )}

      <div className="mx-1 h-4 w-px bg-border-default" />

      {/* Blocks */}
      {toolbarButton(
        () => editor.chain().focus().toggleBlockquote().run(),
        editor.isActive("blockquote"),
        <Quote className="h-4 w-4" />,
        "Blockquote"
      )}
      {toolbarButton(
        () => editor.chain().focus().setHorizontalRule().run(),
        false,
        <Minus className="h-4 w-4" />,
        "Horizontal Rule"
      )}

      <div className="mx-1 h-4 w-px bg-border-default" />

      {/* Link */}
      {toolbarButton(toggleLink, editor.isActive("link"), <LinkIcon className="h-4 w-4" />, "Link")}

      {/* Table */}
      {toolbarButton(insertTable, editor.isActive("table"), <Table className="h-4 w-4" />, "Table")}

      <div className="mx-1 h-4 w-px bg-border-default" />

      {/* Math */}
      {toolbarButton(insertMathInline, false, <Superscript className="h-4 w-4" />, "Inline Math")}
      {toolbarButton(insertMathBlock, false, <Superscript className="h-4 w-4" />, "Block Math")}

      {/* Alert */}
      {toolbarButton(insertAlert, false, <AlertCircle className="h-4 w-4" />, "Alert")}
    </div>
  );
}
