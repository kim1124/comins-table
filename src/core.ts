import { setColumnWidth } from "./column-layout";
import { parseCominsClipboardText, MAX_CLIPBOARD_CELLS } from "./clipboard-text";
export { parseCominsClipboardText } from "./clipboard-text";
import { normalizeCominsColumnPinned, type CominsColumnPinned } from "./column-pinning";
export type { CominsColumnPinned } from "./column-pinning";

import type {
  CominsRowId,
  CominsTableDensity,
  CominsSortDirection,
  CominsSortState,
  CominsSortModel,
  CominsComponentPrimitiveValue,
  CominsComponentAlign,
  CominsComponentDirection,
  CominsComponentPlacement,
  CominsComponentRowPayload,
  CominsColumnRuntimeState,
  CominsColumnGroupRuntimeState,
  CominsColumnLayout,
  CominsPaginationState,
  CominsSelectionState,
  CominsRowUpdate,
  CominsVirtualRowsOptions,
  CominsVirtualRows,
  CominsCopiedRow,
  CominsCopiedCell,
  CominsCopiedCellRangeCell,
  CominsCopiedCellRange,
  CominsExportFormat,
  CominsExportValueSource,
  CominsExportColumn,
  CominsExportRowsOptions,
  CominsCellAddress,
  CominsCellRange,
  CominsPasteRowOptions,
  CominsRowSelectionOptions,
  CominsCellSelectionOptions,
  CominsFillCellRangeOptions,
} from "./model";
export type {
  CominsRowId,
  CominsTableDensity,
  CominsSortDirection,
  CominsSortState,
  CominsSortModel,
  CominsComponentPrimitiveValue,
  CominsComponentAlign,
  CominsComponentDirection,
  CominsComponentPlacement,
  CominsComponentRowPayload,
  CominsColumnRuntimeState,
  CominsColumnGroupRuntimeState,
  CominsColumnLayout,
  CominsPaginationState,
  CominsSelectionState,
  CominsRowUpdate,
  CominsVirtualRowsOptions,
  CominsVirtualRows,
  CominsCopiedRow,
  CominsCopiedCell,
  CominsCopiedCellRangeCell,
  CominsCopiedCellRange,
  CominsExportFormat,
  CominsExportValueSource,
  CominsExportColumn,
  CominsExportRowsOptions,
  CominsCellAddress,
  CominsCellRange,
  CominsPasteRowOptions,
  CominsRowSelectionOptions,
  CominsCellSelectionOptions,
  CominsFillCellRangeOptions,
} from "./model";

import type {
  CominsTableTheme,
  CominsCellFormatParams,
  CominsColumnValueResolver,
  CominsTableComponentOption,
  CominsVirtualListItem,
  CominsTableMenuItem,
  CominsComponentColumnPayload,
  CominsCellComponentPayload,
  CominsHeaderComponentPayload,
  CominsClipboardGuard,
  CominsColumnProps,
  CominsTableComponentProps,
  CominsTableOptions,
  CominsTableMenuItems,
  CominsVirtualListItems,
  CominsButtonComponentConfig,
  CominsInputCommitEvent,
  CominsInputComponentConfig,
  CominsCheckboxComponentConfig,
  CominsRadioComponentConfig,
  CominsSelectComponentConfig,
  CominsToggleComponentConfig,
  CominsProgressComponentConfig,
  CominsMenuComponentConfig,
  CominsVirtualListSearchFilterPayload,
  CominsVirtualListComponentConfig,
  CominsHeaderComponentConfig,
  CominsCellComponentConfig,
  CominsHeaderComponent,
  CominsCellComponent,
  CominsTableCellConfig,
  CominsTableHeaderConfig,
  CominsTableColumn,
  CominsTableColumnGroup,
  CominsTableRuntimeColumn,
  CominsTableRuntimeColumnGroup,
  CominsEventColumn,
  CominsTableState,
  CominsTableStateInput,
  CominsHeaderColumnCell,
  CominsHeaderGroupCell,
  CominsHeaderCell,
} from "./react-types";
export type {
  CominsTableTheme,
  CominsCellFormatParams,
  CominsColumnValueResolver,
  CominsTableComponentOption,
  CominsVirtualListItem,
  CominsTableMenuItem,
  CominsComponentColumnPayload,
  CominsCellComponentPayload,
  CominsHeaderComponentPayload,
  CominsClipboardGuard,
  CominsColumnProps,
  CominsTableComponentProps,
  CominsTableOptions,
  CominsTableMenuItems,
  CominsVirtualListItems,
  CominsButtonComponentConfig,
  CominsInputCommitEvent,
  CominsInputComponentConfig,
  CominsCheckboxComponentConfig,
  CominsRadioComponentConfig,
  CominsSelectComponentConfig,
  CominsToggleComponentConfig,
  CominsProgressComponentConfig,
  CominsMenuComponentConfig,
  CominsVirtualListSearchFilterPayload,
  CominsVirtualListComponentConfig,
  CominsHeaderComponentConfig,
  CominsCellComponentConfig,
  CominsHeaderComponent,
  CominsCellComponent,
  CominsTableCellConfig,
  CominsTableHeaderConfig,
  CominsTableColumn,
  CominsTableColumnGroup,
  CominsTableRuntimeColumn,
  CominsTableRuntimeColumnGroup,
  CominsEventColumn,
  CominsTableState,
  CominsTableStateInput,
  CominsHeaderColumnCell,
  CominsHeaderGroupCell,
  CominsHeaderCell,
} from "./react-types";

