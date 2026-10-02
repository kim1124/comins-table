import { createElement } from "react";
import { describe, expect, it } from "vitest";
import * as react from "../src";
import { createCominsTableState } from "../src/core/state/table";
import { projectReactState } from "../src/react/model";

const modules = import.meta.glob("../src/core/editing/*.ts", { eager: true });
function neutral() {
  for (const name of ["cells", "clipboard", "export"]) {
    expect(modules[`../src/core/editing/${name}.ts`], `neutral editing ${name}`).toBeDefined();
  }
  return {
    ...modules["../src/core/editing/cells.ts"],
    ...modules["../src/core/editing/clipboard.ts"],
    ...modules["../src/core/editing/export.ts"],
  } as typeof import("../src/core/editing/cells") & typeof import("../src/core/editing/clipboard") & typeof import("../src/core/editing/export");
}
const address = (rowId: number, columnId = "score") => ({ rowId, columnId });
const range = (from: number, to: number) => ({ anchor: address(from), focus: address(to) });
const rows = () => [{ id: 7, score: 7 }, { id: 1, score: 1 }, { id: 2, score: 2 }];
const getRowId = (row: { id: number }) => row.id;

describe("editing atomicity across the React and neutral boundaries", () => {
  for (const target of ["React", "Core"] as const) {
    it(`${target}: rejects the second Fill target without publishing the first`, () => {
      const checked: unknown[] = [];
      const cell = { validateFill: ({ row, value }: { row: { id: react.CominsRowId; dataIndex: number; data: { score: number } }; value: unknown }) => {
        checked.push([row.id, row.dataIndex, row.data.score, value]);
        if (row.id === 2) throw new Error("second target rejected");
      } };
      const input = { rows: rows(), getRowId, columns: [{ field: "score", label: "Score", cell }] };
      const reactState = react.createCominsTableState(input), coreState = createCominsTableState(input);
      const source = target === "React" ? reactState : coreState;
      const originalRows = source.rows;
      const apply = () => target === "React"
        ? react.fillCominsCellRange(reactState, { source: address(7), target: range(1, 2) })
        : neutral().fillCominsCellRange(coreState, { source: address(7), target: range(1, 2) });
      expect(apply).toThrow("second target rejected");
      expect(checked).toEqual([[1, 1, 1, 7], [2, 2, 2, 7]]);
      expect(source.rows).toBe(originalRows);
      expect(input.rows.map(row => row.score)).toEqual([7, 1, 2]);
    });
    it(`${target}: parser failure retains original rows after an earlier candidate`, () => {
      const input = { rows: rows(), getRowId, columns: [{ field: "score", label: "Score", cell: {
        parseClipboard: ({ text }: { text: string }) => { if (text === "bad") throw new Error("invalid score"); return Number(text); },
      } }] };
      const reactState = react.createCominsTableState(input), coreState = createCominsTableState(input);
      const source = target === "React" ? reactState : coreState;
      const originalRows = source.rows;
      const apply = () => target === "React"
        ? react.pasteCominsText(reactState, address(1), "9\nbad")
        : neutral().pasteCominsText(coreState, address(1), "9\nbad");
      expect(apply).toThrow("invalid score");
      expect(source.rows).toBe(originalRows);
      expect(input.rows.map(row => row.score)).toEqual([7, 1, 2]);
    });
  }
});

