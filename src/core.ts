import type React from "react";

export type CominsRowId = string | number;

export type CominsTableDensity = "comfortable" | "compact" | "spacious";

export type CominsTableTheme = {
  className?: string;
  density?: CominsTableDensity;
  style?: React.CSSProperties;
};

export type CominsSortDirection = "asc" | "desc";

export type CominsSortState = {
  columnId: string;
  direction: CominsSortDirection;
};

export type CominsCellFormatParams<TData, TValue = unknown> = {
  column: CominsTableRuntimeColumn<TData, TValue>;
  row: TData;
  rowId: CominsRowId;
  value: TValue;
};

export type CominsColumnValueResolver<TData, TValue> =
  | TValue
  | ((params: CominsCellFormatParams<TData, TValue>) => TValue);

export type CominsComponentPrimitiveValue = string | number | boolean;
export type CominsComponentAlign = "center" | "end" | "start";
export type CominsComponentDirection = "left" | "right";

export type CominsComponentPlacement = {
  align?: CominsComponentAlign;
  direction?: CominsComponentDirection;
  id?: string;
};

export type CominsTableComponentOption = {
  disabled?: boolean;
  label: React.ReactNode;
  value: CominsComponentPrimitiveValue;
};

export type CominsVirtualListItem<TItem = unknown> = {
  data?: TItem;
  disabled?: boolean;
  label: React.ReactNode;
  searchText?: string;
  value: CominsComponentPrimitiveValue;
};

export type CominsTableMenuItem =
  | {
      disabled?: boolean;
      label: React.ReactNode;
      type?: "item";
      value: CominsComponentPrimitiveValue;
    }
  | {
      label: React.ReactNode;
      type: "label";
    }
  | {
      type: "divider";
    };

export type CominsComponentColumnPayload<TData, TValue = unknown> = {
  definition: CominsTableRuntimeColumn<TData, TValue>;
  field: string;
  id: string;
  index: number;
  label: React.ReactNode;
};

export type CominsComponentRowPayload<TData> = {
  data: TData;
  dataIndex: number;
  disabled: boolean;
  id: CominsRowId;
  index: number;
  selected: boolean;
};

export type CominsCellComponentPayload<TData, TValue = unknown> = {
  column: CominsComponentColumnPayload<TData, TValue>;
  row: CominsComponentRowPayload<TData>;
  selection: {
    selectedRowCount: number;
  };
  value: TValue;
};

export type CominsHeaderComponentPayload<TData, TValue = unknown> = {
  column: CominsComponentColumnPayload<TData, TValue>;
  layout: {
    hidden: boolean;
    width?: number;
  };
  sort: {
    direction: CominsSortDirection | null;
    enabled: boolean;
  };
};

export type CominsClipboardGuard<TData, TValue = unknown> =
  | boolean
  | ((params: CominsCellComponentPayload<TData, TValue>) => boolean);

export type CominsColumnProps<TData, TValue = unknown> = {
  className?: string | ((params: CominsCellComponentPayload<TData, TValue>) => string | undefined);
  copyable?: CominsClipboardGuard<TData, TValue>;
  disabled?: CominsClipboardGuard<TData, TValue>;
  pasteable?: CominsClipboardGuard<TData, TValue>;
  style?: React.CSSProperties | ((params: CominsCellComponentPayload<TData, TValue>) => React.CSSProperties | undefined);
};

export type CominsTableComponentProps<TPayload, TProps> = TProps | ((payload: TPayload) => TProps);

export type CominsTableOptions<TPayload> =
  | CominsTableComponentOption[]
  | ((payload: TPayload) => CominsTableComponentOption[]);

export type CominsTableMenuItems<TPayload> =
  | CominsTableMenuItem[]
  | ((payload: TPayload) => CominsTableMenuItem[]);

export type CominsVirtualListItems<TPayload> =
  | Array<CominsVirtualListItem>
  | ((payload: TPayload) => Array<CominsVirtualListItem>);

export type CominsButtonComponentConfig<TPayload> = {
  onClick?: (payload: TPayload & { event: React.MouseEvent<HTMLButtonElement> }) => void;
  props?: CominsTableComponentProps<TPayload, React.ButtonHTMLAttributes<HTMLButtonElement>>;
  type: "button";
};

export type CominsInputCommitEvent =
  | React.ChangeEvent<HTMLInputElement>
  | React.FocusEvent<HTMLInputElement>
  | React.KeyboardEvent<HTMLInputElement>;

export type CominsInputComponentConfig<TPayload> = {
  onChange?: (payload: TPayload & { event: CominsInputCommitEvent; value: string }) => void;
  onValueChange?: (payload: TPayload & { value: string }) => void;
  props?: CominsTableComponentProps<TPayload, React.InputHTMLAttributes<HTMLInputElement>>;
  type: "input";
};

export type CominsCheckboxComponentConfig<TPayload> = {
  onCheckedChange?: (payload: TPayload & { checked: boolean }) => void;
  props?: CominsTableComponentProps<TPayload, React.InputHTMLAttributes<HTMLInputElement>>;
  type: "checkbox";
};

export type CominsRadioComponentConfig<TPayload> = {
  onValueChange?: (payload: TPayload & { value: string }) => void;
  options: CominsTableOptions<TPayload>;
  props?: CominsTableComponentProps<
    TPayload,
    React.HTMLAttributes<HTMLDivElement> & { value?: CominsComponentPrimitiveValue }
  >;
  type: "radio";
};