const COMINS_MIN_COLUMN_WIDTH = 88;

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
      pinned: normalizeCominsColumnPinned(
        layout === undefined ? column.pinned : layout.columns?.[column.id]?.pinned,
      ),
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
      pinned: normalizeCominsColumnPinned(
        layout === undefined ? group.pinned : layout.groups?.[group.id]?.pinned,
      ),
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
  const columnById = new Map(columns.map((column) => [column.id, column]));
  const groupIdByColumnId = getColumnGroupIdMap(columnGroups);
  const groupById = new Map(columnGroups.map((group) => [group.id, group]));
  const isColumnPinned = (columnId: string) =>
    !groupIdByColumnId.has(columnId) &&
    normalizeCominsColumnPinned(
      layout === undefined
        ? columnById.get(columnId)?.pinned
        : layout.columns?.[columnId]?.pinned,
    ) !== undefined;
  const isGroupPinned = (groupId: string) =>
    normalizeCominsColumnPinned(
      layout === undefined
        ? groupById.get(groupId)?.pinned
        : layout.groups?.[groupId]?.pinned,
    ) !== undefined;
  type ColumnOrderEntity = {
    columnIds: string[];
    key: string;
    locked: boolean;
  };
  const createEntities = (order: readonly string[]) => {
    const emittedGroups = new Set<string>();
    const entities: ColumnOrderEntity[] = [];

    for (const columnId of order) {
      const groupId = groupIdByColumnId.get(columnId);

      if (!groupId) {
        entities.push({
          columnIds: [columnId],
          key: `column:${columnId}`,
          locked:
            columnById.get(columnId)?.lockPosition === true ||
            isColumnPinned(columnId),
        });
        continue;
      }

      if (emittedGroups.has(groupId)) {
        continue;
      }

      const group = groupById.get(groupId);

      if (!group) {
        entities.push({
          columnIds: [columnId],
          key: `column:${columnId}`,
          locked:
            columnById.get(columnId)?.lockPosition === true ||
            isColumnPinned(columnId),
        });
        continue;
      }

      const groupChildrenInOrder = order.filter((currentId) => group.children.includes(currentId));
      entities.push({
        columnIds: groupChildrenInOrder,
        key: `group:${groupId}`,
        locked:
          group.lockPosition ||
          isGroupPinned(groupId) ||
          groupChildrenInOrder.some((currentId) => columnById.get(currentId)?.lockPosition === true),
      });
      emittedGroups.add(groupId);
    }

    return entities;
  };
  const declaredEntities = createEntities(columns.map((column) => column.id));
  const proposedEntities = createEntities(flatOrder);
  const declaredEntityByKey = new Map(declaredEntities.map((entity) => [entity.key, entity]));
  const declaredSegmentByKey = new Map<string, number>();
  let segmentCount = 0;

  for (const entity of declaredEntities) {
    declaredSegmentByKey.set(entity.key, segmentCount);

    if (entity.locked) {
      segmentCount += 1;
    }
  }

  const movableEntitiesBySegment = Array.from(
    { length: segmentCount + 1 },
    () => [] as ColumnOrderEntity[],
  );
  const proposedEntityByKey = new Map(proposedEntities.map((entity) => [entity.key, entity]));

  for (const entity of proposedEntities) {
    const declaredEntity = declaredEntityByKey.get(entity.key);

    if (!declaredEntity || declaredEntity.locked) {
      continue;
    }

    const segment = declaredSegmentByKey.get(entity.key) ?? 0;
    movableEntitiesBySegment[segment]?.push(entity);
  }

  const normalizedEntities: ColumnOrderEntity[] = [];
  let currentSegment = 0;

  for (const entity of declaredEntities) {
    if (!entity.locked) {
      continue;
    }

    normalizedEntities.push(...(movableEntitiesBySegment[currentSegment] ?? []));
    normalizedEntities.push(proposedEntityByKey.get(entity.key) ?? entity);
    currentSegment += 1;
  }

  normalizedEntities.push(...(movableEntitiesBySegment[currentSegment] ?? []));

  return normalizedEntities.flatMap((entity) => {
    const declaredEntity = declaredEntityByKey.get(entity.key);

    if (!declaredEntity || entity.columnIds.length === 1) {
      return entity.columnIds;
    }

    const lockedChildIds = new Set(
      declaredEntity.columnIds.filter((columnId) => columnById.get(columnId)?.lockPosition),
    );

    if (lockedChildIds.size === 0) {
      return entity.columnIds;
    }

    const declaredChildSegmentById = new Map<string, number>();
    let childSegmentCount = 0;

    for (const columnId of declaredEntity.columnIds) {
      declaredChildSegmentById.set(columnId, childSegmentCount);

      if (lockedChildIds.has(columnId)) {
        childSegmentCount += 1;
      }
    }

    const movableChildrenBySegment = Array.from(
      { length: childSegmentCount + 1 },
      () => [] as string[],
    );

    for (const columnId of entity.columnIds) {
      if (lockedChildIds.has(columnId)) {
        continue;
      }

      const segment = declaredChildSegmentById.get(columnId) ?? 0;
      movableChildrenBySegment[segment]?.push(columnId);
    }

    const normalizedChildren: string[] = [];
    let currentChildSegment = 0;

    for (const columnId of declaredEntity.columnIds) {
      if (!lockedChildIds.has(columnId)) {
        continue;
      }

      normalizedChildren.push(...(movableChildrenBySegment[currentChildSegment] ?? []));
      normalizedChildren.push(columnId);
      currentChildSegment += 1;
    }

    normalizedChildren.push(...(movableChildrenBySegment[currentChildSegment] ?? []));
    return normalizedChildren;
  });
}

