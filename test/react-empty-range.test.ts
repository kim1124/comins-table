import { describe, expect, it } from "vitest";
import { createCominsTableState, getCominsSelectedCellRange, isCominsCellInSelectedRange, selectCellRange } from "../src";

function fixture() {
  const state = createCominsTableState({
    rows: [{ id: "a", value: 1 }, { id: "b", value: 2 }],
    columns: [{ field: "value", label: "Value" }],
    getRowId: row => row.id,
  });
  const columns = state.columns;
  let reads = 0;
  Object.defineProperty(state, "columns", { get() { reads++; return columns; } });
  return { state, reads: () => reads };
}

describe("empty selected ranges", () => {
  it("does not inspect column definitions to reject an empty range", () => {
    const { state, reads } = fixture();
    expect(isCominsCellInSelectedRange(state, { rowId: "a", columnId: "value" })).toBe(false);
    expect(reads()).toBe(0);
  });

  it("does not project columns when enumerating an empty range", () => {
    const { state, reads } = fixture();
    expect(getCominsSelectedCellRange(state)).toEqual([]);
    expect(reads()).toBe(0);
  });

  it("honors an explicitly empty range even when the state has a range", () => {
    const original = fixture().state;
    const state = selectCellRange(original, {
      anchor: { rowId: "a", columnId: "value" },
      focus: { rowId: "b", columnId: "value" },
    });
    const columns = state.columns;
    let reads = 0;
    Object.defineProperty(state, "columns", { get() { reads++; return columns; } });
    expect(getCominsSelectedCellRange(state, null)).toEqual([]);
    expect(reads).toBe(0);
    expect(isCominsCellInSelectedRange(state, { rowId: "b", columnId: "value" })).toBe(true);
    expect(reads).toBeGreaterThan(0);
  });
});
