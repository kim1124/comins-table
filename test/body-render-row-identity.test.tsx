// @vitest-environment jsdom
import { act, useEffect } from "react";
import { createRoot } from "react-dom/client";
import { expect, it } from "vitest";
import { CominsTable, type CominsTableColumn } from "../src";

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

it("preserves keyed row editors on reorder while replacing event row data for the same ID", () => {
  type Row = { id: string; name: string };
  const mounted: string[] = [], unmounted: string[] = [];
  const clicked: Row[] = [];
  function Editor({ id }: { id: string }) {
    useEffect(() => { mounted.push(id); return () => { unmounted.push(id); }; }, []);
    return <input data-testid={`editor-${id}`} defaultValue={id} />;
  }
  const columns: CominsTableColumn<Row>[] = [{ field: "name", label: "Name", cell: { render: p => <Editor id={String(p.row.id)} /> } }];
  const host = document.createElement("div"); document.body.append(host); const root = createRoot(host);
  const first: Row = { id: "a", name: "Alpha" }, second: Row = { id: "b", name: "Beta" };
  const render = (rows: Row[]) => act(() => root.render(<CominsTable columns={columns} data={rows} getRowId={row => row.id} onClickCell={p => clicked.push(p.row.data)} />));
  try {
    render([first, second]);
    const editor = host.querySelector<HTMLInputElement>('[data-testid="editor-a"]')!;
    editor.value = "consumer edited";
    render([second, first]);
    expect(host.querySelector('[data-testid="editor-a"]')).toBe(editor);
    expect(editor.value).toBe("consumer edited");
    expect(mounted).toEqual(["a", "b"]);
    expect(unmounted).toEqual([]);
    const replacement: Row = { id: "a", name: "Replacement" };
    render([second, replacement]);
    expect(host.querySelector('[data-testid="editor-a"]')).toBe(editor);
    act(() => host.querySelector<HTMLTableCellElement>('[data-testid="cell-a-name"]')!.click());
    expect(clicked.at(-1)).toBe(replacement);
    expect(unmounted).toEqual([]);
  } finally { act(() => root.unmount()); host.remove(); }
  expect(unmounted.slice().sort()).toEqual(["a", "b"]);
});
