import type { CominsRowId } from "../model";

export function findRowIndex(state: { rowIds: readonly CominsRowId[] }, rowId: CominsRowId) {
  return state.rowIds.findIndex((id) => id === rowId);
}

export function findColumn<TColumn extends { id: string }>(state: { columns: readonly TColumn[] }, columnId: string) {
  return state.columns.find((column) => column.id === columnId);
}

export function getNestedFieldValue(row: unknown, field: string): unknown {
  return field.split(".").reduce<unknown>((value, key) => {
    if (value == null || typeof value !== "object") {
      return undefined;
    }

    return (value as Record<string, unknown>)[key];
  }, row);
}
