export type CominsSummaryBuiltin = "avg" | "count" | "max" | "min" | "sum";

function getNumericValues(values: readonly unknown[]) {
  return values.filter((value): value is number => typeof value === "number" && Number.isFinite(value));
}

export function getBuiltinSummaryValue(kind: CominsSummaryBuiltin, values: readonly unknown[]): number | null {
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
