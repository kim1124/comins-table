import type {
  CominsTableState, CominsRowId, CominsTableRuntimeColumn, CominsCopiedRow, CominsPasteRowOptions,
  CominsCellAddress, CominsCellRange, CominsCopiedCellRange, CominsCopiedCellRangeCell, CominsFillCellRangeOptions,
} from "../model";
import { addCominsRows, updateCominsRows, withRows, getCominsCellValue } from "../state/table";
import { findRowIndex, getNestedFieldValue } from "../state/access";
import { getCominsVisibleColumns } from "../layout/columns";
import { getCellRangeBounds } from "../selection/state";
import { parseCominsClipboardText, MAX_CLIPBOARD_CELLS } from "../../clipboard-text";
import { canUseCellClipboard, createCellComponentParams, setNestedFieldValue } from "./cells";

function assignGeneratedRowId<TData>(row: TData, rowId: CominsRowId) {
  if (row && typeof row === "object" && "id" in row) {
    return { ...row, id: rowId } as TData;
  }

  return row;
}

function createCopiedRowId(existingIds: readonly CominsRowId[], sourceRowId: CominsRowId) {
  let index = 1;
  let nextId = `${String(sourceRowId)}-copy-${index}`;
  const ids = new Set(existingIds.map(String));

  while (ids.has(nextId)) {
    index += 1;
    nextId = `${String(sourceRowId)}-copy-${index}`;
  }

  return nextId;
}

export function copyCominsRow<TData>(state: CominsTableState<TData>, rowId: CominsRowId): CominsCopiedRow<TData> {
  const row = state.rows[findRowIndex(state, rowId)];

  if (row === undefined) {
    throw new Error(`Cannot copy missing row: ${String(rowId)}`);
  }

  return {
    kind: "row",
    row,
    text: JSON.stringify(row),
  };
}

export function pasteCominsRow<TData>(
  state: CominsTableState<TData>,
  copied: CominsCopiedRow<TData>,
  options: CominsPasteRowOptions<TData>,
) {
  if (options.mode === "append") {
    const rowId = options.getNewRowId?.(copied.row);
    const row = rowId === undefined ? copied.row : assignGeneratedRowId(copied.row, rowId);

    return addCominsRows(state, [row]);
  }

  if (options.mode === "insert-after") {
    const targetIndex = findRowIndex(state, options.targetRowId);

    if (targetIndex < 0) {
      return state;
    }

    const sourceRowId = state.getRowId(copied.row, targetIndex);
    const rowId = options.getPastedRowId?.(copied.row) ?? createCopiedRowId(state.rowIds, sourceRowId);
    const row = assignGeneratedRowId(copied.row, rowId);
    const rows = [...state.rows];
    rows.splice(targetIndex + 1, 0, row);

    return withRows(state, rows);
  }

  return updateCominsRows(state, [
    {
      id: options.targetRowId,
      patch: assignGeneratedRowId(copied.row, options.targetRowId) as Partial<TData>,
    },
  ]);
}

export function copyCominsCellRange<TData>(
  state: CominsTableState<TData>,
  range: CominsCellRange | null = state.selection.range,
  rowIds: readonly CominsRowId[] = state.rowIds,
): CominsCopiedCellRange | null {
  if (!range) {
    return null;
  }

  const bounds = getCellRangeBounds(state, range, rowIds);

  if (!bounds) {
    return null;
  }

  const copiedRows: CominsCopiedCellRangeCell[][] = [];

  for (let rowIndex = bounds.rowStart; rowIndex <= bounds.rowEnd; rowIndex += 1) {
    const rowId = bounds.rowIds[rowIndex];
    const dataIndex = rowId === undefined ? -1 : findRowIndex(state, rowId);
    const row = state.rows[dataIndex];
    const copiedCells: CominsCopiedCellRangeCell[] = [];

    for (let columnIndex = bounds.columnStart; columnIndex <= bounds.columnEnd; columnIndex += 1) {
      const column = bounds.visibleColumns[columnIndex];

      if (row === undefined || rowId === undefined || !column || !canUseCellClipboard(state, row, rowId, column, "copy")) {
        copiedCells.push(null);
        continue;
      }

      const value = getCominsCellValue(state, row, column.id);
      copiedCells.push({
        columnId: column.id,
        text: value == null ? "" : String(value),
        value,
      });
    }

    copiedRows.push(copiedCells);
  }

  return {
    kind: "cell-range",
    rows: copiedRows,
    text: copiedRows.map((row) => row.map((cell) => cell?.text ?? "").join("\t")).join("\n"),
  };
}

export function pasteCominsCellRange<TData>(
  state: CominsTableState<TData>,
  target: CominsCellAddress,
  copied: CominsCopiedCellRange | null,
  rowIds: readonly CominsRowId[] = state.rowIds,
) {
  if (!copied) {
    return state;
  }

  const visibleColumns = getCominsVisibleColumns(state);
  const targetRowIndex = rowIds.indexOf(target.rowId);
  const targetColumnIndex = visibleColumns.findIndex((column) => column.id === target.columnId);
  const rows = [...state.rows];

  if (targetRowIndex < 0 || targetColumnIndex < 0) {
    return state;
  }

  let changed = false;

  copied.rows.forEach((copiedRow, rowOffset) => {
    const rowId = rowIds[targetRowIndex + rowOffset];
    const rowIndex = rowId === undefined ? -1 : findRowIndex(state, rowId);
    const row = rows[rowIndex];

    if (row === undefined || rowId === undefined) {
      return;
    }

    copiedRow.forEach((copiedCell, columnOffset) => {
      const column = visibleColumns[targetColumnIndex + columnOffset];

      if (!copiedCell || !column || !canUseCellClipboard(state, row, rowId, column, "paste")) {
        return;
      }

      rows[rowIndex] = setNestedFieldValue(rows[rowIndex]!, column.field, copiedCell.value);
      changed = true;
    });
  });

  return changed ? withRows(state, rows) : state;
}

