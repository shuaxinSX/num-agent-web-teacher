import { Fragment } from "react";
import { MathFormula } from "./MathFormula";

const INLINE_MATH_PATTERN = /\\\(((?:\\.|[^\\\n])+?)\\\)/g;

export function InlineMathText({ text }) {
  if (!text) {
    return null;
  }

  const nodes = [];
  let lastIndex = 0;
  let matchIndex = 0;

  for (const match of text.matchAll(INLINE_MATH_PATTERN)) {
    const [source, inner] = match;
    const start = match.index ?? 0;

    if (start > lastIndex) {
      nodes.push(<Fragment key={`text-${matchIndex}`}>{text.slice(lastIndex, start)}</Fragment>);
    }

    nodes.push(<MathFormula key={`math-${matchIndex}`} latex={inner.trim()} block={false} />);
    lastIndex = start + source.length;
    matchIndex += 1;
  }

  if (lastIndex < text.length) {
    nodes.push(<Fragment key={`tail-${matchIndex}`}>{text.slice(lastIndex)}</Fragment>);
  }

  return <>{nodes}</>;
}
