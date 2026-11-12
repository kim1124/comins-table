// @vitest-environment node
import { renderToString } from "react-dom/server";
import { expect, it } from "vitest";
import { CominsTable, type CominsTableColumn } from "../src";

it("preserves summary preparation, header rendering and each row's format/render callback order", () => {
  type Row = { id: string; name: string; amount: number };
  const calls: string[] = [];
  const columns: CominsTableColumn<Row>[] = [{ field: "name", label: "Name", header: {
    render: p => { calls.push(`header:${p.column.id}`); return <b>{p.column.label}</b>; },
  }, cell: {
    format: p => { calls.push(`format:${String(p.row.id)}`); return String(p.value); },
    render: p => { calls.push(`cell:${String(p.row.id)}`); return undefined; },
  } }, { field: "amount", label: "Amount" }];
  const html = renderToString(<CominsTable columns={columns} data={[{ id: "a", name: "Alpha", amount: 3 }, { id: "b", name: "Beta", amount: 7 }]}
    getRowId={row => row.id} rowProps={{ disabled: row => { calls.push(`row:${row.id}`); return false; } }}
    summary={{ columns: { amount: {
      aggregate: ({ rows }) => { calls.push("summary:aggregate"); return rows.reduce((sum, row) => sum + row.amount, 0); },
      format: ({ value }) => { calls.push("summary:format"); return value; },
      render: ({ formattedValue }) => { calls.push("summary:render"); return <em>{formattedValue}</em>; },
    } } }} />);
  // Summary callbacks already run during projection, before JSX header/body evaluation.
  expect(calls).toEqual([
    "summary:aggregate", "summary:format", "summary:render", "header:name",
    "row:a", "format:a", "cell:a", "row:b", "format:b", "cell:b",
  ]);
  expect(html).toContain("Alpha");
  expect(html).toContain("Beta");
  expect(html).toContain("<em>10</em>");
});
