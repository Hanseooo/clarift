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
        tag: 'div[data-type="alert"]',
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
