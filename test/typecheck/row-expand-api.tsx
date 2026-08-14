import {
  CominsTable,
  type CominsTableProps,
  type CominsTreeNode,
  type CominsTreeTableProps,
} from "../../src";

type Row = { id: string; name: string };

const flatProps = {
  columns: [{ field: "name", label: "Name" }],
  data: [{ id: "a", name: "Alpha" }],
  estimatedRowDetailHeight: 180,
  expandedRowIds: ["a"],
  getRowDetailHeight: ({ row }) => (row.id === "a" ? "auto" : 240),
  getRowId: (row) => row.id,
  isRowExpandable: ({ row }) => row.data.name.length > 0,
  onChangeExpandedRowIds: (_rowIds) => undefined,
  renderRowDetail: ({ row }) => <div>{row.data.name}</div>,
} satisfies CominsTableProps<Row>;

const treeData: CominsTreeNode<Row>[] = [{ item: { id: "root", name: "Root" } }];

const treeProps: CominsTreeTableProps<Row> = {
  columns: [{ field: "name", label: "Name" }],
  data: treeData,
  getRowId: (row) => row.id,
  tree: true,
  // @ts-expect-error Tree Grid does not accept flat Row Detail rendering.
  renderRowDetail: ({ row }) => <div>{row.data.name}</div>,
};

void <CominsTable {...flatProps} />;
void treeProps;
