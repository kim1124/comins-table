import { createElement } from "react";
import { describe, expect, it } from "vitest";
import { createCominsTableState, selectCell, selectCellRange, selectRows } from "../src/core";
import { createCominsTableState as createReactState, pasteCominsText } from "../src";

const modules = import.meta.glob(["../src/core/state/reconcile.ts", "../src/react/state.ts"], { eager: true });
function core() {
  expect(modules["../src/core/state/reconcile.ts"], "Core reconciliation entry").toBeDefined();
  return modules["../src/core/state/reconcile.ts"] as typeof import("../src/core/state/reconcile");
}
function react() {
  expect(modules["../src/react/state.ts"], "React state adapter").toBeDefined();
  return modules["../src/react/state.ts"] as typeof import("../src/react/state");
}
type Row = { id: string; score: number; name: string };
const rows: Row[] = [{ id: "a", score: 1, name: "A" }, { id: "b", score: 2, name: "B" }];
const columns = [{ field: "score", label: "Score", sort: true }, { field: "name", label: "Name" }];
const getRowId = (row: Row) => row.id;
const input = { rows, columns, getRowId };
const address = { rowId: "a", columnId: "score" };

describe("Core props reconciliation", () => {
  it("keeps locally edited rows and selection on a label-only input change", () => {
    const editedRows = [{ ...rows[0]!, score: 9 }, rows[1]!];
    const current = selectCell(createCominsTableState({ ...input, rows: editedRows }), address);
    const { state } = core().reconcileCoreState({ current, nextInput: { ...input, columns: [{ ...columns[0]!, label: "Updated score" }, columns[1]!] }, columnOrderHistory: current.columnOrder, dataChanged: false, getRowIdChanged: false });
    expect(state.rows).toBe(editedRows);
    expect(state.rows[0]?.score).toBe(9);
    expect(state.columns[0]?.label).toBe("Updated score");
    expect(state.selection).toBe(current.selection);
    expect(rows[0]?.score).toBe(1);
  });

  it("accepts new data authoritatively and clears selection when the row sequence changes", () => {
    const current = selectRows(createCominsTableState(input), ["a"]);
    const replacement = [{ id: "c", score: 7, name: "C" }];
    const { state } = core().reconcileCoreState({ current, nextInput: { ...input, rows: replacement }, columnOrderHistory: current.columnOrder, dataChanged: true, getRowIdChanged: false });
    expect(state.rows).toBe(replacement);
    expect(state.rowIds).toEqual(["c"]);
    expect(state.selection.rowIds).toEqual([]);
    expect(current.selection.rowIds).toEqual(["a"]);
  });

  it("keeps selection identity for replacement rows with the same IDs in the same order", () => {
    const current = selectCell(createCominsTableState(input), address);
    const replacement = rows.map(row => ({ ...row, score: 10 }));
    const { state } = core().reconcileCoreState({ current, nextInput: { ...input, rows: replacement }, columnOrderHistory: current.columnOrder, dataChanged: true, getRowIdChanged: false });
    expect(state.rows).toBe(replacement);
    expect(state.selection).toBe(current.selection);
  });

  it("remembers removed column positions and clears a removed cell and sort rule", () => {
    const current = selectCell(createCominsTableState({ ...input, columnLayout: { order: ["name", "score"], columns: { score: { width: 90 } } }, sortModel: [{ columnId: "score", direction: "desc" }] }), address);
    const removed = core().reconcileCoreState({ current, nextInput: { ...input, columns: [columns[1]!] }, columnOrderHistory: current.columnOrder, dataChanged: false, getRowIdChanged: false });
    expect(removed.state.columnOrder).toEqual(["name"]);
    expect(removed.columnOrderHistory).toEqual(["name", "score"]);
    expect(removed.state.selection.cell).toBeNull();
    expect(removed.state.sortModel).toEqual([]);
    const restored = core().reconcileCoreState({ current: removed.state, nextInput: input, columnOrderHistory: removed.columnOrderHistory, dataChanged: false, getRowIdChanged: false });
    expect(restored.state.columnOrder).toEqual(["name", "score"]);
    expect(current.columnState.score?.width).toBe(90);
  });

  it("preserves existing layout while applying new pagination and header inputs", () => {
    const current = createCominsTableState({ ...input, columnLayout: { order: ["name", "score"], columns: { score: { width: 90, hidden: true } } } });
    const { state } = core().reconcileCoreState({ current, nextInput: { ...input, pagination: { pageIndex: 2, pageSize: 5 }, showHeader: false }, columnOrderHistory: current.columnOrder, dataChanged: false, getRowIdChanged: false });
    expect(state.columnOrder).toEqual(["name", "score"]);
    expect(state.columnState.score).toMatchObject({ width: 90, hidden: true });
    expect(state.pagination).toEqual({ pageIndex: 2, pageSize: 5 });
    expect(state.showHeader).toBe(false);
  });

  it("returns only reused row IDs mapped to different objects when getRowId changes", () => {
    const current = createCominsTableState(input);
    const nextInput = { ...input, getRowId: (row: Row) => row.id === "a" ? "b" : "c" };
    const options = { current, nextInput, columnOrderHistory: current.columnOrder, dataChanged: false };
    expect(core().reconcileCoreState({ ...options, getRowIdChanged: true }).invalidatedDetailRowIds).toEqual(["b"]);
    expect(core().reconcileCoreState({ ...options, getRowIdChanged: false }).invalidatedDetailRowIds).toEqual([]);
    expect(core().reconcileCoreState({ ...options, nextInput: { ...input, getRowId: row => row.id }, getRowIdChanged: true }).invalidatedDetailRowIds).toEqual([]);
  });

  it("drops a Viewport range across unloaded indexes without clearing row selection", () => {
    const current = selectCellRange(selectRows(createCominsTableState(input), ["a"]), { anchor: address, focus: { ...address, rowId: "b" } });
    const options = { current, nextInput: input, columnOrderHistory: current.columnOrder, dataChanged: false, getRowIdChanged: false };
    expect(core().reconcileCoreState({ ...options, viewportIndices: [50, 51] }).state.selection).toBe(current.selection);
    const sparse = core().reconcileCoreState({ ...options, viewportIndices: [50, 80] }).state.selection;
    expect(sparse.range).toBeNull();
    expect(sparse.rowIds).toEqual(["a"]);
    expect(current.selection.range).not.toBeNull();
  });
});

