import { useMemo, useState } from "react";

import {
  CominsTable,
  type CominsRowId,
  type CominsTableColumn,
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

const groupingRows: RowGroupingExampleRow[] = [
  { amount: 120, id: "group-a", name: "Alpha", region: "East", status: "Active", team: "Platform" },
  { amount: 80, id: "group-b", name: "Beta", region: "West", status: "Review", team: "Product" },
  { amount: 210, id: "group-c", name: "Gamma", region: "East", status: "Active", team: "Platform" },
  { amount: 140, id: "group-d", name: "Delta", region: "East", status: "Paused", team: "Product" },
  { amount: 95, id: "group-e", name: "Epsilon", region: "West", status: "Active", team: "Product" },
  { amount: 180, id: "group-f", name: "Zeta", region: "West", status: "Review", team: "Platform" },
  { amount: 160, id: "group-g", name: "Eta", region: "East", status: "Active", team: "Product" },
  { amount: 70, id: "group-h", name: "Theta", region: "West", status: "Paused", team: "Platform" },
];

const singleGroupingAggregations = { amount: "sum", status: "count" } as const;
const singleGroupingCriteria = ["region"] as const;
const nestedGroupingAggregations = { amount: "avg", status: "count" } as const;
const nestedGroupingCriteria = ["region", "team"] as const;

type VirtualGroupingRow = {
  amount: number;
  category: string;
  id: string;
  name: string;
};

function createVirtualGroupingRows(count: number): VirtualGroupingRow[] {
  return Array.from({ length: count }, (_value, index) => ({
    amount: (index % 100) + 1,
    category: "All rows",
    id: `grouping-virtual-${index + 1}`,
    name: `Virtual grouped row ${index + 1}`,
  }));
}

const virtualGroupingAggregations = { amount: "sum", id: "count" } as const;
const virtualGroupingCriteria = ["category"] as const;

function getRowGroupingExampleRowId(row: RowGroupingExampleRow) {
  return row.id;
}

function getVirtualGroupingRowId(row: VirtualGroupingRow) {
  return row.id;
}

export function RowGroupingFeature() {
  const { text } = usePlaygroundLocale();
  const [singleExpandedGroupIds, setSingleExpandedGroupIds] = useState<string[]>([]);
  const [nestedExpandedGroupIds, setNestedExpandedGroupIds] = useState<string[]>([]);
  const [expandedRowIds, setExpandedRowIds] = useState<readonly CominsRowId[]>([]);
  const [virtualExpandedGroupIds, setVirtualExpandedGroupIds] = useState<string[]>([]);
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
  const hiddenCriterionColumns = useMemo<Array<CominsTableColumn<RowGroupingExampleRow>>>(
    () => columns.map((column) => column.field === "region" ? { ...column, hidden: true } : column),
    [columns],
  );
  const virtualRows = useMemo(() => createVirtualGroupingRows(100_000), []);
  const virtualColumns = useMemo<Array<CominsTableColumn<VirtualGroupingRow>>>(
    () => [
      { field: "category", hidden: true, label: text(defineLocalizedText("그룹", "Group")), sort: true },
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
          "숨겨진 Region Column을 단일 기준으로 사용하고, group Row에서 전체 descendant 금액을 합산합니다.",
          "Use the hidden Region column as one criterion and sum every descendant amount in the group row.",
        ))}
        id="row-grouping-single"
        title={text(defineLocalizedText("단일 기준과 숨겨진 Column", "Single criterion and hidden column"))}
      >
        <FeatureControls
          actions={(
            <Button onClick={() => setSingleExpandedGroupIds([])} variant="outline">
              {text(defineLocalizedText("모든 Region 접기", "Collapse all regions"))}
            </Button>
          )}
        />
        <pre className="state-output" data-testid="row-grouping-single-state">
          {JSON.stringify(singleExpandedGroupIds, null, 2)}
        </pre>
        <CominsTable
          className="example-table"
          columns={hiddenCriterionColumns}
          data={groupingRows}
          data-testid="row-grouping-single-viewport"
          getRowId={getRowGroupingExampleRowId}
          multiSort
          rowGrouping={{
            aggregations: singleGroupingAggregations,
            criteria: singleGroupingCriteria,
            expandedGroupIds: singleExpandedGroupIds,
            onChangeExpandedGroupIds: setSingleExpandedGroupIds,
          }}
          theme={{ density: "compact" }}
        />
      </FeatureSampleSection>

      <FeatureSampleSection
        description={text(defineLocalizedText(
          "Region과 Team 순서로 hierarchy를 만들고, visible leaf Row에서만 Row Detail을 엽니다.",
          "Build a Region then Team hierarchy and open Row Detail only from visible leaf rows.",
        ))}
        id="row-grouping-nested"
        title={text(defineLocalizedText("다중 기준과 Row Detail", "Multiple criteria and Row Detail"))}
      >
        <FeatureControls
          actions={(
            <>
              <Button onClick={() => setNestedExpandedGroupIds([])} variant="outline">
                {text(defineLocalizedText("모든 Group 접기", "Collapse all groups"))}
              </Button>
              <Button onClick={() => setExpandedRowIds([])} variant="outline">
                {text(defineLocalizedText("모든 Detail 접기", "Collapse all Details"))}
              </Button>
            </>
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
            aggregations: nestedGroupingAggregations,
            criteria: nestedGroupingCriteria,
            expandedGroupIds: nestedExpandedGroupIds,
            onChangeExpandedGroupIds: setNestedExpandedGroupIds,
          }}
          theme={{ density: "compact" }}
        />
      </FeatureSampleSection>

      <FeatureSampleSection
        className="row-grouping-virtual-card"
        description={text(defineLocalizedText(
          "100000개 leaf를 한 Group에 배치합니다. Group을 펼쳐도 fixed-height virtual slot window만 DOM에 유지됩니다.",
          "Place 100000 leaves in one group. Expanding it keeps only the fixed-height virtual slot window in the DOM.",
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
            criteria: virtualGroupingCriteria,
            expandedGroupIds: virtualExpandedGroupIds,
            onChangeExpandedGroupIds: setVirtualExpandedGroupIds,
          }}
          rowHeight={36}
          virtualized
        />
      </FeatureSampleSection>
    </section>
  );
}
