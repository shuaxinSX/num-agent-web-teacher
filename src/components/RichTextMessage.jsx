import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import { CodeBlock } from "./CodeBlock";

const blockEnvironments = [
  "align",
  "align*",
  "aligned",
  "equation",
  "equation*",
  "gather",
  "gather*",
  "cases"
];

function normalizeMathDelimiters(content) {
  const parts = content.split(/(```[\s\S]*?```)/g);

  return parts
    .map((part) => {
      if (part.startsWith("```")) {
        return part;
      }

      let next = part
        .replace(/\\\[((?:.|\n)*?)\\\]/g, (_match, inner) => `\n$$\n${inner.trim()}\n$$\n`)
        .replace(/\\\(((?:\\.|[^\\\n])+?)\\\)/g, (_match, inner) => `$${inner.trim()}$`);

      blockEnvironments.forEach((envName) => {
        const pattern = new RegExp(
          `\\\\begin\\{${envName.replace("*", "\\*")}\\}([\\s\\S]*?)\\\\end\\{${envName.replace("*", "\\*")}\\}`,
          "g"
        );
        next = next.replace(
          pattern,
          (_match, inner) => `\n$$\n\\begin{${envName}}\n${inner.trim()}\n\\end{${envName}}\n$$\n`
        );
      });

      return next;
    })
    .join("");
}

export function RichTextMessage({ content }) {
  const normalizedContent = normalizeMathDelimiters(content);

  return (
    <div className="rich-message">
      <ReactMarkdown
        remarkPlugins={[remarkGfm, remarkMath]}
        rehypePlugins={[rehypeKatex]}
        components={{
          pre({ children }) {
            return <>{children}</>;
          },
          code({ inline, className, children, ...props }) {
            return (
              <CodeBlock inline={Boolean(inline)} className={className} {...props}>
                {children}
              </CodeBlock>
            );
          },
          a({ href, children, ...props }) {
            return (
              <a
                href={href}
                target="_blank"
                rel="noreferrer"
                className="message-link"
                {...props}
              >
                {children}
              </a>
            );
          },
          table({ children }) {
            return (
              <div className="message-table-wrap">
                <table className="message-table">{children}</table>
              </div>
            );
          }
        }}
      >
        {normalizedContent}
      </ReactMarkdown>
    </div>
  );
}
