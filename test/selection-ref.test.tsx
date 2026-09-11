// @vitest-environment jsdom
import { act, createRef } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, expect, it } from "vitest";
import { CominsTable, type CominsTableRef } from "../src";
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
let dispose = () => {};
afterEach(() => dispose());
it("keeps row selection during cell gestures and context menus, and returns fresh snapshots", () => {
  const ref = createRef<CominsTableRef<{ id: string; value: number }>>();
  const node = document.createElement("div"); document.body.append(node);
  const root = createRoot(node); dispose = () => { act(() => root.unmount()); node.remove(); };
  act(() => root.render(<CominsTable ref={ref} rowSelectionOnClick={false} columns={[{ field: "value", label: "value" }]} data={Array.from({ length: 5 }, (_, value) => ({ id: String(value), value }))} getRowId={row => row.id} />));
  act(() => ref.current!.setSelectedRows([0, 1, 2, 3, 4]));
  const cell = (i: number) => node.querySelector(`[data-testid='cell-${i}-value']`)!;
  act(() => cell(0).dispatchEvent(new MouseEvent("click", { bubbles: true })));
  act(() => cell(2).dispatchEvent(new MouseEvent("click", { bubbles: true, shiftKey: true })));
  expect(ref.current!.getSelectedRows()).toHaveLength(5);
  expect(ref.current!.getSelectedCells().map(cell => cell.value)).toEqual([0, 1, 2]);
  act(() => cell(1).dispatchEvent(new MouseEvent("contextmenu", { bubbles: true })));
  expect(ref.current!.getSelectedCells()).toHaveLength(3);
  expect(ref.current!.getSelectedRows()).toHaveLength(5);
  const snapshot = ref.current!.getSelection(); snapshot.rowIds.length = 0;
  expect(ref.current!.getSelection().rowIds).toHaveLength(5);
});

it("copies selected Rows from checkbox focus but preserves native text input copying", () => {
  const ref = createRef<CominsTableRef<{ id: string; value: string }>>();
  const node = document.createElement("div"); document.body.append(node);
  const root = createRoot(node); dispose = () => { act(() => root.unmount()); node.remove(); };
  act(() => root.render(<CominsTable clipboard ref={ref} rowSelectionOnClick={false}
    columns={[{ field: "value", label: "value", cell: { renderer: () => <><input type="checkbox" /><input type="text" /></> } }]}
    data={[{ id: "a", value: "first" }, { id: "b", value: "second" }]} getRowId={row => row.id} />));
  act(() => ref.current!.setSelectedRows([0, 1]));
  const values: string[] = [];
  function copy(selector: string) {
    const event = new Event("copy", { bubbles: true, cancelable: true });
    Object.defineProperty(event, "clipboardData", { value: { setData: (_type: string, value: string) => values.push(value) } });
    act(() => node.querySelector(selector)!.dispatchEvent(event));
    return event;
  }
  expect(copy('input[type="checkbox"]').defaultPrevented).toBe(true);
  expect(values).toEqual(["first\nsecond"]);
  expect(copy('input[type="text"]').defaultPrevented).toBe(false);
});
