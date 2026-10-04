import type { CominsRowId, CominsSelectionState, CominsTableState, CominsTableStateInput } from "../model";
import { serializeCominsColumnLayout } from "../layout/columns";
import { canPreserveSelection, insertDeclaredColumnsIntoOrder, reconcileColumnOrderHistory } from "../../table-state";
import { createCominsTableState } from "./table";

export type CoreReconciliationInput<TData> = Pick<CominsTableStateInput<TData>,
  "columnGroups" | "columns" | "rows" | "getRowId" | "pagination" | "showHeader">;

export type CoreReconciliationOptions<TData> = {
  current: CominsTableState<TData>;
  nextInput: CoreReconciliationInput<TData>;
  columnOrderHistory: readonly string[];
  dataChanged: boolean;
  getRowIdChanged: boolean;
  viewportIndices?: readonly number[];
};

/** Reconcile inputs without applying state, clearing caches, or notifying consumers. */
export function reconcileCoreState<TData>({ current, nextInput, columnOrderHistory, dataChanged, getRowIdChanged, viewportIndices }: CoreReconciliationOptions<TData>): {
  state: CominsTableState<TData>;
  columnOrderHistory: string[];
  invalidatedDetailRowIds: CominsRowId[];
} {
  const declaredColumnOrder = nextInput.columns.map(column => String(column.id ?? column.field));
  const historicalOrder = reconcileColumnOrderHistory(columnOrderHistory, current.columnOrder, current.columns.map(column => column.id));
  const nextState = createCominsTableState({
    ...nextInput,
    columnLayout: {
      ...serializeCominsColumnLayout(current),
      order: insertDeclaredColumnsIntoOrder(historicalOrder, declaredColumnOrder),
    },
    // Only the adapter knows whether the original external data reference changed.
    rows: dataChanged ? nextInput.rows : current.rows,
    sortModel: current.sortModel,
  });
  const state = viewportIndices
    ? { ...nextState, selection: reconcileCoreViewportSelection(current.selection, nextState.rowIds, viewportIndices, nextState.columns.map(column => column.id)) }
    : canPreserveSelection(current, nextState) || (
      // An already empty selection is unchanged even if the visible row IDs change.
      current.selection.rowIds.length === 0 && current.selection.cell === null &&
      current.selection.range === null && !current.selection.cells?.length
    )
      ? { ...nextState, selection: current.selection }
      : nextState;
  const invalidatedDetailRowIds: CominsRowId[] = [];
  if (getRowIdChanged) {
    const previousRowById = new Map(current.rowIds.map((rowId, index) => [rowId, current.rows[index]]));
    state.rowIds.forEach((rowId, index) => {
      if (previousRowById.has(rowId) && previousRowById.get(rowId) !== state.rows[index]) invalidatedDetailRowIds.push(rowId);
    });
  }
  return {
    state,
    columnOrderHistory: reconcileColumnOrderHistory(historicalOrder, state.columnOrder, declaredColumnOrder),
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