export function pasteCominsText<TData>(
  state: CominsTableState<TData>,
  target: CominsCellAddress,
  text: string,
  rowIds: readonly CominsRowId[] = state.rowIds,
) {
  const matrix = parseCominsClipboardText(text);
  const columns = getCominsVisibleColumns(state);
  const firstRow = rowIds.indexOf(target.rowId), firstColumn = columns.findIndex(column => column.id === target.columnId);
  if (firstRow < 0 || firstColumn < 0) return state;
  return applyClipboardMatrix(state, rowIds, firstRow, firstColumn, matrix.length,
    matrix.reduce((max, row) => Math.max(max, row.length), 0), (rowOffset, columnOffset, column, row, rowId, rowIndex) => {
      const value = matrix[rowOffset]?.[columnOffset];
      if (value === undefined) return null;
      const params = createCellComponentParams(state, row, rowId, column, rowIndex);
      return { value: column.cell?.parseClipboard ? column.cell.parseClipboard({ ...params, text: value }) : value };
    });
}

function applyClipboardMatrix<TData>(
  state: CominsTableState<TData>, rowIds: readonly CominsRowId[], rowStart: number, columnStart: number,
  height: number, width: number,
  read: (rowOffset: number, columnOffset: number, column: CominsTableRuntimeColumn<TData>, row: TData, rowId: CominsRowId, rowIndex: number) => { value: unknown } | null,
) {
  if (height * width > MAX_CLIPBOARD_CELLS) throw new Error("Clipboard exceeds 100000 cells.");
  const columns = getCominsVisibleColumns(state);
  const indexes = new Map(state.rowIds.map((id, index) => [id, index]));
  const rows = [...state.rows];
  let changed = false;
  for (let y = 0; y < height && rowStart + y < rowIds.length; y++) {
    const rowId = rowIds[rowStart + y]!;
    const index = indexes.get(rowId), row = index === undefined ? undefined : state.rows[index];
    if (index === undefined || row === undefined) continue;
    for (let x = 0; x < width && columnStart + x < columns.length; x++) {
      const column = columns[columnStart + x]!;
      if (!canUseCellClipboard(state, row, rowId, column, "paste", index)) continue;
      const cell = read(y, x, column, row, rowId, index);
      if (!cell || Object.is(getNestedFieldValue(rows[index], column.field), cell.value)) continue;
      rows[index] = setNestedFieldValue(rows[index]!, column.field, cell.value);
      changed = true;
    }
  }
  // Parsing and guards finish before publishing any changes; a thrown parser is atomic.
  return changed ? withRows(state, rows) : state;
}

export function fillCominsCellRange<TData>(
  state: CominsTableState<TData>,
  { source, target }: CominsFillCellRangeOptions,
  rowIds: readonly CominsRowId[] = state.rowIds,
) {
  const sourceRange = "anchor" in source ? source : { anchor: source, focus: source };
  const from = getCellRangeBounds(state, sourceRange, rowIds), to = getCellRangeBounds(state, target, rowIds);
  if (!from || !to) return state;
  const height = from.rowEnd - from.rowStart + 1, width = from.columnEnd - from.columnStart + 1;
  if (height * width > MAX_CLIPBOARD_CELLS) throw new Error("Clipboard exceeds 100000 cells.");
  const indexes = new Map(state.rowIds.map((id, index) => [id, index]));
  const pattern = Array.from({ length: height }, (_, y) => {
    const id = rowIds[from.rowStart + y]!, index = indexes.get(id), row = index === undefined ? undefined : state.rows[index];
    return Array.from({ length: width }, (_, x) => {
      const column = from.visibleColumns[from.columnStart + x]!;
      return row === undefined || !canUseCellClipboard(state, row, id, column, "copy", index)
        ? null : { value: getNestedFieldValue(row, column.field) };
    });
  });
  const mod = (value: number, size: number) => ((value % size) + size) % size;
  return applyClipboardMatrix(state, rowIds, to.rowStart, to.columnStart,
    to.rowEnd - to.rowStart + 1, to.columnEnd - to.columnStart + 1,
    (y, x, column, row, rowId, rowIndex) => {
      const cell = pattern[mod(to.rowStart + y - from.rowStart, height)]![mod(to.columnStart + x - from.columnStart, width)]!;
      if (cell && !Object.is(getNestedFieldValue(row, column.field), cell.value) && column.cell?.validateFill) {
        const params = createCellComponentParams(state, row, rowId, column, rowIndex);
        if (column.cell.validateFill({ ...params, value: cell.value }) === false) {
          throw new Error(`Fill rejected for column "${column.id}".`);
        }
      }
      return cell;
    });
}
