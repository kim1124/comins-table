export * from "./core/layout/row-height";

import type { CominsRowId } from "./model";
import type { CominsRowMeasurement } from "./core/layout/row-height";

export function reconcileCominsRowMeasurements<TData>(
  measurements: Map<CominsRowId, CominsRowMeasurement<TData>>,
  rowIds: readonly CominsRowId[],
  rows: readonly TData[],
) {
  if (measurements.size === 0) return;
  const currentRows = new Map<CominsRowId, TData | undefined>();
  rowIds.forEach((id, index) => currentRows.set(id, rows[index]));
  for (const [id, measurement] of measurements) {
    if (!currentRows.has(id) || currentRows.get(id) !== measurement.row) measurements.delete(id);
  }
}
