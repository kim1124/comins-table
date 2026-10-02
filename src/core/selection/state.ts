import type {
  CominsRowId,
  CominsSelectionState,
  CominsCellAddress,
  CominsCellRange,
  CominsRowSelectionOptions,
  CominsCellSelectionOptions,
  CominsTableState,
} from "../model";
import {
  getCominsVisibleColumns,
} from "../layout/columns";

export function createEmptySelection(): CominsSelectionState {
  return {
    cell: null,
    cells: [],
    range: null,
    rowIds: [],
  };
}

export function getCellRangeBounds<TData>(
  state: CominsTableState<TData>,
  range: CominsCellRange,
  rowIds: readonly CominsRowId[] = state.rowIds,
) {
  const visibleColumns = getCominsVisibleColumns(state);
  const anchorRowIndex = rowIds.indexOf(range.anchor.rowId);
  const focusRowIndex = rowIds.indexOf(range.focus.rowId);
  const anchorColumnIndex = visibleColumns.findIndex((column) => column.id === range.anchor.columnId);
  const focusColumnIndex = visibleColumns.findIndex((column) => column.id === range.focus.columnId);

  if (anchorRowIndex < 0 || focusRowIndex < 0 || anchorColumnIndex < 0 || focusColumnIndex < 0) {
    return null;
  }

  return {
    columnEnd: Math.max(anchorColumnIndex, focusColumnIndex),
    columnStart: Math.min(anchorColumnIndex, focusColumnIndex),
    rowEnd: Math.max(anchorRowIndex, focusRowIndex),
    rowIds,
    rowStart: Math.min(anchorRowIndex, focusRowIndex),
    visibleColumns,
  };
}

export function selectRow<TData>(
  state: CominsTableState<TData>,
  rowId: CominsRowId,
  options: CominsRowSelectionOptions = {},
) {
  const current = state.selection.rowIds;
  const selected = current.includes(rowId);
  const rowIds = options.multi
    ? options.toggle && selected
      ? current.filter((id) => id !== rowId)
      : selected
        ? current
        : [...current, rowId]
    : options.toggle && selected
      ? []
      : [rowId];

  return {
    ...state,
    selection: {
      ...state.selection,
      rowIds,
    },
  };
}

export function selectRows<TData>(state: CominsTableState<TData>, rowIds: readonly CominsRowId[]) {
  return {
    ...state,
    selection: {
      ...state.selection,
      rowIds: [...rowIds],
    },
  };
}

export function areCellAddressesEqual(left: CominsCellAddress, right: CominsCellAddress) {
  return left.rowId === right.rowId && left.columnId === right.columnId;
}

export function selectCell<TData>(
  state: CominsTableState<TData>,
  cell: CominsCellAddress,
  options: CominsCellSelectionOptions = {},
) {
  const current = state.selection.cells ?? (state.selection.cell ? [state.selection.cell] : []);
  const selected = current.some((candidate) => areCellAddressesEqual(candidate, cell));
  const cells = options.multi
    ? options.toggle && selected
      ? current.filter((candidate) => !areCellAddressesEqual(candidate, cell))
      : selected
        ? current
        : [...current, cell]
    : options.toggle && selected
      ? []
      : [cell];
  const activeCell = cells.some((candidate) => areCellAddressesEqual(candidate, cell))
    ? cell
    : (cells.at(-1) ?? null);

  return {
    ...state,
    selection: {
      ...state.selection,
      cell: activeCell,
      cells,
      range: null,
    },
  };
}

export function selectCellRange<TData>(state: CominsTableState<TData>, range: CominsCellRange) {
  return {
    ...state,
    selection: {
      ...state.selection,
      cell: range.focus,
      cells: [],
      range,
    },
  };
}

export function clearCominsCellRange<TData>(state: CominsTableState<TData>) {
  return {
    ...state,
    selection: {
      ...state.selection,
      range: null,
    },
  };
}

export function clearCominsSelection<TData>(state: CominsTableState<TData>) {
  return {
    ...state,
    selection: createEmptySelection(),
  };
}

export function isCominsRowSelected<TData>(state: Pick<CominsTableState<TData>, "selection">, rowId: CominsRowId) {
  return state.selection.rowIds.includes(rowId);
}

export function isCominsCellSelected<TData>(state: Pick<CominsTableState<TData>, "selection">, cell: CominsCellAddress) {
  const selectedCells = state.selection.cells;

  if (selectedCells && selectedCells.length > 0) {
    return selectedCells.some((candidate) => areCellAddressesEqual(candidate, cell));
  }

  return state.selection.cell !== null && areCellAddressesEqual(state.selection.cell, cell);
}

export function getCominsSelectedCellRange<TData>(
  state: CominsTableState<TData>,
  range: CominsCellRange | null = state.selection.range,
  rowIds: readonly CominsRowId[] = state.rowIds,
) {
  if (!range) {
    return [];
  }

  const visibleColumns = getCominsVisibleColumns(state);
  const bounds = getCellRangeBounds(state, range, rowIds);

  if (!bounds) {
    return [];
  }

  const cells: CominsCellAddress[] = [];

  for (let rowIndex = bounds.rowStart; rowIndex <= bounds.rowEnd; rowIndex += 1) {
    const rowId = bounds.rowIds[rowIndex];

    if (rowId === undefined) {
      continue;
    }

    for (let columnIndex = bounds.columnStart; columnIndex <= bounds.columnEnd; columnIndex += 1) {
      const column = visibleColumns[columnIndex];

      if (column) {
        cells.push({ columnId: column.id, rowId });
      }
    }
  }

  return cells;
}

export function isCominsCellInSelectedRange<TData>(
  state: CominsTableState<TData>,
  cell: CominsCellAddress,
  rowIds: readonly CominsRowId[] = state.rowIds,
) {
  return getCominsSelectedCellRange(state, state.selection.range, rowIds).some(
    (selected) => selected.rowId === cell.rowId && selected.columnId === cell.columnId,
  );
}
