import {
  CominsTable,
  type CominsColumnFilteringConfig,
  type CominsRowGroupingConfig,
  type CominsTableColumn,
} from "../../src";

type Row = {
  active: boolean;
  amount: number;
  createdAt: Date;
  groupId: string;
  id: string;
  name: string;
};

type Group = { id: string; label: string };

const rows: Row[] = [];
const columns = [
  { field: "name", filter: { kind: "text" }, label: "Name" },
  { field: "amount", filter: { kind: "number" }, label: "Amount" },
  { field: "createdAt", filter: { kind: "date" }, label: "Created" },
  {
    field: "active",
    filter: {
      getValue: ({ row, value }) => row.active && value,
      kind: "boolean",
    },
    label: "Active",
  },
] satisfies CominsTableColumn<Row>[];
const columnFiltering = {
  model: [{ columnId: "name", operator: "contains", value: "alpha" }],
  onChangeModel: (_model) => undefined,
  onChangeOpenColumnId: (_columnId) => undefined,
  openColumnId: "name",
} satisfies CominsColumnFilteringConfig;
const groups: Group[] = [{ id: "a", label: "A" }];
const rowGrouping = {
  getGroupId: (group) => group.id,
  getRowGroupId: (row) => row.groupId,
  groupDraggable: true,
  groups,
  onChangeGroups: (_groups) => undefined,
} satisfies CominsRowGroupingConfig<Row, Group>;

void (
  <CominsTable
    columnFiltering={columnFiltering}
    columns={columns}
    data={rows}
    pagination={{ pageSize: 20 }}
    virtualized
  />
);

void (
  <CominsTable
    columnFiltering={columnFiltering}
    columns={columns}
    data={rows}
    rowGrouping={rowGrouping}
  />
);

// @ts-expect-error Filtered tables do not accept Infinite Scroll.
void <CominsTable columnFiltering={columnFiltering} columns={columns} data={rows} infiniteScroll onLoadMore={() => undefined} />;

// @ts-expect-error Filtered tables do not accept Lazy Loading.
void <CominsTable columnFiltering={columnFiltering} columns={columns} data={rows} lazyLoad onLazyLoad={() => undefined} />;

// @ts-expect-error Filtered tables do not accept Row Drag.
void <CominsTable columnFiltering={columnFiltering} columns={columns} data={rows} rowProps={{ draggable: true }} />;

// @ts-expect-error Grouped and filtered tables do not accept Row Drag.
void <CominsTable columnFiltering={columnFiltering} columns={columns} data={rows} rowGrouping={rowGrouping} rowProps={{ draggable: true }} />;

// @ts-expect-error Tree Grid does not accept Column Filtering.
void <CominsTable columnFiltering={columnFiltering} columns={columns} data={[]} getRowId={(row: Row) => row.id} tree />;

const invalidFiltering: CominsColumnFilteringConfig = {
  model: [{
    columnId: "name",
    // @ts-expect-error Unknown filter operators are rejected.
    operator: "matches",
    value: "alpha",
  }],
};

void invalidFiltering;
