import type { CominsEventRow } from "../model";

export type CominsRowHeight = number | "auto";
export type CominsRowHeightParams<TData> = { row: CominsEventRow<TData> };
export type CominsRowMeasurement<TData> = { row: TData; layoutKey: string; contentRevision?: object; height: number };

export function normalizeCominsRowHeight(value: number | undefined, fallback = 36) {
  return typeof value === "number" && Number.isFinite(value) && value > 0 ? value : fallback;
}

export function resolveCominsRowHeight<TData>(input: {
  value: CominsRowHeight | undefined;
  rowHeight: number;
  estimate?: number;
  measurement?: CominsRowMeasurement<TData>;
  row: TData;
  layoutKey: string;
  contentRevision?: object;
}) {
  const fallback = normalizeCominsRowHeight(input.rowHeight);
  const auto = input.value === "auto";
  const measurement = input.measurement;
  return {
    auto,
    height: auto
      ? measurement?.row === input.row && measurement.layoutKey === input.layoutKey && measurement.contentRevision === input.contentRevision
        ? measurement.height : normalizeCominsRowHeight(input.estimate, fallback)
      : normalizeCominsRowHeight(input.value as number | undefined, fallback),
  };
}
