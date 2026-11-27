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
  it("matches enumerated membership across grouped hidden pinned and reordered layouts", () => {
    const rowOrders = [["a", "b", "c"], ["c", "b", "a"], ["b", "a", "b", "c"]];
    for (const order of [["name", "age", "role"], ["role", "age", "name"]]) {
      for (const hidden of [false, true]) {
        for (const groupHidden of [false, true]) {
          let state = createCominsTableState<PersonRow>({
            columns, rows, getRowId: row => row.id,
            columnGroups: [{ id: "profile", label: "Profile", children: ["name", "age"] }],
          });
          state.columnOrder = order;
          state.columnState.age!.hidden = hidden;
          state.columnGroupState.profile!.hidden = groupHidden;
          if (order[0] === "role") state.columnState.role!.pinned = "left";
          state = selectCellRange(state, { anchor: { rowId: "a", columnId: "name" }, focus: { rowId: "c", columnId: "role" } });
          for (const rowIds of rowOrders) {
            const cells = getCominsSelectedCellRange(state, state.selection.range, rowIds);
            for (const rowId of ["a", "b", "c", "missing"]) {
              for (const columnId of ["name", "age", "role", "missing"]) {
                expect(isCominsCellInSelectedRange(state, { rowId, columnId }, rowIds)).toBe(
                  cells.some(cell => cell.rowId === rowId && cell.columnId === columnId),
                );
              }
            }
          }
        }
      }
    }
  });

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

  it("expands and tests ranges in an explicit grouped leaf order", () => {
    let state = createState();

    state = selectCellRange(state, {
      anchor: { columnId: "name", rowId: "c" },
      focus: { columnId: "age", rowId: "a" },
    });

    expect(
      getCominsSelectedCellRange(state, state.selection.range, ["c", "a"])
        .map((cell) => `${String(cell.rowId)}:${cell.columnId}`),
    ).toEqual(["c:name", "c:age", "a:name", "a:age"]);
    expect(
      isCominsCellInSelectedRange(state, { columnId: "age", rowId: "b" }, ["c", "a"]),
    ).toBe(false);
  });
});
