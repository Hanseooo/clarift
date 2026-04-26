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
