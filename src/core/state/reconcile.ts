import type { CominsRowId, CominsSelectionState, CominsTableState, CominsTableStateInput } from "../model";
import { normalizeColumns, normalizeColumnGroups, serializeColumnLayoutState, type ColumnLayoutDefinition, type ColumnGroupLayoutDefinition } from "../layout/columns";
import { canPreserveSelection, insertDeclaredColumnsIntoOrder, reconcileColumnOrderHistory } from "../../table-state";
import { createNormalizedCominsTableState, defaultGetRowId } from "./table";

const MAX_RETIRED_COLUMN_IDS = 128;

export type CoreReconciliationInput<TData> = Pick<CominsTableStateInput<TData>,
  "columnGroups" | "columns" | "rows" | "getRowId" | "pagination" | "showHeader">;

export type CoreReconciliationOptions<TData> = {
  current: CominsTableState<TData>;
  nextInput: CoreReconciliationInput<TData>;
  columnOrderHistory: readonly string[];
  retiredColumnIds?: readonly string[];
  dataChanged: boolean;
  getRowIdChanged: boolean;
  viewportIndices?: readonly number[];
};

/** Reconcile inputs without applying state, clearing caches, or notifying consumers. */
export function reconcileCoreState<TData>({ current, nextInput, columnOrderHistory, retiredColumnIds, dataChanged, getRowIdChanged, viewportIndices }: CoreReconciliationOptions<TData>): {
  state: CominsTableState<TData>;
  columnOrderHistory: string[];
  retiredColumnIds: string[];
  invalidatedDetailRowIds: CominsRowId[];
} {
  const columns = normalizeColumns(nextInput.columns);
  const columnGroups = normalizeColumnGroups(columns, nextInput.columnGroups);
  return reconcileNormalizedTableState({ current, nextInput, columnOrderHistory, retiredColumnIds, dataChanged, getRowIdChanged, viewportIndices, columns, columnGroups });
}

// Data-only reconciliation; adapters retain ownership of their normalized definitions.
export function reconcileNormalizedTableState<
  TData,
  TColumn extends ColumnLayoutDefinition & { sort?: unknown },
  TGroup extends ColumnGroupLayoutDefinition,
>({ current, nextInput, columnOrderHistory, retiredColumnIds, dataChanged, getRowIdChanged, viewportIndices, columns, columnGroups }: {
  current: Omit<CominsTableState<TData>, "columns" | "columnGroups"> & { columns: TColumn[]; columnGroups: TGroup[] };
  nextInput: Omit<CoreReconciliationInput<TData>, "columns" | "columnGroups">;
  columnOrderHistory: readonly string[];
  retiredColumnIds?: readonly string[];
  dataChanged: boolean;
  getRowIdChanged: boolean;
  viewportIndices?: readonly number[];
  columns: TColumn[];
  columnGroups: TGroup[];
}) {
  const declaredColumnOrder = columns.map(column => column.id);
  const previousDeclaredOrder = current.columns.map(column => column.id);
  const historicalOrder = reconcileColumnOrderHistory(columnOrderHistory, current.columnOrder, previousDeclaredOrder);
  // Keep the existing row-ID projection only while both inputs are unchanged.
  const currentRowIds = !dataChanged && !getRowIdChanged &&
    (nextInput.getRowId ?? defaultGetRowId) === current.getRowId
    ? current.rowIds : undefined;
  const nextState = createNormalizedCominsTableState({
    ...nextInput,
    columnLayout: {
      ...serializeColumnLayoutState(current),
      order: insertDeclaredColumnsIntoOrder(historicalOrder, declaredColumnOrder),
    },
    // Only the adapter knows whether the original external data reference changed.
    rows: dataChanged ? nextInput.rows : current.rows,
    sortModel: current.sortModel,
  }, columns, columnGroups, currentRowIds);
  const state = viewportIndices
    ? { ...nextState, selection: reconcileCoreViewportSelection(current.selection, nextState.rowIds, viewportIndices, nextState.columns.map(column => column.id)) }
    : (
      // 빈 선택은 행·컬럼 탐색 없이 그대로 유지한다.
      current.selection.rowIds.length === 0 && current.selection.cell === null &&
      current.selection.range === null && !current.selection.cells?.length
    ) || canPreserveSelection(current, nextState)
      ? { ...nextState, selection: current.selection }
      : nextState;
  const invalidatedDetailRowIds: CominsRowId[] = [];
  if (getRowIdChanged) {
    const previousRowById = new Map(current.rowIds.map((rowId, index) => [rowId, current.rows[index]]));
    state.rowIds.forEach((rowId, index) => {
      if (previousRowById.has(rowId) && previousRowById.get(rowId) !== state.rows[index]) invalidatedDetailRowIds.push(rowId);
    });
  }
  const activeColumnIds = new Set(declaredColumnOrder);
  const previousColumnIds = new Set(previousDeclaredOrder);
  const previouslyRetired = retiredColumnIds ?? historicalOrder.filter(id => !previousColumnIds.has(id));
  // Removal order is independent of display order, which can change after a drag.
  const nextRetiredColumnIds = [
    ...previouslyRetired.filter(id => !activeColumnIds.has(id) && !previousColumnIds.has(id)),
    ...Array.from(previousColumnIds).filter(id => !activeColumnIds.has(id)),
  ].slice(-MAX_RETIRED_COLUMN_IDS);
  const rememberedColumnIds = new Set(nextRetiredColumnIds);
  const nextColumnOrderHistory = reconcileColumnOrderHistory(historicalOrder, state.columnOrder, declaredColumnOrder)
    .filter(id => activeColumnIds.has(id) || rememberedColumnIds.has(id));

  return {
    state,
    columnOrderHistory: nextColumnOrderHistory,
    retiredColumnIds: nextRetiredColumnIds,
    invalidatedDetailRowIds,
  };
}

// Kept separate from the Browser-owned request model (which requires AbortSignal).
export function reconcileCoreViewportSelection(selection: CominsSelectionState, rowIds: readonly CominsRowId[], indices: readonly number[], columnIds: readonly string[]): CominsSelectionState {
  const positions = new Map(rowIds.map((id, index) => [id, index]));
  const columns = new Set(columnIds);
  const valid = (address: { rowId: CominsRowId; columnId: string }) => positions.has(address.rowId) && columns.has(address.columnId);
  const cell = selection.cell && valid(selection.cell) ? selection.cell : null;
  let range = selection.range;
  if (range) {
    if (!valid(range.anchor) || !valid(range.focus)) range = null;
    else {
      const a = positions.get(range.anchor.rowId)!, b = positions.get(range.focus.rowId)!;
      for (let index = Math.min(a, b); index < Math.max(a, b); index++) if (indices[index + 1] !== indices[index]! + 1) { range = null; break; }
    }
  }
  const cells = selection.cells?.filter(valid);
  if (cell === selection.cell && range === selection.range && cells?.length === selection.cells?.length) return selection;
  return { ...selection, cell, range, ...(cells ? { cells } : {}) };
}
