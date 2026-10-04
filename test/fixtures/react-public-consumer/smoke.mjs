import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createElement, act, version } from "react";
import { createRoot } from "react-dom/client";
import * as root from "comins-table";
import * as core from "comins-table/core";
import * as clipboard from "comins-table/clipboard";
import * as selection from "comins-table/selection";
import { JSDOM } from "jsdom";

for (const api of [root, core]) {
  const row = { id: "001", score: 42 };
  const columns = [{ id: "score", value: item => item.score }];
  assert.equal(api.exportCominsRowsToCsv(api.createCominsTreeExportOptions({ columns, nodes: [{ item: row }], getRowId: item => item.id })),
    "score,__rowId,__parentId,__depth\n42,001,,0");
  assert.deepEqual(JSON.parse(api.exportCominsRowsToJson(api.createCominsGroupedExportOptions({
    columns, rows: [row], groups: ["all"], getGroupId: group => group, getRowGroupId: () => "all", getRowId: item => item.id,
  }))), [{ score: 42, __rowId: "001", __groupId: "all" }]);
  assert.deepEqual(row, { id: "001", score: 42 });
}

const label = createElement("strong", null, "Score");
let guardCalls = 0;
const state = root.createCominsTableState({
  rows: [{ id: "a", score: 10 }], getRowId: row => row.id,
  columns: [{ field: "score", label, cell: {
    props: () => { guardCalls++; return { pasteable: true }; },
    parseClipboard: ({ text }) => Number(text),
  } }],
});
const selected = selection.selectCell(state, { rowId: "a", columnId: "score" });
const edited = clipboard.pasteCominsText(selected, { rowId: "a", columnId: "score" }, "42");
assert.deepEqual(edited.rows, [{ id: "a", score: 42 }]);
assert.equal(state.rows[0].score, 10);
assert.equal(edited.columns[0].label, label);
assert.equal(edited.theme, state.theme);
assert.ok(guardCalls > 0, "React cell.props guard must execute");
assert.deepEqual(selected.selection.cells, [{ rowId: "a", columnId: "score" }]);
assert.equal(typeof root.setCominsTableTheme, "function");
assert.equal(core.setCominsTableTheme, undefined);
assert.equal(core.CominsTable, undefined);
assert.ok(readFileSync(new URL(import.meta.resolve("comins-table/styles.css")), "utf8").includes("--comins-table-"));

const dom = new JSDOM('<!doctype html><div id="app"></div>', { pretendToBeVisual: true });
for (const key of ["window", "document", "navigator", "HTMLElement", "Element", "Node", "MutationObserver", "getComputedStyle", "requestAnimationFrame", "cancelAnimationFrame"]) {
  Object.defineProperty(globalThis, key, { configurable: true, value: typeof dom.window[key] === "function" && /^(getComputedStyle|requestAnimationFrame|cancelAnimationFrame)$/.test(key) ? dom.window[key].bind(dom.window) : dom.window[key] });
}
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
const container = document.getElementById("app");
const mounted = createRoot(container);
try {
  await act(async () => mounted.render(createElement(root.CominsTable, {
    columns: state.columns, data: edited.rows, getRowId: row => row.id,
  })));
  assert.ok(container.querySelector("strong"));
  assert.ok(container.textContent.includes("42"), "Packed React table renders edited data");
} finally {
  await act(async () => mounted.unmount());
  assert.equal(container.childElementCount, 0);
  dom.window.close();
}
console.log(`React ${version}: packed root/clipboard/selection/CSS runtime and client mount passed`);
