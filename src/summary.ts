import type React from "react";

import type { CominsTableRuntimeColumn } from "./core";

export type CominsSummaryBuiltin = "avg" | "count" | "max" | "min" | "sum";

export type CominsSummaryAggregator<TData> = (input: {
  column: CominsTableRuntimeColumn<TData>;
  rows: readonly TData[];
  values: readonly unknown[];
}) => React.ReactNode;

export type CominsSummaryFormatPayload<TData> = {
  column: CominsTableRuntimeColumn<TData>;
  rows: readonly TData[];
  value: React.ReactNode;
  values: readonly unknown[];
};

export type CominsSummaryColumnConfig<TData> = {
  aggregate: CominsSummaryBuiltin | CominsSummaryAggregator<TData>;
  className?: string;
  colSpan?: number;
  format?: (payload: CominsSummaryFormatPayload<TData>) => React.ReactNode;
  style?: React.CSSProperties;
};

export type CominsSummaryColumn<TData> =
  | CominsSummaryBuiltin
  | CominsSummaryAggregator<TData>
  | CominsSummaryColumnConfig<TData>;

export type CominsTableSummaryConfig<TData> = {
  className?: string;
  columns: Partial<Record<string, CominsSummaryColumn<TData>>>;
  label?: React.ReactNode;
  style?: React.CSSProperties;
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
  return Object.entries(summary.columns).reduce<Record<string, React.ReactNode>>((valuesByColumnId, [columnId, configuredColumn]) => {
    const column = columns.find((candidate) => candidate.id === columnId);

    if (!column || !configuredColumn) {
      return valuesByColumnId;
    }

    const config =
      typeof configuredColumn === "object" && configuredColumn !== null ? configuredColumn : undefined;
    const aggregate =
      typeof configuredColumn === "object" && configuredColumn !== null
        ? configuredColumn.aggregate
        : configuredColumn;
    const values = rows.map((row) => getNestedFieldValue(row, column.field));
    const value =
      typeof aggregate === "function" ? aggregate({ column, rows, values }) : getBuiltinSummaryValue(aggregate, values);
    valuesByColumnId[columnId] = config?.format ? config.format({ column, rows, value, values }) : value;

    return valuesByColumnId;
  }, {});
}