export type CominsSelectComponentConfig<TPayload> = {
  onValueChange?: (payload: TPayload & { value: string }) => void;
  options: CominsTableOptions<TPayload>;
  props?: CominsTableComponentProps<TPayload, React.SelectHTMLAttributes<HTMLSelectElement>>;
  type: "select";
};

export type CominsToggleComponentConfig<TPayload> = {
  onCheckedChange?: (payload: TPayload & { checked: boolean }) => void;
  props?: CominsTableComponentProps<
    TPayload,
    React.ButtonHTMLAttributes<HTMLButtonElement> & { checked?: boolean }
  >;
  type: "toggle";
};

export type CominsProgressComponentConfig<TPayload> = {
  props?: CominsTableComponentProps<
    TPayload,
    React.HTMLAttributes<HTMLDivElement> & { max?: number; value?: number }
  >;
  type: "progress";
};

export type CominsMenuComponentConfig<TPayload> = {
  items: CominsTableMenuItems<TPayload>;
  onBeforeChange?: (
    payload: TPayload & { event?: Event | React.SyntheticEvent; open: boolean },
  ) => boolean | void;
  onOpenChange?: (payload: TPayload & { event?: Event | React.SyntheticEvent; open: boolean }) => void;
  onSelect?: (
    payload: TPayload & {
      event: React.MouseEvent<HTMLButtonElement>;
      item: Extract<CominsTableMenuItem, { value: CominsComponentPrimitiveValue }>;
      value: CominsComponentPrimitiveValue;
    },
  ) => void;
  props?: CominsTableComponentProps<TPayload, React.ButtonHTMLAttributes<HTMLButtonElement>>;
  type: "menu";
};

export type CominsVirtualListSearchFilterPayload = {
  item: CominsVirtualListItem;
  itemIndex: number;
  value: string;
};

export type CominsVirtualListComponentConfig<TPayload> = {
  items: CominsVirtualListItems<TPayload>;
  onClickItem?: (
    payload: TPayload & {
      event: React.MouseEvent<HTMLButtonElement> | React.KeyboardEvent<HTMLButtonElement>;
      item: CominsVirtualListItem;
      itemIndex: number;
      value: CominsComponentPrimitiveValue;
    },
  ) => void;
  onContextMenuItem?: (
    payload: TPayload & {
      event: React.MouseEvent<HTMLButtonElement>;
      item: CominsVirtualListItem;
      itemIndex: number;
      value: CominsComponentPrimitiveValue;
    },
  ) => void;
  props?: CominsTableComponentProps<
    TPayload,
    React.HTMLAttributes<HTMLDivElement> & {
      height?: number | string;
      itemHeight?: number;
      limit?: number;
      more?: boolean;
      searchable?: boolean;
    }
  >;
  searchFilter?: (payload: CominsVirtualListSearchFilterPayload) => boolean;
  type: "virtual-list";
};

export type CominsHeaderComponentConfig<TData, TValue = unknown> =
  | CominsButtonComponentConfig<CominsHeaderComponentPayload<TData, TValue>>
  | CominsInputComponentConfig<CominsHeaderComponentPayload<TData, TValue>>
  | CominsCheckboxComponentConfig<CominsHeaderComponentPayload<TData, TValue>>
  | CominsRadioComponentConfig<CominsHeaderComponentPayload<TData, TValue>>
  | CominsSelectComponentConfig<CominsHeaderComponentPayload<TData, TValue>>
  | CominsToggleComponentConfig<CominsHeaderComponentPayload<TData, TValue>>
  | CominsProgressComponentConfig<CominsHeaderComponentPayload<TData, TValue>>
  | CominsMenuComponentConfig<CominsHeaderComponentPayload<TData, TValue>>;

export type CominsCellComponentConfig<TData, TValue = unknown> =
  | CominsButtonComponentConfig<CominsCellComponentPayload<TData, TValue>>
  | CominsInputComponentConfig<CominsCellComponentPayload<TData, TValue>>
  | CominsCheckboxComponentConfig<CominsCellComponentPayload<TData, TValue>>
  | CominsRadioComponentConfig<CominsCellComponentPayload<TData, TValue>>
  | CominsSelectComponentConfig<CominsCellComponentPayload<TData, TValue>>
  | CominsToggleComponentConfig<CominsCellComponentPayload<TData, TValue>>
  | CominsProgressComponentConfig<CominsCellComponentPayload<TData, TValue>>
  | CominsVirtualListComponentConfig<CominsCellComponentPayload<TData, TValue>>;

export type CominsHeaderComponent<TData, TValue = unknown> = CominsComponentPlacement &
  CominsHeaderComponentConfig<TData, TValue>;

export type CominsCellComponent<TData, TValue = unknown> = CominsComponentPlacement &
  CominsCellComponentConfig<TData, TValue>;

export type CominsTableCellConfig<TData, TValue = unknown> = {
  components?: Array<CominsCellComponent<TData, TValue>>;
  format?: (params: CominsCellComponentPayload<TData, TValue>) => React.ReactNode;
  props?:
    | CominsColumnProps<TData, TValue>
    | ((params: CominsCellComponentPayload<TData, TValue>) => CominsColumnProps<TData, TValue>);
  renderer?: (params: CominsCellComponentPayload<TData, TValue>) => React.ReactNode;
  tooltip?: string | ((params: CominsCellComponentPayload<TData, TValue>) => React.ReactNode);
};

