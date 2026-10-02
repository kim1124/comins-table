import { describe, expect, it } from "vitest";
import { distributeRuntimeColumnWidths, setColumnWidthInsideParentGroup } from "../src/column-layout";
import { canPreserveSelection, getNextSortModel, insertDeclaredColumnsIntoOrder, reconcileColumnOrderHistory } from "../src/table-state";
import { setCominsNestedInputValue } from "../src/row-value";
import type { CominsSelectionState } from "../src/model";

describe("framework-independent table calculations", () => {
  const widthState = () => ({
    columns: [{ id: "a", width: 120, maxWidth: 130 }, { id: "b", width: 120, maxWidth: 240 }],
    columnGroups: [{ id: "group", children: ["a", "b"] }],
    columnState: {}, columnGroupState: {}, marker: "preserve",
  });

  it("redistributes width after one column hits its maximum", () => {
    const state = widthState();
    expect(distributeRuntimeColumnWidths(state, state.columns, 320)).toEqual([130, 190]);
    expect(distributeRuntimeColumnWidths(state, state.columns, 100)).toEqual([88, 88]);
    expect(state.columns.map(column => column.width)).toEqual([120, 120]);
  });

  it("preserves group width, custom state and the original during resizing", () => {
    const state = widthState();
    const next = setColumnWidthInsideParentGroup(state, "a", 160);
    expect(next.columnState).toEqual({ a: { width: 130 }, b: { width: 110 } });
    expect(next.marker).toBe("preserve");
    expect(state.columnState).toEqual({});
  });

  it("ignores a hidden sibling when keeping the visible group width", () => {
    const state = { ...widthState(), columnState: { b: { hidden: true, width: 120 } } };
    expect(setColumnWidthInsideParentGroup(state, "a", 160).columnState).toEqual({
      a: { width: 120 }, b: { hidden: true, width: 120 },
    });
  });

  it("cycles a sort rule without changing other priorities or its input", () => {
    const current = [{ columnId: "a", direction: "asc" as const }, { columnId: "b", direction: "desc" as const }];
    expect(getNextSortModel(current, "a", true)).toEqual([{ columnId: "a", direction: "desc" }, { columnId: "b", direction: "desc" }]);
    expect(getNextSortModel(current, "b", true)).toEqual([{ columnId: "a", direction: "asc" }]);
    expect(getNextSortModel(current, "c", false)).toEqual([{ columnId: "c", direction: "asc" }]);
    expect(current[0]?.direction).toBe("asc");
  });

  it("retains hidden column positions while merging declared columns and visible reorder", () => {
    expect(insertDeclaredColumnsIntoOrder(["a", "c"], ["a", "b", "c"])).toEqual(["a", "b", "c"]);
    expect(reconcileColumnOrderHistory(["a", "hidden", "b"], ["b", "a"], ["a", "hidden", "b", "c"])).toEqual(["b", "hidden", "a", "c"]);
  });

  it("preserves selection only when row identity order and all selected columns survive", () => {
    const selection: CominsSelectionState = {
      cell: { rowId: 1, columnId: "a" }, rowIds: [1],
      range: { anchor: { rowId: 1, columnId: "a" }, focus: { rowId: 2, columnId: "b" } },
    };
    const current = { rowIds: [1, 2], columns: [{ id: "a" }, { id: "b" }], selection };
    expect(canPreserveSelection(current, current)).toBe(true);
    expect(canPreserveSelection(current, { ...current, rowIds: [2, 1] })).toBe(false);
    expect(canPreserveSelection(current, { ...current, rowIds: ["1", "2"] })).toBe(false);
    expect(canPreserveSelection(current, { ...current, columns: [{ id: "a" }] })).toBe(false);
    expect(canPreserveSelection({ ...current, selection: { ...selection, range: null, cells: [{ rowId: 1, columnId: "gone" }] } }, current)).toBe(false);
  });

  it("updates nested input values without mutating the row or unrelated references", () => {
    const row = { id: "a", profile: { label: "old", age: 7 }, untouched: { active: true } };
    const next = setCominsNestedInputValue(row, "profile.label", "new");
    expect(next).toEqual({ id: "a", profile: { label: "new", age: 7 }, untouched: { active: true } });
    expect(row.profile.label).toBe("old");
    expect(next.untouched).toBe(row.untouched);
    expect(setCominsNestedInputValue(row, "", "new")).toBe(row);
  });
});
