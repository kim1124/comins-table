import { useMemo, useRef, useState } from "react";

import {
  CominsTable,
  type CominsColumnLayout,
  type CominsTableColumn,
  type CominsTableRef,
} from "../../../src";
import { FeatureControls } from "../components/FeatureControls";
import { FeatureSampleSection } from "../components/FeatureSampleSection";
import { Button } from "../components/ui/button";
import { defineLocalizedText, usePlaygroundLocale } from "../i18n/playground-locale";

type PinningRow = {
  amount: number;
  category: string;
  createdAt: string;
  id: string;
  name: string;
  owner: string;
  priority: string;
  progress: number;
  region: string;
  status: string;
  team: string;
  updatedAt: string;
};

const pinningRows: PinningRow[] = Array.from({ length: 12 }, (_value, index) => ({
  amount: (index + 1) * 125,
  category: index % 2 === 0 ? "Operations" : "Growth",
  createdAt: `2026-08-${String((index % 12) + 1).padStart(2, "0")}`,
  id: `pin-${index + 1}`,
  name: `Pinned row ${index + 1}`,
  owner: index % 2 === 0 ? "Platform" : "Product",
  priority: index % 3 === 0 ? "High" : "Normal",
  progress: (index + 1) * 7,
  region: index % 3 === 0 ? "East" : "West",
  status: index % 2 === 0 ? "Active" : "Review",
  team: index % 2 === 0 ? "Core" : "Experience",
  updatedAt: `2026-08-${String((index % 12) + 13).padStart(2, "0")}`,
}));

export function ColumnPinningFeature() {
  const { text } = usePlaygroundLocale();
  const tableRef = useRef<CominsTableRef<PinningRow>>(null);
  const savedLayoutRef = useRef<CominsColumnLayout | null>(null);
  const [narrow, setNarrow] = useState(false);
  const [layout, setLayout] = useState<CominsColumnLayout | null>(null);
  const columns = useMemo<Array<CominsTableColumn<PinningRow>>>(() => [
    { field: "name", label: text(defineLocalizedText("이름", "Name")), pinned: "left", sort: true, width: 180 },
    { field: "region", label: text(defineLocalizedText("지역", "Region")), sort: true, width: 140 },
    { field: "owner", label: text(defineLocalizedText("담당", "Owner")), sort: true, width: 160 },
    { field: "team", label: text(defineLocalizedText("팀", "Team")), sort: true, width: 160 },
    { field: "category", label: text(defineLocalizedText("분류", "Category")), sort: true, width: 160 },
    { field: "priority", label: text(defineLocalizedText("우선순위", "Priority")), sort: true, width: 130 },
    { field: "amount", label: text(defineLocalizedText("금액", "Amount")), sort: true, width: 140 },
    { field: "progress", label: text(defineLocalizedText("진행률", "Progress")), sort: true, width: 140 },
    { field: "createdAt", label: text(defineLocalizedText("생성일", "Created")), sort: true, width: 180 },
    { field: "updatedAt", label: text(defineLocalizedText("수정일", "Updated")), sort: true, width: 180 },
    { field: "status", label: text(defineLocalizedText("상태", "Status")), pinned: "right", sort: true, width: 140 },
    { field: "id", label: "ID", pinned: "right", width: 170 },
  ], [text]);

  return (
    <section className="feature-panel feature-panel--column-pinning">
      <FeatureSampleSection
        description={text(defineLocalizedText(
          "12개 고정 폭 Column으로 수평 Scroll과 left/right pin을 확인합니다. Scrollbar는 Summary 아래의 Table 최하단에 있고, 고정 block의 직접 Resize는 center 48px를 유지하는 범위로 제한됩니다.",
          "Twelve fixed-width Columns demonstrate horizontal scrolling and left/right pinning. The scrollbar follows Summary at the bottom of the Table, and direct pinned-block resize stops before consuming 48px of center space.",
        ))}
        id="column-pinning-responsive"
        title={text(defineLocalizedText("Responsive Column Pinning", "Responsive Column Pinning"))}
      >
        <FeatureControls
          actions={(
            <>
              <Button onClick={() => setNarrow((current) => !current)} variant="outline">
                {text(defineLocalizedText(narrow ? "넓게 보기" : "좁게 보기", narrow ? "Use wide container" : "Use narrow container"))}
              </Button>
              <Button
                onClick={() => {
                  savedLayoutRef.current = tableRef.current?.getColumnLayout() ?? null;
                  setLayout(savedLayoutRef.current);
                }}
                variant="outline"
              >
                {text(defineLocalizedText("Layout 저장", "Save layout"))}
              </Button>
              <Button
                disabled={!savedLayoutRef.current}
                onClick={() => savedLayoutRef.current && tableRef.current?.setColumnLayout(savedLayoutRef.current)}
                variant="outline"
              >
                {text(defineLocalizedText("Layout 복원", "Restore layout"))}
              </Button>
            </>
          )}
        />
        <pre className="state-output" data-testid="column-pinning-layout">
          {JSON.stringify(layout, null, 2)}
        </pre>
        <div className="column-pinning-table-shell" data-narrow={narrow ? "true" : undefined}>
          <CominsTable
            className="example-table"
            columns={columns}
            data={pinningRows}
            data-testid="column-pinning-viewport"
            getRowId={(row) => row.id}
            onChangeColumnLayout={setLayout}
            ref={tableRef}
            summary={{
              columns: {
                amount: "sum",
                name: { aggregate: "count", colSpan: 2 },
              },
            }}
            theme={{ density: "compact" }}
          />
        </div>
      </FeatureSampleSection>

      <FeatureSampleSection
        description={text(defineLocalizedText(
          "Pinned Header Group은 visible child 전체를 하나의 block으로 유지합니다. Group Row는 full-width 단일 Cell이므로 sticky fragment로 분리되지 않습니다.",
          "A pinned Header Group keeps all visible children in one block. Full-width Group Rows remain single cells and are not split into sticky fragments.",
        ))}
        id="column-pinning-grouped"
        title={text(defineLocalizedText("Header Group과 Row Grouping", "Header Group and Row Grouping"))}
      >
        <CominsTable
          className="example-table"
          columnGroups={[
            { children: ["name", "region"], id: "identity", label: text(defineLocalizedText("식별 정보", "Identity")), pinned: "left" },
          ]}
          columns={columns}
          data={pinningRows}
          data-testid="column-pinning-grouped-viewport"
          getRowId={(row) => row.id}
          rowGrouping={{
            expandedGroupIds: ["East", "West"],
            getGroupId: (group: { id: string }) => group.id,
            getGroupLabel: (group) => group.id,
            getRowGroupId: (row) => row.region,
            groups: [{ id: "East" }, { id: "West" }],
            onChangeExpandedGroupIds: () => undefined,
          }}
          theme={{ density: "compact" }}
        />
      </FeatureSampleSection>
    </section>
  );
}
