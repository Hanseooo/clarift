import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import { remarkAlert } from "remark-github-blockquote-alert";
import rehypeKatex from "rehype-katex";
import rehypePrettyCode from "rehype-pretty-code";

type RichMarkdownProps = {
  content: string;
  className?: string;
};

export function RichMarkdown({ content, className }: RichMarkdownProps) {
  return (
    <div className={className}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm, remarkMath, remarkAlert]}
        rehypePlugins={[
          rehypeKatex,
          [rehypePrettyCode, { theme: "github-dark" }],
        ]}
        components={{
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
