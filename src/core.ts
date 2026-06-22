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

export type KmsfComponentPrimitiveValue = string | number | boolean;
export type KmsfComponentAlign = "center" | "end" | "start";
export type KmsfComponentDirection = "left" | "right";

export type KmsfComponentPlacement = {
  align?: KmsfComponentAlign;
  direction?: KmsfComponentDirection;
  id?: string;
};

export type KmsfDataTableComponentOption = {
  disabled?: boolean;
  label: React.ReactNode;
  value: KmsfComponentPrimitiveValue;
};

export type KmsfVirtualListItem<TItem = unknown> = {
  data?: TItem;
  disabled?: boolean;
  label: React.ReactNode;
  searchText?: string;
  value: KmsfComponentPrimitiveValue;
};

export type KmsfDataTableMenuItem =
  | {
      disabled?: boolean;
      label: React.ReactNode;
      type?: "item";
      value: KmsfComponentPrimitiveValue;
    }
  | {
      label: React.ReactNode;
      type: "label";
    }
  | {
      type: "divider";
    };

export type KmsfComponentColumnPayload<TData, TValue = unknown> = {
  definition: KmsfDataTableRuntimeColumn<TData, TValue>;
  field: string;
  id: string;
  index: number;
  label: React.ReactNode;
};

export type KmsfComponentRowPayload<TData> = {
  data: TData;
  dataIndex: number;
  disabled: boolean;
  id: KmsfRowId;
  index: number;
  selected: boolean;
};

export type KmsfCellComponentPayload<TData, TValue = unknown> = {
  column: KmsfComponentColumnPayload<TData, TValue>;
  row: KmsfComponentRowPayload<TData>;
  selection: {
    selectedRowCount: number;
  };
  value: TValue;
};

export type KmsfHeaderComponentPayload<TData, TValue = unknown> = {
  column: KmsfComponentColumnPayload<TData, TValue>;
  layout: {
    hidden: boolean;
    width?: number;
  };
  sort: {
    direction: KmsfSortDirection | null;
    enabled: boolean;
  };
};

export type KmsfClipboardGuard<TData, TValue = unknown> =
  | boolean
  | ((params: KmsfCellComponentPayload<TData, TValue>) => boolean);

export type KmsfColumnProps<TData, TValue = unknown> = {
  className?: string | ((params: KmsfCellComponentPayload<TData, TValue>) => string | undefined);
  copyable?: KmsfClipboardGuard<TData, TValue>;
  disabled?: KmsfClipboardGuard<TData, TValue>;
  pasteable?: KmsfClipboardGuard<TData, TValue>;
  style?: React.CSSProperties | ((params: KmsfCellComponentPayload<TData, TValue>) => React.CSSProperties | undefined);
};

export type KmsfDataTableComponentProps<TPayload, TProps> = TProps | ((payload: TPayload) => TProps);

export type KmsfDataTableOptions<TPayload> =
  | KmsfDataTableComponentOption[]
  | ((payload: TPayload) => KmsfDataTableComponentOption[]);

export type KmsfDataTableMenuItems<TPayload> =
  | KmsfDataTableMenuItem[]
  | ((payload: TPayload) => KmsfDataTableMenuItem[]);

export type KmsfVirtualListItems<TPayload> =
  | Array<KmsfVirtualListItem>
  | ((payload: TPayload) => Array<KmsfVirtualListItem>);

export type KmsfButtonComponentConfig<TPayload> = {
  onClick?: (payload: TPayload & { event: React.MouseEvent<HTMLButtonElement> }) => void;
  props?: KmsfDataTableComponentProps<TPayload, React.ButtonHTMLAttributes<HTMLButtonElement>>;
  type: "button";
};

export type KmsfInputCommitEvent =
  | React.ChangeEvent<HTMLInputElement>
  | React.FocusEvent<HTMLInputElement>
  | React.KeyboardEvent<HTMLInputElement>;

export type KmsfInputComponentConfig<TPayload> = {
  onChange?: (payload: TPayload & { event: KmsfInputCommitEvent; value: string }) => void;
  onValueChange?: (payload: TPayload & { value: string }) => void;
  props?: KmsfDataTableComponentProps<TPayload, React.InputHTMLAttributes<HTMLInputElement>>;
  type: "input";
};

export type KmsfCheckboxComponentConfig<TPayload> = {
  onCheckedChange?: (payload: TPayload & { checked: boolean }) => void;
  props?: KmsfDataTableComponentProps<TPayload, React.InputHTMLAttributes<HTMLInputElement>>;
  type: "checkbox";
};

export type KmsfRadioComponentConfig<TPayload> = {
  onValueChange?: (payload: TPayload & { value: string }) => void;
  options: KmsfDataTableOptions<TPayload>;
  props?: KmsfDataTableComponentProps<
    TPayload,
    React.HTMLAttributes<HTMLDivElement> & { value?: KmsfComponentPrimitiveValue }
  >;
  type: "radio";
};

