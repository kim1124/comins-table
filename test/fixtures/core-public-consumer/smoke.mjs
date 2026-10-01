import assert from "node:assert/strict";
import { createCominsTableState, queryCominsRows, setCominsSortModel, pasteCominsText, fillCominsCellRange } from "comins-table/core";

const rows = [{ id: "a", score: 20 }, { id: "b", score: 10 }];
const original = structuredClone(rows);
const state = createCominsTableState({
  rows, columns: [{ field: "score", label: "Score", sort: true, cell: {
    disabled: ({ row }) => row.data.score < 0,
    pasteable: true,
    parseClipboard: ({ text }) => { if (text === "bad") throw new Error("invalid score"); return Number(text); },
    validateFill: ({ value }) => typeof value === "number",
  } }], getRowId: (row) => row.id,
});
assert.deepEqual(state.rowIds, ["a", "b"]);
assert.deepEqual(queryCominsRows(state).map((row) => row.id), ["a", "b"]);
const rule = { columnId: "score", direction: "asc" };
const sorted = setCominsSortModel(state, [rule]);
assert.deepEqual(sorted.sortModel, [rule]);
assert.deepEqual(sorted.sort, rule);
assert.deepEqual(state.sortModel, []);
assert.deepEqual(rows, original);
const address = { rowId: "a", columnId: "score" };
const edited = pasteCominsText(state, address, "30");
assert.deepEqual(edited.rows.map(row => row.score), [30, 10]);
assert.equal(pasteCominsText(edited, address, "30"), edited);
const filled = fillCominsCellRange(edited, { source: address, target: { anchor: address, focus: { ...address, rowId: "b" } } });
assert.deepEqual(filled.rows.map(row => row.score), [30, 30]);
assert.throws(() => pasteCominsText(state, address, "50\nbad"), /invalid score/);
assert.deepEqual(rows, original);
assert.equal("theme" in state, false);