export type CominsTableHeaderConfig<TData, TValue = unknown> = {
  components?: Array<CominsHeaderComponent<TData, TValue>>;
  props?: React.ThHTMLAttributes<HTMLTableCellElement>;
  renderer?: (params: CominsHeaderComponentPayload<TData, TValue>) => React.ReactNode;
};

export type CominsTableColumn<TData, TValue = unknown> = {
  cell?: CominsTableCellConfig<TData, TValue>;
  field: string;
  header?: CominsTableHeaderConfig<TData, TValue>;
  hidden?: boolean;
  id?: string;
  label: React.ReactNode;
  maxWidth?: number;
  minWidth?: number;
  sort?: boolean | ((left: TValue, right: TValue, leftRow: TData, rightRow: TData) => number);
  width?: number;
};

export type CominsTableColumnGroup = {
  children: string[];
  hidden?: boolean;
  id: string;
  label: React.ReactNode;
};

export type CominsTableRuntimeColumn<TData, TValue = unknown> = Omit<
  CominsTableColumn<TData, TValue>,
  "id"
> & {
  id: string;
};

export type CominsTableRuntimeColumnGroup = Omit<CominsTableColumnGroup, "children"> & {
  children: string[];
};

export type CominsEventColumn<TData, TValue = unknown> = {
  definition: CominsTableRuntimeColumn<TData, TValue>;
  field: string;
  id: string;
  index: number;
  label: React.ReactNode;
};

export type CominsColumnRuntimeState = {
  hidden?: boolean;
  width?: number;
};

export type CominsColumnGroupRuntimeState = {
  hidden?: boolean;
};

export type CominsColumnLayout = {
  columns: Record<string, CominsColumnRuntimeState>;
  groups?: Record<string, CominsColumnGroupRuntimeState>;
  order: string[];
};

export type CominsPaginationState = {
  pageIndex: number;
  pageSize: number;
};

export type CominsSelectionState = {
  cell: CominsCellAddress | null;
  range: CominsCellRange | null;
  rowIds: CominsRowId[];
};

export type CominsTableState<TData> = {
  columnOrder: string[];
  columnGroups: CominsTableRuntimeColumnGroup[];
  columnGroupState: Record<string, CominsColumnGroupRuntimeState>;
  columns: Array<CominsTableRuntimeColumn<TData>>;
  columnState: Record<string, CominsColumnRuntimeState>;
  getRowId: (row: TData, index: number) => CominsRowId;
  pagination: CominsPaginationState;
  rowIds: CominsRowId[];
  rows: TData[];
  selection: CominsSelectionState;
  showHeader: boolean;
  sort: CominsSortState | null;
  theme: CominsTableTheme;
};

export type CominsTableStateInput<TData> = {
  columnLayout?: Partial<CominsColumnLayout>;
  columnGroups?: ReadonlyArray<CominsTableColumnGroup>;
  columns: ReadonlyArray<CominsTableColumn<TData>>;
  getRowId?: (row: TData, index: number) => CominsRowId;
  pagination?: Partial<CominsPaginationState>;
  rows: readonly TData[];
  showHeader?: boolean;
  sort?: CominsSortState | null;
  theme?: CominsTableTheme;
};

export type CominsRowUpdate<TData> = {
  id: CominsRowId;
  patch: Partial<TData> | ((row: TData) => TData);
};

export type CominsVirtualRowsOptions = {
  overscan?: number;
  rowHeight: number;
  scrollTop: number;
  viewportHeight: number;
};

export type CominsVirtualRows<TData> = {
  bottomSpacerHeight: number;
  endIndex: number;
  rows: TData[];
  startIndex: number;
  topSpacerHeight: number;
  totalHeight: number;
};

export type CominsHeaderColumnCell<TData> = {
  colSpan: 1;
  column: CominsTableRuntimeColumn<TData>;
  columnId: string;
  groupId?: string;
  kind: "column";
  rowSpan: 1 | 2;
};

export type CominsHeaderGroupCell = {
  colSpan: number;
  group: CominsTableRuntimeColumnGroup;
  groupId: string;
  kind: "group";
  rowSpan: 1;
};

export type CominsHeaderCell<TData> = CominsHeaderColumnCell<TData> | CominsHeaderGroupCell;

export type CominsCopiedRow<TData> = {
  kind: "row";
  row: TData;
  text: string;
};

export type CominsCopiedCell = {
  kind: "cell";
  text: string;
  value: unknown;
};

export type CominsCopiedCellRangeCell = {
  columnId: string;
  text: string;
  value: unknown;
} | null;

export type CominsCopiedCellRange = {
  kind: "cell-range";
  rows: CominsCopiedCellRangeCell[][];
  text: string;
};

export type CominsExportFormat = "csv" | "json";

export type CominsExportValueSource = "formatted" | "raw";

export type CominsExportColumn<TData> = {
  format?: (row: TData, rowIndex: number) => unknown;
  id?: string;
  label?: string;
  value: (row: TData, rowIndex: number) => unknown;
};

