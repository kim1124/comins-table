import type React from "react";

export type KmsfRowId = string | number;

export type KmsfDataTableDensity = "comfortable" | "compact" | "spacious";

export type KmsfDataTableTheme = {
  className?: string;
  density?: KmsfDataTableDensity;
  style?: React.CSSProperties;
};

export type KmsfSortDirection = "asc" | "desc";

export type KmsfSortState = {
  columnId: string;
  direction: KmsfSortDirection;
};

export type KmsfCellFormatParams<TData, TValue = unknown> = {
  column: KmsfDataTableRuntimeColumn<TData, TValue>;
  row: TData;
  rowId: KmsfRowId;
  value: TValue;
};

export type KmsfColumnValueResolver<TData, TValue> =
  | TValue
  | ((params: KmsfCellFormatParams<TData, TValue>) => TValue);

export type KmsfClipboardGuard<TData, TValue = unknown> =
  | boolean
  | ((params: KmsfCellFormatParams<TData, TValue>) => boolean);

export type KmsfColumnProps<TData, TValue = unknown> = {
  className?: string | ((params: KmsfCellFormatParams<TData, TValue>) => string | undefined);
  copyable?: KmsfClipboardGuard<TData, TValue>;
  disabled?: KmsfClipboardGuard<TData, TValue>;
  pasteable?: KmsfClipboardGuard<TData, TValue>;
  style?: React.CSSProperties | ((params: KmsfCellFormatParams<TData, TValue>) => React.CSSProperties | undefined);
};

export type KmsfDataTableColumn<TData, TValue = unknown> = {
  field: string;
  format?: (params: KmsfCellFormatParams<TData, TValue>) => React.ReactNode;
  header?: {
    props?: React.ThHTMLAttributes<HTMLTableCellElement>;
  };
  hidden?: boolean;
  id?: string;
  label: React.ReactNode;
  maxWidth?: number;
  minWidth?: number;
  props?: KmsfColumnProps<TData, TValue>;
  sort?: boolean | ((left: TValue, right: TValue, leftRow: TData, rightRow: TData) => number);
  width?: number;
};

export type KmsfDataTableRuntimeColumn<TData, TValue = unknown> = Omit<
  KmsfDataTableColumn<TData, TValue>,
  "id"
> & {
  id: string;
};

export type KmsfEventColumn<TData, TValue = unknown> = {
  definition: KmsfDataTableRuntimeColumn<TData, TValue>;
  field: string;
  id: string;
  index: number;
  label: React.ReactNode;
};

export type KmsfColumnRuntimeState = {
  hidden?: boolean;
  width?: number;
};

export type KmsfColumnLayout = {
  columns: Record<string, KmsfColumnRuntimeState>;
  order: string[];
};

export type KmsfPaginationState = {
  pageIndex: number;
  pageSize: number;
};

export type KmsfSelectionState = {
  cell: KmsfCellAddress | null;
  range: KmsfCellRange | null;
  rowIds: KmsfRowId[];
};

export type KmsfDataTableState<TData> = {
  columnOrder: string[];
  columns: Array<KmsfDataTableRuntimeColumn<TData>>;
  columnState: Record<string, KmsfColumnRuntimeState>;
  getRowId: (row: TData, index: number) => KmsfRowId;
  pagination: KmsfPaginationState;
  rowIds: KmsfRowId[];
  rows: TData[];
  selection: KmsfSelectionState;
  showHeader: boolean;
  sort: KmsfSortState | null;
  theme: KmsfDataTableTheme;
};

export type KmsfDataTableStateInput<TData> = {
  columnLayout?: Partial<KmsfColumnLayout>;
  columns: ReadonlyArray<KmsfDataTableColumn<TData>>;
  getRowId?: (row: TData, index: number) => KmsfRowId;
  pagination?: Partial<KmsfPaginationState>;
  rows: readonly TData[];
  showHeader?: boolean;
  sort?: KmsfSortState | null;
  theme?: KmsfDataTableTheme;
};

