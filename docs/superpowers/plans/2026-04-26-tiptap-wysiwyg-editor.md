# Tiptap WYSIWYG Editor Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace `@uiw/react-md-editor` with a Tiptap-based WYSIWYG editor in the Summary editing feature, preserving Markdown round-trip and supporting LaTeX, tables, and GitHub alerts.

**Architecture:** Next.js Client Component with Tiptap. `immediatelyRender: false` for SSR safety. Custom KaTeX node for math. Markdown import/export via `@tiptap/extension-markdown`.

**Tech Stack:** Tiptap, KaTeX, Tailwind CSS, Next.js 16, React 19.

---

## File Structure

```
frontend/src/components/features/editor/
├── tiptap-provider.tsx        # useEditor hook + extension config
├── tiptap-toolbar.tsx         # Fixed formatting toolbar
├── slash-command.tsx          # /command palette UI + suggestion plugin
├── tiptap-editor.tsx          # Main editor wrapper (save/cancel flow)
└── markdown-editor.tsx        # DELETE

frontend/src/components/features/summary/
└── (existing files unchanged)

frontend/src/app/(app)/summaries/[id]/page.tsx
└── Modify: Remove handleSave, integrate TiptapEditor
```

---

## Chunk 1: Install Dependencies

### Task 1: Add Tiptap Packages

**Files:**
- Modify: `frontend/package.json`

- [ ] **Step 1: Install Tiptap packages**

```bash
cd frontend
pnpm add @tiptap/react @tiptap/starter-kit @tiptap/extension-markdown @tiptap/extension-table @tiptap/extension-table-row @tiptap/extension-table-cell @tiptap/extension-table-header @tiptap/extension-task-list @tiptap/extension-task-item @tiptap/extension-link @tiptap/suggestion tippy.js marked
```

- [ ] **Step 2: Remove legacy packages**

```bash
cd frontend
pnpm remove @uiw/react-md-editor novel tiptap-markdown
```

- [ ] **Step 3: Update pnpm-lock.yaml**

```bash
cd frontend
pnpm install
```

- [ ] **Step 4: Commit**

```bash
git add frontend/package.json frontend/pnpm-lock.yaml
git commit -m "deps: add tiptap and remove react-md-editor, novel, tiptap-markdown"
```

---

## Chunk 2: Custom Extensions

### Task 2: Create KaTeX Math Extension

**Files:**
- Create: `frontend/src/components/features/editor/math-extension.ts`

- [ ] **Step 1: Implement inline and block math nodes**

```typescript
import { Node, mergeAttributes } from "@tiptap/core";
import katex from "katex";

export const MathInline = Node.create({
  name: "mathInline",
  group: "inline",
  inline: true,
  atom: true,

  addAttributes() {
    return {
      latex: {
        default: "",
      },
    };
  },

  parseHTML() {
    return [
      {
        tag: "span[data-type=\"math-inline\"]",
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    return ["span", mergeAttributes({ "data-type": "math-inline" }, HTMLAttributes)];
  },

  renderText({ node }) {
    return `$${node.attrs.latex}$`;
  },

  addNodeView() {
    return ({ node }) => {
      const dom = document.createElement("span");
      dom.className = "math-inline";
      try {
        dom.innerHTML = katex.renderToString(node.attrs.latex, { throwOnError: false });
      } catch {
        dom.textContent = `$${node.attrs.latex}$`;
      }
      return { dom };
    };
  },
});

export const MathBlock = Node.create({
  name: "mathBlock",
  group: "block",
  atom: true,

  addAttributes() {
    return {
      latex: {
        default: "",
      },
    };
  },

  parseHTML() {
    return [
      {
        tag: "div[data-type=\"math-block\"]",
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    return ["div", mergeAttributes({ "data-type": "math-block" }, HTMLAttributes)];
  },

  renderText({ node }) {
    return `$$${node.attrs.latex}$$`;
  },

  addNodeView() {
    return ({ node }) => {
      const dom = document.createElement("div");
      dom.className = "math-block flex justify-center my-4";
      try {
        dom.innerHTML = katex.renderToString(node.attrs.latex, {
          throwOnError: false,
          displayMode: true,
        });
      } catch {
        dom.textContent = `$$${node.attrs.latex}$$`;
      }
      return { dom };
    };
  },
});
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/components/features/editor/math-extension.ts
git commit -m "feat(tiptap): add custom KaTeX math nodes"
```

