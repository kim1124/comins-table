import { describe, expect, it } from "vitest";
import { createCominsTableState, selectCellRange, setCominsColumnHidden } from "../src";
import { copySelectionData } from "../src/selection-data";
const modules = import.meta.glob("../src/core/selection/navigation.ts", { eager: true });
function core() {
  expect(modules["../src/core/selection/navigation.ts"], "neutral navigation policy").toBeDefined();
  return modules["../src/core/selection/navigation.ts"] as typeof import("../src/core/selection/navigation");
}
const source = { anchor: { rowId: 1, columnId: "a" }, focus: { rowId: "1", columnId: "a" } };
describe("Core navigation", () => {
  it("uses displayed typed row IDs and visible columns, choosing vertical extension on a tie", () => {
    const input = { source, rowIds: [1, "1", "last"], columnIds: ["a", "b"] };
    expect(core().resolveCoreFillTarget({ ...input, address: { rowId: "last", columnId: "b" } })).toEqual({ anchor: { rowId: 1, columnId: "a" }, focus: { rowId: "last", columnId: "a" } });
    expect(core().resolveCoreFillTarget({ ...input, address: { rowId: "1", columnId: "b" } })).toEqual({ anchor: { rowId: 1, columnId: "a" }, focus: { rowId: "1", columnId: "b" } });
  });
  it("rejects empty, missing, hidden and inside-source addresses", () => {
    for (const address of [null, { rowId: "missing", columnId: "a" }, { rowId: 1, columnId: "hidden" }, { rowId: "1", columnId: "a" }]) {
      expect(core().resolveCoreFillTarget({ source, address, rowIds: [1, "1"], columnIds: ["a"] })).toBeNull();
    }
    expect(core().resolveCoreFillTarget({ source, address: source.focus, rowIds: [], columnIds: [] })).toBeNull();
  });
  it("accepts exactly 100000 cells but rejects an oversized extension", () => {
    const rowIds = Array.from({ length: 100001 }, (_, i) => i);
    const source = { anchor: { rowId: 0, columnId: "a" }, focus: { rowId: 0, columnId: "a" } };
    expect(core().resolveCoreFillTarget({ source, address: { rowId: 99999, columnId: "a" }, rowIds, columnIds: ["a"] })?.focus.rowId).toBe(99999);
    expect(core().resolveCoreFillTarget({ source, address: { rowId: 100000, columnId: "a" }, rowIds, columnIds: ["a"] })).toBeNull();
  });
  it("plans a copy rectangle in caller order while retaining discontiguous holes", () => {
    const result = core().planCoreSelectionCopy({ cells: [{ rowId: "last", columnId: "a" }, { rowId: 1, columnId: "b" }], selectedRowIds: [], rowIds: ["last", "1", 1], columnIds: ["a", "b"], target: "auto" });
    expect(result?.rowIds).toEqual(["last", "1", 1]);
    expect(result?.columnIds).toEqual(["a", "b"]);
    expect(result?.selected.get("1")).toBeUndefined();
    expect(core().planCoreSelectionCopy({ cells: [], selectedRowIds: [1, "last"], rowIds: ["last", "1", 1], columnIds: ["b"], target: "rows" })?.rowIds).toEqual(["last", 1]);
  });
  it("resolves tree sibling and inside destinations without conflating typed IDs", () => {
    const entries = [{ rowId: 1, path: [0] }, { rowId: "1", path: [0, 0] }, { rowId: "next", path: [0, 1] }, { rowId: "other", path: [1] }];
    expect(core().resolveCoreTreeDropContext({ entries, sourceId: "other", targetId: "1", position: "after" })?.destination).toEqual({ parentId: 1, beforeRowId: "next" });
    expect(core().resolveCoreTreeDropContext({ entries, sourceId: "other", targetId: 1, position: "inside" })?.destination).toEqual({ parentId: 1, beforeRowId: null });
    expect(core().resolveCoreTreeDropContext({ entries, sourceId: "missing", targetId: 1, position: "before" })).toBeNull();
    expect(core().resolveCoreTreePointerPosition(.5, false)).toBe("after");
    expect(core().resolveCoreTreePointerPosition(.25, true)).toBe("inside");
    expect(core().getCominsColumnMouseIntent({ startX: 0, startY: 0, clientX: 6, clientY: 6 })).toBe("cancel");
  });
});
it("the React copy consumer preserves caller order and excludes hidden columns", () => {
  let state = createCominsTableState({ rows: [{ id: 1, a: "one", b: "secret" }, { id: "1", a: "string", b: "secret" }, { id: "last", a: "last", b: "secret" }], getRowId: row => row.id, columns: [{ field: "a" }, { field: "b" }] });
  state = setCominsColumnHidden(state, "b", true);
  state = selectCellRange(state, { anchor: { rowId: "last", columnId: "a" }, focus: { rowId: 1, columnId: "a" } });
  expect(copySelectionData(state, "cells", ["last", 1])?.text).toBe("last\none");
});
