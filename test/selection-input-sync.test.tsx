// @vitest-environment jsdom
import { act, createRef, useState } from "react";
import { createRoot } from "react-dom/client";
import { describe, expect, it } from "vitest";
import { CominsTable, type CominsSelectionState, type CominsTableRef, type CominsTreeNode } from "../src";

globalThis.IS_REACT_ACT_ENVIRONMENT = true;
type Row = { id: string; name: string };
const parent = { id: "root", name: "Root" }, child = { id: "child", name: "Child" };
const columns = [{ field: "name", label: "Name" }];
const getRowId = (row: Row) => row.id;
function click(element: Element) { act(() => element.dispatchEvent(new MouseEvent("click", { bubbles: true }))); }

describe("selection notifications after input reconciliation", () => {
  it.each([false, true])("clears the consumer selection when a Tree collapses, slots=%s", slots => {
    const ref = createRef<CominsTableRef<Row>>();
    const notifications: CominsSelectionState[] = [];
    function Example() {
      const [data, setData] = useState<CominsTreeNode<Row>[]>([{ item: parent, expand: true, children: [{ item: child }] }]);
      const [selection, setSelection] = useState<CominsSelectionState | null>(null);
      return <><CominsTable ref={ref} tree columns={columns} data={data} getRowId={getRowId} onChangeData={setData}
        onChangeSelection={next => { notifications.push(next); setSelection(next); }}
        treeSlots={slots ? { leading: () => <span>Icon</span> } : undefined} />
        <output>{selection?.rowIds.length ?? 0}</output></>;
    }
    const box = document.createElement("div"); document.body.append(box);
    const root = createRoot(box);
    try {
      act(() => root.render(<Example />));
      click(box.querySelector('[data-testid="cell-child-name"]')!);
      expect(box.querySelector("output")?.textContent).toBe("1");
      click(box.querySelector('[data-testid="tree-expander-root"]')!);
      expect(ref.current?.getSelectedRows()).toEqual([]);
      expect(box.querySelector("output")?.textContent).toBe("0");
      expect(notifications.map(value => value.rowIds)).toEqual([["child"], []]);
      click(box.querySelector('[data-testid="tree-expander-root"]')!);
      expect(notifications.map(value => value.rowIds)).toEqual([["child"], []]);
    } finally { act(() => root.unmount()); box.remove(); }
  });

  it.each(["remove", "reorder", "same-ids"] as const)("synchronizes flat table selection on %s without duplicate notifications", change => {
    const ref = createRef<CominsTableRef<Row>>();
    const notifications: CominsSelectionState[] = [];
    let replaceRows: (rows: Row[]) => void = () => {};
    function Example() {
      const [data, setData] = useState([parent, child]);
      const [selection, setSelection] = useState<CominsSelectionState | null>(null);
      replaceRows = setData;
      return <><CominsTable ref={ref} columns={columns} data={data} getRowId={getRowId}
        onChangeSelection={next => { notifications.push(next); setSelection(next); }} />
        <output>{selection?.rowIds.length ?? 0}</output></>;
    }
    const box = document.createElement("div"); document.body.append(box);
    const root = createRoot(box);
    try {
      act(() => root.render(<Example />));
      click(box.querySelector('[data-testid="cell-child-name"]')!);
      act(() => replaceRows(change === "remove" ? [parent] : change === "reorder" ? [child, parent] : [{ ...parent }, { ...child }]));
      const preserved = change === "same-ids";
      expect(ref.current?.getSelectedRows()).toEqual(preserved ? [child] : []);
      expect(box.querySelector("output")?.textContent).toBe(preserved ? "1" : "0");
      expect(notifications.map(value => value.rowIds)).toEqual(preserved ? [["child"]] : [["child"], []]);
      act(() => replaceRows([parent]));
      act(() => replaceRows([parent, child]));
      expect(notifications.map(value => value.rowIds)).toEqual([["child"], []]);
    } finally { act(() => root.unmount()); box.remove(); }
  });
});