it("restores new JSX columns, group metadata, theme and original guard payload after reconciliation", () => {
  const label = createElement("b", null, "Updated score"), groupLabel = createElement("i", null, "Group");
  const renderer = () => createElement("span", null, "cell");
  const theme = { style: { color: "red" } };
  const current = createReactState({ ...input, rows: [{ ...rows[0]!, score: 9 }, rows[1]!], theme });
  let seenLabel: unknown;
  const nextColumns = [{ field: "score", label, cell: { renderer, props: { pasteable: (payload: { column: { label: unknown } }) => { seenLabel = payload.column.label; return true; } }, parseClipboard: ({ text }: { text: string }) => Number(text) } }];
  const result = react().reconcileReactState({ current, nextInput: { ...input, columns: nextColumns, columnGroups: [{ id: "g", children: ["score"], label: groupLabel }] }, columnOrderHistory: current.columnOrder, dataChanged: false, getRowIdChanged: false });
  expect(result.state.rows).toBe(current.rows);
  expect(result.state.theme).toBe(theme);
  expect(result.state.columns[0]?.label).toBe(label);
  expect(result.state.columns[0]?.cell?.renderer).toBe(renderer);
  expect(result.state.columnGroups[0]?.label).toBe(groupLabel);
  expect(pasteCominsText(result.state, address, "12").rows[0]?.score).toBe(12);
  expect(seenLabel).toBe(label);
});