### Task 3: Create Alert Extension

**Files:**
- Create: `frontend/src/components/features/editor/alert-extension.ts`

- [ ] **Step 1: Implement GitHub-style alert node**

```typescript
import { Node, mergeAttributes } from "@tiptap/core";

export const AlertNode = Node.create({
  name: "alert",
  group: "block",
  content: "block+",

  addAttributes() {
    return {
      type: {
        default: "note",
        parseHTML: (element) => element.getAttribute("data-alert-type"),
        renderHTML: (attributes) => ({
          "data-alert-type": attributes.type,
        }),
      },
    };
  },

  parseHTML() {
    return [
      {
        tag: "div[data-type=\"alert\"]",
      },
    ];
  },

  renderHTML({ HTMLAttributes, node }) {
    const type = node.attrs.type as string;
    const borderColors: Record<string, string> = {
      note: "border-l-blue-500",
      important: "border-l-amber-500",
      warning: "border-l-red-500",
    };
    return [
      "div",
      mergeAttributes(
        {
          "data-type": "alert",
          class: `alert border-l-4 ${borderColors[type] || borderColors.note} bg-surface-subtle p-4 my-2`,
        },
        HTMLAttributes
      ),
      0,
    ];
  },

  renderText({ node }) {
    const type = node.attrs.type as string;
    return `> [!${type.toUpperCase()}]\n`;
  },
});
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/components/features/editor/alert-extension.ts
git commit -m "feat(tiptap): add custom alert node for github-style callouts"
```

### Task 3b: Configure Markdown Serializers

**Note:** The custom nodes (`mathInline`, `mathBlock`, `alert`) define `renderText` for serialization (Markdown export). For parsing (Markdown import), the `@tiptap/extension-markdown` extension will attempt to match HTML tags in the Markdown output. Since our backend stores raw Markdown strings (not HTML), full round-trip for math and alerts requires custom remark/rehype plugins or regex preprocessing in a future iteration. For this PR, nodes created via the UI toolbar/slash commands will serialize back to Markdown correctly on save.

---

## Chunk 3: Slash Command

### Task 4: Create slash-command.tsx

**Files:**
- Create: `frontend/src/components/features/editor/slash-command.tsx`

- [ ] **Step 1: Implement slash command suggestion plugin**