export type KmsfSelectComponentConfig<TPayload> = {
  onValueChange?: (payload: TPayload & { value: string }) => void;
  options: KmsfDataTableOptions<TPayload>;
  props?: KmsfDataTableComponentProps<TPayload, React.SelectHTMLAttributes<HTMLSelectElement>>;
  type: "select";
};

export type KmsfToggleComponentConfig<TPayload> = {
  onCheckedChange?: (payload: TPayload & { checked: boolean }) => void;
  props?: KmsfDataTableComponentProps<
    TPayload,
    React.ButtonHTMLAttributes<HTMLButtonElement> & { checked?: boolean }
  >;
  type: "toggle";
};

export type KmsfProgressComponentConfig<TPayload> = {
  props?: KmsfDataTableComponentProps<
    TPayload,
    React.HTMLAttributes<HTMLDivElement> & { max?: number; value?: number }
  >;
  type: "progress";
};

export type KmsfMenuComponentConfig<TPayload> = {
  items: KmsfDataTableMenuItems<TPayload>;
  onBeforeChange?: (
    payload: TPayload & { event?: Event | React.SyntheticEvent; open: boolean },
  ) => boolean | void;
  onOpenChange?: (payload: TPayload & { event?: Event | React.SyntheticEvent; open: boolean }) => void;
  onSelect?: (
    payload: TPayload & {
      event: React.MouseEvent<HTMLButtonElement>;
      item: Extract<KmsfDataTableMenuItem, { value: KmsfComponentPrimitiveValue }>;
      value: KmsfComponentPrimitiveValue;
    },
  ) => void;
  props?: KmsfDataTableComponentProps<TPayload, React.ButtonHTMLAttributes<HTMLButtonElement>>;
  type: "menu";
};

export type KmsfVirtualListSearchFilterPayload = {
  item: KmsfVirtualListItem;
  itemIndex: number;
  value: string;
};

export type KmsfVirtualListComponentConfig<TPayload> = {
  items: KmsfVirtualListItems<TPayload>;
  onClickItem?: (
    payload: TPayload & {
      event: React.MouseEvent<HTMLButtonElement> | React.KeyboardEvent<HTMLButtonElement>;
      item: KmsfVirtualListItem;
      itemIndex: number;
      value: KmsfComponentPrimitiveValue;
    },
  ) => void;
  onContextMenuItem?: (
    payload: TPayload & {
      event: React.MouseEvent<HTMLButtonElement>;
      item: KmsfVirtualListItem;
      itemIndex: number;
      value: KmsfComponentPrimitiveValue;
    },
  ) => void;
  props?: KmsfDataTableComponentProps<
    TPayload,
    React.HTMLAttributes<HTMLDivElement> & {
      height?: number | string;
      itemHeight?: number;
      limit?: number;
      more?: boolean;
      searchable?: boolean;
    }
  >;
  searchFilter?: (payload: KmsfVirtualListSearchFilterPayload) => boolean;
  type: "virtual-list";
};

export type KmsfHeaderComponentConfig<TData, TValue = unknown> =
  | KmsfButtonComponentConfig<KmsfHeaderComponentPayload<TData, TValue>>
  | KmsfInputComponentConfig<KmsfHeaderComponentPayload<TData, TValue>>
  | KmsfCheckboxComponentConfig<KmsfHeaderComponentPayload<TData, TValue>>
  | KmsfRadioComponentConfig<KmsfHeaderComponentPayload<TData, TValue>>
  | KmsfSelectComponentConfig<KmsfHeaderComponentPayload<TData, TValue>>
  | KmsfToggleComponentConfig<KmsfHeaderComponentPayload<TData, TValue>>
  | KmsfProgressComponentConfig<KmsfHeaderComponentPayload<TData, TValue>>
  | KmsfMenuComponentConfig<KmsfHeaderComponentPayload<TData, TValue>>;

export type KmsfCellComponentConfig<TData, TValue = unknown> =
  | KmsfButtonComponentConfig<KmsfCellComponentPayload<TData, TValue>>
  | KmsfInputComponentConfig<KmsfCellComponentPayload<TData, TValue>>
  | KmsfCheckboxComponentConfig<KmsfCellComponentPayload<TData, TValue>>
  | KmsfRadioComponentConfig<KmsfCellComponentPayload<TData, TValue>>
  | KmsfSelectComponentConfig<KmsfCellComponentPayload<TData, TValue>>
  | KmsfToggleComponentConfig<KmsfCellComponentPayload<TData, TValue>>
  | KmsfProgressComponentConfig<KmsfCellComponentPayload<TData, TValue>>
  | KmsfVirtualListComponentConfig<KmsfCellComponentPayload<TData, TValue>>;