export type KmsfRowUpdate<TData> = {
  id: KmsfRowId;
  patch: Partial<TData> | ((row: TData) => TData);
};

export type KmsfVirtualRowsOptions = {
  overscan?: number;
  rowHeight: number;
  scrollTop: number;
  viewportHeight: number;
};

export type KmsfVirtualRows<TData> = {
  bottomSpacerHeight: number;
  endIndex: number;
  rows: TData[];
  startIndex: number;
  topSpacerHeight: number;
  totalHeight: number;
};

export type KmsfCopiedRow<TData> = {
  kind: "row";
  row: TData;
  text: string;
};

export type KmsfCopiedCell = {
  kind: "cell";
  text: string;
  value: unknown;
};

export type KmsfCopiedCellRangeCell = {
  columnId: string;
  text: string;
  value: unknown;
} | null;

export type KmsfCopiedCellRange = {
  kind: "cell-range";
  rows: KmsfCopiedCellRangeCell[][];
  text: string;
};

export type KmsfCellAddress = {
  columnId: string;
  rowId: KmsfRowId;
};

export type KmsfCellRange = {
  anchor: KmsfCellAddress;
  focus: KmsfCellAddress;
};

export type KmsfPasteRowOptions<TData> =
  | {
      getNewRowId?: (row: TData) => KmsfRowId;
      mode: "append";
    }
  | {
      getPastedRowId?: (row: TData) => KmsfRowId;
      mode: "insert-after";
      targetRowId: KmsfRowId;
    }
  | {
      mode: "overwrite" | "replace";
      targetRowId: KmsfRowId;
    };

export type KmsfRowSelectionOptions = {
  multi?: boolean;
  toggle?: boolean;
};

export type KmsfFillCellRangeOptions = {
  source: KmsfCellAddress;
  target: KmsfCellRange;
};

function defaultGetRowId<TData>(_row: TData, index: number) {
  return index;
}

function cloneRows<TData>(rows: readonly TData[]) {
  return [...rows];
}

function normalizeColumns<TData>(columns: ReadonlyArray<KmsfDataTableColumn<TData>>) {
  return columns.map((column) => ({
    ...column,
    id: column.id ?? column.field,
  }));
}

function normalizeColumnState<TData>(
  columns: ReadonlyArray<KmsfDataTableRuntimeColumn<TData>>,
  layout?: Partial<KmsfColumnLayout>,
) {
  const state: Record<string, KmsfColumnRuntimeState> = {};

  for (const column of columns) {
    state[column.id] = {
      hidden: layout?.columns?.[column.id]?.hidden ?? column.hidden,
      width: layout?.columns?.[column.id]?.width ?? column.width,
    };
  }

  return state;
}

function normalizeColumnOrder<TData>(
  columns: ReadonlyArray<KmsfDataTableRuntimeColumn<TData>>,
  layout?: Partial<KmsfColumnLayout>,
) {
  const knownIds = new Set(columns.map((column) => column.id));
  const ordered = (layout?.order ?? []).filter((id) => knownIds.has(id));
  const missing = columns.map((column) => column.id).filter((id) => !ordered.includes(id));

  return [...ordered, ...missing];
}

function createEmptySelection(): KmsfSelectionState {
  return {
    cell: null,
    range: null,
    rowIds: [],
  };
}

function areRowIdsEqual(left: readonly KmsfRowId[], right: readonly KmsfRowId[]) {
  return left.length === right.length && left.every((id, index) => id === right[index]);
}

function withRows<TData>(
  state: KmsfDataTableState<TData>,
  rows: TData[],
  options: { resetSelection?: boolean } = {},
): KmsfDataTableState<TData> {
  const rowIds = rows.map(state.getRowId);
  const shouldResetSelection = options.resetSelection === true || !areRowIdsEqual(state.rowIds, rowIds);

  return {
    ...state,
    rowIds,
    rows,
    selection: shouldResetSelection ? createEmptySelection() : state.selection,
  };
}

