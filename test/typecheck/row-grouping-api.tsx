import {
  CominsTable,
  createCominsTableState,
  moveCominsRowToGroup,
  type CominsRowGroupMoveOptions,
  type CominsRowGroupingConfig,
  type CominsTableProps,
} from "../../src";

type Group = {
  id: string;
  name: string;
};

type Row = {
  amount: number | null;
  groupId: string;
  id: string;
  region: string;
};

const columns = [
  { field: "region", label: "Region", sort: true },
  { field: "amount", label: "Amount", sort: true },
];

const groups: Group[] = [
  { id: "east", name: "East" },
  { id: "empty", name: "Empty" },
];

const grouping = {
  aggregations: {
    amount: "sum",
    id: "count",
  },
  expandedGroupIds: ["east"],
  getGroupId: (group: Group) => group.id,
  getGroupLabel: (group) => group.name,
  getGroupRowProps: ({ group, isEmpty }) => ({
    className: isEmpty ? "empty-group" : undefined,
    style: { color: group.id === "east" ? "#111827" : undefined },
  }),
  getRowGroupId: (row: Row) => row.groupId,
  groupDraggable: true,
  groups,
  onChangeExpandedGroupIds: (_ids) => undefined,
  onChangeGroups: (_groups, details) => {
    details.fromIndex satisfies number;
    details.toIndex satisfies number;
  },
  renderGroupContent: ({ group, groupIndex, rowCount }) =>
    `${groupIndex}:${group.name}:${rowCount}`,
  setRowGroupId: ({ row, toGroupId }) => ({
    ...row,
    groupId: String(toGroupId),
  }),
} satisfies CominsRowGroupingConfig<Row, Group>;

const rowMoveOptions = {
  getRowGroupId: (row: Row) => row.groupId,
  setRowGroupId: ({ row, toGroupId }) => ({ ...row, groupId: String(toGroupId) }),
  sourceRowId: "row-a",
  targetGroupId: "empty",
} satisfies CominsRowGroupMoveOptions<Row>;
const rowMoveState = createCominsTableState({ columns, rows: [] as Row[] });

moveCominsRowToGroup(rowMoveState, rowMoveOptions);

const ordinary = {
  columns,
  data: [],
  getRowId: (row) => row.id,
  infiniteScroll: true,
  onAfterDragRow: ({ reason, result, row, target }) => {
    reason satisfies string;
    result satisfies "cancelled" | "moved" | "rejected";
    row.data satisfies Row;
    target?.valid satisfies boolean | undefined;
  },
  onBeforeRowDrag: ({ row }) => row.data.groupId !== "locked",
  onLoadMore: () => undefined,
  onRowDrag: ({ row, target }) => {
    row.id satisfies string | number;
    target.valid satisfies boolean;
  },
  pagination: { pageSize: 10 },
  rowProps: { draggable: true },
} satisfies CominsTableProps<Row>;

void <CominsTable {...ordinary} />;

void (
  <CominsTable
    columns={columns}
    data={[] as Row[]}
    getRowId={(row) => row.id}
    isRowExpandable={() => true}
    renderRowDetail={({ row }) => row.data.region}
    rowGrouping={grouping}
    rowProps={{ draggable: true }}
  />
);

// @ts-expect-error Grouped tables do not accept pagination.
void <CominsTable columns={columns} data={[] as Row[]} pagination={{ pageSize: 10 }} rowGrouping={grouping} />;

// @ts-expect-error Grouped tables do not accept infinite loading.
void <CominsTable columns={columns} data={[] as Row[]} infiniteScroll onLoadMore={() => undefined} rowGrouping={grouping} />;

// @ts-expect-error Grouped tables do not accept lazy loading.
void <CominsTable columns={columns} data={[] as Row[]} lazyLoad onLazyLoad={() => undefined} rowGrouping={grouping} />;

// @ts-expect-error Tree tables do not accept Row Grouping.
void <CominsTable columns={columns} data={[] as Row[]} getRowId={(row) => row.id} rowGrouping={grouping} tree />;

const invalidGrouping: CominsRowGroupingConfig<Row, Group> = {
  // @ts-expect-error Custom reducer names are not supported.
  aggregations: { amount: "median" },
  getGroupId: (group) => group.id,
  getRowGroupId: (row) => row.groupId,
  groups,
};

void invalidGrouping;