```tsx
"use client";

import { useState, useEffect, useCallback, forwardRef, useImperativeHandle } from "react";
import { Editor, Extension } from "@tiptap/core";
import Suggestion from "@tiptap/suggestion";
import { ReactRenderer } from "@tiptap/react";
import tippy, { Instance } from "tippy.js";
import "tippy.js/dist/tippy.css";
import {
  Heading1,
  Heading2,
  Heading3,
  List,
  ListOrdered,
  CheckSquare,
  Quote,
  Minus,
  Table,
  Superscript,
  AlertCircle,
  Code,
} from "lucide-react";

const commands = [
  {
    title: "Heading 1",
    command: ({ editor }: { editor: Editor }) => editor.chain().focus().toggleHeading({ level: 1 }).run(),
    icon: Heading1,
  },
  {
    title: "Heading 2",
    command: ({ editor }: { editor: Editor }) => editor.chain().focus().toggleHeading({ level: 2 }).run(),
    icon: Heading2,
  },
  {
    title: "Heading 3",
    command: ({ editor }: { editor: Editor }) => editor.chain().focus().toggleHeading({ level: 3 }).run(),
    icon: Heading3,
  },
  {
    title: "Bullet List",
    command: ({ editor }: { editor: Editor }) => editor.chain().focus().toggleBulletList().run(),
    icon: List,
  },
  {
    title: "Ordered List",
    command: ({ editor }: { editor: Editor }) => editor.chain().focus().toggleOrderedList().run(),
    icon: ListOrdered,
  },
  {
    title: "Task List",
    command: ({ editor }: { editor: Editor }) => editor.chain().focus().toggleTaskList().run(),
    icon: CheckSquare,
  },
  {
    title: "Blockquote",
    command: ({ editor }: { editor: Editor }) => editor.chain().focus().toggleBlockquote().run(),
    icon: Quote,
  },
  {
    title: "Code Block",
    command: ({ editor }: { editor: Editor }) => editor.chain().focus().toggleCodeBlock().run(),
    icon: Code,
  },
  {
    title: "Table",
    command: ({ editor }: { editor: Editor }) => editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run(),
    icon: Table,
  },
  {
    title: "Inline Math",
    command: ({ editor }: { editor: Editor }) => editor.chain().focus().insertContent({ type: "mathInline", attrs: { latex: "x^2" } }).run(),
    icon: Superscript,
  },
  {
    title: "Block Math",
    command: ({ editor }: { editor: Editor }) => editor.chain().focus().insertContent({ type: "mathBlock", attrs: { latex: "E = mc^2" } }).run(),
    icon: Superscript,
  },
  {
    title: "Alert",
    command: ({ editor }: { editor: Editor }) => editor.chain().focus().insertContent({ type: "alert", attrs: { type: "note" } }).run(),
    icon: AlertCircle,
  },
  {
    title: "Divider",
    command: ({ editor }: { editor: Editor }) => editor.chain().focus().setHorizontalRule().run(),
    icon: Minus,
  },
];

export const SlashCommand = Extension.create({
  name: "slash-command",
  addOptions() {
    return {
      suggestion: {
        char: "/",
        items: ({ query }: { query: string }) => {
          return commands.filter((item) =>
            item.title.toLowerCase().includes(query.toLowerCase())
          );
        },
        command: ({ editor, range, props }: { editor: Editor; range: any; props: any }) => {
          editor.chain().focus().deleteRange(range).run();
          props.command({ editor, range });
        },
        render: () => {
          let component: ReactRenderer<any>;
          let popup: Instance<any>[];

          return {
            onStart: (props: any) => {
              component = new ReactRenderer(SlashCommandList, {
                props,
                editor: props.editor,
              });
              popup = tippy("body", {
                getReferenceClientRect: props.clientRect,
                appendTo: () => document.body,
                content: component.element,
                showOnCreate: true,
                interactive: true,
                trigger: "manual",
                placement: "bottom-start",
              });
            },
            onUpdate: (props: any) => {
              component.updateProps(props);
              popup[0].setProps({
                getReferenceClientRect: props.clientRect,
              });
            },
            onKeyDown: (props: any) => {
              return component.ref?.onKeyDown?.(props);
            },
            onExit: () => {
              popup[0].destroy();
              component.destroy();
            },
          };
        },
      },
    };
  },
  addProseMirrorPlugins() {
    return [
      Suggestion({
        editor: this.editor,
        ...this.options.suggestion,
      }),
    ];
  },
});

// React component for the slash command list
export const SlashCommandList = forwardRef(({ items, command }: { items: typeof commands; command: (item: typeof commands[0]) => void }, ref) => {
  const [selectedIndex, setSelectedIndex] = useState(0);

  useEffect(() => {
    setSelectedIndex(0);
  }, [items]);

  const onKeyDown = useCallback(
    (event: KeyboardEvent) => {
      if (event.key === "ArrowUp") {
        event.preventDefault();
        setSelectedIndex((prev) => (prev + items.length - 1) % items.length);
        return true;
      }
      if (event.key === "ArrowDown") {
        event.preventDefault();
        setSelectedIndex((prev) => (prev + 1) % items.length);
        return true;
      }
      if (event.key === "Enter") {
        event.preventDefault();
        command(items[selectedIndex]);
        return true;
      }
      return false;
    },
    [items, selectedIndex, command]
  );

  useImperativeHandle(ref, () => ({
    onKeyDown,
  }));

  return (
    <div className="z-50 w-64 overflow-hidden rounded-lg border border-border-default bg-surface-card shadow-lg">
      {items.map((item, index) => {
        const Icon = item.icon;
        return (
          <button
            key={item.title}
            type="button"
            onClick={() => command(item)}
            className={`flex w-full items-center gap-2 px-3 py-2 text-left text-sm transition-colors ${
              index === selectedIndex ? "bg-brand-100 text-brand-800" : "hover:bg-surface-subtle"
            }`}
          >
            <Icon className="h-4 w-4" />
            {item.title}
          </button>
        );
      })}
    </div>
  );
});

SlashCommandList.displayName = "SlashCommandList";
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/components/features/editor/slash-command.tsx
git commit -m "feat(tiptap): add slash command palette"
```

