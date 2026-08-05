import { useMemo } from "react";

import { CominsTable } from "../../../src";
import { FeatureSampleSection } from "../components/FeatureSampleSection";
import { createBaseColumns } from "../fixtures/columns";
import { createExampleRows } from "../fixtures/people";
import { defineLocalizedText, usePlaygroundLocale } from "../i18n/playground-locale";

export function SizeFeature() {
  const { text } = usePlaygroundLocale();
  const columns = useMemo(() => createBaseColumns(), []);
  const rows = useMemo(() => createExampleRows(100), []);

  return (
    <section className="feature-panel feature-panel--size">
      <FeatureSampleSection
        className="feature-option-container--size"
        description={text(defineLocalizedText(
          "300px 고정 높이와 부모 컨테이너 500px 높이를 테이블이 그대로 채우는지 확인합니다.",
          "Verify that the table fills a fixed 300px height and a 500px parent container.",
        ))}
        id="size-fixed"
        title={text(defineLocalizedText("테이블 크기", "Table sizing"))}
      >
        <div className="size-example-grid size-example-grid--fixed">
          <section className="size-example">
            <h2>{text(defineLocalizedText("300px 고정", "Fixed 300px"))}</h2>
            <p>{text(defineLocalizedText(
              "사용자가 지정한 높이 300px을 테이블이 그대로 채우는지 확인합니다.",
              "Verify that the table fills the user-defined 300px height.",
            ))}</p>
            <div className="size-case size-case--manual" data-testid="size-case-manual">
              <CominsTable
                className="size-table"
                columns={columns}
                data={rows}
                data-testid="data-table-size-manual"
                getRowId={(row) => row.id}
                pagination={{ pageIndex: 0, pageSize: 100 }}
                theme={{ density: "compact" }}
              />
            </div>
          </section>
          <section className="size-example">
            <h2>{text(defineLocalizedText("상위 컨테이너 500px", "500px parent container"))}</h2>
            <p>{text(defineLocalizedText(
              "상위 컨테이너 높이 500px을 테이블이 100%로 사용하는지 확인합니다.",
              "Verify that the table uses 100% of the 500px parent height.",
            ))}</p>
            <div className="size-case size-case--parent" data-testid="size-case-parent">
              <CominsTable
                className="size-table"
                columns={columns}
                data={rows}
                data-testid="data-table-size-parent"
                getRowId={(row) => row.id}
                pagination={{ pageIndex: 0, pageSize: 100 }}
                theme={{ density: "compact" }}
              />
            </div>
          </section>
        </div>
      </FeatureSampleSection>
    </section>
  );
}
