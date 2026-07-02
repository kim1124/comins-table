import { Highlight, themes } from "prism-react-renderer";

import type { DocsCodeSample } from "../../docs/types";

interface CodeExampleProps {
  sample: DocsCodeSample;
}

export function CodeExample({ sample }: CodeExampleProps) {
  return (
    <section aria-label={sample.title} className="docs-code">
      <div className="docs-code__header">
        <span>{sample.title}</span>
        <span>{sample.language}</span>
      </div>
      <Highlight code={sample.code.trim()} language={sample.language} theme={themes.github}>
        {({ className, style, tokens, getLineProps, getTokenProps }) => (
          <pre className={`${className} docs-code__pre`} style={style}>
            {tokens.map((line, lineIndex) => (
              <div key={lineIndex} {...getLineProps({ className: "docs-code__line", line })}>
                <span className="docs-code__line-number">{lineIndex + 1}</span>
                <span className="docs-code__line-content">
                  {line.map((token, tokenIndex) => (
                    <span key={tokenIndex} {...getTokenProps({ token })} />
                  ))}
                </span>
              </div>
            ))}
          </pre>
        )}
      </Highlight>
    </section>
  );
}
