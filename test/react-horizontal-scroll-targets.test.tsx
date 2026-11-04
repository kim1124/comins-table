// @vitest-environment jsdom
import { act } from "react";
import { createRoot } from "react-dom/client";
import { expect, it } from "vitest";
import { CominsTable, type CominsTableColumn } from "../src";

globalThis.IS_REACT_ACT_ENVIRONMENT = true;
type Row = { id: string; name: string; age: number };
const data: Row[] = [{ id: "a", name: "Alpha", age: 31 }];
const columns: CominsTableColumn<Row>[] = [
  { field: "name", label: "Name", width: 200 },
  { field: "age", label: "Age", width: 200 },
];
const getRowId = (row: Row) => row.id;

it.each(["header", "summary"])("aligns a newly mounted %s with the existing body position", (target) => {
  const host = document.createElement("div");
  document.body.append(host);
  const root = createRoot(host);
  const render = (visible: boolean) => act(() => root.render(
    <CominsTable columns={columns} data={data} data-testid="horizontal-targets" getRowId={getRowId}
      showHeader={target === "header" ? visible : true}
      summary={target === "summary" && visible ? { columns: { age: "sum" } } : undefined} />,
  ));
  try {
    render(false);
    const viewport = host.querySelector<HTMLElement>('[data-testid="horizontal-targets"]')!;
    viewport.scrollLeft = 100;
    render(true);
    expect(viewport.scrollLeft).toBe(100);
    const added = host.querySelector<HTMLElement>(target === "header" ? ".comins-table__header" : ".comins-table__summary")!;
    expect(added).not.toBeNull();
    expect(added.scrollLeft).toBe(100);
  } finally {
    act(() => root.unmount());
    host.remove();
  }
});