export type KmsfHeaderComponent<TData, TValue = unknown> = KmsfComponentPlacement &
  KmsfHeaderComponentConfig<TData, TValue>;

export type KmsfCellComponent<TData, TValue = unknown> = KmsfComponentPlacement &
  KmsfCellComponentConfig<TData, TValue>;

export type KmsfDataTableCellConfig<TData, TValue = unknown> = {
  components?: Array<KmsfCellComponent<TData, TValue>>;
  format?: (params: KmsfCellComponentPayload<TData, TValue>) => React.ReactNode;
  props?:
    | KmsfColumnProps<TData, TValue>
    | ((params: KmsfCellComponentPayload<TData, TValue>) => KmsfColumnProps<TData, TValue>);
  renderer?: (params: KmsfCellComponentPayload<TData, TValue>) => React.ReactNode;
  tooltip?: string | ((params: KmsfCellComponentPayload<TData, TValue>) => React.ReactNode);
};

export type KmsfDataTableHeaderConfig<TData, TValue = unknown> = {
  components?: Array<KmsfHeaderComponent<TData, TValue>>;
  props?: React.ThHTMLAttributes<HTMLTableCellElement>;
  renderer?: (params: KmsfHeaderComponentPayload<TData, TValue>) => React.ReactNode;
};

export type KmsfDataTableColumn<TData, TValue = unknown> = {
  cell?: KmsfDataTableCellConfig<TData, TValue>;
  field: string;
  header?: KmsfDataTableHeaderConfig<TData, TValue>;
  hidden?: boolean;
  id?: string;
  label: React.ReactNode;
  maxWidth?: number;
  minWidth?: number;
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

function createCellComponentParams<TData>(
  state: KmsfDataTableState<TData>,
  row: TData,
  rowId: KmsfRowId,
  column: KmsfDataTableRuntimeColumn<TData>,
): KmsfCellComponentPayload<TData> {
  return {
    column: {
      definition: column,
      field: column.field,
      id: column.id,
      index: state.columns.findIndex((current) => current.id === column.id),
      label: column.label,
    },
    row: {
      data: row,
      dataIndex: state.rows.indexOf(row),
      disabled: false,
      id: rowId,
      index: state.rowIds.indexOf(rowId),
      selected: state.selection.rowIds.includes(rowId),
    },
    selection: {
      selectedRowCount: state.selection.rowIds.length,
    },
    value: getKmsfCellValue(state, row, column.id),
  };
}

function resolveGuard<TData>(
  guard: KmsfClipboardGuard<TData> | undefined,
  params: KmsfCellComponentPayload<TData>,
) {
  if (guard === undefined) {
    return true;
  }

  return typeof guard === "boolean" ? guard : guard(params);
}

function resolveCellProps<TData>(
  state: KmsfDataTableState<TData>,
  row: TData,
  rowId: KmsfRowId,
  column: KmsfDataTableRuntimeColumn<TData>,
) {
  const params = createCellComponentParams(state, row, rowId, column);
  const props = column.cell?.props;

  return typeof props === "function" ? props(params) : props;
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

  const params = createCellComponentParams(state, row, rowId, column);
  const props = resolveCellProps(state, row, rowId, column);

  if (props?.disabled !== undefined && resolveGuard(props.disabled, params) === true) {
    return false;
  }

  return resolveGuard(kind === "copy" ? props?.copyable : props?.pasteable, params);
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

  if (column.cell?.format) {
    return column.cell.format(createCellComponentParams(state, row, rowId, column));
  }

  return value == null ? "" : String(value);
}

export function isKmsfCellDisabled<TData>(
  state: KmsfDataTableState<TData>,
  row: TData,
  rowId: KmsfRowId,
  column: KmsfDataTableRuntimeColumn<TData>,
) {
  const props = resolveCellProps(state, row, rowId, column);

  return props?.disabled !== undefined && resolveGuard(props.disabled, createCellComponentParams(state, row, rowId, column)) === true;
}

export function getKmsfCellClassName<TData>(
  state: KmsfDataTableState<TData>,
  row: TData,
  rowId: KmsfRowId,
  column: KmsfDataTableRuntimeColumn<TData>,
) {
  const params = createCellComponentParams(state, row, rowId, column);
  const className = resolveCellProps(state, row, rowId, column)?.className;

  return typeof className === "function" ? className(params) : className;
}

export function getKmsfCellStyle<TData>(
  state: KmsfDataTableState<TData>,
  row: TData,
  rowId: KmsfRowId,
  column: KmsfDataTableRuntimeColumn<TData>,
) {
  const params = createCellComponentParams(state, row, rowId, column);
  const style = resolveCellProps(state, row, rowId, column)?.style;

  return typeof style === "function" ? style(params) : style;
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
