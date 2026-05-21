import { useState } from "react";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { oneLight } from "react-syntax-highlighter/dist/esm/styles/prism";
import { MermaidBlock } from "./MermaidBlock";

export function CodeBlock({ inline = false, className = "", children }) {
  const code = String(children).replace(/\n$/, "");
  const language = /language-([\w-]+)/.exec(className)?.[1] || "";
  const [copied, setCopied] = useState(false);

  if (inline) {
    return <code className="message-inline-code">{code}</code>;
  }

  if (language.toLowerCase() === "mermaid") {
    return <MermaidBlock chart={code} />;
  }

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    } catch (_error) {
      setCopied(false);
    }
  }

  return (
    <div className="code-block">
      <div className="code-toolbar">
        <span className="code-language">{language || "text"}</span>
        <button type="button" className="code-copy" onClick={handleCopy}>
          {copied ? "已复制" : "复制代码"}
        </button>
      </div>

      <SyntaxHighlighter
        language={language || "text"}
        style={oneLight}
        customStyle={{
          margin: 0,
          padding: "16px 18px",
          background: "transparent",
          fontSize: "0.9rem"
        }}
        codeTagProps={{
          style: {
            fontFamily: "var(--font-mono)",
            fontVariantLigatures: "contextual",
            fontFeatureSettings: '"calt" 1, "liga" 1'
          }
        }}
      >
        {code}
      </SyntaxHighlighter>
    </div>
  );
}
