import { createElement } from "react";
import { describe, expect, it } from "vitest";
import * as legacy from "../src/core";

const modules = import.meta.glob("../src/react/model.ts", { eager: true });
function bridgeApi() {
  expect(modules["../src/react/model.ts"], "React state bridge").toBeDefined();
  return modules["../src/react/model.ts"] as typeof import("../src/react/model");
}
const label = createElement("strong", null, "Score");
const theme = { className: "consumer-theme" };
const rows = [{ id: "a", score: 9 }, { id: "b", score: 2 }];
const create = () => legacy.createCominsTableState({ rows, getRowId: row => row.id, theme,
  columns: [{ field: "score", label, sort: true, cell: { renderer: () => label } }],
  columnGroups: [{ id: "g", label, children: ["score"] }],
});

describe("React state bridge", () => {
  it("projects data without rendering metadata and restores the exact no-op state", () => {
    const { projectReactState, restoreReactState } = bridgeApi();
    const source = create(), bridge = projectReactState(source);
    expect(bridge.core.rows).toBe(source.rows);
    expect(bridge.core.selection).toBe(source.selection);
    expect(bridge.core.columns[0]?.label).toBe("score");
    expect(bridge.core.columnGroups[0]?.label).toBe("g");
    expect(bridge.core).not.toHaveProperty("theme");
    expect(bridge.core.columns[0]).not.toHaveProperty("cell.renderer");
    expect(restoreReactState(bridge, bridge.core)).toBe(source);
    const changed = restoreReactState(bridge, { ...bridge.core, showHeader: false });
    expect(changed.showHeader).toBe(false);
    expect(changed.columns).toBe(source.columns);
    expect(changed.columnGroups).toBe(source.columnGroups);
    expect(changed.theme).toBe(theme);
  });
  it("preserves root metadata and references through ordinary state operations", () => {
    const state = create();
    const sorted = legacy.setCominsSortModel(state, [{ columnId: "score", direction: "asc" }]);
    expect(legacy.setCominsSortModel(sorted, sorted.sortModel)).toBe(sorted);
    const next = legacy.updateCominsRows(legacy.selectRow(sorted, "a"), [{ id: "b", patch: { score: 4 } }]);
    expect(next.rows.map(row => row.score)).toEqual([9, 4]);
    expect(next.columns).toBe(state.columns);
    expect(next.columns[0]?.label).toBe(label);
    expect(next.columnGroups).toBe(state.columnGroups);
    expect(next.theme).toBe(theme);
    const header = legacy.getCominsHeaderRows(next);
    expect(header[0]?.[0]?.kind === "group" && header[0][0].group).toBe(state.columnGroups[0]);
    expect(legacy.getCominsVisibleColumns(next)[0]).toBe(state.columns[0]);
  });
  it("does not collapse distinct definitions sharing a column ID", () => {
    const api = bridgeApi();
    const state = legacy.createCominsTableState({ rows, columns: [{ id: "x", field: "score", label }, { id: "x", field: "id", label: "Second" }] });
    const bridge = api.projectReactState(state);
    expect(bridge.core.columns.map(column => column.field)).toEqual(["score", "id"]);
    const next = api.restoreReactState(bridge, { ...bridge.core, columns: [...bridge.core.columns] });
    expect(next.columns[0]).toBe(state.columns[0]);
    expect(next.columns[1]).toBe(state.columns[1]);
    expect(legacy.getCominsVisibleColumns(state)[0]).toBe(state.columns[0]);
  });
});
