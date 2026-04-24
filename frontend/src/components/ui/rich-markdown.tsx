"use client";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import { remarkAlert } from "remark-github-blockquote-alert";
import rehypeKatex from "rehype-katex";
import rehypeHighlight from "rehype-highlight";
import { MermaidBlock } from "@/components/features/summary/mermaid-block";

type RichMarkdownProps = {
  content: string;
  className?: string;
};

export function RichMarkdown({ content, className }: RichMarkdownProps) {
  return (
    <div className={`${className} prose-pre:p-0`}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm, remarkMath, remarkAlert]}
        rehypePlugins={[rehypeKatex, rehypeHighlight]}
        components={{
          code({ className, children, node, ...props }) {
            if (className?.includes("language-mermaid")) {
              const rawText =
                node?.children
                  ?.map((child) => (child.type === 'text' ? child.value : ''))
                  ?.join('') || String(children);
              return (
                <MermaidBlock chart={rawText.replace(/\n$/, "")} />
              );
            }
            return (
              <code className={className} {...props}>
                {children}
              </code>
            );
          },
          a: ({ href, children }) => (
            <a href={href} target="_blank" rel="noopener noreferrer">
              {children}
            </a>
          ),
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
