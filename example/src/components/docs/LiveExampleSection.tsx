import type { DocsPage } from "../../docs/types";
import { defineLocalizedText, usePlaygroundLocale } from "../../i18n/playground-locale";
import { FeatureContent } from "../FeatureContent";

interface LiveExampleSectionProps {
  page: DocsPage;
}

export function LiveExampleSection({ page }: LiveExampleSectionProps) {
  const { text } = usePlaygroundLocale();

  if (!page.featureId) {
    return null;
  }

  return (
    <section aria-label={text(defineLocalizedText("예제", "Example"))} className="docs-live">
      <div className="docs-live__header">
        <h2>{text(defineLocalizedText("예제", "Example"))}</h2>
      </div>
      <FeatureContent featureId={page.featureId} key={`${page.path}-${page.featureId}`} />
    </section>
  );
}
