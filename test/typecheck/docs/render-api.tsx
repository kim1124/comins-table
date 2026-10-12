import { CominsTable, type CominsTableColumn } from "../../../src";
type Row = { id: string; score: number };
const rows: Row[] = [{ id: "a", score: 10 }];
const columns: CominsTableColumn<Row>[] = [{ field: "score", label: "Score",
  header: { render: ({ column }) => <strong>{column.label}</strong> },
  cell: { render: ({ value }) => <strong>{String(value)}</strong>,
    tooltip: { render: ({ row }) => <span>Score: <b>{row.data.score}</b></span> } },
}];
export function RenderingExample() {
  return <CominsTable columns={columns} data={rows} getRowId={row => row.id}
    expandedRowIds={["a"]} rowDetail={{ render: ({ row }) => <span>{row.data.score}</span> }}
    loadingContent={{ render: () => <span>Loading</span> }} emptyContent={{ render: () => <span>No rows</span> }}
    summary={{ columns: { score: { aggregate: "sum", format: ({ value }) => `Total ${value}`,
      render: ({ formattedValue }) => <strong>{formattedValue}</strong> } } }} />;
}
