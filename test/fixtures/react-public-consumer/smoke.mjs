import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { JSDOM } from "jsdom";

const dom = new JSDOM('<!doctype html><div id="app"></div>', { pretendToBeVisual: true });
for (const key of ["window", "document", "navigator", "HTMLElement", "Element", "Node", "MutationObserver", "getComputedStyle", "requestAnimationFrame", "cancelAnimationFrame"]) {
  Object.defineProperty(globalThis, key, { configurable: true, value: typeof dom.window[key] === "function" && /^(getComputedStyle|requestAnimationFrame|cancelAnimationFrame)$/.test(key) ? dom.window[key].bind(dom.window) : dom.window[key] });
}
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
const browserErrors = [];
dom.window.addEventListener("error", event => browserErrors.push(event.error ?? event.message));
// React detects input-event support at import time; initialize the browser first.
const { createElement, act, version } = await import("react");
const { createRoot } = await import("react-dom/client");
const root = await import("comins-table");
const core = await import("comins-table/core");
const clipboard = await import("comins-table/clipboard");
const selection = await import("comins-table/selection");


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

const container = document.getElementById("app");
const mounted = createRoot(container);
try {
  await act(async () => mounted.render(createElement(root.CominsTable, {
    columns: state.columns, data: edited.rows, getRowId: row => row.id,
  })));
  assert.ok(container.querySelector("strong"));
  assert.ok(container.textContent.includes("42"), "Packed React table renders edited data");
  let legacyCalls = 0;
  await act(async () => mounted.render(createElement(root.CominsTable, {
    columns: [{ field: "score", label: "Score", header: { render: () => createElement("b", null, "Standard header") },
      cell: { renderer: () => { legacyCalls++; return "Legacy"; }, render: ({ value }) => createElement("output", null, String(value)),
        tooltip: { render: ({ value }) => createElement("b", null, `Tooltip ${value}`) } } }],
    data: edited.rows, getRowId: row => row.id, expandedRowIds: ["a"],
    rowDetail: { render: ({ row }) => createElement("span", { "data-testid": "packed-detail" }, `Detail ${row.data.score}`) },
    summary: { columns: { score: { aggregate: "sum", render: ({ formattedValue }) => createElement("b", null, `Summary ${formattedValue}`) } } },
  })));
  assert.equal(legacyCalls, 0, "Standard render must suppress the legacy callback");
  assert.equal(container.querySelector("output").textContent, "42");
  assert.equal(container.querySelector('[data-testid="packed-detail"]').textContent, "Detail 42");
  assert.equal(container.querySelector('[data-testid="summary-cell-score"]').textContent, "Summary 42");
  const cell = container.querySelector('[data-testid="cell-a-score"]');
  await act(async () => { cell.focus(); await new Promise(resolve => setTimeout(resolve, 70)); });
  assert.equal(document.querySelector('[role="tooltip"]').textContent, "Tooltip 42");
  await act(async () => cell.dispatchEvent(new dom.window.KeyboardEvent("keydown", { bubbles: true, key: "Escape" })));
  assert.equal(document.querySelector('[role="tooltip"]'), null);
  assert.equal(root.resolveCominsSummaryValues, undefined);
  let filterModel = [];
  const filterData = [{ id: "a", score: 10 }, { id: "b", score: 20 }];
  const filterColumns = [{ field: "score", label: "Score", filter: { kind: "number", mode: "values", option: { render: p => createElement("b", null, p.option.label) } } }];
  const renderValues = () => mounted.render(createElement(root.CominsTable, { data: filterData, columns: filterColumns, getRowId: row => row.id,
    columnFiltering: { model: filterModel, openColumnId: "score", onChangeOpenColumnId: () => {}, onChangeModel: next => { filterModel = next; renderValues(); } } }));
  await act(async () => renderValues());
  const option = container.querySelector('input[type="checkbox"][aria-label="10"]');
  assert.ok(option, "Packed value-list checkbox must be present");
  await act(async () => option.click());
  assert.deepEqual(filterModel, [{ columnId: "score", operator: "in", values: [20] }]);
  assert.equal(container.querySelector('input[aria-label="10"]').checked, false);
  assert.equal(container.querySelector('[data-testid="row-a"]'), null);
  assert.ok(container.querySelector('[data-testid="row-b"]'));
  assert.deepEqual(browserErrors, [], "Packed React interactions must not emit uncaught DOM errors");

} finally {
  await act(async () => mounted.unmount());
  assert.equal(container.childElementCount, 0);
  dom.window.close();
}
console.log(`React ${version}: packed root/clipboard/selection/CSS runtime and client mount passed`);