---

## Chunk 4: Toolbar Component

### Task 5: Create tiptap-toolbar.tsx

**Files:**
- Create: `frontend/src/components/features/editor/tiptap-toolbar.tsx`

- [ ] **Step 1: Implement the toolbar**

```tsx
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
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/components/features/editor/tiptap-toolbar.tsx
git commit -m "feat(tiptap): add formatting toolbar"
```

---

## Chunk 5: Tiptap Provider

### Task 6: Create tiptap-provider.tsx

**Files:**
- Create: `frontend/src/components/features/editor/tiptap-provider.tsx`

- [ ] **Step 1: Create the provider component**

```tsx
"use client";

import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Markdown from "@tiptap/extension-markdown";
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
  children: (editor: Editor) => React.ReactNode;
};

export function TiptapProvider({ initialContent, children }: TiptapProviderProps) {
  const htmlContent = marked.parse(initialContent || "") as string;
  
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
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/components/features/editor/tiptap-provider.tsx
git commit -m "feat(tiptap): add core provider with extensions"
```

---

## Chunk 6: Main Editor Component

### Task 7: Create tiptap-editor.tsx

**Files:**
- Create: `frontend/src/components/features/editor/slash-command.tsx`

- [ ] **Step 1: Implement slash command suggestion plugin**

