import { CominsTable, type CominsTableColumn, type CominsTableProps, type CominsTreeTableProps, type CominsViewportTableProps } from "../../src";

type Row = { id: string; name: string; group: string };
const typedColumn: CominsTableColumn<Row, string> = { field: "name", label: "Name", cell: {
  render: ({ row, value }) => <b>{row.data.name}{value}</b>, renderer: ({ value }) => value,
}, header: { render: ({ column }) => column.label, renderer: ({ column }) => column.label } };
const columns: CominsTableColumn<Row>[] = [{ field: "name", label: "Name" }];
const props: CominsTableProps<Row, { id: string }> = {
  columns, data: [], rowDetail: { render: ({ row }) => row.data.name },
  renderRowDetail: ({ row }) => row.data.name,
  loadingContent: { render: () => <span>Loading</span> }, emptyContent: { render: () => null },
  rowGrouping: { groups: [{ id: "g" }], getGroupId: group => group.id, getRowGroupId: row => row.group,
    label: { render: group => group.id }, content: { render: ({ group }) => group.id } },
};
const summary: NonNullable<CominsTableProps<Row>["summary"]> = { columns: { name: {
  aggregate: "count", render: ({ formattedValue, rows }) => <b>{rows[0]?.name}{formattedValue}</b>,
} } };
const tree: CominsTreeTableProps<Row> = { columns, data: [], tree: true, getRowId: row => row.id,
  treeSlots: { leading: () => null, content: { render: ({ item, defaultContent }) => <b>{item.name}{defaultContent}</b> } } };
const invalidTree: CominsTreeTableProps<Row> = { ...tree,
  // @ts-expect-error Tree keeps its existing row-detail exclusion.
  rowDetail: { render: () => null },
};
declare const viewport: CominsViewportTableProps<Row>;
const invalidViewport: CominsViewportTableProps<Row> = { ...viewport,
  // @ts-expect-error Viewport keeps its existing row-detail exclusion.
  rowDetail: { render: () => null },
};
void <CominsTable {...props} />;
void [typedColumn, invalidTree, invalidViewport, summary];
