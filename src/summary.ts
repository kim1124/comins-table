import type React from "react";

import type { CominsTableRuntimeColumn } from "./core";

export type CominsSummaryBuiltin = "avg" | "count" | "max" | "min" | "sum";

export type CominsSummaryAggregator<TData> = (input: {
  column: CominsTableRuntimeColumn<TData>;
  rows: readonly TData[];
  values: readonly unknown[];
}) => React.ReactNode;

export type CominsTableSummaryConfig<TData> = {
  columns: Partial<Record<string, CominsSummaryBuiltin | CominsSummaryAggregator<TData>>>;
  label?: React.ReactNode;
};

function getNestedFieldValue(row: unknown, field: string): unknown {
  return field.split(".").reduce<unknown>((value, key) => {
    if (value == null || typeof value !== "object") {
      return undefined;
    }

    return (value as Record<string, unknown>)[key];
  }, row);
}

function getNumericValues(values: readonly unknown[]) {
  return values.filter((value): value is number => typeof value === "number" && Number.isFinite(value));
}

function getBuiltinSummaryValue(kind: CominsSummaryBuiltin, values: readonly unknown[]): React.ReactNode {
  if (kind === "count") {
    return values.length;
  }

  const numericValues = getNumericValues(values);

  if (numericValues.length === 0) {
    return null;
  }

  if (kind === "sum") {
    return numericValues.reduce((total, value) => total + value, 0);
  }

  if (kind === "avg") {
    return numericValues.reduce((total, value) => total + value, 0) / numericValues.length;
  }

  return kind === "min" ? Math.min(...numericValues) : Math.max(...numericValues);
}

export function getCominsSummaryValues<TData>(
  rows: readonly TData[],
  columns: readonly CominsTableRuntimeColumn<TData>[],
  summary: CominsTableSummaryConfig<TData>,
): Record<string, React.ReactNode> {
  return Object.entries(summary.columns).reduce<Record<string, React.ReactNode>>((valuesByColumnId, [columnId, aggregate]) => {
    const column = columns.find((candidate) => candidate.id === columnId);

    if (!column || !aggregate) {
      return valuesByColumnId;
    }

    const values = rows.map((row) => getNestedFieldValue(row, column.field));
    valuesByColumnId[columnId] =
      typeof aggregate === "function" ? aggregate({ column, rows, values }) : getBuiltinSummaryValue(aggregate, values);

    return valuesByColumnId;
  }, {});
}