```tsx
"use client";

import { useState, useEffect, useCallback } from "react";
import { Editor, Extension } from "@tiptap/core";
import { PluginKey } from "@tiptap/pm/state";
import Suggestion from "@tiptap/suggestion";
import { ReactRenderer } from "@tiptap/react";
import tippy, { Instance } from "tippy.js";
import {
  Heading1,
  Heading2,
  Heading3,
  List,
  ListOrdered,
  CheckSquare,
  Quote,
  Minus,
  Table,
  Superscript,
  AlertCircle,
  Code,
} from "lucide-react";

const commands = [
  {
    title: "Heading 1",
    command: ({ editor }: { editor: Editor }) => editor.chain().focus().toggleHeading({ level: 1 }).run(),
    icon: Heading1,
  },
  {
    title: "Heading 2",
    command: ({ editor }: { editor: Editor }) => editor.chain().focus().toggleHeading({ level: 2 }).run(),
    icon: Heading2,
  },
  {
    title: "Heading 3",
    command: ({ editor }: { editor: Editor }) => editor.chain().focus().toggleHeading({ level: 3 }).run(),
    icon: Heading3,
  },
  {
    title: "Bullet List",
    command: ({ editor }: { editor: Editor }) => editor.chain().focus().toggleBulletList().run(),
    icon: List,
  },
  {
    title: "Ordered List",
    command: ({ editor }: { editor: Editor }) => editor.chain().focus().toggleOrderedList().run(),
    icon: ListOrdered,
  },
  {
    title: "Task List",
    command: ({ editor }: { editor: Editor }) => editor.chain().focus().toggleTaskList().run(),
    icon: CheckSquare,
  },
  {
    title: "Blockquote",
    command: ({ editor }: { editor: Editor }) => editor.chain().focus().toggleBlockquote().run(),
    icon: Quote,
  },
  {
    title: "Code Block",
    command: ({ editor }: { editor: Editor }) => editor.chain().focus().toggleCodeBlock().run(),
    icon: Code,
  },
  {
    title: "Table",
    command: ({ editor }: { editor: Editor }) => editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run(),
    icon: Table,
  },
  {
    title: "Inline Math",
    command: ({ editor }: { editor: Editor }) => editor.chain().focus().insertContent({ type: "mathInline", attrs: { latex: "x^2" } }).run(),
    icon: Superscript,
  },
  {
    title: "Block Math",
    command: ({ editor }: { editor: Editor }) => editor.chain().focus().insertContent({ type: "mathBlock", attrs: { latex: "E = mc^2" } }).run(),
    icon: Superscript,
  },
  {
    title: "Alert",
    command: ({ editor }: { editor: Editor }) => editor.chain().focus().insertContent({ type: "alert", attrs: { type: "note" } }).run(),
    icon: AlertCircle,
  },
  {
    title: "Divider",
    command: ({ editor }: { editor: Editor }) => editor.chain().focus().setHorizontalRule().run(),
    icon: Minus,
  },
];

export const SlashCommand = Extension.create({
  name: "slash-command",
  addOptions() {
    return {
      suggestion: {
        char: "/",
        items: ({ query }: { query: string }) => {
          return commands.filter((item) =>
            item.title.toLowerCase().includes(query.toLowerCase())
          );
        },
        command: ({ editor, range, props }: { editor: Editor; range: any; props: any }) => {
          editor.chain().focus().deleteRange(range).run();
          props.command({ editor, range });
        },
        render: () => {
          let component: ReactRenderer<any>;
          let popup: Instance<any>[];

          return {
            onStart: (props: any) => {
              component = new ReactRenderer(SlashCommandList, {
                props,
                editor: props.editor,
              });
              popup = tippy("body", {
                getReferenceClientRect: props.clientRect,
                appendTo: () => document.body,
                content: component.element,
                showOnCreate: true,
                interactive: true,
                trigger: "manual",
                placement: "bottom-start",
              });
            },
            onUpdate: (props: any) => {
              component.updateProps(props);
              popup[0].setProps({
                getReferenceClientRect: props.clientRect,
              });
            },
            onKeyDown: (props: any) => {
              return component.ref?.onKeyDown?.(props);
            },
            onExit: () => {
              popup[0].destroy();
              component.destroy();
            },
          };
        },
      },
    };
  },
  addProseMirrorPlugins() {
    return [
      Suggestion({
        editor: this.editor,
        ...this.options.suggestion,
      }),
    ];
  },
});

// React component for the slash command list
export function SlashCommandList({ items, command }: { items: typeof commands; command: (item: typeof commands[0]) => void }) {
  const [selectedIndex, setSelectedIndex] = useState(0);

  useEffect(() => {
    setSelectedIndex(0);
  }, [items]);

  const onKeyDown = useCallback(
    (event: KeyboardEvent) => {
      if (event.key === "ArrowUp") {
        setSelectedIndex((prev) => (prev + items.length - 1) % items.length);
        return true;
      }
      if (event.key === "ArrowDown") {
        setSelectedIndex((prev) => (prev + 1) % items.length);
        return true;
      }
      if (event.key === "Enter") {
        command(items[selectedIndex]);
        return true;
      }
      return false;
    },
    [items, selectedIndex, command]
  );

  useEffect(() => {
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [onKeyDown]);

  return (
    <div className="z-50 w-64 overflow-hidden rounded-lg border border-border-default bg-surface-card shadow-lg">
      {items.map((item, index) => {
        const Icon = item.icon;
        return (
          <button
            key={item.title}
            type="button"
            onClick={() => command(item)}
            className={`flex w-full items-center gap-2 px-3 py-2 text-left text-sm transition-colors ${
              index === selectedIndex ? "bg-brand-100 text-brand-800" : "hover:bg-surface-subtle"
            }`}
          >
            <Icon className="h-4 w-4" />
            {item.title}
          </button>
        );
      })}
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/components/features/editor/slash-command.tsx
git commit -m "feat(tiptap): add slash command palette"
```

---

## Chunk 6: Main Editor Component

### Task 7: Create tiptap-editor.tsx

**Files:**
- Create: `frontend/src/components/features/editor/tiptap-editor.tsx`

- [ ] **Step 1: Build the main editor wrapper with save/cancel**

```tsx
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
        const markdown = editor.storage.markdown?.getMarkdown() || "";
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
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/components/features/editor/tiptap-editor.tsx
git commit -m "feat(tiptap): add main editor component with save flow"
```

---

## Chunk 7: Integrate into Page

### Task 8: Update summaries/[id]/page.tsx

