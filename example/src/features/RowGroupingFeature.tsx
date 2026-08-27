import { useMemo, useRef, useState, type CSSProperties } from "react";

import {
  CominsTable,
  type CominsRowId,
  type CominsTableColumn,
  type CominsTableRef,
} from "../../../src";
import { FeatureControls } from "../components/FeatureControls";
import { FeatureSampleSection } from "../components/FeatureSampleSection";
import { Button } from "../components/ui/button";
import { defineLocalizedText, usePlaygroundLocale } from "../i18n/playground-locale";

type RowGroupingExampleRow = {
  amount: number;
  id: string;
  name: string;
  region: string;
  status: string;
  team: string;
};

type ExampleGroup = {
  id: string;
  label: string;
};

const initialGroupingRows: RowGroupingExampleRow[] = [
  { amount: 120, id: "group-a", name: "Alpha", region: "east", status: "Active", team: "platform" },
  { amount: 80, id: "group-b", name: "Beta", region: "west", status: "Review", team: "product" },
  { amount: 210, id: "group-c", name: "Gamma", region: "east", status: "Active", team: "platform" },
  { amount: 140, id: "group-d", name: "Delta", region: "east", status: "Paused", team: "product" },
  { amount: 95, id: "group-e", name: "Epsilon", region: "west", status: "Active", team: "product" },
  { amount: 180, id: "group-f", name: "Zeta", region: "west", status: "Review", team: "platform" },
  { amount: 160, id: "group-g", name: "Eta", region: "east", status: "Active", team: "product" },
  { amount: 70, id: "group-h", name: "Theta", region: "west", status: "Paused", team: "platform" },
];

const initialRegionGroups: ExampleGroup[] = [
  { id: "east", label: "East" },
  { id: "empty", label: "Empty" },
  { id: "west", label: "West" },
];

const initialTeamGroups: ExampleGroup[] = [
  { id: "product", label: "Product" },
  { id: "platform", label: "Platform" },
  { id: "unassigned", label: "Unassigned" },
];

const singleGroupingAggregations = { amount: "sum", status: "count" } as const;
const customGroupingAggregations = { amount: "avg", status: "count" } as const;

type VirtualGroupingRow = {
  amount: number;
  id: string;
  name: string;
};

function createVirtualGroupingRows(count: number): VirtualGroupingRow[] {
  return Array.from({ length: count }, (_value, index) => ({
    amount: (index % 100) + 1,
    id: `grouping-virtual-${index + 1}`,
    name: `Virtual grouped row ${index + 1}`,
  }));
}

const virtualGroupingAggregations = { amount: "sum", id: "count" } as const;
const virtualGroups: ExampleGroup[] = [{ id: "all", label: "All rows" }];

function getExampleGroupId(group: ExampleGroup) {
  return group.id;
}

function getExampleGroupLabel(group: ExampleGroup) {
  return group.label;
}

function getRowGroupingExampleRowId(row: RowGroupingExampleRow) {
  return row.id;
}

function getVirtualGroupingRowId(row: VirtualGroupingRow) {
  return row.id;
}