function findRowIndex<TData>(state: KmsfDataTableState<TData>, rowId: KmsfRowId) {
  return state.rowIds.findIndex((id) => id === rowId);
}

function findColumn<TData>(state: KmsfDataTableState<TData>, columnId: string) {
  return state.columns.find((column) => column.id === columnId);
}

function getNestedFieldValue(row: unknown, field: string): unknown {
  return field.split(".").reduce<unknown>((value, key) => {
    if (value == null || typeof value !== "object") {
      return undefined;
    }

    return (value as Record<string, unknown>)[key];
  }, row);
}

function setNestedFieldValue<TData>(row: TData, field: string, value: unknown): TData {
  if (!row || typeof row !== "object") {
    return row;
  }

  const keys = field.split(".");
  const [firstKey] = keys;

  if (!firstKey) {
    return row;
  }

  if (keys.length === 1) {
    return { ...row, [firstKey]: value };
  }

  const root = { ...(row as Record<string, unknown>) };
  let current: Record<string, unknown> = root;

  keys.slice(0, -1).forEach((key, index) => {
    const nextKey = keys[index + 1];
    const existing = current[key];
    const next =
      existing && typeof existing === "object" && !Array.isArray(existing)
        ? { ...(existing as Record<string, unknown>) }
        : {};

    current[key] = next;

    if (nextKey) {
      current = next;
    }
  });

  current[keys.at(-1)!] = value;

  return root as TData;
}

function createCellParams<TData>(
  state: KmsfDataTableState<TData>,
  row: TData,
  rowId: KmsfRowId,
  column: KmsfDataTableRuntimeColumn<TData>,
): KmsfCellFormatParams<TData> {
  return {
    column,
    row,
    rowId,
    value: getKmsfCellValue(state, row, column.id),
  };
}

function resolveGuard<TData>(
  guard: KmsfClipboardGuard<TData> | undefined,
  params: KmsfCellFormatParams<TData>,
) {
  if (guard === undefined) {
    return true;
  }

  return typeof guard === "boolean" ? guard : guard(params);
}

function getCellRangeBounds<TData>(state: KmsfDataTableState<TData>, range: KmsfCellRange) {
  const visibleColumns = getKmsfVisibleColumns(state);
  const anchorRowIndex = findRowIndex(state, range.anchor.rowId);
  const focusRowIndex = findRowIndex(state, range.focus.rowId);
  const anchorColumnIndex = visibleColumns.findIndex((column) => column.id === range.anchor.columnId);
  const focusColumnIndex = visibleColumns.findIndex((column) => column.id === range.focus.columnId);

  if (anchorRowIndex < 0 || focusRowIndex < 0 || anchorColumnIndex < 0 || focusColumnIndex < 0) {
    return null;
  }

  return {
    columnEnd: Math.max(anchorColumnIndex, focusColumnIndex),
    columnStart: Math.min(anchorColumnIndex, focusColumnIndex),
    rowEnd: Math.max(anchorRowIndex, focusRowIndex),
    rowStart: Math.min(anchorRowIndex, focusRowIndex),
    visibleColumns,
  };
}

function assignGeneratedRowId<TData>(row: TData, rowId: KmsfRowId) {
  if (row && typeof row === "object" && "id" in row) {
    return { ...row, id: rowId } as TData;
  }

  return row;
}

function createCopiedRowId(existingIds: readonly KmsfRowId[], sourceRowId: KmsfRowId) {
  let index = 1;
  let nextId = `${String(sourceRowId)}-copy-${index}`;
  const ids = new Set(existingIds.map(String));

  while (ids.has(nextId)) {
    index += 1;
    nextId = `${String(sourceRowId)}-copy-${index}`;
  }

  return nextId;
}