describe("neutral editing policies", () => {
  it("short-circuits copy and paste for disabled cells", () => {
    const api = neutral();
    const state = createCominsTableState({ getRowId, rows: rows(), columns: [{ field: "score", label: "Score", cell: {
      disabled: payload => payload.row.id === 1,
      copyable: payload => { expect(payload.row.id).not.toBe(1); return true; },
      pasteable: payload => { expect(payload.row.id).not.toBe(1); return true; },
    } }] });
    expect(api.isCominsCellDisabled(state, state.rows[1]!, 1, state.columns[0]!)).toBe(true);
    expect(api.copyCominsCell(state, address(1))).toBeNull();
    expect(api.pasteCominsCell(state, address(1), { kind: "cell", text: "9", value: 9 })).toBe(state);
    expect(api.isCominsCellDisabled(state, state.rows[0]!, 7, state.columns[0]!)).toBe(false);
    expect(api.copyCominsCell(state, address(7))?.value).toBe(7);
  });
  it("keeps guarded matrix positions and uses original rows for every parser", () => {
    const api = neutral();
    const checked: unknown[] = [];
    const state = createCominsTableState({ getRowId, rows: [{ id: 1, a: "old", locked: "keep", c: "old-c" }], columns: [
      { field: "a", label: "A" }, { field: "locked", label: "Locked", cell: { pasteable: false, copyable: false } },
      { field: "c", label: "C", cell: { parseClipboard: payload => { checked.push(payload.row.data.a); return payload.text; } } },
    ] });
    const next = api.pasteCominsText(state, address(1, "a"), "new\tskip\tnew-c");
    expect(next.rows).toEqual([{ id: 1, a: "new", locked: "keep", c: "new-c" }]);
    expect(checked).toEqual(["old"]);
    expect(state.rows[0]?.a).toBe("old");
    expect(api.copyCominsCellRange(next, { anchor: address(1, "a"), focus: address(1, "c") })?.text).toBe("new\t\tnew-c");
  });
  it("retains existing no-op identity without making legacy typed paste a no-op", () => {
    const api = neutral();
    const state = createCominsTableState({ getRowId, rows: rows(), columns: [{ field: "score", label: "Score", cell: { parseClipboard: p => Number(p.text) } }] });
    expect(api.pasteCominsText(state, address(7), "7")).toBe(state);
    expect(api.fillCominsCellRange(state, { source: address(7), target: range(7, 7) })).toBe(state);
    expect(api.pasteCominsCell(state, address(7), null)).toBe(state);
    const copied = api.copyCominsCell(state, address(7));
    expect(api.pasteCominsCell(state, address(7), copied)).not.toBe(state);
    expect(api.pasteCominsCellRange(state, address(7), { kind: "cell-range", rows: [[{ columnId: "score", value: 7, text: "7" }]], text: "7" })).not.toBe(state);
  });
  it("rejects oversized Fill before destination guards or partial changes", () => {
    const api = neutral();
    let checks = 0;
    const state = createCominsTableState({ rows: Array.from({ length: 100001 }, (_, id) => ({ id, score: id })), columns: [
      { field: "score", label: "Score", cell: { pasteable: () => { checks++; return true; } } },
    ] });
    expect(() => api.fillCominsCellRange(state, { source: address(0), target: range(0, 100000) })).toThrow("100000 cells");
    expect(checks).toBe(0);
    expect(state.rows[1]?.score).toBe(1);
  });
  it("keeps raw clipboard values separate from formatted CSV and JSON", () => {
    const api = neutral();
    const state = createCominsTableState({ getRowId, rows: rows(), columns: [{ field: "score", label: "Score" }] });
    expect(api.copyCominsCell(state, address(7))).toEqual({ kind: "cell", text: "7", value: 7 });
    const options = { rows: [state.rows[0]!], columns: [{ id: "score", label: "Score", value: (row: { score: number }) => row.score, format: (row: { score: number }) => `score,${row.score}` }] };
    expect(api.exportCominsRowsToCsv(options)).toBe("Score\n7");
    expect(api.exportCominsRowsToCsv({ ...options, valueSource: "formatted" })).toBe('Score\n"score,7"');
    expect(JSON.parse(api.exportCominsRowsToJson({ ...options, valueSource: "formatted" }))).toEqual([{ Score: "score,7" }]);
  });
});

describe("React edit-policy projection", () => {
  for (const target of ["React", "Core bridge"] as const) {
    it(`${target}: resolves props once and preserves original payloads and parser receiver`, () => {
      const label = createElement("strong", null, "Score");
      const events: unknown[] = [];
      const theme = { className: "consumer" };
      const state = react.selectRows(react.createCominsTableState({ getRowId, rows: rows(), theme, columns: [{ field: "score", label, cell: {
        props: payload => {
          events.push("props");
          expect(payload.column.definition).toBe(state.columns[0]);
          expect(payload.column.label).toBe(label);
          expect(payload.row.data).toBe(state.rows[1]);
          expect([payload.row.index, payload.row.dataIndex, payload.row.selected, payload.selection.selectedRowCount]).toEqual([1, 1, true, 2]);
          return { disabled: guard => { expect(guard).toBe(payload); events.push("disabled"); return false; },
            pasteable: guard => { expect(guard).toBe(payload); events.push("pasteable"); return true; } };
        },
        parseClipboard(payload) {
          expect(this).toBe(state.columns[0]!.cell);
          expect(payload.column.definition).toBe(state.columns[0]);
          expect(payload.column.label).toBe(label);
          events.push(["parse", payload.row.dataIndex, payload.value]);
          return Number(payload.text);
        },
      } }] }), [7, 1]);
      const next = target === "React" ? react.pasteCominsText(state, address(1), "9", [1, 7])
        : neutral().pasteCominsText(projectReactState(state).core, address(1), "9", [1, 7]);
      expect(events).toEqual(["props", "disabled", "pasteable", ["parse", 1, 1]]);
      expect(next.rows.map(row => row.score)).toEqual([7, 9, 2]);
      expect(state.rows.map(row => row.score)).toEqual([7, 1, 2]);
      if (target === "React") {
        expect(next.columns).toBe(state.columns);
        expect(next).toHaveProperty("theme", theme);
      }
    });
  }
});
