import type {
  CominsRowId,
  CominsSortState,
  CominsSortModel,
  CominsPaginationState,
  CominsRowUpdate,
  CominsVirtualRowsOptions,
  CominsVirtualRows,
  CominsTableRuntimeColumn,
  CominsTableState,
  CominsTableStateInput,
} from "../model";
import {
  normalizeColumns,
  normalizeColumnGroups,
  normalizeColumnState,
  normalizeColumnGroupState,
  normalizeColumnOrder,
} from "../layout/columns";
import {
  createEmptySelection,
} from "../selection/state";
import {
  findRowIndex,
  findColumn,
  getNestedFieldValue,
} from "./access";

export type CominsRowGroupMoveOptions<TData> = {
  getRowGroupId: (row: TData, dataIndex: number) => CominsRowId;
  setRowGroupId?: (params: {
    fromGroupId: CominsRowId;
    row: TData;
    rowId: CominsRowId;
    toGroupId: CominsRowId;
  }) => TData;
  sourceRowId: CominsRowId;
  targetGroupId: CominsRowId;
  targetRowId?: CominsRowId;
};

export function defaultGetRowId<TData>(_row: TData, index: number) {
  return index;
}

export function useRowsReference<TData>(rows: readonly TData[]) {
  return rows as TData[];
}

export function areRowIdsEqual(left: readonly CominsRowId[], right: readonly CominsRowId[]) {
  return left.length === right.length && left.every((id, index) => id === right[index]);
}

export function withRows<TData>(
  state: CominsTableState<TData>,
  rows: TData[],
  options: { resetSelection?: boolean } = {},
): CominsTableState<TData> {
  const rowIds = rows.map(state.getRowId);
  const shouldResetSelection = options.resetSelection === true || !areRowIdsEqual(state.rowIds, rowIds);

  return {
    ...state,
    rowIds,
    rows,
    selection: shouldResetSelection ? createEmptySelection() : state.selection,
  };
}

export function areSortModelsEqual(left: CominsSortModel, right: CominsSortModel) {
  return (
    left.length === right.length &&
    left.every(
      (rule, index) => rule.columnId === right[index]?.columnId && rule.direction === right[index]?.direction,
    )
  );
}

export function normalizeSortModel<TData>(
  columns: ReadonlyArray<CominsTableRuntimeColumn<TData>>,
  sortModel: CominsSortModel,
): CominsSortState[] {
  const sortableColumnIds = new Set(columns.filter((column) => Boolean(column.sort)).map((column) => column.id));
  const usedColumnIds = new Set<string>();
  const normalized: CominsSortState[] = [];

  for (const rule of sortModel) {
    if (
      !sortableColumnIds.has(rule.columnId) ||
      usedColumnIds.has(rule.columnId) ||
      (rule.direction !== "asc" && rule.direction !== "desc")
    ) {
      continue;
    }

    usedColumnIds.add(rule.columnId);
    normalized.push({ columnId: rule.columnId, direction: rule.direction });
  }

  return normalized;
}

export function defaultCompare(left: unknown, right: unknown) {
  if (typeof left === "number" && typeof right === "number") {
    return left - right;
  }

  return String(left ?? "").localeCompare(String(right ?? ""));
}

export function createCominsTableState<TData>({
  columnLayout,
  columnGroups,
  columns,
  getRowId = defaultGetRowId,
  pagination,
  rows,
  showHeader = true,
  sort = null,
  sortModel,
}: CominsTableStateInput<TData>): CominsTableState<TData> {
  const nextRows = useRowsReference(rows);
  const nextColumns = normalizeColumns(columns);
  const nextColumnGroups = normalizeColumnGroups(nextColumns, columnGroups);
  const nextSortModel = normalizeSortModel(nextColumns, sortModel ?? (sort ? [sort] : []));

  return {
    columnOrder: normalizeColumnOrder(nextColumns, columnLayout, nextColumnGroups),
    columnGroups: nextColumnGroups,
    columnGroupState: normalizeColumnGroupState(nextColumnGroups, columnLayout),
    columns: nextColumns,
    columnState: normalizeColumnState(nextColumns, columnLayout),
    getRowId,
    pagination: {
      pageIndex: pagination?.pageIndex ?? 0,
      pageSize: pagination?.pageSize ?? Math.max(nextRows.length, 1),
    },
    rowIds: nextRows.map(getRowId),
    rows: nextRows,
    selection: createEmptySelection(),
    showHeader,
    sort: nextSortModel[0] ?? null,
    sortModel: nextSortModel,
  };
}

