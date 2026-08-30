import { useMemo, useRef, useState, type CSSProperties, type ReactNode } from "react";

import {
  CominsTable,
  createCominsTableTransferCoordinator,
  type CominsColumnFilterModel,
  type CominsRowId,
  type CominsTableColumn,
  type CominsTableRef,
  type CominsTreeNode,
} from "../../../src";

type ReadmeFeatureId =
  | "column-filtering"
  | "column-pinning"
  | "cross-table-drag"
  | "row-grouping"
  | "table-overview"
  | "tree-grid";

type PreviewGroup = {
  id: string;
  label: string;
};

type PreviewRow = {
  amount: number;
  category: string;
  createdAt: string;
  groupId: string;
  id: string;
  name: string;
  owner: string;
  priority: string;
  progress: number;
  region: string;
  status: string;
  team: string;
};

const featureOrder: readonly ReadmeFeatureId[] = [
  "table-overview",
  "column-pinning",
  "row-grouping",
  "column-filtering",
  "tree-grid",
  "cross-table-drag",
];

const featureCopy: Record<ReadmeFeatureId, { description: string; label: string; title: string }> = {
  "column-filtering": {
    description: "Apply controlled Header filters while explicit Groups and Summary values update in place.",
    label: "Filtering",
    title: "Controlled Column Filtering",
  },
  "column-pinning": {
    description: "Scroll wide data while left and right Columns stay aligned across Header, Body, and Summary.",
    label: "Pinning",
    title: "Responsive Column Pinning",
  },
  "table-overview": {
    description: "Sort, move, select, and summarize application-owned Rows with one controlled React Table.",
    label: "Table",
    title: "Controlled Data Table",
  },
  "tree-grid": {
    description: "Expand hierarchical Rows while renderers, Summary values, and controlled data stay aligned.",
    label: "Tree",
    title: "Tree Grid and Summary",
  },
  "cross-table-drag": {
    description: "Move complete Group bundles between controlled Tables and reject duplicate Row IDs with feedback.",
    label: "Transfer",
    title: "Cross-Table Row and Group Drag",
  },
  "row-grouping": {
    description: "Keep ordered and empty Groups in application state while Group and Row drag update the models.",
    label: "Grouping",
    title: "Application-Owned Row Grouping",
  },
};

const baseRows: PreviewRow[] = [
  { amount: 120, category: "Operations", createdAt: "2026-08-02", groupId: "platform", id: "record-a", name: "Alpha", owner: "Core", priority: "High", progress: 82, region: "East", status: "Active", team: "Platform" },
  { amount: 80, category: "Growth", createdAt: "2026-08-04", groupId: "experience", id: "record-b", name: "Beta", owner: "Product", priority: "Normal", progress: 64, region: "West", status: "Review", team: "Experience" },
  { amount: 210, category: "Operations", createdAt: "2026-08-06", groupId: "platform", id: "record-c", name: "Gamma", owner: "Core", priority: "High", progress: 93, region: "East", status: "Active", team: "Platform" },
  { amount: 140, category: "Growth", createdAt: "2026-08-08", groupId: "experience", id: "record-d", name: "Delta", owner: "Product", priority: "Normal", progress: 48, region: "West", status: "Paused", team: "Experience" },
  { amount: 95, category: "Operations", createdAt: "2026-08-10", groupId: "platform", id: "record-e", name: "Epsilon", owner: "Core", priority: "Normal", progress: 71, region: "East", status: "Active", team: "Platform" },
  { amount: 180, category: "Growth", createdAt: "2026-08-12", groupId: "experience", id: "record-f", name: "Zeta", owner: "Product", priority: "High", progress: 55, region: "West", status: "Review", team: "Experience" },
];

const previewGroups: PreviewGroup[] = [
  { id: "platform", label: "Platform" },
  { id: "empty", label: "Unassigned" },
  { id: "experience", label: "Experience" },
];

function getGroupId(group: PreviewGroup) {
  return group.id;
}

function getGroupLabel(group: PreviewGroup) {
  return group.label;
}

function getRowId(row: PreviewRow) {
  return row.id;
}

function resolveInitialFeature(): ReadmeFeatureId {
  if (typeof window === "undefined") return "table-overview";
  const feature = new URLSearchParams(window.location.search).get("feature");
  return featureOrder.includes(feature as ReadmeFeatureId)
    ? feature as ReadmeFeatureId
    : "table-overview";
}

