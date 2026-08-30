import { CominsTable, type CominsTableColumn, type CominsTableColumnGroup } from "../../../src";

type Row = { amount: number; id: string; name: string; status: string };

const rows: Row[] = [{ amount: 10, id: "a", name: "Alpha", status: "Active" }];
const columns = [
  { field: "name", label: "Name", pinned: "left", width: 180 },
  { field: "amount", label: "Amount", width: 140 },
  { field: "status", label: "Status", pinned: "right", width: 140 },
] satisfies Array<CominsTableColumn<Row>>;
const columnGroups = [
  { children: ["name"], id: "identity", label: "Identity", pinned: "left" },
] satisfies Array<CominsTableColumnGroup>;

export const columnPinningDocumentationExample = (
  <CominsTable columns={columns} columnGroups={columnGroups} data={rows} getRowId={(row) => row.id} />
);