function createEmptySelection(): CominsSelectionState {
  return {
    cell: null,
    cells: [],
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

function areSortModelsEqual(left: CominsSortModel, right: CominsSortModel) {
  return (
    left.length === right.length &&
    left.every(
      (rule, index) => rule.columnId === right[index]?.columnId && rule.direction === right[index]?.direction,
    )
  );
}

function normalizeSortModel<TData>(
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
  rowIndex = state.rowIds.indexOf(rowId),
): CominsCellComponentPayload<TData> {

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

function getCellRangeBounds<TData>(
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
  rowIndex = state.rowIds.indexOf(rowId),
) {
  if (row === undefined) {
    return false;
  }

  const params = createCellComponentParams(state, row, rowId, column, rowIndex);
  const definition = column.cell?.props;
  const props = typeof definition === "function" ? definition(params) : definition;

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
  sortModel,
  theme = {},
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

export function setCominsColumnWidth<TData>(
  state: CominsTableState<TData>,
  columnId: string,
  width: number,
) {
  return setColumnWidth(state, columnId, width);
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

function doesColumnMoveChangeLockedPositions<TData>(
  state: CominsTableState<TData>,
  nextOrder: readonly string[],
) {
  const currentIndexByColumnId = new Map(
    state.columnOrder.map((columnId, index) => [columnId, index] as const),
  );
  const nextIndexByColumnId = new Map(
    nextOrder.map((columnId, index) => [columnId, index] as const),
  );

  const groupIdByColumnId = getColumnGroupIdMap(state.columnGroups);

  for (const column of state.columns) {
    if (
      (
        column.lockPosition ||
        (!groupIdByColumnId.has(column.id) && state.columnState[column.id]?.pinned !== undefined)
      ) &&
      currentIndexByColumnId.get(column.id) !== nextIndexByColumnId.get(column.id)
    ) {
      return true;
    }
  }

  for (const group of state.columnGroups) {
    if (!group.lockPosition && state.columnGroupState[group.id]?.pinned === undefined) {
      continue;
    }

    const currentPositions = group.children
      .map((columnId) => currentIndexByColumnId.get(columnId))
      .filter((index): index is number => index !== undefined)
      .sort((left, right) => left - right);
    const nextPositions = group.children
      .map((columnId) => nextIndexByColumnId.get(columnId))
      .filter((index): index is number => index !== undefined)
      .sort((left, right) => left - right);

    if (
      currentPositions.length !== nextPositions.length ||
      currentPositions.some((index, position) => index !== nextPositions[position])
    ) {
      return true;
    }
  }

  return false;
}

export function moveCominsColumn<TData>(
  state: CominsTableState<TData>,
  columnId: string,
  targetIndex: number,
) {
  const sourceColumn = findColumn(state, columnId);
  const sourceGroupId = getColumnGroupIdMap(state.columnGroups).get(columnId);

  if (
    !sourceColumn ||
    sourceColumn.lockPosition ||
    (!sourceGroupId && state.columnState[columnId]?.pinned !== undefined)
  ) {
    return state;
  }

  const groupIdByColumnId = getColumnGroupIdMap(state.columnGroups);

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

  if (doesColumnMoveChangeLockedPositions(state, current)) {
    return state;
  }

  if (current.every((id, index) => id === state.columnOrder[index])) {
    return state;
  }

  return { ...state, columnOrder: current };
}

export function moveCominsColumnGroup<TData>(
  state: CominsTableState<TData>,
  groupId: string,
  targetIndex: number,
) {
  const group = findColumnGroupById(state.columnGroups, groupId);

  if (
    !group ||
    group.lockPosition ||
    state.columnGroupState[groupId]?.pinned !== undefined
  ) {
    return state;
  }

  const groupChildren = state.columnOrder.filter((id) => group.children.includes(id));

  if (groupChildren.length === 0) {
    return state;
  }

  const current = state.columnOrder.filter((id) => !group.children.includes(id));
  const nextIndex = Math.max(0, Math.min(targetIndex, current.length));
  const nextOrder = [...current.slice(0, nextIndex), ...groupChildren, ...current.slice(nextIndex)];

  if (doesColumnMoveChangeLockedPositions(state, nextOrder)) {
    return state;
  }

  if (nextOrder.every((id, index) => id === state.columnOrder[index])) {
    return state;
  }

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

function areCellAddressesEqual(left: CominsCellAddress, right: CominsCellAddress) {
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

export function isCominsRowSelected<TData>(state: CominsTableState<TData>, rowId: CominsRowId) {
  return state.selection.rowIds.includes(rowId);
}

export function isCominsCellSelected<TData>(state: CominsTableState<TData>, cell: CominsCellAddress) {
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

export function getCominsVisibleColumns<TData>(state: CominsTableState<TData>) {
  const groupIdByColumnId = getColumnGroupIdMap(state.columnGroups);
  const groupById = new Map(state.columnGroups.map((group) => [group.id, group]));
  const emittedGroups = new Set<string>();
  const blocks: Array<{
    columns: Array<CominsTableRuntimeColumn<TData>>;
    pinned?: CominsColumnPinned;
  }> = [];

  for (const columnId of state.columnOrder) {
    const column = findColumn(state, columnId);

    if (!column || state.columnState[column.id]?.hidden === true) {
      continue;
    }

    const groupId = groupIdByColumnId.get(column.id);

    if (!groupId) {
      blocks.push({ columns: [column], pinned: state.columnState[column.id]?.pinned });
      continue;
    }

    if (emittedGroups.has(groupId) || state.columnGroupState[groupId]?.hidden === true) {
      continue;
    }

    const group = groupById.get(groupId);

    if (!group) {
      continue;
    }

    const columns = state.columnOrder
      .filter((currentId) => group.children.includes(currentId))
      .map((currentId) => findColumn(state, currentId))
      .filter((current): current is CominsTableRuntimeColumn<TData> =>
        Boolean(current) && state.columnState[current!.id]?.hidden !== true,
      );

    if (columns.length > 0) {
      blocks.push({ columns, pinned: state.columnGroupState[groupId]?.pinned });
    }

    emittedGroups.add(groupId);
  }

  return ["left", undefined, "right"].flatMap((pinned) =>
    blocks
      .filter((block) => block.pinned === pinned)
      .flatMap((block) => block.columns),
  );
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

  for (const column of visibleColumns) {
    const columnId = column.id;

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

    const visibleGroupColumns = visibleColumns.filter((currentColumn) =>
      group.children.includes(currentColumn.id),
    );

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

/** Apply external text in the supplied visible Row order, preserving matrix positions at guarded Cells. */
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
