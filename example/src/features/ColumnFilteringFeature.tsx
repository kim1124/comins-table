import { useMemo, useState } from "react";

import {
  CominsTable,
  type CominsColumnFilterModel,
  type CominsRowId,
  type CominsTableColumn,
} from "../../../src";
import { FeatureSampleSection } from "../components/FeatureSampleSection";
import { defineLocalizedText, usePlaygroundLocale } from "../i18n/playground-locale";

type FilteringExampleRow = {
  active: boolean;
  amount: number;
  id: string;
  joinedAt: string;
  name: string;
  region: string;
  status: string;
};

type FilteringExampleGroup = {
  id: string;
  label: string;
};

const filteringRows: FilteringExampleRow[] = [
  { active: true, amount: 120, id: "filter-a", joinedAt: "2026-01-12", name: "Alpha", region: "east", status: "Active" },
  { active: false, amount: 80, id: "filter-b", joinedAt: "2026-02-03", name: "Beta", region: "west", status: "Review" },
  { active: true, amount: 210, id: "filter-c", joinedAt: "2026-02-18", name: "Gamma", region: "east", status: "Active" },
  { active: false, amount: 140, id: "filter-d", joinedAt: "2026-03-02", name: "Delta", region: "west", status: "Paused" },
  { active: true, amount: 95, id: "filter-e", joinedAt: "2026-03-15", name: "Epsilon", region: "west", status: "Active" },
  { active: true, amount: 180, id: "filter-f", joinedAt: "2026-04-09", name: "Zeta", region: "east", status: "Review" },
];

const filteringGroups: FilteringExampleGroup[] = [
  { id: "east", label: "East" },
  { id: "empty", label: "Empty" },
  { id: "west", label: "West" },
];

function getFilteringRowId(row: FilteringExampleRow) {
  return row.id;
}

function getFilteringGroupId(group: FilteringExampleGroup) {
  return group.id;
}

function getFilteringGroupLabel(group: FilteringExampleGroup) {
  return group.label;
}

function createLargeFilteringRows(count: number): FilteringExampleRow[] {
  return Array.from({ length: count }, (_value, index) => ({
    active: index % 2 === 0,
    amount: (index % 100) + 1,
    id: `filter-virtual-${index + 1}`,
    joinedAt: `2026-${String((index % 12) + 1).padStart(2, "0")}-01`,
    name: `Virtual filtered row ${index + 1}`,
    region: index % 2 === 0 ? "east" : "west",
    status: index % 3 === 0 ? "Active" : "Review",
  }));
}

