import type { DocsCodeSample } from "../../docs/types";
import { getCodeHighlight } from "./codeHighlight";

interface CodeExampleProps {
  sample: DocsCodeSample;
}

export function CodeExample({ sample }: CodeExampleProps) {
  const highlighted = getCodeHighlight(sample);
  return (
    <section aria-label={sample.title} className="docs-code">
      <div className="docs-code__header">
        <span>{sample.title}</span>
        <span>{sample.language}</span>
      </div>
      <pre className={`${highlighted.className} docs-code__pre`} style={highlighted.style}>
        {highlighted.lines.map((line, lineIndex) => (
          <div className="token-line docs-code__line" key={lineIndex} style={highlighted.lineStyle}>
            <span className="docs-code__line-number">{lineIndex + 1}</span>
            <span className="docs-code__line-content">
              {line.map((token, tokenIndex) => (
                <span className={token.className} key={tokenIndex} style={token.style}>{token.content}</span>
              ))}
            </span>
          </div>
        ))}
      </pre>
    </section>
  );
}
