import type { FeatureId } from "../../features/types";
import { findFeature } from "../../features/featureRegistry";
import { defineLocalizedText, usePlaygroundLocale } from "../../i18n/playground-locale";

interface FeatureApiTableProps {
  featureId?: FeatureId;
}

export function FeatureApiTable({ featureId }: FeatureApiTableProps) {
  const { locale, text } = usePlaygroundLocale();

  if (!featureId) {
    return null;
  }

  const items = findFeature(featureId, locale).options.filter((option) => option.apiKind);

  if (items.length === 0) {
    return null;
  }

  return (
    <section
      aria-labelledby={`feature-api-table-${featureId}`}
      className="docs-api-table"
      data-testid="feature-api-table"
    >
      <h2 id={`feature-api-table-${featureId}`}>
        {text(defineLocalizedText("이벤트 및 메서드", "Events and methods"))}
      </h2>
      <div className="docs-api-table__viewport">
        <table>
          <thead>
            <tr>
              <th scope="col">
                {text(defineLocalizedText("이벤트명 또는 메서드명", "Event or method"))}
              </th>
              <th scope="col">{text(defineLocalizedText("설명", "Description"))}</th>
              <th scope="col">{text(defineLocalizedText("사용 방법", "Usage"))}</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr key={`${item.apiKind}-${item.name}`} data-api-kind={item.apiKind}>
                <th scope="row"><code>{item.name}</code></th>
                <td>{item.description}</td>
                <td><code>{item.example}</code></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