function canUseCellClipboard<TData>(
  state: KmsfDataTableState<TData>,
  row: TData | undefined,
  rowId: KmsfRowId,
  column: KmsfDataTableRuntimeColumn<TData>,
  kind: "copy" | "paste",
) {
  if (row === undefined) {
    return false;
  }

  const params = createCellParams(state, row, rowId, column);

  if (column.props?.disabled !== undefined && resolveGuard(column.props.disabled, params) === true) {
    return false;
  }

  return resolveGuard(kind === "copy" ? column.props?.copyable : column.props?.pasteable, params);
}

function defaultCompare(left: unknown, right: unknown) {
  if (typeof left === "number" && typeof right === "number") {
    return left - right;
  }

  return String(left ?? "").localeCompare(String(right ?? ""));
}

export function createKmsfDataTableState<TData>({
  columnLayout,
  columns,
  getRowId = defaultGetRowId,
  pagination,
  rows,
  showHeader = true,
  sort = null,
  theme = {},
}: KmsfDataTableStateInput<TData>): KmsfDataTableState<TData> {
  const nextRows = cloneRows(rows);
  const nextColumns = normalizeColumns(columns);

  return {
    columnOrder: normalizeColumnOrder(nextColumns, columnLayout),
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
    sort,
    theme,
  };
}

export function queryKmsfRows<TData>(
  state: KmsfDataTableState<TData>,
  predicate?: (row: TData, index: number) => boolean,
) {
  return predicate ? state.rows.filter(predicate) : [...state.rows];
}

export function replaceKmsfRows<TData>(state: KmsfDataTableState<TData>, rows: readonly TData[]) {
  return withRows(state, cloneRows(rows), { resetSelection: true });
}

export function addKmsfRows<TData>(state: KmsfDataTableState<TData>, rows: readonly TData[]) {
  return withRows(state, [...state.rows, ...rows]);
}

