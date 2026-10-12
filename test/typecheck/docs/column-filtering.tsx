import { useState } from "react";
import {
  CominsTable,
  type CominsColumnFilterModel,
  type CominsTableColumn,
} from "../../../src";

type Row = { active: boolean; amount: number; id: string; joinedAt: string; name: string };

const rows: Row[] = [{ active: true, amount: 10, id: "a", joinedAt: "2026-08-31", name: "Alpha" }];
const columns: Array<CominsTableColumn<Row>> = [
  { field: "name", filter: { kind: "text" }, label: "Name", sort: true },
  { field: "amount", filter: { kind: "number" }, label: "Amount", sort: true },
  { field: "joinedAt", filter: { kind: "date" }, label: "Joined", sort: true },
  { field: "active", filter: { kind: "boolean" }, label: "Enabled", sort: true },
];

export function ColumnFilteringDocumentationExample() {
  const [model, setModel] = useState<CominsColumnFilterModel>([]);
  const [openColumnId, setOpenColumnId] = useState<string | null>(null);

  return (
    <CominsTable
      columnFiltering={{ model, onChangeModel: setModel, onChangeOpenColumnId: setOpenColumnId, openColumnId }}
      columns={columns}
      data={rows}
      getRowId={(row) => row.id}
    />
  );
}

export const valueColumns: Array<CominsTableColumn<Row>> = [{ field: "name", label: "Name", filter: {
  kind: "text", mode: "values", getOptionLabel: value => value === null ? "Empty" : String(value),
  option: { render: ({ option }) => <strong>{option.label}</strong> },
  panel: { render: p => <section><input {...p.getSearchInputProps()} /><ul>{p.visibleOptions.map(o => <li key={o.id} {...p.getOptionContainerProps(o)}>
    <input {...p.getOptionProps(o)} />{p.renderOption(o)}<small>{o.count}</small>
  </li>)}</ul><button {...p.getClearProps()}>Clear</button></section> },
} }];
