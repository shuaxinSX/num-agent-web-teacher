import { useEffect, useId, useState } from "react";

export function MermaidBlock({ chart }) {
  const uniqueId = useId().replace(/:/g, "");
  const [svg, setSvg] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;

    async function renderChart() {
      try {
        const { default: mermaid } = await import("mermaid");

        mermaid.initialize({
          startOnLoad: false,
          securityLevel: "loose",
          theme: "neutral"
        });

        const { svg: renderedSvg } = await mermaid.render(
          `mermaid-${uniqueId}-${Date.now()}`,
          chart
        );

        if (!active) {
          return;
        }

        setSvg(renderedSvg);
        setError("");
      } catch (caughtError) {
        if (!active) {
          return;
        }

        setError(caughtError.message || "Mermaid 渲染失败。");
      }
    }

    setSvg("");
    setError("");
    renderChart();

    return () => {
      active = false;
    };
  }, [chart, uniqueId]);

  if (error) {
    return (
      <div className="mermaid-fallback">
        <p>Mermaid 渲染失败：{error}</p>
        <pre>{chart}</pre>
      </div>
    );
  }

  if (!svg) {
    return <div className="mermaid-loading">正在渲染 Mermaid 图...</div>;
  }

  return <div className="mermaid-block" dangerouslySetInnerHTML={{ __html: svg }} />;
}