export function updateKmsfRows<TData>(
  state: KmsfDataTableState<TData>,
  updates: ReadonlyArray<KmsfRowUpdate<TData>>,
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

export function deleteKmsfRows<TData>(state: KmsfDataTableState<TData>, rowIds: readonly KmsfRowId[]) {
  const deleteIds = new Set(rowIds);

  return withRows(
    state,
    state.rows.filter((_row, index) => {
      const rowId = state.rowIds[index];

      return rowId === undefined || !deleteIds.has(rowId);
    }),
  );
}

export function setKmsfTableTheme<TData>(state: KmsfDataTableState<TData>, theme: KmsfDataTableTheme) {
  return {
    ...state,
    theme: { ...state.theme, ...theme },
  };
}

export function setKmsfHeaderVisible<TData>(state: KmsfDataTableState<TData>, showHeader: boolean) {
  return {
    ...state,
    showHeader,
  };
}

export function setKmsfPagination<TData>(
  state: KmsfDataTableState<TData>,
  pagination: Partial<KmsfPaginationState>,
) {
  return {
    ...state,
    pagination: {
      pageIndex: pagination.pageIndex ?? state.pagination.pageIndex,
      pageSize: pagination.pageSize ?? state.pagination.pageSize,
    },
  };
}

export function setKmsfSortState<TData>(
  state: KmsfDataTableState<TData>,
  sort: KmsfSortState | null,
) {
  return {
    ...state,
    sort,
  };
}

export function clearKmsfSortState<TData>(state: KmsfDataTableState<TData>) {
  return setKmsfSortState(state, null);
}

export function setKmsfColumnWidth<TData>(
  state: KmsfDataTableState<TData>,
  columnId: string,
  width: number,
) {
  return {
    ...state,
    columnState: {
      ...state.columnState,
      [columnId]: {
        ...state.columnState[columnId],
        width,
      },
    },
  };
}

export function setKmsfColumnHidden<TData>(
  state: KmsfDataTableState<TData>,
  columnId: string,
  hidden: boolean,
) {
  return {
    ...state,
    columnState: {
      ...state.columnState,
      [columnId]: {
        ...state.columnState[columnId],
        hidden,
      },
    },
  };
}

export function moveKmsfColumn<TData>(
  state: KmsfDataTableState<TData>,
  columnId: string,
  targetIndex: number,
) {
  const current = state.columnOrder.filter((id) => id !== columnId);

  if (current.length === state.columnOrder.length) {
    return state;
  }

  const nextIndex = Math.max(0, Math.min(targetIndex, current.length));
  current.splice(nextIndex, 0, columnId);

  return { ...state, columnOrder: current };
}

export function serializeKmsfColumnLayout<TData>(state: KmsfDataTableState<TData>): KmsfColumnLayout {
  return {
    columns: { ...state.columnState },
    order: [...state.columnOrder],
  };
}

export function applyKmsfColumnLayout<TData>(state: KmsfDataTableState<TData>, layout: KmsfColumnLayout) {
  return {
    ...state,
    columnOrder: normalizeColumnOrder(state.columns, layout),
    columnState: normalizeColumnState(state.columns, layout),
  };
}

export function selectRow<TData>(
  state: KmsfDataTableState<TData>,
  rowId: KmsfRowId,
  options: KmsfRowSelectionOptions = {},
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

export function selectRows<TData>(state: KmsfDataTableState<TData>, rowIds: readonly KmsfRowId[]) {
  return {
    ...state,
    selection: {
      ...state.selection,
      rowIds: [...rowIds],
    },
  };
}

export function selectCell<TData>(state: KmsfDataTableState<TData>, cell: KmsfCellAddress) {
  return {
    ...state,
    selection: {
      ...state.selection,
      cell,
      range: null,
    },
  };
}

export function selectCellRange<TData>(state: KmsfDataTableState<TData>, range: KmsfCellRange) {
  return {
    ...state,
    selection: {
      ...state.selection,
      cell: range.focus,
      range,
    },
  };
}

export function clearKmsfCellRange<TData>(state: KmsfDataTableState<TData>) {
  return {
    ...state,
    selection: {
      ...state.selection,
      range: null,
    },
  };
}

export function clearKmsfSelection<TData>(state: KmsfDataTableState<TData>) {
  return {
    ...state,
    selection: createEmptySelection(),
  };
}

export function isKmsfRowSelected<TData>(state: KmsfDataTableState<TData>, rowId: KmsfRowId) {
  return state.selection.rowIds.includes(rowId);
}

export function isKmsfCellSelected<TData>(state: KmsfDataTableState<TData>, cell: KmsfCellAddress) {
  return state.selection.cell?.rowId === cell.rowId && state.selection.cell.columnId === cell.columnId;
}

export function getKmsfSelectedCellRange<TData>(
  state: KmsfDataTableState<TData>,
  range: KmsfCellRange | null = state.selection.range,
) {
  if (!range) {
    return [];
  }

  const visibleColumns = getKmsfVisibleColumns(state);
  const bounds = getCellRangeBounds(state, range);

  if (!bounds) {
    return [];
  }

  const cells: KmsfCellAddress[] = [];

  for (let rowIndex = bounds.rowStart; rowIndex <= bounds.rowEnd; rowIndex += 1) {
    const rowId = state.rowIds[rowIndex];

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

export function isKmsfCellInSelectedRange<TData>(state: KmsfDataTableState<TData>, cell: KmsfCellAddress) {
  return getKmsfSelectedCellRange(state).some(
    (selected) => selected.rowId === cell.rowId && selected.columnId === cell.columnId,
  );
}

export function getKmsfVisibleColumns<TData>(state: KmsfDataTableState<TData>) {
  return state.columnOrder
    .map((columnId) => findColumn(state, columnId))
    .filter((column): column is KmsfDataTableRuntimeColumn<TData> => Boolean(column))
    .filter((column) => state.columnState[column.id]?.hidden !== true);
}

export function getKmsfSortedRowIndexes<TData>(state: KmsfDataTableState<TData>) {
  const indexes = state.rows.map((_row, index) => index);

  if (!state.sort) {
    return indexes;
  }

  const column = findColumn(state, state.sort.columnId);

  if (!column || !column.sort) {
    return indexes;
  }

  return [...indexes].sort((leftIndex, rightIndex) => {
    const leftRow = state.rows[leftIndex]!;
    const rightRow = state.rows[rightIndex]!;
    const leftValue = getKmsfCellValue(state, leftRow, column.id);
    const rightValue = getKmsfCellValue(state, rightRow, column.id);
    const result =
      typeof column.sort === "function"
        ? column.sort(leftValue, rightValue, leftRow, rightRow)
        : defaultCompare(leftValue, rightValue);

    return state.sort?.direction === "desc" ? result * -1 : result;
  });
}

export function sortKmsfRows<TData>(
  state: KmsfDataTableState<TData>,
  sort: KmsfSortState | null,
) {
  const sortedState = setKmsfSortState(state, sort);
  const indexes = getKmsfSortedRowIndexes(sortedState);
  const rows = indexes.map((index) => sortedState.rows[index]!);

  return withRows(sortedState, rows);
}

export function getKmsfPageRows<TData>(
  state: KmsfDataTableState<TData>,
  pagination: Partial<KmsfPaginationState> = {},
) {
  const pageIndex = pagination.pageIndex ?? state.pagination.pageIndex;
  const pageSize = pagination.pageSize ?? state.pagination.pageSize;
  const start = Math.max(0, pageIndex) * Math.max(1, pageSize);
  const indexes = getKmsfSortedRowIndexes(state).slice(start, start + Math.max(1, pageSize));

  return indexes.map((index) => state.rows[index]!);
}

export function getKmsfVirtualRows<TData>(
  state: KmsfDataTableState<TData>,
  { overscan = 2, rowHeight, scrollTop, viewportHeight }: KmsfVirtualRowsOptions,
): KmsfVirtualRows<TData> {
  const safeRowHeight = Math.max(1, rowHeight);
  const rowIndexes = getKmsfSortedRowIndexes(state);
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

export function moveKmsfRow<TData>(
  state: KmsfDataTableState<TData>,
  rowId: KmsfRowId,
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

export function getKmsfCellValue<TData>(
  state: KmsfDataTableState<TData>,
  row: TData,
  columnId: string,
) {
  const column = findColumn(state, columnId);

  return column ? getNestedFieldValue(row, column.field) : undefined;
}

export function formatKmsfCellValue<TData>(
  state: KmsfDataTableState<TData>,
  row: TData,
  rowId: KmsfRowId,
  column: KmsfDataTableRuntimeColumn<TData>,
) {
  const value = getKmsfCellValue(state, row, column.id);

  if (column.format) {
    return column.format({ column, row, rowId, value });
  }

  return value == null ? "" : String(value);
}

export function isKmsfCellDisabled<TData>(
  state: KmsfDataTableState<TData>,
  row: TData,
  rowId: KmsfRowId,
  column: KmsfDataTableRuntimeColumn<TData>,
) {
  return column.props?.disabled !== undefined && resolveGuard(column.props.disabled, createCellParams(state, row, rowId, column)) === true;
}

export function getKmsfCellClassName<TData>(
  state: KmsfDataTableState<TData>,
  row: TData,
  rowId: KmsfRowId,
  column: KmsfDataTableRuntimeColumn<TData>,
) {
  const className = column.props?.className;

  return typeof className === "function" ? className(createCellParams(state, row, rowId, column)) : className;
}

export function getKmsfCellStyle<TData>(
  state: KmsfDataTableState<TData>,
  row: TData,
  rowId: KmsfRowId,
  column: KmsfDataTableRuntimeColumn<TData>,
) {
  const style = column.props?.style;

  return typeof style === "function" ? style(createCellParams(state, row, rowId, column)) : style;
}

export function copyKmsfRow<TData>(state: KmsfDataTableState<TData>, rowId: KmsfRowId): KmsfCopiedRow<TData> {
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

export function pasteKmsfRow<TData>(
  state: KmsfDataTableState<TData>,
  copied: KmsfCopiedRow<TData>,
  options: KmsfPasteRowOptions<TData>,
) {
  if (options.mode === "append") {
    const rowId = options.getNewRowId?.(copied.row);
    const row = rowId === undefined ? copied.row : assignGeneratedRowId(copied.row, rowId);

    return addKmsfRows(state, [row]);
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

  return updateKmsfRows(state, [
    {
      id: options.targetRowId,
      patch: assignGeneratedRowId(copied.row, options.targetRowId) as Partial<TData>,
    },
  ]);
}

export function copyKmsfCell<TData>(
  state: KmsfDataTableState<TData>,
  { columnId, rowId }: KmsfCellAddress,
): KmsfCopiedCell | null {
  const row = state.rows[findRowIndex(state, rowId)];
  const column = findColumn(state, columnId);

  if (!column || !canUseCellClipboard(state, row, rowId, column, "copy")) {
    return null;
  }

  const value = getKmsfCellValue(state, row!, columnId);

  return {
    kind: "cell",
    text: value == null ? "" : String(value),
    value,
  };
}

export function pasteKmsfCell<TData>(
  state: KmsfDataTableState<TData>,
  { columnId, rowId }: KmsfCellAddress,
  copied: KmsfCopiedCell | null,
) {
  const column = findColumn(state, columnId);
  const row = state.rows[findRowIndex(state, rowId)];

  if (!copied || !column || !canUseCellClipboard(state, row, rowId, column, "paste")) {
    return state;
  }

  return updateKmsfRows(state, [
    {
      id: rowId,
      patch: (currentRow) => setNestedFieldValue(currentRow, column.field, copied.value),
    },
  ]);
}

export function copyKmsfCellRange<TData>(
  state: KmsfDataTableState<TData>,
  range: KmsfCellRange | null = state.selection.range,
): KmsfCopiedCellRange | null {
  if (!range) {
    return null;
  }

  const bounds = getCellRangeBounds(state, range);

  if (!bounds) {
    return null;
  }

  const copiedRows: KmsfCopiedCellRangeCell[][] = [];

  for (let rowIndex = bounds.rowStart; rowIndex <= bounds.rowEnd; rowIndex += 1) {
    const row = state.rows[rowIndex];
    const rowId = state.rowIds[rowIndex];
    const copiedCells: KmsfCopiedCellRangeCell[] = [];

    for (let columnIndex = bounds.columnStart; columnIndex <= bounds.columnEnd; columnIndex += 1) {
      const column = bounds.visibleColumns[columnIndex];

      if (row === undefined || rowId === undefined || !column || !canUseCellClipboard(state, row, rowId, column, "copy")) {
        copiedCells.push(null);
        continue;
      }

      const value = getKmsfCellValue(state, row, column.id);
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

export function pasteKmsfCellRange<TData>(
  state: KmsfDataTableState<TData>,
  target: KmsfCellAddress,
  copied: KmsfCopiedCellRange | null,
) {
  if (!copied) {
    return state;
  }

  const visibleColumns = getKmsfVisibleColumns(state);
  const targetRowIndex = findRowIndex(state, target.rowId);
  const targetColumnIndex = visibleColumns.findIndex((column) => column.id === target.columnId);
  const rows = [...state.rows];

  if (targetRowIndex < 0 || targetColumnIndex < 0) {
    return state;
  }

  let changed = false;

  copied.rows.forEach((copiedRow, rowOffset) => {
    const rowIndex = targetRowIndex + rowOffset;
    const row = rows[rowIndex];
    const rowId = state.rowIds[rowIndex];

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

export function fillKmsfCellRange<TData>(
  state: KmsfDataTableState<TData>,
  { source, target }: KmsfFillCellRangeOptions,
) {
  const copied = copyKmsfCell(state, source);

  if (!copied) {
    return state;
  }

  return getKmsfSelectedCellRange(state, target).reduce(
    (currentState, cell) => pasteKmsfCell(currentState, cell, copied),
    state,
  );
}
