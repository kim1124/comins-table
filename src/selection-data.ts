import { planCoreSelectionCopy } from "./core/selection/navigation";
import { canUseCellClipboard } from "./core/editing/cells";
import { getNestedFieldValue, indexCominsRows } from "./core/state/access";
import { projectReactState } from "./react/model";
import {
  getCominsCellValue, getCominsSelectedCellRange, getCominsVisibleColumns,
} from "./react/core-compat";
import type { CominsCellAddress, CominsCopiedCellRange, CominsRowId } from "./model";
import type { CominsTableState } from "./react-types";

export type CominsSelectedCell = CominsCellAddress & { value: unknown };
export type CominsCopyTarget = "auto" | "cells" | "rows";
export type CominsSelectionCopy = { target: "cells" | "rows"; text: string; data: CominsCopiedCellRange };

export function selectedRowData<T>(state: CominsTableState<T>): T[] {
  const selected = new Set(state.selection.rowIds);
  return state.rows.filter((_, index) => selected.has(state.rowIds[index]!));
}

export function selectedCellValues<T>(state: CominsTableState<T>, order: readonly CominsRowId[] = state.rowIds): CominsSelectedCell[] {
  const cells = state.selection.range ? getCominsSelectedCellRange(state, state.selection.range, order)
    : state.selection.cells ?? (state.selection.cell ? [state.selection.cell] : []);
  const rows = new Map(state.rowIds.map((id, index) => [id, state.rows[index]]));
  const columns = new Set(getCominsVisibleColumns(state).map(column => column.id));
  return cells.flatMap(cell => {
    const row = rows.get(cell.rowId);
    return row === undefined || !columns.has(cell.columnId) ? [] : [{ ...cell, value: getCominsCellValue(state, row, cell.columnId) }];
  });
}

function encodeTsv(value: unknown): string {
  let text = value == null ? "" : String(value);
  if (typeof value === "string" && /^[\t\r\n ]*[=+@-]/u.test(text)) text = `'${text}`;
  return /["\t\n\r]/u.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

// Enumeration happens on demand; rendering does not materialize the selected rectangle.
export function copySelectionData<T>(state: CominsTableState<T>, target: CominsCopyTarget = "auto", order: readonly CominsRowId[] = state.rowIds): CominsSelectionCopy | null {
  const cells = selectedCellValues(state, order);
  const visible = getCominsVisibleColumns(state);
  const plan = planCoreSelectionCopy({ cells, selectedRowIds: state.selection.rowIds, rowIds: order, columnIds: visible.map(column => column.id), target });
  if (!plan) return null;
  const { target: kind, rowIds, selected } = plan;
  const core = projectReactState(state).core;
  const rowIndexes = indexCominsRows(core.rowIds);
  const columnsById = new Map(core.columns.map(column => [column.id, column]));
  const columns = plan.columnIds.map(id => columnsById.get(id)!);
  const rows = rowIds.map(rowId => {
    const index = rowIndexes.get(rowId) ?? -1;
    const row = core.rows[index];
    return columns.map(column => {
      if (kind === "cells" && !selected.get(rowId)?.has(column.id)) return null;
      if (row === undefined || !canUseCellClipboard(core, row, rowId, column, "copy", index)) return null;
      const value = getNestedFieldValue(row, column.field);
      return { columnId: column.id, value, text: encodeTsv(value) };
    });
  });
  if (!rows.some(row => row.some(Boolean))) return null;
  const text = rows.map(row => row.map(cell => cell?.text ?? "").join("\t")).join("\n");
  return { target: kind, text, data: { kind: "cell-range", rows, text } };
}
