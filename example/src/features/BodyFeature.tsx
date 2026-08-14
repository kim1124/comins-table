import { useMemo, useState } from "react";

import {
  CominsTable,
  type CominsRowId,
  type CominsTableColumn,
  type CominsVirtualListItem,
} from "../../../src";
import { FeatureSampleSection } from "../components/FeatureSampleSection";
import { createVirtualRows, type PersonRow } from "../fixtures/people";
import { defineLocalizedText, usePlaygroundLocale } from "../i18n/playground-locale";

type ComponentLargeOverride = {
  active?: boolean;
  role?: string;
};

const componentLargeVirtualItems: CominsVirtualListItem[] = Array.from({ length: 1_000 }, (_value, index) => ({
  label: `Item ${index + 1}`,
  value: `item-${index + 1}`,
}));

export function BodyFeature() {
  const { locale, text } = usePlaygroundLocale();
  const roleOptions = useMemo(
    () => [
      { label: text(defineLocalizedText("소유자", "Owner")), value: "Owner" },
      { label: text(defineLocalizedText("편집자", "Editor")), value: "Editor" },
      { label: text(defineLocalizedText("조회자", "Viewer")), value: "Viewer" },
    ],
    [text],
  );
  const [rows] = useState<PersonRow[]>(() => createVirtualRows(100_000));
  const [componentOverrides, setComponentOverrides] = useState<Record<number, ComponentLargeOverride>>({});
  const [componentEvent, setComponentEvent] = useState<string | null>(null);
  const fixture = useMemo(
    () =>
      typeof window === "undefined"
        ? ""
        : new URLSearchParams(window.location.search).get("fixture") ?? "",
    [],
  );
  const detailEnabled = fixture === "row-detail-fixed" || fixture === "row-detail-auto";
  const automaticDetail = fixture === "row-detail-auto";
  const [expandedRowIds, setExpandedRowIds] = useState<CominsRowId[]>(
    detailEnabled ? [50_000] : [],
  );
  const [detailGrowth, setDetailGrowth] = useState(0);
  const useHeavyRenderer = fixture === "heavy-renderer";
  const columns = useMemo<Array<CominsTableColumn<PersonRow>>>(
    () => {
      const createCell = (columnNumber: number): CominsTableColumn<PersonRow>["cell"] =>
        useHeavyRenderer
          ? {
              renderer: ({ row }) => (
                <span className="body-virtualization-table__heavy-cell" data-testid="virtual-heavy-cell">
                  <strong>{`Data ${row.index + 1}`}</strong>
                  <span>{`Column ${columnNumber}`}</span>
                </span>
              ),
            }
          : {
              format: ({ row }) => `Data ${row.index + 1}`,
            };

      return [
        {
          cell: createCell(1),
          field: "name",
          label: "Column1",
          minWidth: 100,
          sort: true,
          width: 100,
        },
        {
          cell: createCell(2),
          field: "age",
          label: "Column2",
          minWidth: 100,
          sort: true,
          width: 100,
        },
        {
          cell: createCell(3),
          field: "role",
          label: "Column3",
          minWidth: 100,
          sort: true,
          width: 100,
        },
        {
          cell: createCell(4),
          field: "id",
          label: "Column4",
          minWidth: 100,
          width: 140,
        },
        {
          cell: createCell(5),
          field: "active",
          label: "Column5",
          minWidth: 100,
          width: 120,
        },
        {
          cell: createCell(6),
          field: "locked",
          label: "Column6",
          minWidth: 100,
          width: 160,
        },
        {
          cell: createCell(7),
          field: "role",
          id: "group",
          label: "Column7",
          minWidth: 100,
          width: 140,
        },
        {
          cell: createCell(8),
          field: "age",
          id: "score",
          label: "Column8",
          minWidth: 100,
          width: 120,
        },
        {
          cell: createCell(9),
          field: "active",
          id: "status",
          label: "Column9",
          minWidth: 100,
          width: 120,
        },
        {
          cell: createCell(10),
          field: "name",
          id: "memo",
          label: "Column10",
          minWidth: 100,
          width: 160,
        },
      ];
    },
    [useHeavyRenderer],
  );
  const componentColumns = useMemo<Array<CominsTableColumn<PersonRow>>>(
    () => [
      {
        cell: {
          format: ({ row }) => `Data ${row.index + 1}`,
        },
        field: "name",
        label: "Column1",
        minWidth: 100,
        width: 130,
      },
      {
        cell: {
          components: [
            {
              onCheckedChange: ({ checked, row }) => {
                setComponentOverrides((current) => ({
                  ...current,
                  [row.index]: { ...current[row.index], active: checked },
                }));
              },
              props: ({ row }) => ({
                "aria-label": `Data ${row.index + 1} checkbox`,
                checked: componentOverrides[row.index]?.active ?? row.index % 2 === 0,
                "data-testid": "component-large-checkbox",
              }),
              type: "checkbox",
            },
          ],
        },
        field: "active",
        label: "Column2",
        minWidth: 100,
        width: 130,
      },
      {
        cell: {
          components: [
            {
              onClick: ({ row }) => setComponentEvent(`Button: Data ${row.index + 1}`),
              props: ({ row }) => ({
                children: `Data ${row.index + 1}`,
                "data-testid": "component-large-button",
              }),
              type: "button",
            },
          ],
        },
        field: "name",
        id: "button",
        label: "Column3",
        minWidth: 120,
        width: 150,
      },
      {
        cell: {
          renderer: ({ row }) => {
            const value = componentOverrides[row.index]?.role ?? (row.index % 2 === 0 ? "Owner" : "Viewer");

            return (
              <select
                aria-label={`Data ${row.index + 1} select`}
                className="comins-table__component comins-table__component-select"
                data-testid="component-large-select"
                onChange={(event) => {
                  const nextValue = event.currentTarget.value;
                  setComponentOverrides((current) => ({
                    ...current,
                    [row.index]: { ...current[row.index], role: nextValue },
                  }));
                }}
                onClick={(event) => event.stopPropagation()}
                onKeyDown={(event) => event.stopPropagation()}
                onMouseDown={(event) => event.stopPropagation()}
                onPointerDown={(event) => event.stopPropagation()}
                value={value}
              >
                {roleOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            );
          },
        },
        field: "role",
        id: "select",
        label: "Column4",
        minWidth: 130,
        width: 150,
      },
      {
        cell: {
          components: [
            {
              props: ({ row }) => ({
                "aria-label": `Data ${row.index + 1} progress`,
                "data-testid": "component-large-progress",
                max: 100,
                value: row.index % 100,
              }),
              type: "progress",
            },
          ],
        },
        field: "age",
        id: "progress",
        label: "Column5",
        minWidth: 140,
        width: 160,
      },
      {
        cell: {
          components: [
            {
              items: componentLargeVirtualItems,
              props: {
                "aria-label": "Component large virtual list",
                height: 84,
                itemHeight: 28,
                limit: 3,
              },
              type: "virtual-list",
            },
          ],
        },
        field: "name",
        id: "virtual-list",
        label: "Column6",
        minWidth: 170,
        width: 200,
      },
      {
        cell: {
          components: [
            {
              onValueChange: ({ row, value }) => {
                setComponentOverrides((current) => ({
                  ...current,
                  [row.index]: { ...current[row.index], role: value },
                }));
              },
              options: roleOptions,
              props: ({ row }) => ({
                "aria-label": `Data ${row.index + 1} radio`,
                "data-testid": "component-large-radio",
                value: componentOverrides[row.index]?.role ?? (row.index % 2 === 0 ? "Owner" : "Viewer"),
              }),
              type: "radio",
            },
          ],
        },
        field: "role",
        id: "radio",
        label: "Column7",
        minWidth: 260,
        width: 280,
      },
    ],
    [componentOverrides, roleOptions],
  );

  return (
    <section className="feature-panel feature-panel--virtualization">
      <FeatureSampleSection
        description={text(defineLocalizedText(
          "대용량 데이터 10만 Row를 처음부터 로드하고 virtualized, 안정적인 getRowId, 전체 pageSize 계약으로 렌더링 Row 수가 제한되는지 확인합니다.",
          "Load 100,000 Rows up front and verify that virtualization, stable getRowId, and a full pageSize keep the rendered Row count bounded.",
        ))}
        id="body"
        title={text(defineLocalizedText("대용량 데이터 표시", "Large dataset rendering"))}
      >
        <CominsTable
          className="example-table body-virtualization-table"
          columns={columns}
          data={rows}
          data-testid="data-table-viewport"
          estimatedRowDetailHeight={detailEnabled ? 180 : undefined}
          expandedRowIds={detailEnabled ? expandedRowIds : undefined}
          getRowDetailHeight={detailEnabled ? () => (automaticDetail ? "auto" : 360) : undefined}
          getRowId={(_row, index) => index}
          multiSort
          onChangeExpandedRowIds={detailEnabled ? setExpandedRowIds : undefined}
          pagination={{ pageIndex: 0, pageSize: rows.length }}
          renderRowDetail={
            detailEnabled
              ? ({ row }) => (
                  <div
                    data-testid={`row-detail-perf-${automaticDetail ? "auto" : "fixed"}`}
                    style={{
                      display: "grid",
                      gap: 12,
                      maxHeight: 640,
                      overflow: "auto",
                    }}
                  >
                    <strong>
                      {locale === "ko"
                        ? `owner ${String(row.id)}의 성능 Detail`
                        : `Performance Detail for owner ${String(row.id)}`}
                    </strong>
                    <span>{text(defineLocalizedText(
                      "제한된 내용으로 owner Row를 확장하지 않고 mixed-height 가상화를 검증합니다.",
                      "Bounded content verifies mixed-height virtualization without expanding owner Rows.",
                    ))}</span>
                    {automaticDetail ? (
                      <button
                        data-testid="row-detail-perf-grow"
                        disabled={detailGrowth >= 4}
                        onClick={() => setDetailGrowth((current) => Math.min(4, current + 1))}
                        type="button"
                      >
                        {text(defineLocalizedText("측정형 Detail 늘리기", "Grow measured Detail"))}
                      </button>
                    ) : null}
                    {Array.from({ length: detailGrowth }, (_value, index) => (
                      <p
                        data-testid="row-detail-perf-grown-block"
                        key={index}
                        style={{ margin: 0, minHeight: 96 }}
                      >
                        {locale === "ko"
                          ? `제한된 측정형 content block ${index + 1}/4.`
                          : `Bounded measured content block ${index + 1} of 4.`}
                      </p>
                    ))}
                  </div>
                )
              : undefined
          }
          theme={{ density: "compact" }}
          virtualized
        />
      </FeatureSampleSection>
      <FeatureSampleSection
        description={text(defineLocalizedText(
          "컴포넌트 Cell이 포함된 10만 Row를 기본 buffer-size 10 기준으로 렌더링하고, 작은 override state로 상호작용 비용을 제한합니다.",
          "Render 100,000 Rows with Component Cells using the default buffer-size of 10 and keep interaction cost bounded with small override state.",
        ))}
        id="component-large-virtualization"
        title={text(defineLocalizedText("컴포넌트 기반 10만 행 가상 스크롤", "100,000-Row Component virtualization"))}
      >
        <p className="body-virtualization-table__event" data-testid="component-large-event">
          {componentEvent ?? text(defineLocalizedText("컴포넌트 대용량 이벤트 대기", "Waiting for a large Component event"))}
        </p>
        <CominsTable
          className="example-table body-virtualization-table component-large-virtualization-table"
          columns={componentColumns}
          data={rows}
          data-testid="data-table-viewport-component-large"
          getRowId={(_row, index) => index}
          pagination={{ pageIndex: 0, pageSize: rows.length }}
          rowHeight={112}
          theme={{ density: "compact" }}
          virtualized
        />
      </FeatureSampleSection>
    </section>
  );
}
