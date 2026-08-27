import { describe, expect, it, vi } from "vitest";

import type { CominsTableRuntimeColumn } from "../src/core";
import {
  getCominsFilteredRowIndexes,
  normalizeCominsColumnFilterModel,
} from "../src/filtering";

type FilterRow = {
  active: boolean | null;
  amount: number | null;
  createdAt: Date | string | null;
  id: string;
  meta: { label: string };
};

const rows: FilterRow[] = [
  { active: true, amount: 10, createdAt: "2026-08-25", id: "a", meta: { label: "Alpha" } },
  { active: false, amount: 20, createdAt: new Date("2026-08-26T23:30:00-04:00"), id: "b", meta: { label: "beta" } },
  { active: null, amount: null, createdAt: null, id: "c", meta: { label: "  " } },
  { active: true, amount: Number.NaN, createdAt: "invalid", id: "d", meta: { label: "Gamma" } },
];

const columns: CominsTableRuntimeColumn<FilterRow>[] = [
  { field: "meta.label", filter: { kind: "text" }, id: "label", label: "Label" },
  { field: "amount", filter: { kind: "number" }, id: "amount", label: "Amount" },
  { field: "createdAt", filter: { kind: "date" }, id: "createdAt", label: "Created" },
  { field: "active", filter: { kind: "boolean" }, id: "active", label: "Active" },
  { field: "id", id: "id", label: "ID" },
];

const sourceRows = rows.map((data, dataIndex) => ({ data, dataIndex, id: data.id }));

function filter(model: unknown, runtimeColumns = columns) {
  return getCominsFilteredRowIndexes({ columns: runtimeColumns, model, rows: sourceRows });
}

describe("column filtering", () => {
  it("returns every source index when the controlled model has no valid rule", () => {
    expect(filter(undefined)).toEqual([0, 1, 2, 3]);
    expect(filter({})).toEqual([0, 1, 2, 3]);
    expect(filter([
      { columnId: "unknown", operator: "contains", value: "a" },
      { columnId: "id", operator: "contains", value: "a" },
      { columnId: "amount", operator: "contains", value: 10 },
      { columnId: "label", operator: "contains", value: "" },
    ])).toEqual([0, 1, 2, 3]);
  });

  it("keeps the first valid rule for a Column and ignores malformed values", () => {
    const normalized = normalizeCominsColumnFilterModel({
      columns,
      model: [
        { columnId: "amount", operator: "greaterThan", value: Number.NaN },
        { columnId: "amount", operator: "greaterThan", value: 9 },
        { columnId: "amount", operator: "lessThan", value: 100 },
      ],
    });

    expect(normalized).toHaveLength(1);
    expect(normalized[0]).toMatchObject({ operator: "greaterThan", value: 9 });
  });

  it("supports case-insensitive text operators and treats whitespace as a value", () => {
    expect(filter([{ columnId: "label", operator: "contains", value: "ALP" }])).toEqual([0]);
    expect(filter([{ columnId: "label", operator: "startsWith", value: "be" }])).toEqual([1]);
    expect(filter([{ columnId: "label", operator: "endsWith", value: "MA" }])).toEqual([3]);
    expect(filter([{ columnId: "label", operator: "notContains", value: "a" }])).toEqual([2]);
    expect(filter([{ columnId: "label", operator: "equals", value: "  " }])).toEqual([2]);
  });

  it("honors caseSensitive and custom getValue without losing explicit empty values", () => {
    const getValue = vi.fn(({ row }: { row: FilterRow }) => row.id === "c" ? null : row.meta.label);
    const runtimeColumns: CominsTableRuntimeColumn<FilterRow>[] = [
      {
        field: "meta.label",
        filter: { caseSensitive: true, getValue, kind: "text" },
        id: "label",
        label: "Label",
      },
    ];

    expect(filter([{ columnId: "label", operator: "equals", value: "alpha" }], runtimeColumns)).toEqual([]);
    expect(filter([{ columnId: "label", operator: "isEmpty" }], runtimeColumns)).toEqual([2]);
    expect(getValue).toHaveBeenCalled();
  });

  it("supports finite number comparisons, normalized between endpoints, and empty checks", () => {
    expect(filter([{ columnId: "amount", operator: "greaterThanOrEqual", value: 20 }])).toEqual([1]);
    expect(filter([{ columnId: "amount", operator: "between", value: 25, valueTo: 5 }])).toEqual([0, 1]);
    expect(filter([{ columnId: "amount", operator: "notEquals", value: 10 }])).toEqual([1]);
    expect(filter([{ columnId: "amount", operator: "isEmpty" }])).toEqual([2]);
    expect(filter([{ columnId: "amount", operator: "isNotEmpty" }])).toEqual([0, 1, 3]);
  });

  it("normalizes date values to UTC calendar days and rejects invalid dates", () => {
    expect(filter([{ columnId: "createdAt", operator: "equals", value: "2026-08-25" }])).toEqual([0]);
    expect(filter([{ columnId: "createdAt", operator: "equals", value: "2026-08-27" }])).toEqual([1]);
    expect(filter([{
      columnId: "createdAt",
      operator: "between",
      value: "2026-08-27",
      valueTo: "2026-08-25",
    }])).toEqual([0, 1]);
    expect(filter([{ columnId: "createdAt", operator: "equals", value: "2026-02-30" }])).toEqual([0, 1, 2, 3]);
  });

  it("supports boolean equality and dedicated empty operators", () => {
    expect(filter([{ columnId: "active", operator: "equals", value: false }])).toEqual([1]);
    expect(filter([{ columnId: "active", operator: "notEquals", value: false }])).toEqual([0, 3]);
    expect(filter([{ columnId: "active", operator: "isEmpty" }])).toEqual([2]);
  });

  it("combines one valid rule per Column with AND", () => {
    expect(filter([
      { columnId: "label", operator: "contains", value: "a" },
      { columnId: "amount", operator: "greaterThan", value: 15 },
      { columnId: "active", operator: "equals", value: false },
    ])).toEqual([1]);
  });
});