export function ColumnFilteringFeature() {
  const { text } = usePlaygroundLocale();
  const [model, setModel] = useState<CominsColumnFilterModel>([]);
  const [openColumnId, setOpenColumnId] = useState<string | null>(null);
  const [groupedModel, setGroupedModel] = useState<CominsColumnFilterModel>([
    { columnId: "status", operator: "equals", value: "Active" },
  ]);
  const [groupedOpenColumnId, setGroupedOpenColumnId] = useState<string | null>(null);
  const [groups, setGroups] = useState(filteringGroups);
  const [expandedGroupIds, setExpandedGroupIds] = useState<CominsRowId[]>(["east", "empty", "west"]);
  const performanceFixture = useMemo(
    () => typeof window !== "undefined" && new URLSearchParams(window.location.search).get("fixture") === "large",
    [],
  );
  const largeRows = useMemo(() => performanceFixture ? createLargeFilteringRows(100_000) : [], [performanceFixture]);
  const [largeModel, setLargeModel] = useState<CominsColumnFilterModel>([
    { columnId: "amount", operator: "greaterThan", value: 98 },
  ]);
  const [largeOpenColumnId, setLargeOpenColumnId] = useState<string | null>(null);
  const columns = useMemo<Array<CominsTableColumn<FilteringExampleRow>>>(() => [
    {
      field: "name",
      filter: { kind: "text" },
      label: text(defineLocalizedText("이름", "Name")),
      minWidth: 150,
      sort: true,
    },
    {
      field: "amount",
      filter: { kind: "number" },
      label: text(defineLocalizedText("금액", "Amount")),
      minWidth: 120,
      sort: true,
    },
    {
      field: "joinedAt",
      filter: { kind: "date" },
      label: text(defineLocalizedText("등록일", "Joined")),
      minWidth: 140,
      sort: true,
    },
    {
      field: "active",
      filter: { kind: "boolean" },
      format: ({ value }) => value
        ? text(defineLocalizedText("활성", "Active"))
        : text(defineLocalizedText("비활성", "Inactive")),
      label: text(defineLocalizedText("활성 여부", "Enabled")),
      minWidth: 125,
      sort: true,
    },
    {
      field: "status",
      filter: { kind: "text" },
      label: text(defineLocalizedText("상태", "Status")),
      minWidth: 125,
      sort: true,
    },
  ], [text]);

  return (
    <section className="feature-panel feature-panel--column-filtering">
      <FeatureSampleSection
        description={text(defineLocalizedText(
          "각 Header의 Filter 버튼에서 text, number, UTC 날짜와 boolean 조건을 편집합니다. 여러 Column 조건은 AND로 결합됩니다.",
          "Edit text, number, UTC date, and boolean conditions from each Header Filter button. Rules across Columns use AND.",
        ))}
        id="column-filtering-controlled"
        title={text(defineLocalizedText("Controlled Column Filtering", "Controlled Column Filtering"))}
      >
        <pre className="state-output" data-testid="column-filtering-model">
          {JSON.stringify(model, null, 2)}
        </pre>
        <CominsTable
          className="example-table"
          columnFiltering={{
            model,
            onChangeModel: setModel,
            onChangeOpenColumnId: setOpenColumnId,
            openColumnId,
          }}
          columns={columns}
          data={filteringRows}
          data-testid="column-filtering-viewport"
          getRowId={getFilteringRowId}
          multiSort
          summary={{ columns: { amount: "sum", name: "count" } }}
          theme={{ density: "compact" }}
        />
      </FeatureSampleSection>

      <FeatureSampleSection
        description={text(defineLocalizedText(
          "Filter는 Group 위치와 빈 Group을 유지하면서 Group별 Row, count와 aggregate만 갱신합니다. Filter 설정 중 Row Drag는 비활성화됩니다.",
          "Filtering preserves Group positions and empty Groups while updating member Rows, counts, and aggregates. Row Drag is disabled while filtering is configured.",
        ))}
        id="column-filtering-grouping"
        title={text(defineLocalizedText("Row Grouping 결합", "Row Grouping integration"))}
      >
        <pre className="state-output" data-testid="column-filtering-grouped-model">
          {JSON.stringify(groupedModel, null, 2)}
        </pre>
        <CominsTable
          className="example-table"
          columnFiltering={{
            model: groupedModel,
            onChangeModel: setGroupedModel,
            onChangeOpenColumnId: setGroupedOpenColumnId,
            openColumnId: groupedOpenColumnId,
          }}
          columns={columns}
          data={filteringRows}
          data-testid="column-filtering-grouped-viewport"
          getRowId={getFilteringRowId}
          multiSort
          rowGrouping={{
            aggregations: { amount: "sum" },
            expandedGroupIds,
            getGroupId: getFilteringGroupId,
            getGroupLabel: getFilteringGroupLabel,
            getRowGroupId: (row) => row.region,
            groupDraggable: true,
            groups,
            onChangeExpandedGroupIds: setExpandedGroupIds,
            onChangeGroups: (nextGroups) => setGroups(nextGroups),
          }}
          theme={{ density: "compact" }}
        />
      </FeatureSampleSection>

      {performanceFixture ? (
        <FeatureSampleSection
          description={text(defineLocalizedText(
            "100000개 source Row를 Filter한 뒤에도 virtual DOM window를 제한합니다.",
            "Keep the virtual DOM window bounded after filtering 100000 source Rows.",
          ))}
          id="column-filtering-virtual"
          title={text(defineLocalizedText("100000 Row Filter 가상화", "100000-row Filter virtualization"))}
        >
          <div className="body-virtualization-table__event" data-testid="column-filtering-virtual-count">
            {`${largeRows.length} source rows`}
          </div>
          <CominsTable
            className="example-table"
            columnFiltering={{
              model: largeModel,
              onChangeModel: setLargeModel,
              onChangeOpenColumnId: setLargeOpenColumnId,
              openColumnId: largeOpenColumnId,
            }}
            columns={columns}
            data={largeRows}
            data-testid="column-filtering-virtual-viewport"
            getRowId={getFilteringRowId}
            rowGrouping={{
              aggregations: { amount: "sum" },
              expandedGroupIds: ["east", "empty", "west"],
              getGroupId: getFilteringGroupId,
              getGroupLabel: getFilteringGroupLabel,
              getRowGroupId: (row) => row.region,
              groups: filteringGroups,
            }}
            virtualized
          />
        </FeatureSampleSection>
      ) : null}
    </section>
  );
}
