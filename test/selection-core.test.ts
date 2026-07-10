import { describe, expect, it } from "vitest";

import {
  clearCominsSelection,
  createCominsTableState,
  deleteCominsRows,
  isCominsCellSelected,
  isCominsRowSelected,
  replaceCominsRows,
  selectCell,
  selectRow,
  updateCominsRows,
} from "../src";

type PersonRow = {
  age: number;
  id: string;
  name: string;
};

const rows: PersonRow[] = [
  { age: 31, id: "a", name: "Alpha" },
  { age: 42, id: "b", name: "Beta" },
  { age: 27, id: "c", name: "Gamma" },
];

const columns = [
  { field: "name", label: "Name" },
  { field: "age", label: "Age" },
] as const;

function createState() {
  return createCominsTableState<PersonRow>({
    columns,
    getRowId: (row) => row.id,
    rows,
  });
}

describe("comins-table selection core", () => {
  it("supports single row, multi row, single cell, and clear selection", () => {
    let state = createState();

    state = selectRow(state, "a");
    expect(state.selection.rowIds).toEqual(["a"]);
    expect(isCominsRowSelected(state, "a")).toBe(true);

    state = selectRow(state, "b", { multi: true });
    expect(state.selection.rowIds).toEqual(["a", "b"]);

    state = selectRow(state, "a", { multi: true, toggle: true });
    expect(state.selection.rowIds).toEqual(["b"]);
    expect(isCominsRowSelected(state, "a")).toBe(false);

    state = selectCell(state, { columnId: "age", rowId: "c" });
    expect(state.selection.cell).toEqual({ columnId: "age", rowId: "c" });
    expect(isCominsCellSelected(state, { columnId: "age", rowId: "c" })).toBe(true);

    state = clearCominsSelection(state);
    expect(state.selection.rowIds).toEqual([]);
    expect(state.selection.cell).toBeNull();
  });

  it("clears selection for row identity changes but keeps it for value-only updates", () => {
    let state = createState();

    state = selectRow(state, "a");
    state = selectCell(state, { columnId: "name", rowId: "b" });
    state = updateCominsRows(state, [{ id: "b", patch: { name: "Beta updated" } }]);

    expect(state.selection.rowIds).toEqual(["a"]);
    expect(state.selection.cell).toEqual({ columnId: "name", rowId: "b" });

    state = deleteCominsRows(state, ["c"]);

    expect(state.selection.rowIds).toEqual([]);
    expect(state.selection.cell).toBeNull();

    state = selectRow(state, "a");
    state = selectCell(state, { columnId: "name", rowId: "b" });
    state = replaceCominsRows(state, [
      { age: 31, id: "a", name: "Alpha refreshed" },
      { age: 42, id: "b", name: "Beta refreshed" },
    ]);

    expect(state.selection.rowIds).toEqual([]);
    expect(state.selection.cell).toBeNull();
  });
});