export function queryCominsRows<TData>(
  state: Pick<CominsTableState<TData>, "rows">,
  predicate?: (row: TData, index: number) => boolean,
) {
  return predicate ? state.rows.filter(predicate) : [...state.rows];
}

export function replaceCominsRows<TData>(state: CominsTableState<TData>, rows: readonly TData[]) {
  return withRows(state, useRowsReference(rows), { resetSelection: true });
}

export function addCominsRows<TData>(state: CominsTableState<TData>, rows: readonly TData[]) {
  return withRows(state, [...state.rows, ...rows]);
}

export function updateCominsRows<TData>(
  state: CominsTableState<TData>,
  updates: ReadonlyArray<CominsRowUpdate<TData>>,
) {
  const updateMap = new Map(updates.map((update) => [update.id, update.patch]));
  const rows = state.rows.map((row, index) => {
    const rowId = state.rowIds[index];
    const patch = rowId === undefined ? undefined : updateMap.get(rowId);

    if (!patch) {
      return row;
    }

    return typeof patch === "function" ? patch(row) : { ...row, ...patch };
  });

  return withRows(state, rows);
}

export function deleteCominsRows<TData>(state: CominsTableState<TData>, rowIds: readonly CominsRowId[]) {
  const deleteIds = new Set(rowIds);

  return withRows(
    state,
    state.rows.filter((_row, index) => {
      const rowId = state.rowIds[index];

      return rowId === undefined || !deleteIds.has(rowId);
    }),
  );
}

export function setCominsHeaderVisible<TData>(state: CominsTableState<TData>, showHeader: boolean) {
  return {
    ...state,
    showHeader,
  };
}

export function setCominsPagination<TData>(
  state: CominsTableState<TData>,
  pagination: Partial<CominsPaginationState>,
) {
  return {
    ...state,
    pagination: {
      pageIndex: pagination.pageIndex ?? state.pagination.pageIndex,
      pageSize: pagination.pageSize ?? state.pagination.pageSize,
    },
  };
}

export function setCominsSortState<TData>(
  state: CominsTableState<TData>,
  sort: CominsSortState | null,
) {
  return setCominsSortModel(state, sort ? [sort] : []);
}

export function setCominsSortModel<TData>(
  state: CominsTableState<TData>,
  sortModel: CominsSortModel,
) {
  const nextSortModel = normalizeSortModel(state.columns, sortModel);
  const nextSort = nextSortModel[0] ?? null;

  if (areSortModelsEqual(state.sortModel, nextSortModel)) {
    return state;
  }

  return {
    ...state,
    sort: nextSort,
    sortModel: nextSortModel,
  };
}

export function clearCominsSortState<TData>(state: CominsTableState<TData>) {
  return setCominsSortModel(state, []);
}

export function getCominsSortedRowIndexes<TData>(
  state: CominsTableState<TData>,
  sourceIndexes: readonly number[] = state.rows.map((_row, index) => index),
) {
  const indexes = [...sourceIndexes];

  if (state.sortModel.length === 0) {
    return indexes;
  }

  return [...indexes].sort((leftIndex, rightIndex) => {
    const leftRow = state.rows[leftIndex]!;
    const rightRow = state.rows[rightIndex]!;

    for (const rule of state.sortModel) {
      const column = findColumn(state, rule.columnId);

      if (!column?.sort) {
        continue;
      }

      const leftValue = getCominsCellValue(state, leftRow, column.id);
      const rightValue = getCominsCellValue(state, rightRow, column.id);
      const result =
        typeof column.sort === "function"
          ? column.sort(leftValue, rightValue, leftRow, rightRow)
          : defaultCompare(leftValue, rightValue);

      if (result !== 0) {
        return rule.direction === "desc" ? result * -1 : result;
      }
    }

    return leftIndex - rightIndex;
  });
}

export function sortCominsRows<TData>(
  state: CominsTableState<TData>,
  sort: CominsSortState | null,
) {
  const sortedState = setCominsSortState(state, sort);
  const indexes = getCominsSortedRowIndexes(sortedState);
  const rows = indexes.map((index) => sortedState.rows[index]!);

  return withRows(sortedState, rows);
}

