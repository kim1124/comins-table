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
  getVisibleLayoutColumns,
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
  return getLayoutCellRangeBounds(state, range, rowIds);
}

type CellRangeLayoutSource<TColumn, TGroup> = Pick<CominsTableState<unknown>,
  "columnOrder" | "columnState" | "columnGroupState" | "selection" | "rowIds"
> & { columns: readonly TColumn[]; columnGroups: readonly TGroup[] };

export function getLayoutCellRangeBounds<TColumn extends { id: string }, TGroup extends { id: string; children: string[] }>(
  state: CellRangeLayoutSource<TColumn, TGroup>,
  range: CominsCellRange,
  rowIds: readonly CominsRowId[] = state.rowIds,
) {
  const visibleColumns = getVisibleLayoutColumns(state);
  return getCellRangeBoundsInColumns(visibleColumns, range, rowIds);
}

function getCellRangeBoundsInColumns<TColumn extends { id: string }>(
  visibleColumns: readonly TColumn[],
  range: CominsCellRange,
  rowIds: readonly CominsRowId[],
) {
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

export function getCellRangeMembership(
  visibleColumns: readonly { id: string }[],
  range: CominsCellRange,
  rowIds: readonly CominsRowId[],
) {
  const bounds = getCellRangeBoundsInColumns(visibleColumns, range, rowIds);
  if (!bounds) return null;
  return {
    rowIds: new Set(bounds.rowIds.slice(bounds.rowStart, bounds.rowEnd + 1)),
    columnIds: new Set(bounds.visibleColumns.slice(bounds.columnStart, bounds.columnEnd + 1).map(column => column.id)),
  };
}

export function selectRow<TData>(state: CominsTableState<TData>, rowId: CominsRowId, options: CominsRowSelectionOptions = {}) {
  return selectRowInState(state, rowId, options);
}

export function selectRowInState<TState extends { selection: CominsSelectionState }>(
  state: TState,
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
  return selectRowsInState(state, rowIds);
}

export function selectRowsInState<TState extends { selection: CominsSelectionState }>(state: TState, rowIds: readonly CominsRowId[]) {
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

export function selectCell<TData>(state: CominsTableState<TData>, cell: CominsCellAddress, options: CominsCellSelectionOptions = {}) {
  return selectCellInState(state, cell, options);
}

export function selectCellInState<TState extends { selection: CominsSelectionState }>(
  state: TState,
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
  return selectCellRangeInState(state, range);
}

export function selectCellRangeInState<TState extends { selection: CominsSelectionState }>(state: TState, range: CominsCellRange) {
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
  return clearCellRangeInState(state);
}

export function clearCellRangeInState<TState extends { selection: CominsSelectionState }>(state: TState) {
  return {
    ...state,
    selection: {
      ...state.selection,
      range: null,
    },
  };
}

export function clearCominsSelection<TData>(state: CominsTableState<TData>) {
  return clearSelectionInState(state);
}

export function clearSelectionInState<TState extends { selection: CominsSelectionState }>(state: TState) {
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
  return getLayoutSelectedCellRange(state, range, rowIds);
}

export function getLayoutSelectedCellRange<TColumn extends { id: string }, TGroup extends { id: string; children: string[] }>(
  state: CellRangeLayoutSource<TColumn, TGroup>,
  range: CominsCellRange | null = state.selection.range,
  rowIds: readonly CominsRowId[] = state.rowIds,
) {
  if (!range) {
    return [];
  }

  const bounds = getLayoutCellRangeBounds(state, range, rowIds);

  if (!bounds) {
    return [];
  }

  const { visibleColumns } = bounds;
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
  return isCellInLayoutSelectedRange(state, cell, rowIds);
}

export function isCellInLayoutSelectedRange<TColumn extends { id: string }, TGroup extends { id: string; children: string[] }>(
  state: CellRangeLayoutSource<TColumn, TGroup>,
  cell: CominsCellAddress,
  rowIds: readonly CominsRowId[] = state.rowIds,
) {
  const bounds = state.selection.range ? getLayoutCellRangeBounds(state, state.selection.range, rowIds) : null;
  if (!bounds) return false;
  let columnInRange = false;
  for (let index = bounds.columnStart; index <= bounds.columnEnd; index += 1) {
    const column = bounds.visibleColumns[index];
    if (column && column.id === cell.columnId) {
      columnInRange = true;
      break;
    }
  }
  if (!columnInRange) return false;
  for (let index = bounds.rowStart; index <= bounds.rowEnd; index += 1) {
    const rowId = bounds.rowIds[index];
    if (rowId !== undefined && rowId === cell.rowId) return true;
  }
  return false;
}
