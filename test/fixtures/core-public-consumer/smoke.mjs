import assert from "node:assert/strict";
import { createCominsTableState, queryCominsRows, setCominsSortModel } from "comins-table/core";

const rows = [{ id: "a", score: 20 }, { id: "b", score: 10 }];
const original = structuredClone(rows);
const state = createCominsTableState({
  rows, columns: [{ field: "score", label: "Score", sort: true }], getRowId: (row) => row.id,
});
assert.deepEqual(state.rowIds, ["a", "b"]);
assert.deepEqual(queryCominsRows(state).map((row) => row.id), ["a", "b"]);
const rule = { columnId: "score", direction: "asc" };
const sorted = setCominsSortModel(state, [rule]);
assert.deepEqual(sorted.sortModel, [rule]);
assert.deepEqual(sorted.sort, rule);
assert.deepEqual(state.sortModel, []);
assert.deepEqual(rows, original);