**Files:**
- Modify: `frontend/src/app/(app)/summaries/[id]/page.tsx`

- [ ] **Step 1: Remove handleSave and integrate TiptapEditor**

Replace:
```tsx
import { MarkdownEditor } from "@/components/features/editor/markdown-editor";
import { updateSummaryContent } from "@/app/actions/summaries";
```

With:
```tsx
import { TiptapEditor } from "@/components/features/editor/tiptap-editor";
```

Remove:
```tsx
async function handleSave(content: string) {
  "use server";
  const result = await updateSummaryContent(id, content);
  if (result.success) {
    redirect(`/summaries/${id}`);
  }
}
```

Replace:
```tsx
<MarkdownEditor
  initialContent={summary.content}
  onSave={handleSave}
  onCancelHref={`/summaries/${id}`}
/>
```

With:
```tsx
<TiptapEditor
  initialContent={summary.content}
  summaryId={id}
/>
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/app/(app)/summaries/[id]/page.tsx
git commit -m "refactor(summaries): integrate tiptap editor into detail page"
```

---

## Chunk 8: Cleanup

### Task 9: Delete Legacy Editor

**Files:**
- Delete: `frontend/src/components/features/editor/markdown-editor.tsx`

- [ ] **Step 1: Remove the old markdown editor file**

```bash
rm frontend/src/components/features/editor/markdown-editor.tsx
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/components/features/editor/markdown-editor.tsx
git commit -m "chore: remove legacy react-md-editor component"
```

---

## Chunk 9: Configuration & Verification

### Task 10: Update next.config.ts

**Files:**
- Modify: `frontend/next.config.ts`

- [ ] **Step 1: Add Tiptap to transpilePackages**

Append to the existing `transpilePackages` array in `frontend/next.config.ts`:

```typescript
const nextConfig: NextConfig = {
  transpilePackages: [
    "mermaid",
    "@mermaid-js/parser",
    "@tiptap/react",
    "@tiptap/starter-kit",
    "@tiptap/extension-markdown",
    "@tiptap/extension-table",
    "@tiptap/extension-table-row",
    "@tiptap/extension-table-cell",
    "@tiptap/extension-table-header",
    "@tiptap/extension-task-list",
    "@tiptap/extension-task-item",
    "@tiptap/extension-link",
    "@tiptap/suggestion",
    "tippy.js",
  ],
};
```

- [ ] **Step 2: Commit**

```bash
git add frontend/next.config.ts
git commit -m "chore(next): add tiptap packages to transpilePackages"
```

### Task 11: Verify Build

**Files:**
- N/A

- [ ] **Step 1: Run typecheck and tests**

```bash
cd frontend
pnpm run generate:openapi
pnpm run test:run
```

- [ ] **Step 2: Manual smoke test checklist**

- [ ] Navigate to a summary detail page
- [ ] Click edit toggle
- [ ] Verify toolbar renders without errors
- [ ] Type some text and format with Bold/Italic
- [ ] Insert a heading
- [ ] Insert a table
- [ ] Insert inline math and verify KaTeX renders
- [ ] Insert block math and verify KaTeX renders
- [ ] Insert an alert block
- [ ] Click Save and verify redirect to read mode
- [ ] Verify PaginatedReader shows updated content correctly
- [ ] Verify LaTeX renders correctly in read mode

- [ ] **Step 3: Final commit (if any fixes needed)**

---

## Rollback Plan

If critical issues are found during verification:

1. Revert commits: `git revert HEAD~N..HEAD` (where N = number of commits in this PR)
2. Re-install legacy packages: `pnpm add @uiw/react-md-editor`
3. Restore `markdown-editor.tsx` from git history
4. Restore `page.tsx` to use `MarkdownEditor` with `handleSave`
5. Remove Tiptap packages: `pnpm remove @tiptap/react @tiptap/starter-kit ...`

---

## References

- Spec: `docs/superpowers/specs/2026-04-26-tiptap-wysiwyg-editor-design.md`
- Prior design: `docs/superpowers/specs/2026-04-21-summary-editor-paginated-design.md`
- Tiptap docs: https://tiptap.dev/docs/editor/getting-started/install/nextjs
