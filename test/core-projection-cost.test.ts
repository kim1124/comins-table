import { expect, it } from "vitest";
import * as core from "../src/core";
import * as legacy from "../src/react/core-compat";
import { copySelectionData } from "../src/selection-data";

const columns = [{ field: "a", label: "A" }];

it("indexes row IDs once for selection and range copy", () => {
  const n = 512;
  const rows = Array.from({ length: n }, (_, index) => ({ a: index }));
  const state = legacy.createCominsTableState({ rows, columns: columns.slice(0, 1) });
  let numericReads = 0;
  state.rowIds = new Proxy(state.rowIds, { get(target, key, receiver) {
    if (typeof key === "string" && /^\d+$/.test(key)) numericReads++;
    return Reflect.get(target, key, receiver);
  } });
  const selected = legacy.selectCellRange(state, { anchor: { rowId: 0, columnId: "a" }, focus: { rowId: n - 1, columnId: "a" } });
  expect(copySelectionData(selected, "cells")?.data.rows).toHaveLength(n);
  expect(numericReads).toBeLessThan(n * 10);
  numericReads = 0;
  expect(legacy.copyCominsCellRange(selected)?.rows).toHaveLength(n);
  expect(numericReads).toBeLessThan(n * 6);
});

it("resolves sort columns ahead of row comparisons", () => {
  const rowCount = 256;
  const columnCount = 24;
  const sortId = String(columnCount - 1);
  const state = core.createCominsTableState({
    rows: Array.from({ length: rowCount }, (_, index) => ({ value: rowCount - index })),
    columns: Array.from({ length: columnCount }, (_, index) => ({ field: "value", id: String(index), label: String(index), sort: true })),
    sort: { columnId: sortId, direction: "asc" },
  });
  let columnIdReads = 0;
  let comparisons = 0;
  for (const column of state.columns) {
    const id = column.id;
    Object.defineProperty(column, "id", { get() { columnIdReads++; return id; } });
    if (id === sortId) column.sort = (left, right) => { comparisons++; return Number(left) - Number(right); };
  }
  expect(core.getCominsSortedRowIndexes(state)).toEqual(Array.from({ length: rowCount }, (_, index) => rowCount - index - 1));
  expect(comparisons).toBe(rowCount - 1);
  expect(columnIdReads).toBe(columnCount);
});
