import {
  copyCominsCell, getCominsCellValue, getCominsSelectedCellRange, getCominsVisibleColumns,
} from "./core";
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
  const kind = target === "auto" ? (cells.length > 1 ? "cells" : state.selection.rowIds.length ? "rows" : "cells") : target;
  const visible = getCominsVisibleColumns(state);
  const selectedRows = new Set(state.selection.rowIds);
  const rowPositions = new Map(order.map((id, index) => [id, index]));
  const columnPositions = new Map(visible.map((column, index) => [column.id, index]));
  let rowIds: readonly CominsRowId[];
  let columns = visible;
  const selected = new Map<CominsRowId, Set<string>>();
  if (kind === "rows") {
    rowIds = order.filter(id => selectedRows.has(id));
  } else {
    const positions = cells.filter(cell => rowPositions.has(cell.rowId)).map(cell => ({ row: rowPositions.get(cell.rowId)!, column: columnPositions.get(cell.columnId)! }));
    if (!positions.length) return null;
    let firstRow = Infinity, lastRow = -1, firstColumn = Infinity, lastColumn = -1;
    for (const position of positions) {
      firstRow = Math.min(firstRow, position.row); lastRow = Math.max(lastRow, position.row);
      firstColumn = Math.min(firstColumn, position.column); lastColumn = Math.max(lastColumn, position.column);
    }
    rowIds = order.slice(firstRow, lastRow + 1);
    columns = visible.slice(firstColumn, lastColumn + 1);
    for (const cell of cells) {
      if (!selected.has(cell.rowId)) selected.set(cell.rowId, new Set());
      selected.get(cell.rowId)!.add(cell.columnId);
    }
  }
  if (!rowIds.length || !columns.length) return null;
  const rows = rowIds.map(rowId => columns.map(column => {
    if (kind === "cells" && !selected.get(rowId)?.has(column.id)) return null;
    const cell = copyCominsCell(state, { rowId, columnId: column.id });
    return cell ? { columnId: column.id, value: cell.value, text: encodeTsv(cell.value) } : null;
  }));
  if (!rows.some(row => row.some(Boolean))) return null;
  const text = rows.map(row => row.map(cell => cell?.text ?? "").join("\t")).join("\n");
  return { target: kind, text, data: { kind: "cell-range", rows, text } };
}