export type CominsExportRowsOptions<TData> = {
  columnOrder?: string[];
  columns: Array<CominsExportColumn<TData>>;
  headerOverrides?: Record<string, string>;
  rows: readonly TData[];
  valueSource?: CominsExportValueSource;
};

export type CominsCellAddress = {
  columnId: string;
  rowId: CominsRowId;
};

export type CominsCellRange = {
  anchor: CominsCellAddress;
  focus: CominsCellAddress;
};

export type CominsPasteRowOptions<TData> =
  | {
      getNewRowId?: (row: TData) => CominsRowId;
      mode: "append";
    }
  | {
      getPastedRowId?: (row: TData) => CominsRowId;
      mode: "insert-after";
      targetRowId: CominsRowId;
    }
  | {
      mode: "overwrite" | "replace";
      targetRowId: CominsRowId;
    };

export type CominsRowSelectionOptions = {
  multi?: boolean;
  toggle?: boolean;
};

export type CominsFillCellRangeOptions = {
  source: CominsCellAddress;
  target: CominsCellRange;
};

const COMINS_MIN_COLUMN_WIDTH = 50;

function defaultGetRowId<TData>(_row: TData, index: number) {
  return index;
}

function useRowsReference<TData>(rows: readonly TData[]) {
  return rows as TData[];
}

function normalizeColumns<TData>(columns: ReadonlyArray<CominsTableColumn<TData>>) {
  return columns.map((column) => ({
    ...column,
    id: column.id ?? column.field,
  }));
}

function normalizeColumnGroups<TData>(
  columns: ReadonlyArray<CominsTableRuntimeColumn<TData>>,
  columnGroups: ReadonlyArray<CominsTableColumnGroup> = [],
) {
  const knownColumnIds = new Set(columns.map((column) => column.id));
  const usedColumnIds = new Set<string>();
  const usedGroupIds = new Set<string>();
  const groups: CominsTableRuntimeColumnGroup[] = [];

  for (const group of columnGroups) {
    if (usedGroupIds.has(group.id)) {
      continue;
    }

    const children = group.children.filter((columnId) => {
      if (!knownColumnIds.has(columnId) || usedColumnIds.has(columnId)) {
        return false;
      }

      usedColumnIds.add(columnId);
      return true;
    });

    usedGroupIds.add(group.id);

    if (children.length === 0) {
      continue;
    }

    groups.push({
      ...group,
      children,
    });
  }

  return groups;
}

function normalizeColumnState<TData>(
  columns: ReadonlyArray<CominsTableRuntimeColumn<TData>>,
  layout?: Partial<CominsColumnLayout>,
) {
  const state: Record<string, CominsColumnRuntimeState> = {};

  for (const column of columns) {
    state[column.id] = {
      hidden: layout?.columns?.[column.id]?.hidden ?? column.hidden,
      width: layout?.columns?.[column.id]?.width ?? column.width,
    };
  }

  return state;
}

function normalizeColumnGroupState(
  columnGroups: ReadonlyArray<CominsTableRuntimeColumnGroup>,
  layout?: Partial<CominsColumnLayout>,
) {
  const state: Record<string, CominsColumnGroupRuntimeState> = {};

  for (const group of columnGroups) {
    state[group.id] = {
      hidden: layout?.groups?.[group.id]?.hidden ?? group.hidden,
    };
  }

  return state;
}

function getColumnGroupIdMap(columnGroups: ReadonlyArray<CominsTableRuntimeColumnGroup>) {
  const map = new Map<string, string>();

  for (const group of columnGroups) {
    for (const columnId of group.children) {
      map.set(columnId, group.id);
    }
  }

  return map;
}

function findColumnGroupById(
  columnGroups: ReadonlyArray<CominsTableRuntimeColumnGroup>,
  groupId: string,
) {
  return columnGroups.find((group) => group.id === groupId);
}

function normalizeColumnOrder<TData>(
  columns: ReadonlyArray<CominsTableRuntimeColumn<TData>>,
  layout?: Partial<CominsColumnLayout>,
  columnGroups: ReadonlyArray<CominsTableRuntimeColumnGroup> = [],
) {
  const knownIds = new Set(columns.map((column) => column.id));
  const ordered = (layout?.order ?? []).filter((id) => knownIds.has(id));
  const missing = columns.map((column) => column.id).filter((id) => !ordered.includes(id));
  const flatOrder = [...ordered, ...missing];

  if (columnGroups.length === 0) {
    return flatOrder;
  }

  const groupIdByColumnId = getColumnGroupIdMap(columnGroups);
  const groupById = new Map(columnGroups.map((group) => [group.id, group]));
  const emittedGroups = new Set<string>();
  const nextOrder: string[] = [];

  for (const columnId of flatOrder) {
    const groupId = groupIdByColumnId.get(columnId);

    if (!groupId) {
      nextOrder.push(columnId);
      continue;
    }

    if (emittedGroups.has(groupId)) {
      continue;
    }

    const group = groupById.get(groupId);

    if (!group) {
      nextOrder.push(columnId);
      continue;
    }

    const groupChildrenInOrder = flatOrder.filter((currentId) => group.children.includes(currentId));
    nextOrder.push(...groupChildrenInOrder);
    emittedGroups.add(groupId);
  }

  return nextOrder;
}

function createEmptySelection(): CominsSelectionState {
  return {
    cell: null,
    range: null,
    rowIds: [],
  };
}

