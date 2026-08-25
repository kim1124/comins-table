import {
  CominsTable,
  type CominsRowGroupingConfig,
  type CominsTableProps,
} from "../../src";

type Row = {
  amount: number | null;
  id: string;
  region: string;
};

const columns = [
  { field: "region", label: "Region", sort: true },
  { field: "amount", label: "Amount", sort: true },
];

const grouping = {
  aggregations: {
    amount: "sum",
    id: "count",
  },
  criteria: [
    "region",
    {
      columnId: "amount",
      getKey: ({ value }) =>
        typeof value === "number" && value >= 100 ? "high" : "low",
    },
  ],
  expandedGroupIds: [],
  onChangeExpandedGroupIds: (_ids) => undefined,
} satisfies CominsRowGroupingConfig<Row>;

const ordinary = {
  columns,
  data: [],
  getRowId: (row) => row.id,
  infiniteScroll: true,
  onLoadMore: () => undefined,
  pagination: { pageSize: 10 },
  rowProps: { draggable: true },
} satisfies CominsTableProps<Row>;

void <CominsTable {...ordinary} />;

void (
  <CominsTable
    columns={columns}
    data={[]}
    getRowId={(row) => row.id}
    isRowExpandable={() => true}
    renderRowDetail={({ row }) => row.data.region}
    rowGrouping={grouping}
  />
);

// @ts-expect-error Grouped tables do not accept pagination.
void <CominsTable columns={columns} data={[]} pagination={{ pageSize: 10 }} rowGrouping={grouping} />;

// @ts-expect-error Grouped tables do not accept infinite loading.
void <CominsTable columns={columns} data={[]} infiniteScroll onLoadMore={() => undefined} rowGrouping={grouping} />;

// @ts-expect-error Grouped tables do not accept lazy loading.
void <CominsTable columns={columns} data={[]} lazyLoad onLazyLoad={() => undefined} rowGrouping={grouping} />;

// @ts-expect-error Grouped tables do not accept draggable Row props.
void <CominsTable columns={columns} data={[]} rowGrouping={grouping} rowProps={{ draggable: true }} />;

// @ts-expect-error Tree tables do not accept Row Grouping.
void <CominsTable columns={columns} data={[]} getRowId={(row) => row.id} rowGrouping={grouping} tree />;

const invalidGrouping: CominsRowGroupingConfig<Row> = {
  // @ts-expect-error Custom reducer names are not supported.
  aggregations: { amount: "median" },
  criteria: ["region"],
};

void invalidGrouping;
