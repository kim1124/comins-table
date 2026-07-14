import type { FeatureDefinition } from "../features/types";
import { ScrollArea } from "./ui/scroll-area";

const docsByFeature: Record<string, Array<{ href: string; label: string }>> = {
  "basic-crud": [
    { href: "./docs/user/02-data-and-crud.md", label: "Data and CRUD" },
    { href: "./docs/user/10-selection.md", label: "Selection" },
  ],
  body: [{ href: "./docs/user/11-virtualization.md", label: "Virtualization" }],
  cell: [{ href: "./docs/user/08-cell.md", label: "Cells" }],
  "context-menu": [{ href: "./docs/user/12-playground.md", label: "Playground" }],
  header: [{ href: "./docs/user/06-header.md", label: "Headers" }],
  row: [{ href: "./docs/user/07-row.md", label: "Rows" }],
};

export function FeatureDocsPanel({ feature }: { feature: FeatureDefinition }) {
  const docs = docsByFeature[feature.id] ?? [
    { href: "./README.md", label: "README" },
    { href: "./docs/user/12-playground.md", label: "Playground" },
  ];

  return (
    <aside aria-label="Data table docs" className="docs-aside">
      <div className="docs-heading">
        <p className="example-kicker">Docs</p>
        <h2>{feature.label}</h2>
      </div>
      <ScrollArea className="docs-scroll">
        <section className="docs-section">
          <h3>Feature Summary</h3>
          <p>{feature.summary}</p>
        </section>
        <section className="docs-section">
          <h3>Related Docs</h3>
          <ul>
            {docs.map((doc) => (
              <li key={doc.href}>
                <a href={doc.href}>{doc.label}</a>
              </li>
            ))}
          </ul>
        </section>
      </ScrollArea>
    </aside>
  );
}
