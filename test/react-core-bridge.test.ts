import { createElement } from "react";
import { describe, expect, it } from "vitest";
import * as legacy from "../src";
import * as clipboard from "../src/clipboard";
import * as selection from "../src/selection";

const modules = import.meta.glob("../src/react/model.ts", { eager: true });
function bridgeApi() {
  expect(modules["../src/react/model.ts"], "React state bridge").toBeDefined();
  return modules["../src/react/model.ts"] as typeof import("../src/react/model");
}
const label = createElement("strong", null, "Score");
const theme = { className: "consumer-theme" };
const rows = [{ id: "a", score: 9 }, { id: "b", score: 2 }];
const create = () => legacy.createCominsTableState({ rows, getRowId: row => row.id, theme,
  columns: [{ field: "score", label, sort: true, cell: { renderer: () => label } }],
  columnGroups: [{ id: "g", label, children: ["score"] }],
});

describe("React state bridge", () => {
  it("applies the saved group layout without evaluating unrelated React metadata", () => {
    const state = create();
    const originalColumn = state.columns[0]!;
    let metadataReads = 0;
    for (const key of ["cell", "sort", "filter", "label"] as const) {
      const value = originalColumn[key];
      Object.defineProperty(originalColumn, key, { configurable: true, get: () => { metadataReads++; return value; } });
    }
    const initial = legacy.serializeCominsColumnLayout(state);
    const hidden = legacy.applyCominsColumnLayout(state, { ...initial, groups: { g: { hidden: true } } });
    const resized = legacy.applyCominsColumnLayout(hidden, { ...initial, columns: { score: { width: 132 } } });
    const reset = legacy.applyCominsColumnLayout(resized, initial);
    expect(hidden.columnGroupState.g?.hidden).toBe(true);
    expect(resized.columnState.score?.width).toBe(132);
    expect(legacy.serializeCominsColumnLayout(reset)).toEqual(initial);
    for (const next of [hidden, resized, reset]) {
      expect(next).not.toBe(state);
      expect(next.columns).toBe(state.columns);
      expect(next.columnGroups).toBe(state.columnGroups);
      expect(next.rows).toBe(rows);
      expect(next.getRowId).toBe(state.getRowId);
      expect(next.selection).toBe(state.selection);
      expect(next.theme).toBe(theme);
    }
    expect(legacy.applyCominsColumnLayout(state, initial)).not.toBe(state);
    expect(metadataReads).toBe(0);
  });

  it("changes group layout without evaluating unrelated React metadata", () => {
    const state = legacy.createCominsTableState({
      rows, getRowId: row => row.id, theme,
      columns: [
        { field: "score", label, width: 100, minWidth: 90, maxWidth: 140, cell: { renderer: () => label } },
        { field: "id", label, width: 100 },
      ],
      columnGroups: [{ id: "g", label, children: ["score"] }],
    });
    let metadataReads = 0;
    for (const column of state.columns) {
      for (const key of ["cell", "sort", "filter", "label"] as const) {
        const value = column[key];
        Object.defineProperty(column, key, { configurable: true, get: () => { metadataReads++; return value; } });
      }
    }
    const hidden = legacy.setCominsColumnGroupHidden(state, "g", true);
    const restored = legacy.setCominsColumnGroupHidden(hidden, "g", false);
    const resized = legacy.setCominsColumnGroupWidth(restored, "g", 200);
    const moved = legacy.moveCominsColumnGroup(resized, "g", 1);
    expect(hidden.columnGroupState.g?.hidden).toBe(true);
    expect(restored.columnGroupState.g?.hidden).toBe(false);
    expect(resized.columnState.score?.width).toBe(140);
    expect(moved.columnOrder).toEqual(["id", "score"]);
    for (const next of [hidden, restored, resized, moved]) {
      expect(next.columns).toBe(state.columns);
      expect(next.columnGroups).toBe(state.columnGroups);
      expect(next.rows).toBe(rows);
      expect(next.getRowId).toBe(state.getRowId);
      expect(next.selection).toBe(state.selection);
      expect(next.theme).toBe(theme);
    }
    expect(legacy.setCominsColumnGroupHidden(state, "missing", true)).toBe(state);
    expect(legacy.setCominsColumnGroupWidth(hidden, "g", 200)).toBe(hidden);
    expect(legacy.moveCominsColumnGroup(state, "g", 0)).toBe(state);
    // Existing setters allocate a state even when the requested value is unchanged.
    expect(legacy.setCominsColumnGroupHidden(hidden, "g", true)).not.toBe(hidden);
    expect(legacy.setCominsColumnGroupWidth(resized, "g", 140)).not.toBe(resized);
    expect(metadataReads).toBe(0);
  });

  it("initializes normalized state without evaluating unused filter presentation metadata", () => {
    let metadataReads = 0;
    const optionLabel = (value: legacy.CominsColumnFilterValue) => String(value);
    const filter = {
      kind: "number" as const,
      get getOptionLabel() { metadataReads++; return optionLabel; },
    };
    const getRowId = (row: (typeof rows)[number]) => row.id;
    const state = legacy.createCominsTableState({
      rows, getRowId, theme,
      columns: [{ field: "score", label, sort: true, filter }],
      columnGroups: [{ id: "g", label, children: ["missing", "score", "score"] }],
      sortModel: [{ columnId: "missing", direction: "asc" }, { columnId: "score", direction: "desc" }],
    });
    expect(metadataReads).toBe(0);
    expect(state.rows).toBe(rows);
    expect(state.getRowId).toBe(getRowId);
    expect(state.theme).toBe(theme);
    expect(state.columns[0]?.id).toBe("score");
    expect(state.columns[0]?.label).toBe(label);
    expect(state.columns[0]?.filter).toBe(filter);
    expect(state.columnGroups[0]?.label).toBe(label);
    expect(state.columnGroups[0]?.children).toEqual(["score"]);
    expect(state.sortModel).toEqual([{ columnId: "score", direction: "desc" }]);
    expect(state.columns[0]?.filter?.getOptionLabel).toBe(optionLabel);
  });

  it("derives layout without evaluating unrelated render and editing metadata", () => {
    const state = create();
    const originalColumn = state.columns[0]!;
    let policyReads = 0;
    const cell = originalColumn.cell;
    Object.defineProperty(originalColumn, "cell", { configurable: true, get: () => { policyReads++; return cell; } });
    const visible = legacy.getCominsVisibleColumns(state);
    const headers = legacy.getCominsHeaderRows(state);
    expect(visible).toEqual([originalColumn]);
    expect(headers[0]?.[0]?.kind === "group" && headers[0][0].group).toBe(state.columnGroups[0]);
    expect(headers[1]?.[0]?.kind === "column" && headers[1][0].column).toBe(originalColumn);
    expect(policyReads).toBe(0);
  });

  it("serializes layout without reading unused React column metadata and preserves snapshot copies", () => {
    const state = create();
    const originalColumn = state.columns[0]!;
    const cell = originalColumn.cell;
    let policyReads = 0;
    Object.defineProperty(originalColumn, "cell", { configurable: true, get: () => { policyReads++; return cell; } });
    const layout = legacy.serializeCominsColumnLayout(state);
    expect(layout).toEqual({
      columns: { ...state.columnState },
      groups: { g: { ...state.columnGroupState.g } },
      order: [...state.columnOrder],
    });
    expect(layout.columns).not.toBe(state.columnState);
    expect(layout.columns!.score).toBe(state.columnState.score);
    expect(layout.groups!.g).not.toBe(state.columnGroupState.g);
    expect(layout.order).not.toBe(state.columnOrder);
    expect(legacy.serializeCominsColumnLayout(state)).toEqual(layout);
    expect(policyReads).toBe(0);
  });

  it("queries selected layout ranges without evaluating unused cell policies", () => {
    const state = create();
    const range = { anchor: { rowId: "a", columnId: "score" }, focus: { rowId: "b", columnId: "score" } };
    state.selection = { ...state.selection, range };
    const cell = state.columns[0]!.cell;
    let policyReads = 0;
    Object.defineProperty(state.columns[0]!, "cell", { configurable: true, get: () => { policyReads++; return cell; } });
    expect(legacy.getCominsSelectedCellRange(state)).toEqual([
      { rowId: "a", columnId: "score" }, { rowId: "b", columnId: "score" },
    ]);
    expect(legacy.isCominsCellInSelectedRange(state, { rowId: "b", columnId: "score" })).toBe(true);
    expect(legacy.isCominsCellInSelectedRange(state, { rowId: "missing", columnId: "score" })).toBe(false);
    expect(legacy.getCominsSelectedCellRange(state, range, ["b", "a"])).toEqual([
      { rowId: "b", columnId: "score" }, { rowId: "a", columnId: "score" },
    ]);
    state.selection.range = { anchor: { rowId: "a", columnId: "score" }, focus: { rowId: "c", columnId: "score" } };
    expect(legacy.isCominsCellInSelectedRange(state, { rowId: "b", columnId: "score" }, ["b", "a", "b", "c"])).toBe(true);
    state.selection.range = range;
    state.columnState.score!.hidden = true;
    expect(legacy.getCominsSelectedCellRange(state)).toEqual([]);
    expect(legacy.isCominsCellInSelectedRange(state, { rowId: "b", columnId: "score" })).toBe(false);
    expect(policyReads).toBe(0);
  });

  it("projects only filter data fields and preserves the original getValue column", () => {
    const render = () => label;
    const getOptionLabel = (value: legacy.CominsColumnFilterValue) => String(value);
    const column: legacy.CominsTableRuntimeColumn<{ score: number }> = { id: "score", field: "score", label,
      filter: { kind: "number", mode: "values", getOptionLabel, trigger: { render }, option: { render }, panel: { render },
        getValue: params => { expect(params.column).toBe(column); return params.value; } } };
    const projected = bridgeApi().projectReactColumn(column);
    expect(Object.keys(projected.filter!).sort()).toEqual(["caseSensitive", "getOptionLabel", "getValue", "kind"]);
    expect(projected.filter!.getOptionLabel).toBe(getOptionLabel);
    expect(projected.filter!.getValue!({ column: projected, row: { score: 3 }, rowId: "a", value: 3 })).toBe(3);
  });
  it("preserves React metadata and guard payloads through the public subpaths", () => {
    const state = create();
    let seenLabel: unknown;
    state.columns[0]!.cell = { ...state.columns[0]!.cell, props: { pasteable: params => {
      seenLabel = params.column.label;
      expect(params.column.definition).toBe(state.columns[0]);
      return true;
    } }, parseClipboard: ({ text }) => Number(text) };
    const selected = selection.selectCell(state, { rowId: "a", columnId: "score" });
    const next = clipboard.pasteCominsText(selected, { rowId: "a", columnId: "score" }, "12");
    expect(next.rows[0]?.score).toBe(12);
    expect(next.columns).toBe(state.columns);
    expect(next.columns[0]?.cell?.renderer).toBe(state.columns[0]?.cell?.renderer);
    expect(next.theme).toBe(theme);
    expect(seenLabel).toBe(label);
    expect(clipboard.pasteCominsText(next, { rowId: "a", columnId: "score" }, "12")).toBe(next);
  });
  it("projects data without rendering metadata and restores the exact no-op state", () => {
    const { projectReactState, restoreReactState } = bridgeApi();
    const source = create(), bridge = projectReactState(source);
    expect(bridge.core.rows).toBe(source.rows);
    expect(bridge.core.selection).toBe(source.selection);
    expect(bridge.core.columns[0]?.label).toBe("score");
    expect(bridge.core.columnGroups[0]?.label).toBe("g");
    expect(bridge.core).not.toHaveProperty("theme");
    expect(bridge.core.columns[0]).not.toHaveProperty("cell.renderer");
    expect(restoreReactState(bridge, bridge.core)).toBe(source);
    const changed = restoreReactState(bridge, { ...bridge.core, showHeader: false });
    expect(changed.showHeader).toBe(false);
    expect(changed.columns).toBe(source.columns);
    expect(changed.columnGroups).toBe(source.columnGroups);
    expect(changed.theme).toBe(theme);
  });
  it("preserves root metadata and references through ordinary state operations", () => {
    const state = create();
    const sorted = legacy.setCominsSortModel(state, [{ columnId: "score", direction: "asc" }]);
    expect(legacy.setCominsSortModel(sorted, sorted.sortModel)).toBe(sorted);
    const next = legacy.updateCominsRows(legacy.selectRow(sorted, "a"), [{ id: "b", patch: { score: 4 } }]);
    expect(next.rows.map(row => row.score)).toEqual([9, 4]);
    expect(next.columns).toBe(state.columns);
    expect(next.columns[0]?.label).toBe(label);
    expect(next.columnGroups).toBe(state.columnGroups);
    expect(next.theme).toBe(theme);
    const header = legacy.getCominsHeaderRows(next);
    expect(header[0]?.[0]?.kind === "group" && header[0][0].group).toBe(state.columnGroups[0]);
    expect(legacy.getCominsVisibleColumns(next)[0]).toBe(state.columns[0]);
  });
  it("does not collapse distinct definitions sharing a column ID", () => {
    const api = bridgeApi();
    const state = legacy.createCominsTableState({ rows, columns: [{ id: "x", field: "score", label }, { id: "x", field: "id", label: "Second" }] });
    const bridge = api.projectReactState(state);
    expect(bridge.core.columns.map(column => column.field)).toEqual(["score", "id"]);
    const next = api.restoreReactState(bridge, { ...bridge.core, columns: [...bridge.core.columns] });
    expect(next.columns[0]).toBe(state.columns[0]);
    expect(next.columns[1]).toBe(state.columns[1]);
    expect(legacy.getCominsVisibleColumns(state)[0]).toBe(state.columns[0]);
  });
});