export function RowGroupingFeature() {
  const { text } = usePlaygroundLocale();
  const tableRef = useRef<CominsTableRef<RowGroupingExampleRow>>(null);
  const [groupingRows, setGroupingRows] = useState(initialGroupingRows);
  const [regionGroups, setRegionGroups] = useState(initialRegionGroups);
  const [singleExpandedGroupIds, setSingleExpandedGroupIds] = useState<CominsRowId[]>([]);
  const [teamGroups, setTeamGroups] = useState(initialTeamGroups);
  const [customExpandedGroupIds, setCustomExpandedGroupIds] = useState<CominsRowId[]>([]);
  const [expandedRowIds, setExpandedRowIds] = useState<readonly CominsRowId[]>([]);
  const [virtualExpandedGroupIds, setVirtualExpandedGroupIds] = useState<CominsRowId[]>([]);
  const columns = useMemo<Array<CominsTableColumn<RowGroupingExampleRow>>>(
    () => [
      { field: "name", label: text(defineLocalizedText("이름", "Name")), minWidth: 180, sort: true },
      { field: "region", label: text(defineLocalizedText("지역", "Region")), minWidth: 130, sort: true },
      { field: "team", label: text(defineLocalizedText("팀", "Team")), minWidth: 140, sort: true },
      { field: "amount", label: text(defineLocalizedText("금액", "Amount")), minWidth: 120, sort: true },
      { field: "status", label: text(defineLocalizedText("상태", "Status")), minWidth: 130, sort: true },
    ],
    [text],
  );
  const virtualRows = useMemo(() => createVirtualGroupingRows(100_000), []);
  const virtualColumns = useMemo<Array<CominsTableColumn<VirtualGroupingRow>>>(
    () => [
      { field: "name", label: text(defineLocalizedText("이름", "Name")), minWidth: 260, sort: true },
      { field: "amount", label: text(defineLocalizedText("금액", "Amount")), minWidth: 140, sort: true },
      { field: "id", label: text(defineLocalizedText("ID", "ID")), minWidth: 220 },
    ],
    [text],
  );

  return (
    <section className="feature-panel feature-panel--row-grouping">
      <FeatureSampleSection
        description={text(defineLocalizedText(
          "빈 Group을 포함한 controlled Group 배열이 실제 위치를 소유합니다. Group과 Row handle로 모델 순서를 변경할 수 있습니다.",
          "A controlled Group array owns the actual positions, including empty Groups. Group and Row handles update the models.",
        ))}
        id="row-grouping-single"
        title={text(defineLocalizedText("Explicit Group 모델과 Drag", "Explicit Group model and Drag"))}
      >
        <FeatureControls
          actions={(
            <>
              <Button onClick={() => tableRef.current?.expandGroups()} variant="outline">
                {text(defineLocalizedText("모든 Group 펼치기", "Expand all groups"))}
              </Button>
              <Button onClick={() => tableRef.current?.foldGroups()} variant="outline">
                {text(defineLocalizedText("모든 Group 접기", "Collapse all groups"))}
              </Button>
              <Button
                onClick={() => setRegionGroups((current) => current.some((group) => group.id === "archived")
                  ? current
                  : [...current, { id: "archived", label: "Archived" }])}
                variant="outline"
              >
                {text(defineLocalizedText("빈 Group 추가", "Add empty group"))}
              </Button>
              <Button
                onClick={() => setRegionGroups((current) => current.map((group) =>
                  group.id === "empty" ? { ...group, label: group.label === "Empty" ? "Renamed" : "Empty" } : group))}
                variant="outline"
              >
                {text(defineLocalizedText("빈 Group 이름 변경", "Rename empty group"))}
              </Button>
              <Button
                onClick={() => setRegionGroups((current) => current.filter((group) => group.id !== "archived"))}
                variant="outline"
              >
                {text(defineLocalizedText("추가 Group 삭제", "Delete added group"))}
              </Button>
            </>
          )}
        />
        <pre className="state-output" data-testid="row-grouping-single-state">
          {JSON.stringify(singleExpandedGroupIds, null, 2)}
        </pre>
        <pre className="state-output" data-testid="row-grouping-single-groups">
          {JSON.stringify(regionGroups.map((group) => group.id), null, 2)}
        </pre>
        <CominsTable
          className="example-table"
          columns={columns}
          data={groupingRows}
          data-testid="row-grouping-single-viewport"
          getRowId={getRowGroupingExampleRowId}
          multiSort
          onChangeData={setGroupingRows}
          ref={tableRef}
          rowGrouping={{
            aggregations: singleGroupingAggregations,
            expandedGroupIds: singleExpandedGroupIds,
            getGroupId: getExampleGroupId,
            getGroupLabel: getExampleGroupLabel,
            getRowGroupId: (row) => row.region,
            groupDraggable: true,
            groups: regionGroups,
            onChangeExpandedGroupIds: setSingleExpandedGroupIds,
            onChangeGroups: (nextGroups) => setRegionGroups(nextGroups),
            setRowGroupId: ({ row, toGroupId }) => ({ ...row, region: String(toGroupId) }),
          }}
          rowProps={{ draggable: true }}
          theme={{ density: "compact" }}
        />
      </FeatureSampleSection>

      <FeatureSampleSection
        description={text(defineLocalizedText(
          "Group shell, disclosure와 Drag handle은 Table이 유지하고 typed Row style과 custom content가 배경, label, count, aggregate와 업무 action을 렌더링합니다.",
          "The Table keeps the Group shell, disclosure, and Drag handle while typed Row styles and custom content render backgrounds, labels, counts, aggregates, and business actions.",
        ))}
        id="row-grouping-nested"
        title={text(defineLocalizedText("Custom Group content/style과 Row Detail", "Custom Group content/style and Row Detail"))}
      >
        <FeatureControls
          actions={(
            <Button onClick={() => setExpandedRowIds([])} variant="outline">
              {text(defineLocalizedText("모든 Detail 접기", "Collapse all Details"))}
            </Button>
          )}
        />
        <CominsTable
          className="example-table"
          columns={columns}
          data={groupingRows}
          data-testid="row-grouping-nested-viewport"
          expandedRowIds={expandedRowIds}
          getRowId={getRowGroupingExampleRowId}
          multiSort
          onChangeExpandedRowIds={setExpandedRowIds}
          renderRowDetail={({ row }) => (
            <div data-testid={`row-grouping-detail-${row.id}`} style={{ display: "grid", gap: 6, padding: 12 }}>
              <strong>{row.data.name}</strong>
              <span>{`${row.data.region} / ${row.data.team} / ${row.data.status}`}</span>
            </div>
          )}
          rowGrouping={{
            aggregations: customGroupingAggregations,
            expandedGroupIds: customExpandedGroupIds,
            getGroupId: getExampleGroupId,
            getGroupLabel: getExampleGroupLabel,
            getGroupRowProps: ({ group, isEmpty }) => ({
              className: "row-grouping-custom-group-row",
              style: {
                "--comins-table-group-row-background": isEmpty
                  ? "#e2e8f0"
                  : group.id === "product"
                    ? "#cbd5e1"
                    : "#dbeafe",
                "--comins-table-group-row-color": "#0f172a",
              } as CSSProperties,
            }),
            getRowGroupId: (row) => row.team,
            groups: teamGroups,
            onChangeExpandedGroupIds: setCustomExpandedGroupIds,
            renderGroupContent: ({ aggregateValues, group, groupIndex, rowCount }) => (
              <span data-testid={`custom-group-content-${group.id}`}>
                <strong>{`${groupIndex + 1}. ${group.label}`}</strong>
                {` · ${rowCount} Rows · Avg ${String(aggregateValues.amount ?? "-")}`}
                <button
                  data-testid={`rename-group-${group.id}`}
                  onClick={() => setTeamGroups((current) => current.map((candidate) =>
                    candidate.id === group.id ? { ...candidate, label: `${candidate.label}*` } : candidate))}
                  type="button"
                >
                  {text(defineLocalizedText("이름 변경", "Rename"))}
                </button>
              </span>
            ),
          }}
          theme={{ density: "compact" }}
        />
      </FeatureSampleSection>

      <FeatureSampleSection
        className="row-grouping-virtual-card"
        description={text(defineLocalizedText(
          "100000개 leaf를 explicit Group 하나에 배치합니다. Group을 펼쳐도 fixed-height virtual slot window만 DOM에 유지됩니다.",
          "Place 100000 leaves in one explicit Group. Expanding it keeps only the fixed-height virtual slot window in the DOM.",
        ))}
        id="row-grouping-virtual"
        title={text(defineLocalizedText("100000 Row 가상화", "100000-row virtualization"))}
      >
        <div className="body-virtualization-table__event" data-testid="row-grouping-virtual-count">
          {text(defineLocalizedText("100000개 leaf", "100000 leaves"))}
        </div>
        <CominsTable
          buffer-size={4}
          className="example-table row-grouping-virtual-table"
          columns={virtualColumns}
          data={virtualRows}
          data-testid="row-grouping-virtual-viewport"
          getRowId={getVirtualGroupingRowId}
          rowGrouping={{
            aggregations: virtualGroupingAggregations,
            expandedGroupIds: virtualExpandedGroupIds,
            getGroupId: getExampleGroupId,
            getGroupLabel: getExampleGroupLabel,
            getRowGroupId: () => "all",
            groups: virtualGroups,
            onChangeExpandedGroupIds: setVirtualExpandedGroupIds,
          }}
          rowHeight={36}
          virtualized
        />
      </FeatureSampleSection>
    </section>
  );
}