function TableOverviewDemo() {
  const [rows, setRows] = useState(baseRows);
  const columns = useMemo<Array<CominsTableColumn<PreviewRow>>>(() => [
    { field: "name", label: "Name", minWidth: 170, sort: true },
    { field: "team", label: "Team", minWidth: 145, sort: true },
    { field: "amount", label: "Amount", minWidth: 125, sort: true },
    {
      cell: { format: ({ value }) => `${String(value)}%` },
      field: "progress",
      label: "Progress",
      minWidth: 125,
      sort: true,
    },
    { field: "status", label: "Status", minWidth: 130, sort: true },
  ], []);

  return (
    <CominsTable
      className="readme-demo__table"
      columns={columns}
      data={rows}
      data-testid="readme-demo-table-overview-table"
      getRowId={getRowId}
      multiSort
      onChangeData={setRows}
      rowProps={{ draggable: true }}
      summary={{
        columns: {
          amount: "sum",
          name: { aggregate: "count", colSpan: 2 },
          progress: "avg",
        },
      }}
      theme={{ density: "compact" }}
    />
  );
}

function createOverviewTree(): Array<CominsTreeNode<PreviewRow>> {
  return [
    {
      children: [
        { item: baseRows[0] },
        { item: baseRows[2] },
        { item: baseRows[4] },
      ],
      item: { ...baseRows[0], id: "tree-platform", name: "Platform portfolio", team: "Core" },
    },
    {
      children: [
        { item: baseRows[1] },
        { item: baseRows[3] },
        { item: baseRows[5] },
      ],
      item: { ...baseRows[1], id: "tree-experience", name: "Experience portfolio", team: "Product" },
    },
  ];
}

function TreeGridOverviewDemo() {
  const tableRef = useRef<CominsTableRef<PreviewRow>>(null);
  const [rows, setRows] = useState(createOverviewTree);
  const columns = useMemo<Array<CominsTableColumn<PreviewRow>>>(() => [
    {
      cell: {
        renderer: ({ row, value }) => (
          <span className="readme-demo__tree-label">
            <strong>{String(value)}</strong>
            <small>{row.data.team}</small>
          </span>
        ),
      },
      field: "name",
      label: "Node",
      minWidth: 280,
      sort: true,
    },
    { field: "amount", label: "Amount", minWidth: 130, sort: true },
    { field: "progress", label: "Progress", minWidth: 130, sort: true },
    { field: "status", label: "Status", minWidth: 140, sort: true },
  ], []);

  return (
    <div className="readme-demo__tree-grid">
      <div className="readme-demo__tree-controls">
        <button onClick={() => tableRef.current?.expand()} type="button">Expand all</button>
        <button onClick={() => tableRef.current?.fold()} type="button">Fold all</button>
      </div>
      <CominsTable
        ref={tableRef}
        className="readme-demo__table"
        columns={columns}
        data={rows}
        data-testid="readme-demo-tree-grid-table"
        defaultExpandAll={false}
        getRowId={getRowId}
        onChangeData={setRows}
        summary={{ columns: { amount: "sum", name: { aggregate: () => "Leaves", colSpan: 2 }, progress: "avg" } }}
        theme={{ density: "compact" }}
        tree
      />
    </div>
  );
}

function ColumnPinningDemo() {
  const columns = useMemo<Array<CominsTableColumn<PreviewRow>>>(() => [
    { field: "name", label: "Name", pinned: "left", sort: true, width: 170 },
    { field: "region", label: "Region", sort: true, width: 130 },
    { field: "owner", label: "Owner", sort: true, width: 150 },
    { field: "team", label: "Team", sort: true, width: 150 },
    { field: "category", label: "Category", sort: true, width: 155 },
    { field: "priority", label: "Priority", sort: true, width: 125 },
    { field: "amount", label: "Amount", sort: true, width: 130 },
    { field: "progress", label: "Progress", sort: true, width: 130 },
    { field: "createdAt", label: "Created", sort: true, width: 160 },
    { field: "status", label: "Status", pinned: "right", sort: true, width: 135 },
  ], []);

  return (
    <CominsTable
      className="readme-demo__table"
      columns={columns}
      data={baseRows}
      data-testid="readme-demo-column-pinning-table"
      getRowId={getRowId}
      summary={{
        columns: {
          amount: "sum",
          name: { aggregate: "count", colSpan: 2 },
        },
      }}
      theme={{ density: "compact" }}
    />
  );
}