function areRowIdsEqual(left: readonly CominsRowId[], right: readonly CominsRowId[]) {
  return left.length === right.length && left.every((id, index) => id === right[index]);
}

function withRows<TData>(
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

function findRowIndex<TData>(state: CominsTableState<TData>, rowId: CominsRowId) {
  return state.rowIds.findIndex((id) => id === rowId);
}

function findColumn<TData>(state: CominsTableState<TData>, columnId: string) {
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
  state: CominsTableState<TData>,
  row: TData,
  rowId: CominsRowId,
  column: CominsTableRuntimeColumn<TData>,
): CominsCellComponentPayload<TData> {
  const rowIndex = state.rowIds.indexOf(rowId);

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
      dataIndex: rowIndex,
      disabled: false,
      id: rowId,
      index: rowIndex,
      selected: state.selection.rowIds.includes(rowId),
    },
    selection: {
      selectedRowCount: state.selection.rowIds.length,
    },
    value: getCominsCellValue(state, row, column.id),
  };
}

function resolveGuard<TData>(
  guard: CominsClipboardGuard<TData> | undefined,
  params: CominsCellComponentPayload<TData>,
) {
  if (guard === undefined) {
    return true;
  }

  return typeof guard === "boolean" ? guard : guard(params);
}

function resolveCellProps<TData>(
  state: CominsTableState<TData>,
  row: TData,
  rowId: CominsRowId,
  column: CominsTableRuntimeColumn<TData>,
) {
  const params = createCellComponentParams(state, row, rowId, column);
  const props = column.cell?.props;

  return typeof props === "function" ? props(params) : props;
}

