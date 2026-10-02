import { describe, expect, it } from "vitest";
import { execFileSync } from "node:child_process";
import { cpSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { resolve } from "node:path";

// Missing layer is a boundary failure, not an unresolved static import error.
const modules = import.meta.glob("../src/core/{state/table,layout/columns,selection/state}.ts", { eager: true });
const load = (path: string) => {
  expect(modules[path], `neutral module ${path}`).toBeDefined();
  return modules[path] as typeof import("../src/core/state/table") & typeof import("../src/core/layout/columns") & typeof import("../src/core/selection/state");
};
const rows = [{ id: 1, score: 9 }, { id: "1", score: 2 }, { id: "c", score: 5 }];
const input = () => ({ rows, getRowId: (row: typeof rows[number]) => row.id,
  columns: [{ field: "id", label: "ID", pinned: "left" as const }, { field: "score", label: "Score", sort: true }],
});

describe("neutral table operations", () => {
  it("compiles the actual model and algorithms with only ES2022 and no React installation", () => {
    const root = mkdtempSync(resolve(tmpdir(), "comins-neutral-model-"));
    try {
      cpSync(resolve("src"), resolve(root, "src"), { recursive: true });
      writeFileSync(resolve(root, "consumer.ts"), readFileSync("test/typecheck/core-neutral-model.ts", "utf8").replaceAll("../../src/", "./src/"));
      writeFileSync(resolve(root, "tsconfig.json"), JSON.stringify({ compilerOptions: {
        strict: true, noUncheckedIndexedAccess: true, skipLibCheck: false, noEmit: true,
        types: [], lib: ["ES2022"], target: "ES2022", module: "ESNext", moduleResolution: "Bundler",
      }, files: ["consumer.ts"] }));
      let diagnostics = "";
      try { execFileSync(resolve("node_modules/.bin/tsc"), ["-p", resolve(root, "tsconfig.json")], { encoding: "utf8", stdio: "pipe" }); }
      catch (error) { const failure = error as { stdout?: string; stderr?: string }; diagnostics = `${failure.stdout ?? ""}${failure.stderr ?? ""}` || String(error); }
      expect(diagnostics).toBe("");
    } finally { rmSync(root, { recursive: true, force: true }); }
  });
  it("keeps input rows and typed IDs without a renderer or theme", () => {
    const api = load("../src/core/state/table.ts");
    const state = api.createCominsTableState(input());
    expect(state.rows).toBe(rows);
    expect(state.rowIds).toEqual([1, "1", "c"]);
    expect(state).not.toHaveProperty("theme");
    expect(state.pagination).toEqual({ pageIndex: 0, pageSize: 3 });
  });
  it("normalizes sorting, preserves no-op identity and calculates page/virtual rows", () => {
    const api = load("../src/core/state/table.ts");
    const state = api.createCominsTableState(input());
    const sorted = api.setCominsSortModel(state, [{ columnId: "score", direction: "asc" }, { columnId: "id", direction: "desc" }]);
    expect(sorted.sortModel).toEqual([{ columnId: "score", direction: "asc" }]);
    expect(api.setCominsSortModel(sorted, sorted.sortModel)).toBe(sorted);
    expect(api.getCominsSortedRowIndexes(sorted)).toEqual([1, 2, 0]);
    expect(api.getCominsPageRows(sorted, { pageIndex: 1, pageSize: 1 })).toEqual([rows[2]]);
    expect(api.getCominsVirtualRows(sorted, { rowHeight: 10, scrollTop: 10, viewportHeight: 10, overscan: 0 })).toEqual({ rows: [rows[2]], startIndex: 1, endIndex: 2, totalHeight: 30, topSpacerHeight: 10, bottomSpacerHeight: 10 });
    expect(rows.map(row => row.score)).toEqual([9, 2, 5]);
  });
  it("updates only matching IDs and resets selection when membership changes", () => {
    const api = load("../src/core/state/table.ts");
    const selection = load("../src/core/selection/state.ts");
    const selected = selection.selectRow(api.createCominsTableState(input()), 1);
    const updated = api.updateCominsRows(selected, [{ id: "1", patch: { score: 7 } }]);
    expect(updated.rows.map(row => row.score)).toEqual([9, 7, 5]);
    expect(updated.selection).toBe(selected.selection);
    const removed = api.deleteCominsRows(updated, [1]);
    expect(removed.rowIds).toEqual(["1", "c"]);
    expect(removed.selection.rowIds).toEqual([]);
    expect(api.moveCominsRow(updated, "missing", 0)).toBe(updated);
    expect(api.addCominsRows(removed, [{ id: "d", score: 8 }]).rowIds).toEqual(["1", "c", "d"]);
    expect(api.replaceCominsRows(updated, rows).rows).toBe(rows);
  });
  it("keeps grouped headers, pinned order and hidden-column range semantics", () => {
    const api = load("../src/core/state/table.ts");
    const layout = load("../src/core/layout/columns.ts");
    const selection = load("../src/core/selection/state.ts");
    const state = api.createCominsTableState({ ...input(), columnGroups: [{ id: "g", label: "Metrics", children: ["score", "unknown", "score"] }] });
    expect(state.columnGroups[0]?.children).toEqual(["score"]);
    expect(layout.getCominsHeaderRows(state).map(row => row.map(cell => cell.kind))).toEqual([["column", "group"], ["column"]]);
    expect(layout.moveCominsColumn(state, "score", 0)).toBe(state);
    const selected = selection.selectCellRange(state, { anchor: { rowId: 1, columnId: "id" }, focus: { rowId: "1", columnId: "score" } });
    expect(selection.getCominsSelectedCellRange(selected)).toHaveLength(4);
    expect(selection.getCominsSelectedCellRange(layout.setCominsColumnHidden(selected, "score", true))).toEqual([]);
    expect(layout.getCominsVisibleColumns(layout.setCominsColumnGroupHidden(state, "g", true)).map(column => column.id)).toEqual(["id"]);
  });
});
