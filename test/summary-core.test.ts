import { describe, expect, it, vi } from "vitest";

import { createCominsTableState, getCominsSummaryValues } from "../src";

type PersonRow = {
  age: number | string;
  id: string;
  name: string;
};

const columns = [
  { field: "name", label: "Name" },
  { field: "age", label: "Age" },
] as const;

const rows: PersonRow[] = [
  { age: 31, id: "a", name: "Alpha" },
  { age: 42, id: "b", name: "Beta" },
];

const state = createCominsTableState({
  columns,
  getRowId: (row: PersonRow) => row.id,
  rows,
});

describe("comins-table summary core", () => {
  it("aggregates every controlled row before pagination", () => {
    expect(
      getCominsSummaryValues(state.rows, state.columns, {
        columns: { age: "sum", name: "count" },
      }),
    ).toEqual({ age: 73, name: 2 });
  });

  it("ignores non-numeric values for numeric aggregates", () => {
    expect(
      getCominsSummaryValues(
        [
          { age: 31, id: "a", name: "Alpha" },
          { age: "unknown", id: "b", name: "Beta" },
        ],
        state.columns,
        { columns: { age: "avg" } },
      ),
    ).toEqual({ age: 31 });
  });

  it("passes source rows and resolved values to custom aggregators", () => {
    const aggregate = vi.fn(({ rows: aggregateRows, values }) => `${aggregateRows.length}:${values.join(",")}`);

    expect(getCominsSummaryValues(state.rows, state.columns, { columns: { age: aggregate } })).toEqual({
      age: "2:31,42",
    });
    expect(aggregate).toHaveBeenCalledOnce();
  });
});