function RowGroupingDemo() {
  const [rows, setRows] = useState(baseRows);
  const [groups, setGroups] = useState(previewGroups);
  const [expandedGroupIds, setExpandedGroupIds] = useState<CominsRowId[]>([
    "platform",
    "empty",
    "experience",
  ]);
  const columns = useMemo<Array<CominsTableColumn<PreviewRow>>>(() => [
    { field: "name", label: "Name", minWidth: 170, sort: true },
    { field: "team", label: "Team", minWidth: 145, sort: true },
    { field: "amount", label: "Amount", minWidth: 120, sort: true },
    { field: "status", label: "Status", minWidth: 130, sort: true },
  ], []);

  return (
    <CominsTable
      className="readme-demo__table"
      columns={columns}
      data={rows}
      data-testid="readme-demo-row-grouping-table"
      getRowId={getRowId}
      onChangeData={setRows}
      rowGrouping={{
        aggregations: { amount: "sum", status: "count" },
        expandedGroupIds,
        getGroupId,
        getGroupLabel,
        getGroupRowProps: ({ group, isEmpty }) => ({
          className: "readme-demo__group-row",
          style: {
            "--comins-table-group-row-background": isEmpty
              ? "#e2e8f0"
              : group.id === "platform"
                ? "#cbd5e1"
                : "#dbeafe",
            "--comins-table-group-row-color": "#0f172a",
          } as CSSProperties,
        }),
        getRowGroupId: (row) => row.groupId,
        groupDraggable: true,
        groups,
        onChangeExpandedGroupIds: setExpandedGroupIds,
        onChangeGroups: (nextGroups) => setGroups(nextGroups),
        renderGroupContent: ({ aggregateValues, group, groupIndex, rowCount }) => (
          <span className="readme-demo__group-content">
            <strong>{`${groupIndex + 1}. ${group.label}`}</strong>
            <span>{`${rowCount} rows`}</span>
            <span>{`Total ${String(aggregateValues.amount ?? 0)}`}</span>
          </span>
        ),
        setRowGroupId: ({ row, toGroupId }) => ({ ...row, groupId: String(toGroupId) }),
      }}
      rowProps={{ draggable: true }}
      theme={{ density: "compact" }}
    />
  );
}

function ColumnFilteringDemo() {
  const [model, setModel] = useState<CominsColumnFilterModel>([]);
  const [openColumnId, setOpenColumnId] = useState<string | null>(null);
  const [expandedGroupIds, setExpandedGroupIds] = useState<CominsRowId[]>([
    "platform",
    "empty",
    "experience",
  ]);
  const columns = useMemo<Array<CominsTableColumn<PreviewRow>>>(() => [
    { field: "name", filter: { kind: "text" }, label: "Name", minWidth: 160, sort: true },
    { field: "amount", filter: { kind: "number" }, label: "Amount", minWidth: 120, sort: true },
    { field: "createdAt", filter: { kind: "date" }, label: "Created", minWidth: 140, sort: true },
    { field: "status", filter: { kind: "text" }, label: "Status", minWidth: 130, sort: true },
  ], []);

  return (
    <CominsTable
      className="readme-demo__table"
      columnFiltering={{
        model,
        onChangeModel: setModel,
        onChangeOpenColumnId: setOpenColumnId,
        openColumnId,
      }}
      columns={columns}
      data={baseRows}
      data-testid="readme-demo-column-filtering-table"
      getRowId={getRowId}
      rowGrouping={{
        aggregations: { amount: "sum" },
        expandedGroupIds,
        getGroupId,
        getGroupLabel,
        getRowGroupId: (row) => row.groupId,
        groups: previewGroups,
        onChangeExpandedGroupIds: setExpandedGroupIds,
      }}
      summary={{ columns: { amount: "sum", name: "count" } }}
      theme={{ density: "compact" }}
    />
  );
}

const transferColumns: Array<CominsTableColumn<PreviewRow>> = [
  { field: "name", label: "Name", minWidth: 135 },
  { field: "status", label: "Status", minWidth: 100 },
];

const leftTransferGroups: PreviewGroup[] = [
  { id: "platform", label: "Platform" },
  { id: "review", label: "Review Queue" },
  { id: "left-empty", label: "Unassigned" },
];

const rightTransferGroups: PreviewGroup[] = [
  { id: "experience", label: "Experience" },
  { id: "right-empty", label: "Inbox" },
];

const leftTransferRows: PreviewRow[] = [
  { ...baseRows[0], groupId: "platform", id: "transfer-alpha", name: "Alpha bundle" },
  { ...baseRows[1], groupId: "review", id: "shared", name: "Shared from left" },
];

