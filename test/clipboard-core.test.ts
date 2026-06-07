import { describe, expect, it } from "vitest";

import {
  copyKmsfCell,
  copyKmsfCellRange,
  copyKmsfRow,
  createKmsfDataTableState,
  fillKmsfCellRange,
  pasteKmsfCell,
  pasteKmsfCellRange,
  pasteKmsfRow,
  queryKmsfRows,
  selectCellRange,
} from "../src";

type PersonRow = {
  age: number;
  id: string;
  locked: string;
  name: string;
};

const rows: PersonRow[] = [
  { age: 31, id: "a", locked: "A-lock", name: "Alpha" },
  { age: 42, id: "b", locked: "B-lock", name: "Beta" },
  { age: 27, id: "c", locked: "C-lock", name: "Gamma" },
];

const columns = [
  { field: "name", label: "Name" },
  { field: "age", label: "Age" },
  { field: "locked", label: "Locked", props: { copyable: false, pasteable: false } },
] as const;

function createState() {
  return createKmsfDataTableState<PersonRow>({
    columns,
    getRowId: (row) => row.id,
    rows,
  });
}

describe("@kmsf/data-table clipboard core", () => {
  it("inserts a copied row after the target row with a generated id", () => {
    let state = createState();
    const copied = copyKmsfRow(state, "a");

    state = pasteKmsfRow(state, copied, { mode: "insert-after", targetRowId: "b" });

    expect(queryKmsfRows(state).map((row) => row.id)).toEqual(["a", "b", "a-copy-1", "c"]);
    expect(queryKmsfRows(state)[2]).toMatchObject({ age: 31, id: "a-copy-1", name: "Alpha" });
  });

  it("keeps target row id when overwriting an existing row", () => {
    let state = createState();
    const copied = copyKmsfRow(state, "a");

    state = pasteKmsfRow(state, copied, { mode: "overwrite", targetRowId: "b" });

    expect(queryKmsfRows(state).find((row) => row.id === "b")).toEqual({
      age: 31,
      id: "b",
      locked: "A-lock",
      name: "Alpha",
    });
  });

  it("overwrites a target cell unless the column disables copy or paste", () => {
    let state = createState();

    const copiedName = copyKmsfCell(state, { columnId: "name", rowId: "b" });
    state = pasteKmsfCell(state, { columnId: "name", rowId: "a" }, copiedName);
    expect(queryKmsfRows(state)[0]?.name).toBe("Beta");

    const blockedCopy = copyKmsfCell(state, { columnId: "locked", rowId: "b" });
    expect(blockedCopy).toBeNull();

    const copiedAge = copyKmsfCell(state, { columnId: "age", rowId: "b" });
    state = pasteKmsfCell(state, { columnId: "locked", rowId: "a" }, copiedAge);
    expect(queryKmsfRows(state)[0]?.locked).toBe("A-lock");
  });

  it("copies and pastes a selected cell range within existing row boundaries", () => {
    let state = createState();

    state = selectCellRange(state, {
      anchor: { columnId: "name", rowId: "a" },
      focus: { columnId: "age", rowId: "b" },
    });

    const copied = copyKmsfCellRange(state);
    state = pasteKmsfCellRange(state, { columnId: "name", rowId: "b" }, copied);

    expect(copied?.text).toBe("Alpha\t31\nBeta\t42");
    expect(queryKmsfRows(state)).toEqual([
      { age: 31, id: "a", locked: "A-lock", name: "Alpha" },
      { age: 31, id: "b", locked: "B-lock", name: "Alpha" },
      { age: 42, id: "c", locked: "C-lock", name: "Beta" },
    ]);
  });

  it("skips guarded cells when pasting a range or filling a target range", () => {
    let state = createState();

    state = selectCellRange(state, {
      anchor: { columnId: "name", rowId: "a" },
      focus: { columnId: "age", rowId: "a" },
    });

    const copied = copyKmsfCellRange(state);
    state = pasteKmsfCellRange(state, { columnId: "locked", rowId: "b" }, copied);

    expect(queryKmsfRows(state)[1]).toEqual({ age: 42, id: "b", locked: "B-lock", name: "Beta" });

    state = fillKmsfCellRange(state, {
      source: { columnId: "name", rowId: "a" },
      target: {
        anchor: { columnId: "locked", rowId: "b" },
        focus: { columnId: "locked", rowId: "c" },
      },
    });

    expect(queryKmsfRows(state).map((row) => row.locked)).toEqual(["A-lock", "B-lock", "C-lock"]);
  });
});