export function getCominsPageRows<TData>(
  state: CominsTableState<TData>,
  pagination: Partial<CominsPaginationState> = {},
) {
  const pageIndex = pagination.pageIndex ?? state.pagination.pageIndex;
  const pageSize = pagination.pageSize ?? state.pagination.pageSize;
  const start = Math.max(0, pageIndex) * Math.max(1, pageSize);
  const indexes = getCominsSortedRowIndexes(state).slice(start, start + Math.max(1, pageSize));

  return indexes.map((index) => state.rows[index]!);
}

export function getCominsVirtualRows<TData>(
  state: CominsTableState<TData>,
  { overscan = 2, rowHeight, scrollTop, viewportHeight }: CominsVirtualRowsOptions,
): CominsVirtualRows<TData> {
  const safeRowHeight = Math.max(1, rowHeight);
  const rowIndexes = getCominsSortedRowIndexes(state);
  const totalRows = rowIndexes.length;
  const totalHeight = totalRows * safeRowHeight;
  const startIndex = Math.max(0, Math.floor(Math.max(0, scrollTop) / safeRowHeight) - Math.max(0, overscan));
  const endIndex = Math.min(
    totalRows,
    Math.ceil((Math.max(0, scrollTop) + Math.max(0, viewportHeight)) / safeRowHeight) + Math.max(0, overscan),
  );
  const topSpacerHeight = startIndex * safeRowHeight;

  return {
    bottomSpacerHeight: Math.max(0, totalHeight - topSpacerHeight - (endIndex - startIndex) * safeRowHeight),
    endIndex,
    rows: rowIndexes.slice(startIndex, endIndex).map((index) => state.rows[index]!),
    startIndex,
    topSpacerHeight,
    totalHeight,
  };
}

export function moveCominsRow<TData>(
  state: CominsTableState<TData>,
  rowId: CominsRowId,
  targetIndex: number,
) {
  const currentIndex = findRowIndex(state, rowId);

  if (currentIndex < 0) {
    return state;
  }

  const rows = [...state.rows];
  const [row] = rows.splice(currentIndex, 1);

  if (row === undefined) {
    return state;
  }

  rows.splice(Math.max(0, Math.min(targetIndex, rows.length)), 0, row);

  return withRows(state, rows);
}

export function moveCominsRowToGroup<TData>(
  state: CominsTableState<TData>,
  options: CominsRowGroupMoveOptions<TData>,
) {
  const sourceIndex = findRowIndex(state, options.sourceRowId);
  const targetRowIndex = options.targetRowId === undefined
    ? -1
    : findRowIndex(state, options.targetRowId);

  if (
    sourceIndex < 0 ||
    options.targetRowId === options.sourceRowId ||
    (options.targetRowId !== undefined && targetRowIndex < 0)
  ) {
    return state;
  }

  const sourceRow = state.rows[sourceIndex];

  if (sourceRow === undefined) {
    return state;
  }

  const fromGroupId = options.getRowGroupId(sourceRow, sourceIndex);
  const membershipChanged = fromGroupId !== options.targetGroupId;

  if (membershipChanged && typeof options.setRowGroupId !== "function") {
    return state;
  }

  if (targetRowIndex >= 0) {
    const targetRow = state.rows[targetRowIndex];

    if (
      targetRow === undefined ||
      options.getRowGroupId(targetRow, targetRowIndex) !== options.targetGroupId
    ) {
      return state;
    }
  }

  const movedRow = membershipChanged
    ? options.setRowGroupId!({
        fromGroupId,
        row: sourceRow,
        rowId: options.sourceRowId,
        toGroupId: options.targetGroupId,
      })
    : sourceRow;
  const rows = [...state.rows];
  rows.splice(sourceIndex, 1);
  let targetIndex: number;

  if (options.targetRowId !== undefined) {
    targetIndex = Math.max(0, Math.min(targetRowIndex, rows.length));
  } else {
    let lastTargetIndex = -1;

    rows.forEach((row, index) => {
      if (options.getRowGroupId(row, index) === options.targetGroupId) {
        lastTargetIndex = index;
      }
    });
    targetIndex = lastTargetIndex < 0 ? rows.length : lastTargetIndex + 1;
  }

  rows.splice(targetIndex, 0, movedRow);

  return withRows(state, rows);
}

export function getCominsCellValue<TData>(
  state: { columns: readonly { id: string; field: string }[] },
  row: TData,
  columnId: string,
) {
  const column = findColumn(state, columnId);

  return column ? getNestedFieldValue(row, column.field) : undefined;
}
