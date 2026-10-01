import { createElement } from "react";
import { describe, expect, it } from "vitest";
import { createCominsTableState } from "../src";
import { getCominsSummaryValues } from "../src/summary";
import { normalizeCominsColumnFilterModel, getCominsFilteredRowIndexes } from "../src/filtering";
import { normalizeCominsRowGrouping, createCominsGroupModel, orderCominsGroupModel } from "../src/grouping";

const modules = import.meta.glob("../src/core/rows/summary.ts", { eager: true });
describe("Core aggregation and React render contracts", () => {
  it("calculates finite numeric aggregates and preserves count and empty semantics", () => {
    expect(modules["../src/core/rows/summary.ts"], "neutral summary").toBeDefined();
    const { getBuiltinSummaryValue } = modules["../src/core/rows/summary.ts"] as typeof import("../src/core/rows/summary");
    const values = [2, 8, null, "4", Infinity, NaN];
    expect((["sum", "avg", "min", "max", "count"] as const).map(kind => getBuiltinSummaryValue(kind, values))).toEqual([10, 5, 2, 8, 6]);
    expect(getBuiltinSummaryValue("sum", [])).toBeNull();
    expect(getBuiltinSummaryValue("count", [])).toBe(0);
  });
  it("keeps JSX labels and original column/filter payloads in React summaries and filtering", () => {
    const label = createElement("b", null, "Score");
    const output = createElement("i", null, "Custom summary");
    const rows = [{ id: "a", score: 1 }, { id: "b", score: 7 }];
    let seen: unknown;
    const state = createCominsTableState({ rows, columns: [{ field: "score", label, filter: { kind: "number", getValue: payload => { seen = payload.column; return payload.value; } } }] });
    const model = [{ columnId: "score", operator: "greaterThan", value: 3 }];
    expect(normalizeCominsColumnFilterModel({ columns: state.columns, model })[0]?.column).toBe(state.columns[0]);
    const indexes = getCominsFilteredRowIndexes({ columns: state.columns, model, rows: rows.map((data, dataIndex) => ({ data, dataIndex, id: data.id })) });
    expect(indexes).toEqual([1]);
    expect(seen).toBe(state.columns[0]);
    const filtered = indexes.map(index => rows[index]!);
    const result = getCominsSummaryValues(filtered, state.columns, { columns: { score: { aggregate: payload => { expect(payload.rows).toBe(filtered); expect(payload.column).toBe(state.columns[0]); expect(payload.values).toEqual([7]); return output; }, format: payload => { expect(payload.value).toBe(output); return payload.value; } } } });
    expect(result.score).toBe(output);
  });
  it("preserves group labels in the React wrapper and sort callback receivers", () => {
    const label = createElement("b", null, "Group");
    const state = createCominsTableState({ rows: [{ score: 9 }, { score: 2 }], columns: [{ field: "score", label, sort() { expect(this.label).toBe(label); return -1; } }] });
    const normalized = normalizeCominsRowGrouping({ columns: state.columns, config: { groups: ["g"], getGroupId: group => group, getGroupLabel: () => label, getRowGroupId: () => "g" } });
    expect(normalized.groupsById.get("g")?.label).toBe(label);
    const model = createCominsGroupModel({ ...normalized, getRowGroupId: () => "g", rows: state.rows.map((data, dataIndex) => ({ data, dataIndex, id: dataIndex })) });
    const ordered = orderCominsGroupModel({ columns: state.columns, model, rows: state.rows, sortModel: [{ columnId: "score", direction: "asc" }] });
    expect(ordered.groupsById.get("g")?.label).toBe(label);
    expect(ordered.orderedLeafSourceIndexesById.get("g")).toEqual([1, 0]);
  });
});
