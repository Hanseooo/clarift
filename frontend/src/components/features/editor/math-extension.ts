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
        tag: 'span[data-type="math-inline"]',
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
        tag: 'div[data-type="math-block"]',
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
