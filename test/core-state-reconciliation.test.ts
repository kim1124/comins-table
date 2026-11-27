import { createElement } from "react";
import { describe, expect, it, vi } from "vitest";
import * as layout from "../src/core/layout/columns";
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
  it("normalizes React input definitions once without projecting unused presentation metadata", () => {
    let presentationReads = 0;
    const label = createElement("strong", null, "Score");
    const filter = { kind: "number" as const, get getOptionLabel() {
      presentationReads++;
      return (value: unknown) => String(value);
    } };
    const nextColumns = [{ field: "score", label, sort: true, filter }];
    const groups = [{ id: "scores", label, children: ["score", "missing"] }];
    const identify = vi.fn(getRowId);
    const current = createReactState({ ...input, getRowId: identify, columns: nextColumns, columnGroups: groups });
    identify.mockClear();
    const columnsSpy = vi.spyOn(layout, "normalizeColumns");
    const groupsSpy = vi.spyOn(layout, "normalizeColumnGroups");
    try {
      const result = react().reconcileReactState({ current,
        nextInput: { ...input, getRowId: identify, columns: nextColumns, columnGroups: groups },
        columnOrderHistory: current.columnOrder, dataChanged: false, getRowIdChanged: false });
      expect(columnsSpy).toHaveBeenCalledTimes(1);
      expect(groupsSpy).toHaveBeenCalledTimes(1);
      expect(presentationReads).toBe(0);
      expect(result.state.columns[0]?.label).toBe(label);
      expect(result.state.columns[0]?.filter).toBe(filter);
      expect(result.state.columnGroups[0]?.label).toBe(label);
      expect(result.state.columnGroups[0]?.children).toEqual(["score"]);
      expect(result.state.rows).toBe(rows);
      expect(result.state.rowIds).toBe(current.rowIds);
      expect(identify).not.toHaveBeenCalled();
      expect(result.state.selection).toBe(current.selection);
    } finally {
      columnsSpy.mockRestore();
      groupsSpy.mockRestore();
    }
  });
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

  it("bounds removed-column history without losing current columns or the latest removed position", () => {
    const stable = { id: "stable", field: "name" };
    const dynamic = (i: number) => ({ id: `schema-${i}`, field: "score" });
    const firstColumns = [stable, dynamic(0)];
    let state = createCominsTableState({ ...input, columns: firstColumns });
    let columnOrderHistory = state.columnOrder;
    let retiredColumnIds: readonly string[] | undefined;
    function render(nextColumns: typeof firstColumns) {
      const result = core().reconcileCoreState({
        current: state,
        nextInput: { ...input, columns: nextColumns },
        columnOrderHistory,
        retiredColumnIds,
        dataChanged: false,
        getRowIdChanged: false,
      });
      state = result.state;
      columnOrderHistory = result.columnOrderHistory;
      retiredColumnIds = result.retiredColumnIds;
    }

    for (let i = 1; i <= 300; i += 1) render([stable, dynamic(i)]);
    expect(state.columnOrder).toEqual(["stable", "schema-300"]);
    expect(columnOrderHistory).toHaveLength(130);
    expect(retiredColumnIds).toEqual(Array.from({ length: 128 }, (_, index) => `schema-${index + 172}`));

    render([dynamic(299), stable, dynamic(300)]);
    expect(state.columnOrder).toEqual(["stable", "schema-300", "schema-299"]);
    expect(retiredColumnIds).not.toContain("schema-299");

    render([dynamic(0), stable, dynamic(300)]);
    expect(state.columnOrder).toEqual(["schema-0", "stable", "schema-300"]);
    expect(retiredColumnIds?.at(-1)).toBe("schema-299");
  });

  it("preserves every active column when its schema exceeds the retired-ID budget", () => {
    const large = Array.from({ length: 150 }, (_, i) => ({ id: `active-${i}`, field: "name" }));
    const nextColumns = [{ id: "previous", field: "score" }, ...large];
    const current = createCominsTableState({ ...input, columns: nextColumns });
    const result = core().reconcileCoreState({
      current,
      nextInput: { ...input, columns: [] },
      columnOrderHistory: current.columnOrder,
      dataChanged: false,
      getRowIdChanged: false,
    });
    expect(result.columnOrderHistory).toHaveLength(128);
    const restored = core().reconcileCoreState({
      current: result.state,
      nextInput: { ...input, columns: nextColumns },
      columnOrderHistory: result.columnOrderHistory,
      retiredColumnIds: result.retiredColumnIds,
      dataChanged: false,
      getRowIdChanged: false,
    });
    expect(restored.state.columnOrder).toEqual(nextColumns.map(column => column.id));
    expect(restored.columnOrderHistory).toHaveLength(151);
    expect(restored.retiredColumnIds).toEqual([]);
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

it("reuses current row IDs for definition, pagination and header changes", () => {
  const identify = vi.fn(getRowId);
  let current = createCominsTableState({ ...input, getRowId: identify });
  const originalIDs = current.rowIds;
  identify.mockClear();
  const changes = [
    { columns: [{ ...columns[0]!, label: "Renamed" }, columns[1]!] },
    { columnGroups: [{ id: "scores", label: "Scores", children: ["score"] }] },
    { pagination: { pageIndex: 1, pageSize: 1 } },
    { showHeader: false },
  ];
  for (const change of changes) {
    const result = core().reconcileCoreState({ current,
      nextInput: { ...input, getRowId: identify, ...change },
      columnOrderHistory: current.columnOrder, dataChanged: false, getRowIdChanged: false });
    expect(result.state.rowIds).toBe(originalIDs);
    expect(result.state.rows).toBe(rows);
    current = result.state;
  }
  expect(identify).not.toHaveBeenCalled();
});

it("derives row IDs again for changed data, changed getters and explicit identity invalidation", () => {
  const identify = vi.fn(getRowId);
  const current = createCominsTableState({ ...input, getRowId: identify });
  identify.mockClear();
  const options = { current, nextInput: { ...input, getRowId: identify },
    columnOrderHistory: current.columnOrder, dataChanged: false, getRowIdChanged: false };
  const data = core().reconcileCoreState({ ...options, dataChanged: true,
    nextInput: { ...options.nextInput, rows: [{ id: "c", name: "C", score: 3 }] } }).state;
  expect(data.rowIds).toEqual(["c"]);
  expect(data.rowIds).not.toBe(current.rowIds);
  identify.mockClear();
  const forced = core().reconcileCoreState({ ...options, getRowIdChanged: true }).state;
  expect(identify).toHaveBeenCalledTimes(rows.length);
  expect(forced.rowIds).toEqual(current.rowIds);
  expect(forced.rowIds).not.toBe(current.rowIds);
  const changed = core().reconcileCoreState({ ...options,
    nextInput: { ...options.nextInput, getRowId: row => `${row.id}-new` } }).state;
  expect(changed.rowIds).toEqual(["a-new", "b-new"]);
});

it("keeps both column groups intact when a move index falls within the other group", () => {
  const state = createCominsTableState({
    rows: [], columns: ["a", "b", "c", "d"].map(field => ({ field })),
    columnGroups: [{ id: "first", children: ["a", "b"] }, { id: "second", children: ["c", "d"] }],
  });
  const moved = layout.moveCominsColumnGroup(state, "first", 1);
  const saved = layout.serializeCominsColumnLayout(moved);
  expect(saved.order).toEqual(["c", "d", "a", "b"]);
  expect(layout.applyCominsColumnLayout(state, saved).columnOrder).toEqual(saved.order);
});

it("restores each known column only once from a duplicate saved order", () => {
  const state = createCominsTableState({ rows: [], columns: ["a", "b", "c", "d"].map(field => ({ field })) });
  const restored = layout.applyCominsColumnLayout(state, { order: ["c", "c", "a"], columns: {} });
  expect(restored.columnOrder).toEqual(["c", "a", "b", "d"]);
});

it("round-trips a literal prototype-shaped column and group ID", () => {
  const state = createCominsTableState({ rows: [], columns: [{ id: "__proto__", field: "value", width: 123 }],
    columnGroups: [{ id: "__proto__", children: ["__proto__"] }] });
  const saved = JSON.parse(JSON.stringify(layout.serializeCominsColumnLayout(state)));
  const restored = layout.applyCominsColumnLayout(state, saved);
  expect(Object.hasOwn(restored.columnState, "__proto__")).toBe(true);
  expect(restored.columnState["__proto__"]?.width).toBe(123);
  expect(Object.hasOwn(restored.columnGroupState, "__proto__")).toBe(true);
});

it("clamps stale virtual scroll positions when the row set shrinks", async () => {
  const { getCominsVirtualRows } = await import("../src/core");
  const state = createCominsTableState({ rows: ["a", "b"], columns: [] });
  expect(getCominsVirtualRows(state, { rowHeight: 20, scrollTop: 10_000, viewportHeight: 20, overscan: 0 })).toEqual({
    rows: ["b"], startIndex: 1, endIndex: 2, topSpacerHeight: 20, bottomSpacerHeight: 0, totalHeight: 40,
  });
});