const rightTransferRows: PreviewRow[] = [
  { ...baseRows[2], groupId: "experience", id: "transfer-beta", name: "Beta row" },
  { ...baseRows[3], groupId: "experience", id: "shared", name: "Shared from right" },
];

function CrossTableDragDemo() {
  const [leftRows, setLeftRows] = useState(leftTransferRows);
  const [rightRows, setRightRows] = useState(rightTransferRows);
  const [leftGroups, setLeftGroups] = useState(leftTransferGroups);
  const [rightGroups, setRightGroups] = useState(rightTransferGroups);
  const [coordinator] = useState(() => createCominsTableTransferCoordinator<PreviewRow, PreviewGroup>({
    onTransfer: (result) => {
      const sourceIsLeft = result.source.tableId === "readme-transfer-left";
      const targetIsLeft = result.target.tableId === "readme-transfer-left";

      (sourceIsLeft ? setLeftRows : setRightRows)(result.source.data);
      (sourceIsLeft ? setLeftGroups : setRightGroups)(result.source.groups ?? []);
      (targetIsLeft ? setLeftRows : setRightRows)(result.target.data);
      (targetIsLeft ? setLeftGroups : setRightGroups)(result.target.groups ?? []);
    },
  }));
  const grouping = (groups: PreviewGroup[]) => ({
    expandedGroupIds: groups.map((group) => group.id),
    getGroupId,
    getGroupLabel,
    getRowGroupId: (row: PreviewRow) => row.groupId,
    groupDraggable: true,
    groups,
    onChangeExpandedGroupIds: () => undefined,
    setRowGroupId: ({ row, toGroupId }: { row: PreviewRow; toGroupId: CominsRowId }) => ({
      ...row,
      groupId: String(toGroupId),
    }),
  });
  const transfer = (tableId: string) => ({
    coordinator,
    rejectionFeedback: {
      duration: 3000,
      renderTooltip: () => (
        <>
          <strong>Duplicate ID</strong>
          <span>The target already owns this Row.</span>
        </>
      ),
    },
    scope: "readme-transfer",
    tableId,
  } as const);

  return (
    <div className="readme-demo__transfer-grid">
      <section>
        <strong>Source Table</strong>
        <CominsTable
          className="readme-demo__transfer-table"
          columns={transferColumns}
          data={leftRows}
          data-testid="readme-demo-transfer-left"
          getRowId={getRowId}
          rowGrouping={grouping(leftGroups)}
          rowProps={{ draggable: true }}
          tableTransfer={transfer("readme-transfer-left")}
          theme={{ density: "compact" }}
        />
      </section>
      <section>
        <strong>Target Table</strong>
        <CominsTable
          className="readme-demo__transfer-table"
          columns={transferColumns}
          data={rightRows}
          data-testid="readme-demo-transfer-right"
          getRowId={getRowId}
          rowGrouping={grouping(rightGroups)}
          rowProps={{ draggable: true }}
          tableTransfer={transfer("readme-transfer-right")}
          theme={{ density: "compact" }}
        />
      </section>
    </div>
  );
}

const featureDemos: Record<ReadmeFeatureId, () => ReactNode> = {
  "column-filtering": ColumnFilteringDemo,
  "column-pinning": ColumnPinningDemo,
  "cross-table-drag": CrossTableDragDemo,
  "row-grouping": RowGroupingDemo,
  "table-overview": TableOverviewDemo,
  "tree-grid": TreeGridOverviewDemo,
};

export function ReadmeDemoPage() {
  const [feature, setFeature] = useState<ReadmeFeatureId>(resolveInitialFeature);
  const copy = featureCopy[feature];
  const FeatureDemo = featureDemos[feature];

  return (
    <section className="readme-demo" data-feature={feature} data-testid="readme-demo">
      <header className="readme-demo__header">
        <div>
          <p className="readme-demo__eyebrow">Comins Table 0.1.9</p>
          <h1>{copy.title}</h1>
          <p>{copy.description}</p>
        </div>
        <div aria-label="README feature preview" className="readme-demo__view-switch" role="group">
          {featureOrder.map((featureId) => (
            <button
              aria-pressed={feature === featureId}
              data-testid={`readme-demo-view-${featureId}`}
              key={featureId}
              onClick={() => setFeature(featureId)}
              type="button"
            >
              {featureCopy[featureId].label}
            </button>
          ))}
        </div>
      </header>

      <div className="readme-demo__surface" data-testid={`readme-demo-${feature}`}>
        <FeatureDemo />
      </div>
    </section>
  );
}
