import type { DocsPage } from "../../docs/types";
import { CodeExample } from "./CodeExample";
import { LiveExampleSection } from "./LiveExampleSection";

interface DocsArticleProps {
  page: DocsPage;
}

export function DocsArticle({ page }: DocsArticleProps) {
  return (
    <article className="docs-article">
      <header className="docs-article__header">
        <p className="docs-article__eyebrow">{page.category}</p>
        <h1>{page.title}</h1>
        <p>{page.summary}</p>
      </header>

      <section className="docs-article__body">{page.body}</section>

      {page.codeSamples.map((sample) => (
        <CodeExample key={`${page.path}-${sample.title}`} sample={sample} />
      ))}

      {page.featureId ? <LiveExampleSection page={page} /> : null}
    </article>
  );
}
