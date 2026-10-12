import type { CominsColumnFilterKind, CominsColumnFilterValue } from "../model";

export function isEmptyFilterValue(value: unknown) {
  return value === null || value === undefined || value === "";
}

export function getDateDayValue(value: unknown): number | null {
  if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/u.test(value)) {
    const [year, month, day] = value.split("-").map(Number);
    const normalized = Date.UTC(year!, month! - 1, day!);
    const date = new Date(normalized);

    return date.getUTCFullYear() === year && date.getUTCMonth() === month! - 1 && date.getUTCDate() === day
      ? normalized
      : null;
  }

  const date = value instanceof Date
    ? value
    : typeof value === "number" || typeof value === "string"
      ? new Date(value)
      : null;

  if (!date || !Number.isFinite(date.getTime())) {
    return null;
  }

  return Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());
}

export function normalizeFilterOptionValue(config: { kind: CominsColumnFilterKind; caseSensitive?: boolean }, raw: unknown): { value: CominsColumnFilterValue; key: string; label: string } | null {
  if (isEmptyFilterValue(raw)) return { value: null, key: JSON.stringify([config.kind, null]), label: "(Empty)" };
  let value: CominsColumnFilterValue;
  let comparison: boolean | number | string;
  switch (config.kind) {
    case "text": value = String(raw); comparison = config.caseSensitive ? value : value.toLocaleLowerCase(); break;
    case "number": if (typeof raw !== "number" || !Number.isFinite(raw)) return null; value = raw === 0 ? 0 : raw; comparison = value; break;
    case "boolean": if (typeof raw !== "boolean") return null; value = raw; comparison = raw; break;
    case "date": {
      const day = getDateDayValue(raw);
      if (day === null) return null;
      value = new Date(day).toISOString().split("T")[0]!; comparison = day; break;
    }
  }
  return { value, key: JSON.stringify([config.kind, comparison]), label: typeof value === "boolean" ? value ? "True" : "False" : String(value) };
}
