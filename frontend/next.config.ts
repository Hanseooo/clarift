import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: [
    "mermaid",
    "@mermaid-js/parser",
    "@tiptap/react",
    "@tiptap/starter-kit",
    "@tiptap/markdown",
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

export default nextConfig;
