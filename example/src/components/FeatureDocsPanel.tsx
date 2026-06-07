import type { FeatureDefinition } from "../features/types";
import { ScrollArea } from "./ui/scroll-area";

const docsByFeature: Record<string, Array<{ href: string; label: string }>> = {
  "basic-crud": [
    { href: "./docs/user/04-basic-crud.md", label: "기본 CRUD" },
    { href: "./docs/user/10-selection.md", label: "선택" },
  ],
  body: [{ href: "./docs/user/11-virtualization.md", label: "버추얼 스크롤" }],
  cell: [{ href: "./docs/user/08-cell.md", label: "셀" }],
  "context-menu": [{ href: "./docs/user/12-playground.md", label: "플레이그라운드" }],
  header: [{ href: "./docs/user/06-header.md", label: "헤더" }],
  row: [{ href: "./docs/user/07-row.md", label: "행" }],
};

export function FeatureDocsPanel({ feature }: { feature: FeatureDefinition }) {
  const docs = docsByFeature[feature.id] ?? [
    { href: "./README.md", label: "README" },
    { href: "./docs/user/12-playground.md", label: "플레이그라운드" },
  ];

  return (
    <aside aria-label="데이터 테이블 문서" className="docs-aside">
      <div className="docs-heading">
        <p className="example-kicker">Docs</p>
        <h2>{feature.label}</h2>
      </div>
      <ScrollArea className="docs-scroll">
        <section className="docs-section">
          <h3>기능 요약</h3>
          <p>{feature.summary}</p>
        </section>
        <section className="docs-section">
          <h3>관련 문서</h3>
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
