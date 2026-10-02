import type { CominsCellAddress, CominsCellRange, CominsRowId } from "../model";
import type { CominsTreeDropPosition } from "../../tree";
export { getCominsColumnMouseIntent } from "../../column-pointer";
export { getCominsDragAutoScrollTop, getCominsDragAutoScrollVelocity } from "../../drag-autoscroll";

export type CoreCellBounds = { top: number; bottom: number; left: number; right: number };
export function getCoreCellBounds(range: CominsCellRange, rows: readonly CominsRowId[], columns: readonly string[]): CoreCellBounds | null {
  const a = rows.indexOf(range.anchor.rowId), b = rows.indexOf(range.focus.rowId);
  const c = columns.indexOf(range.anchor.columnId), d = columns.indexOf(range.focus.columnId);
  return Math.min(a, b, c, d) < 0 ? null : { top: Math.min(a, b), bottom: Math.max(a, b), left: Math.min(c, d), right: Math.max(c, d) };
}
export function getCoreCellRange(box: CoreCellBounds, rows: readonly CominsRowId[], columns: readonly string[]): CominsCellRange {
  return { anchor: { rowId: rows[box.top]!, columnId: columns[box.left]! }, focus: { rowId: rows[box.bottom]!, columnId: columns[box.right]! } };
}
export function resolveCoreFillTarget({ source, address, rowIds, columnIds }: {
  source: CominsCellRange; address: CominsCellAddress | null; rowIds: readonly CominsRowId[]; columnIds: readonly string[];
}): CominsCellRange | null {
  const box = getCoreCellBounds(source, rowIds, columnIds);
  const row = address ? rowIds.indexOf(address.rowId) : -1, column = address ? columnIds.indexOf(address.columnId) : -1;
  if (!box || row < 0 || column < 0) return null;
  const dy = Math.max(box.top - row, row - box.bottom, 0), dx = Math.max(box.left - column, column - box.right, 0);
  if (!dy && !dx) return null;
  const extended = dy >= dx ? { ...box, top: Math.min(box.top, row), bottom: Math.max(box.bottom, row) }
    : { ...box, left: Math.min(box.left, column), right: Math.max(box.right, column) };
  return (extended.bottom - extended.top + 1) * (extended.right - extended.left + 1) <= 100000 ? getCoreCellRange(extended, rowIds, columnIds) : null;
}

export function planCoreSelectionCopy({ cells, selectedRowIds, rowIds: order, columnIds, target }: {
  cells: readonly CominsCellAddress[]; selectedRowIds: readonly CominsRowId[]; rowIds: readonly CominsRowId[]; columnIds: readonly string[]; target: "auto" | "cells" | "rows";
}) {
  const kind = target === "auto" ? (cells.length > 1 ? "cells" : selectedRowIds.length ? "rows" : "cells") : target;
  const selectedRows = new Set(selectedRowIds);
  const rowPositions = new Map(order.map((id, index) => [id, index]));
  const columnPositions = new Map(columnIds.map((id, index) => [id, index]));
  let rowIds: readonly CominsRowId[], columns = columnIds;
  const selected = new Map<CominsRowId, Set<string>>();
  if (kind === "rows") rowIds = order.filter(id => selectedRows.has(id));
  else {
    const positions = cells.filter(cell => rowPositions.has(cell.rowId)).map(cell => ({ row: rowPositions.get(cell.rowId)!, column: columnPositions.get(cell.columnId)! }));
    if (!positions.length) return null;
    let firstRow = Infinity, lastRow = -1, firstColumn = Infinity, lastColumn = -1;
    for (const position of positions) {
      firstRow = Math.min(firstRow, position.row); lastRow = Math.max(lastRow, position.row);
      firstColumn = Math.min(firstColumn, position.column); lastColumn = Math.max(lastColumn, position.column);
    }
    rowIds = order.slice(firstRow, lastRow + 1); columns = columnIds.slice(firstColumn, lastColumn + 1);
    for (const cell of cells) {
      if (!selected.has(cell.rowId)) selected.set(cell.rowId, new Set());
      selected.get(cell.rowId)!.add(cell.columnId);
    }
  }
  return !rowIds.length || !columns.length ? null : { target: kind, rowIds, columnIds: columns, selected };
}

const pathKey = (path: readonly number[]) => path.join(".");
export function resolveCoreTreeDropContext<TEntry extends { rowId: CominsRowId; path: readonly number[] }>({ entries, sourceId, targetId, position }: {
  entries: readonly TEntry[]; sourceId: CominsRowId; targetId: CominsRowId; position: CominsTreeDropPosition;
}) {
  const source = entries.find(entry => entry.rowId === sourceId), target = entries.find(entry => entry.rowId === targetId);
  if (!source || !target) return null;
  const parentPath = target.path.slice(0, -1);
  const parent = entries.find(entry => pathKey(entry.path) === pathKey(parentPath));
  const nextSibling = entries.find(entry => pathKey(entry.path.slice(0, -1)) === pathKey(parentPath) && entry.path[entry.path.length - 1] === target.path[target.path.length - 1]! + 1);
  return { source, target, position, destination: position === "inside"
    ? { parentId: target.rowId, beforeRowId: null }
    : { parentId: parent?.rowId ?? null, beforeRowId: position === "before" ? target.rowId : nextSibling?.rowId ?? null } };
}
export function resolveCoreTreePointerPosition(fraction: number, allowReparent: boolean | undefined): CominsTreeDropPosition {
  return fraction < .25 ? "before" : fraction > .75 ? "after" : allowReparent ? "inside" : fraction < .5 ? "before" : "after";
}