function getCellRangeBounds<TData>(state: CominsTableState<TData>, range: CominsCellRange) {
  const visibleColumns = getCominsVisibleColumns(state);
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

function canUseCellClipboard<TData>(
  state: CominsTableState<TData>,
  row: TData | undefined,
  rowId: CominsRowId,
  column: CominsTableRuntimeColumn<TData>,
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

export function createCominsTableState<TData>({
  columnLayout,
  columnGroups,
  columns,
  getRowId = defaultGetRowId,
  pagination,
  rows,
  showHeader = true,
  sort = null,
  theme = {},
}: CominsTableStateInput<TData>): CominsTableState<TData> {
  const nextRows = useRowsReference(rows);
  const nextColumns = normalizeColumns(columns);
  const nextColumnGroups = normalizeColumnGroups(nextColumns, columnGroups);

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
    sort,
    theme,
  };
}

export function queryCominsRows<TData>(
  state: CominsTableState<TData>,
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

export function setCominsTableTheme<TData>(state: CominsTableState<TData>, theme: CominsTableTheme) {
  return {
    ...state,
    theme: { ...state.theme, ...theme },
  };
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
  return {
    ...state,
    sort,
  };
}

export function clearCominsSortState<TData>(state: CominsTableState<TData>) {
  return setCominsSortState(state, null);
}

export function setCominsColumnWidth<TData>(
  state: CominsTableState<TData>,
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

export function setCominsColumnHidden<TData>(
  state: CominsTableState<TData>,
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

export function setCominsColumnGroupHidden<TData>(
  state: CominsTableState<TData>,
  groupId: string,
  hidden: boolean,
) {
  if (!findColumnGroupById(state.columnGroups, groupId)) {
    return state;
  }

  return {
    ...state,
    columnGroupState: {
      ...state.columnGroupState,
      [groupId]: {
        ...state.columnGroupState[groupId],
        hidden,
      },
    },
  };
}

function getColumnWidth<TData>(
  state: CominsTableState<TData>,
  column: CominsTableRuntimeColumn<TData>,
) {
  return state.columnState[column.id]?.width ?? column.width ?? 100;
}

function getColumnMinWidth<TData>(column: CominsTableRuntimeColumn<TData>) {
  return Math.max(COMINS_MIN_COLUMN_WIDTH, column.minWidth ?? COMINS_MIN_COLUMN_WIDTH);
}

function getColumnMaxWidth<TData>(column: CominsTableRuntimeColumn<TData>) {
  return column.maxWidth ?? Number.POSITIVE_INFINITY;
}

function clampWidth(width: number, minWidth: number, maxWidth: number) {
  return Math.min(maxWidth, Math.max(minWidth, width));
}

function distributeColumnGroupWidths<TData>(
  state: CominsTableState<TData>,
  columns: Array<CominsTableRuntimeColumn<TData>>,
  targetWidth: number,
) {
  const widths = columns.map((column) =>
    clampWidth(getColumnWidth(state, column), getColumnMinWidth(column), getColumnMaxWidth(column)),
  );
  const active = new Set(columns.map((_column, index) => index));
  const minWidths = columns.map(getColumnMinWidth);
  const maxWidths = columns.map(getColumnMaxWidth);
  const boundedTargetWidth = clampWidth(
    targetWidth,
    minWidths.reduce((sum, width) => sum + width, 0),
    maxWidths.reduce((sum, width) => sum + width, 0),
  );

  while (active.size > 0) {
    const currentTotal = widths.reduce((sum, width) => sum + width, 0);
    const delta = boundedTargetWidth - currentTotal;

    if (Math.abs(delta) < 0.001) {
      break;
    }

    const activeIndexes = [...active];
    const activeWeight = activeIndexes.reduce((sum, index) => sum + Math.max(widths[index] ?? 0, 0), 0);
    let clamped = false;

    for (const index of activeIndexes) {
      const width = widths[index] ?? 0;
      const weight = activeWeight > 0 ? width / activeWeight : 1 / activeIndexes.length;
      const nextWidth = width + delta * weight;
      const clampedWidth = clampWidth(nextWidth, minWidths[index] ?? 0, maxWidths[index] ?? Number.POSITIVE_INFINITY);

      widths[index] = clampedWidth;

      if (Math.abs(clampedWidth - nextWidth) > 0.001) {
        active.delete(index);
        clamped = true;
      }
    }

    if (!clamped) {
      break;
    }
  }

  return widths;
}

export function setCominsColumnGroupWidth<TData>(
  state: CominsTableState<TData>,
  groupId: string,
  width: number,
) {
  const group = findColumnGroupById(state.columnGroups, groupId);

  if (!group || state.columnGroupState[group.id]?.hidden === true) {
    return state;
  }

  const childColumns = group.children
    .map((columnId) => findColumn(state, columnId))
    .filter((column): column is CominsTableRuntimeColumn<TData> => Boolean(column))
    .filter((column) => state.columnState[column.id]?.hidden !== true);

  if (childColumns.length === 0) {
    return state;
  }

  const widths = distributeColumnGroupWidths(state, childColumns, width);
  const columnState = { ...state.columnState };

  childColumns.forEach((column, index) => {
    columnState[column.id] = {
      ...columnState[column.id],
      width: widths[index],
    };
  });

  return {
    ...state,
    columnState,
  };
}

export function moveCominsColumn<TData>(
  state: CominsTableState<TData>,
  columnId: string,
  targetIndex: number,
) {
  const groupIdByColumnId = getColumnGroupIdMap(state.columnGroups);
  const sourceGroupId = groupIdByColumnId.get(columnId);

  const current = state.columnOrder.filter((id) => id !== columnId);

  if (current.length === state.columnOrder.length) {
    return state;
  }

  const nextIndex = Math.max(0, Math.min(targetIndex, current.length));

  if (sourceGroupId) {
    const sourceGroup = findColumnGroupById(state.columnGroups, sourceGroupId);

    if (!sourceGroup) {
      return state;
    }

    const groupChildrenInCurrent = current.filter((id) => sourceGroup.children.includes(id));
    const groupStart = current.findIndex((id) => sourceGroup.children.includes(id));
    const groupEnd = groupStart + groupChildrenInCurrent.length;

    if (nextIndex < groupStart || nextIndex > groupEnd) {
      return state;
    }
  } else if (state.columnGroups.length > 0) {
    for (const group of state.columnGroups) {
      const groupChildrenInCurrent = current.filter((id) => group.children.includes(id));

      if (groupChildrenInCurrent.length === 0) {
        continue;
      }

      const groupStart = current.findIndex((id) => group.children.includes(id));
      const groupEnd = groupStart + groupChildrenInCurrent.length;

      if (nextIndex > groupStart && nextIndex < groupEnd) {
        return state;
      }
    }
  }

  current.splice(nextIndex, 0, columnId);

  return { ...state, columnOrder: current };
}

export function moveCominsColumnGroup<TData>(
  state: CominsTableState<TData>,
  groupId: string,
  targetIndex: number,
) {
  const group = findColumnGroupById(state.columnGroups, groupId);

  if (!group) {
    return state;
  }

  const groupChildren = state.columnOrder.filter((id) => group.children.includes(id));

  if (groupChildren.length === 0) {
    return state;
  }

  const current = state.columnOrder.filter((id) => !group.children.includes(id));
  const nextIndex = Math.max(0, Math.min(targetIndex, current.length));
  const nextOrder = [...current.slice(0, nextIndex), ...groupChildren, ...current.slice(nextIndex)];

  return { ...state, columnOrder: nextOrder };
}

export function serializeCominsColumnLayout<TData>(state: CominsTableState<TData>): CominsColumnLayout {
  const groups =
    state.columnGroups.length === 0
      ? undefined
      : Object.fromEntries(state.columnGroups.map((group) => [group.id, { ...state.columnGroupState[group.id] }]));

  return {
    columns: { ...state.columnState },
    ...(groups ? { groups } : {}),
    order: [...state.columnOrder],
  };
}

export function applyCominsColumnLayout<TData>(state: CominsTableState<TData>, layout: CominsColumnLayout) {
  return {
    ...state,
    columnOrder: normalizeColumnOrder(state.columns, layout, state.columnGroups),
    columnGroupState: normalizeColumnGroupState(state.columnGroups, layout),
    columnState: normalizeColumnState(state.columns, layout),
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

export function selectCell<TData>(state: CominsTableState<TData>, cell: CominsCellAddress) {
  return {
    ...state,
    selection: {
      ...state.selection,
      cell,
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

export function isCominsRowSelected<TData>(state: CominsTableState<TData>, rowId: CominsRowId) {
  return state.selection.rowIds.includes(rowId);
}

export function isCominsCellSelected<TData>(state: CominsTableState<TData>, cell: CominsCellAddress) {
  return state.selection.cell?.rowId === cell.rowId && state.selection.cell.columnId === cell.columnId;
}

export function getCominsSelectedCellRange<TData>(
  state: CominsTableState<TData>,
  range: CominsCellRange | null = state.selection.range,
) {
  if (!range) {
    return [];
  }

  const visibleColumns = getCominsVisibleColumns(state);
  const bounds = getCellRangeBounds(state, range);

  if (!bounds) {
    return [];
  }

  const cells: CominsCellAddress[] = [];

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

export function isCominsCellInSelectedRange<TData>(state: CominsTableState<TData>, cell: CominsCellAddress) {
  return getCominsSelectedCellRange(state).some(
    (selected) => selected.rowId === cell.rowId && selected.columnId === cell.columnId,
  );
}

export function getCominsVisibleColumns<TData>(state: CominsTableState<TData>) {
  const groupIdByColumnId = getColumnGroupIdMap(state.columnGroups);

  return state.columnOrder
    .map((columnId) => findColumn(state, columnId))
    .filter((column): column is CominsTableRuntimeColumn<TData> => Boolean(column))
    .filter((column) => {
      const groupId = groupIdByColumnId.get(column.id);

      return state.columnState[column.id]?.hidden !== true && (!groupId || state.columnGroupState[groupId]?.hidden !== true);
    });
}

export function getCominsHeaderRows<TData>(state: CominsTableState<TData>): Array<Array<CominsHeaderCell<TData>>> {
  const visibleColumns = getCominsVisibleColumns(state);

  if (state.columnGroups.length === 0) {
    return [
      visibleColumns.map((column) => ({
        colSpan: 1,
        column,
        columnId: column.id,
        kind: "column",
        rowSpan: 1,
      })),
    ];
  }

  const visibleColumnIds = new Set(visibleColumns.map((column) => column.id));
  const groupIdByColumnId = getColumnGroupIdMap(state.columnGroups);
  const groupById = new Map(state.columnGroups.map((group) => [group.id, group]));
  const emittedGroups = new Set<string>();
  const parentRow: Array<CominsHeaderCell<TData>> = [];
  const childRow: Array<CominsHeaderCell<TData>> = [];

  for (const columnId of state.columnOrder) {
    if (!visibleColumnIds.has(columnId)) {
      continue;
    }

    const column = findColumn(state, columnId);

    if (!column) {
      continue;
    }

    const groupId = groupIdByColumnId.get(columnId);

    if (!groupId) {
      parentRow.push({
        colSpan: 1,
        column,
        columnId: column.id,
        kind: "column",
        rowSpan: 2,
      });
      continue;
    }

    if (emittedGroups.has(groupId)) {
      continue;
    }

    const group = groupById.get(groupId);

    if (!group) {
      continue;
    }

    const visibleGroupColumns = state.columnOrder
      .filter((currentId) => group.children.includes(currentId) && visibleColumnIds.has(currentId))
      .map((currentId) => findColumn(state, currentId))
      .filter((currentColumn): currentColumn is CominsTableRuntimeColumn<TData> => Boolean(currentColumn));

    if (visibleGroupColumns.length === 0) {
      emittedGroups.add(groupId);
      continue;
    }

    parentRow.push({
      colSpan: visibleGroupColumns.length,
      group,
      groupId,
      kind: "group",
      rowSpan: 1,
    });
    childRow.push(
      ...visibleGroupColumns.map((currentColumn) => ({
        colSpan: 1 as const,
        column: currentColumn,
        columnId: currentColumn.id,
        groupId,
        kind: "column" as const,
        rowSpan: 1 as const,
      })),
    );
    emittedGroups.add(groupId);
  }

  return [parentRow, childRow];
}

export function getCominsSortedRowIndexes<TData>(state: CominsTableState<TData>) {
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
    const leftValue = getCominsCellValue(state, leftRow, column.id);
    const rightValue = getCominsCellValue(state, rightRow, column.id);
    const result =
      typeof column.sort === "function"
        ? column.sort(leftValue, rightValue, leftRow, rightRow)
        : defaultCompare(leftValue, rightValue);

    return state.sort?.direction === "desc" ? result * -1 : result;
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

export function getCominsCellValue<TData>(
  state: CominsTableState<TData>,
  row: TData,
  columnId: string,
) {
  const column = findColumn(state, columnId);

  return column ? getNestedFieldValue(row, column.field) : undefined;
}

export function formatCominsCellValue<TData>(
  state: CominsTableState<TData>,
  row: TData,
  rowId: CominsRowId,
  column: CominsTableRuntimeColumn<TData>,
) {
  const value = getCominsCellValue(state, row, column.id);

  if (column.cell?.format) {
    return column.cell.format(createCellComponentParams(state, row, rowId, column));
  }

  return value == null ? "" : String(value);
}

export function isCominsCellDisabled<TData>(
  state: CominsTableState<TData>,
  row: TData,
  rowId: CominsRowId,
  column: CominsTableRuntimeColumn<TData>,
) {
  const props = resolveCellProps(state, row, rowId, column);

  return props?.disabled !== undefined && resolveGuard(props.disabled, createCellComponentParams(state, row, rowId, column)) === true;
}

export function getCominsCellClassName<TData>(
  state: CominsTableState<TData>,
  row: TData,
  rowId: CominsRowId,
  column: CominsTableRuntimeColumn<TData>,
) {
  const params = createCellComponentParams(state, row, rowId, column);
  const className = resolveCellProps(state, row, rowId, column)?.className;

  return typeof className === "function" ? className(params) : className;
}

export function getCominsCellStyle<TData>(
  state: CominsTableState<TData>,
  row: TData,
  rowId: CominsRowId,
  column: CominsTableRuntimeColumn<TData>,
) {
  const params = createCellComponentParams(state, row, rowId, column);
  const style = resolveCellProps(state, row, rowId, column)?.style;

  return typeof style === "function" ? style(params) : style;
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

export function copyCominsCell<TData>(
  state: CominsTableState<TData>,
  { columnId, rowId }: CominsCellAddress,
): CominsCopiedCell | null {
  const row = state.rows[findRowIndex(state, rowId)];
  const column = findColumn(state, columnId);

  if (!column || !canUseCellClipboard(state, row, rowId, column, "copy")) {
    return null;
  }

  const value = getCominsCellValue(state, row!, columnId);

  return {
    kind: "cell",
    text: value == null ? "" : String(value),
    value,
  };
}

export function pasteCominsCell<TData>(
  state: CominsTableState<TData>,
  { columnId, rowId }: CominsCellAddress,
  copied: CominsCopiedCell | null,
) {
  const column = findColumn(state, columnId);
  const row = state.rows[findRowIndex(state, rowId)];

  if (!copied || !column || !canUseCellClipboard(state, row, rowId, column, "paste")) {
    return state;
  }

  return updateCominsRows(state, [
    {
      id: rowId,
      patch: (currentRow) => setNestedFieldValue(currentRow, column.field, copied.value),
    },
  ]);
}

export function copyCominsCellRange<TData>(
  state: CominsTableState<TData>,
  range: CominsCellRange | null = state.selection.range,
): CominsCopiedCellRange | null {
  if (!range) {
    return null;
  }

  const bounds = getCellRangeBounds(state, range);

  if (!bounds) {
    return null;
  }

  const copiedRows: CominsCopiedCellRangeCell[][] = [];

  for (let rowIndex = bounds.rowStart; rowIndex <= bounds.rowEnd; rowIndex += 1) {
    const row = state.rows[rowIndex];
    const rowId = state.rowIds[rowIndex];
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
) {
  if (!copied) {
    return state;
  }

  const visibleColumns = getCominsVisibleColumns(state);
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

export function fillCominsCellRange<TData>(
  state: CominsTableState<TData>,
  { source, target }: CominsFillCellRangeOptions,
) {
  const copied = copyCominsCell(state, source);

  if (!copied) {
    return state;
  }

  return getCominsSelectedCellRange(state, target).reduce(
    (currentState, cell) => pasteCominsCell(currentState, cell, copied),
    state,
  );
}

function normalizeCominsExportColumns<TData>({
  columnOrder,
  columns,
}: Pick<CominsExportRowsOptions<TData>, "columnOrder" | "columns">) {
  if (!columnOrder?.length) {
    return columns;
  }

  const columnsById = new Map(columns.map((column) => [column.id, column]));

  return columnOrder
    .map((id) => columnsById.get(id))
    .filter((column): column is CominsExportColumn<TData> => Boolean(column));
}

function stringifyCominsExportValue(value: unknown) {
  if (value === null || value === undefined) {
    return "";
  }
  if (typeof value === "string") {
    return value;
  }
  if (typeof value === "number" || typeof value === "boolean" || typeof value === "bigint") {
    return String(value);
  }

  return JSON.stringify(value);
}

function escapeCominsCsvCell(value: unknown) {
  const text = stringifyCominsExportValue(value);

  return /[",\r\n]/u.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

function getCominsExportHeader<TData>(column: CominsExportColumn<TData>, headerOverrides?: Record<string, string>) {
  if (column.id && headerOverrides?.[column.id] !== undefined) {
    return headerOverrides[column.id];
  }

  return column.label ?? column.id ?? "";
}

function getCominsExportValue<TData>(
  column: CominsExportColumn<TData>,
  row: TData,
  rowIndex: number,
  valueSource: CominsExportValueSource,
) {
  if (valueSource === "formatted" && column.format) {
    return column.format(row, rowIndex);
  }

  return column.value(row, rowIndex);
}

export function exportCominsRowsToCsv<TData>({
  columnOrder,
  columns,
  headerOverrides,
  rows,
  valueSource = "raw",
}: CominsExportRowsOptions<TData>) {
  const exportColumns = normalizeCominsExportColumns({ columnOrder, columns });
  const lines = [
    exportColumns.map((column) => escapeCominsCsvCell(getCominsExportHeader(column, headerOverrides))).join(","),
    ...rows.map((row, rowIndex) =>
      exportColumns.map((column) => escapeCominsCsvCell(getCominsExportValue(column, row, rowIndex, valueSource))).join(","),
    ),
  ];

  return lines.join("\n");
}

export function exportCominsRowsToJson<TData>({
  columnOrder,
  columns,
  headerOverrides,
  rows,
  valueSource = "raw",
}: CominsExportRowsOptions<TData>) {
  const exportColumns = normalizeCominsExportColumns({ columnOrder, columns });
  const data = rows.map((row, rowIndex) =>
    Object.fromEntries(
      exportColumns.map((column) => [
        getCominsExportHeader(column, headerOverrides),
        getCominsExportValue(column, row, rowIndex, valueSource),
      ]),
    ),
  );

  return JSON.stringify(data, null, 2);
}
