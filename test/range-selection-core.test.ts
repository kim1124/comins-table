import { describe, expect, it } from "vitest";

import {
  clearCominsCellRange,
  createCominsTableState,
  getCominsSelectedCellRange,
  isCominsCellInSelectedRange,
  selectCellRange,
} from "../src";

type PersonRow = {
  age: number;
  id: string;
  name: string;
  role: string;
};

const rows: PersonRow[] = [
  { age: 31, id: "a", name: "Alpha", role: "Owner" },
  { age: 42, id: "b", name: "Beta", role: "Editor" },
  { age: 27, id: "c", name: "Gamma", role: "Viewer" },
];

const columns = [
  { field: "name", label: "Name" },
  { field: "age", label: "Age" },
  { field: "role", label: "Role" },
] as const;

function createState() {
  return createCominsTableState<PersonRow>({
    columns,
    getRowId: (row) => row.id,
    rows,
  });
}

describe("comins-table range selection core", () => {
  it("expands a rectangular selected cell range in row and visible column order", () => {
    let state = createState();

    state = selectCellRange(state, {
      anchor: { columnId: "name", rowId: "a" },
      focus: { columnId: "role", rowId: "c" },
    });

    expect(state.selection.range).toEqual({
      anchor: { columnId: "name", rowId: "a" },
      focus: { columnId: "role", rowId: "c" },
    });
    expect(getCominsSelectedCellRange(state).map((cell) => `${String(cell.rowId)}:${cell.columnId}`)).toEqual([
      "a:name",
      "a:age",
      "a:role",
      "b:name",
      "b:age",
      "b:role",
      "c:name",
      "c:age",
      "c:role",
    ]);
    expect(isCominsCellInSelectedRange(state, { columnId: "age", rowId: "b" })).toBe(true);
    expect(isCominsCellInSelectedRange(state, { columnId: "name", rowId: "a" })).toBe(true);
  });

  it("clears the selected range without clearing row selection", () => {
    let state = createState();

    state = selectCellRange(state, {
      anchor: { columnId: "age", rowId: "b" },
      focus: { columnId: "role", rowId: "c" },
    });
    state = clearCominsCellRange(state);

    expect(state.selection.range).toBeNull();
    expect(getCominsSelectedCellRange(state)).toEqual([]);
  });
});
