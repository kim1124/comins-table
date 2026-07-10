import type { DocsPage } from "../../docs/types";
import { FeatureContent } from "../FeatureContent";

interface LiveExampleSectionProps {
  page: DocsPage;
}

export function LiveExampleSection({ page }: LiveExampleSectionProps) {
  if (!page.featureId) {
    return null;
  }

  return (
    <section aria-label="Example" className="docs-live">
      <div className="docs-live__header">
        <h2>Example</h2>
      </div>
      <FeatureContent featureId={page.featureId} key={`${page.path}-${page.featureId}`} />
    </section>
  );
}
