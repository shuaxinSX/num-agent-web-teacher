import katex from "katex";

export function MathFormula({ latex, block = true }) {
  const rendered = katex.renderToString(latex, {
    displayMode: block,
    throwOnError: false,
    strict: "ignore"
  });

  if (block) {
    return (
      <div
        className="math-formula math-formula-block"
        dangerouslySetInnerHTML={{ __html: rendered }}
      />
    );
  }

  return (
    <span
      className="math-formula math-formula-inline"
      dangerouslySetInnerHTML={{ __html: rendered }}
    />
  );
}
