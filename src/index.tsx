import type React from "react";
import { Fragment, forwardRef, useEffect, useImperativeHandle, useMemo, useRef, useState } from "react";
import { ArrowUp } from "lucide-react";

import {
  applyKmsfColumnLayout,
  clearKmsfSortState,
  copyKmsfCell,
  copyKmsfCellRange,
  copyKmsfRow,
  createKmsfDataTableState,
  formatKmsfCellValue,
  getKmsfCellClassName,
  getKmsfCellStyle,
  getKmsfCellValue,
  getKmsfHeaderRows,
  getKmsfSortedRowIndexes,
  getKmsfVisibleColumns,
  isKmsfCellDisabled,
  isKmsfCellInSelectedRange,
  moveKmsfColumn,
  moveKmsfColumnGroup,
  moveKmsfRow,
  pasteKmsfCell,
  pasteKmsfCellRange,
  pasteKmsfRow,
  selectCell,
  selectCellRange,
  selectRow,
  selectRows,
  serializeKmsfColumnLayout,
  setKmsfColumnWidth,
  setKmsfColumnGroupWidth,
  setKmsfSortState,
  updateKmsfRows,
} from "./core";
import { renderKmsfBuiltInComponent } from "./component-renderer";

export * from "./core";

import type {
  KmsfCellAddress,
  KmsfCellComponent,
  KmsfCellComponentPayload,
  KmsfColumnLayout,
  KmsfCopiedCell,
  KmsfCopiedCellRange,
  KmsfCopiedRow,
  KmsfDataTableColumn,
  KmsfDataTableColumnGroup,
  KmsfDataTableRuntimeColumn,
  KmsfDataTableRuntimeColumnGroup,
  KmsfHeaderCell,
  KmsfDataTableState,
  KmsfDataTableTheme,
  KmsfEventColumn,
  KmsfHeaderComponent,
  KmsfHeaderComponentPayload,
  KmsfPaginationState,
  KmsfRowId,
  KmsfSelectionState,
  KmsfSortState,
} from "./core";

type KmsfClassValue = string | Record<string, boolean> | undefined;
type KmsfRowPropValue<TData, TValue> = TValue | ((row: TData, index: number) => TValue);
type KmsfColumnPointerInteraction = {
  active: boolean;
  cancelSort: boolean;
  id: string;
  kind: "column" | "group";
  movedBeforeLongPress: boolean;
  startedAt: number;
  startX: number;
  startY: number;
  timer: number;
};
type KmsfRowMoveState = {
  sourceRowId: KmsfRowId;
  targetDataIndex: number;
};

const KMSF_MIN_COLUMN_WIDTH = 50;

export type KmsfDataTableRowProps<TData> = {
  className?: KmsfRowPropValue<TData, KmsfClassValue>;
  disabled?: KmsfRowPropValue<TData, boolean | undefined>;
  draggable?: KmsfRowPropValue<TData, boolean | undefined>;
  style?: KmsfRowPropValue<TData, React.CSSProperties | undefined>;
};

export type KmsfEventRow<TData> = {
  data: TData;
  dataIndex: number;
  id: KmsfRowId;
  index: number;
};

export type KmsfRowEventPayload<TData, TEvent = React.MouseEvent<HTMLTableRowElement>> = {
  event: TEvent;
  index: number;
  row: KmsfEventRow<TData>;
};

export type KmsfCellEventPayload<TData, TValue = unknown, TEvent = React.MouseEvent<HTMLTableCellElement>> = {
  column: KmsfEventColumn<TData, TValue>;
  event: TEvent;
  index: number;
  row: KmsfEventRow<TData>;
  value: TValue;
};

export type KmsfRowKeyboardEventPayload<TData> = KmsfRowEventPayload<
  TData,
  React.KeyboardEvent<HTMLTableRowElement>
>;

export type KmsfCellKeyboardEventPayload<TData, TValue = unknown> = KmsfCellEventPayload<
  TData,
  TValue,
  React.KeyboardEvent<HTMLTableCellElement>
>;

export type KmsfDataTableRef<TData = unknown> = {
  clearSort: () => void;
  getColumnLayout: () => KmsfColumnLayout;
  getSortState: () => KmsfSortState | null;
  setColumnLayout: (layout: KmsfColumnLayout) => void;
  setMoveTargetRow: (targetIdx: number, sourceIdx: number) => void;
  setSelectedRow: (index: number) => void;
  setSelectedRows: (indexes: number[]) => void;
  setSortState: (sort: KmsfSortState | null) => void;
};

export type KmsfDataTableProps<TData> = {
  "buffer-size"?: number;
  cellSelection?: boolean;
  className?: string;
  columnGroups?: Array<KmsfDataTableColumnGroup>;
  columns: Array<KmsfDataTableColumn<TData>>;
  data: readonly TData[];
  "data-testid"?: string;
  getRowId?: (row: TData, index: number) => KmsfRowId;
  onChangeColumnLayout?: (layout: KmsfColumnLayout) => void;
  onChangeData?: (data: TData[]) => void;
  onChangeSelection?: (selection: KmsfSelectionState) => void;
  onChangeSort?: (sort: KmsfSortState | null) => void;
  onClickCell?: (payload: KmsfCellEventPayload<TData>) => void;
  onClickRow?: (payload: KmsfRowEventPayload<TData>) => void;
  onContextMenuCell?: (payload: KmsfCellEventPayload<TData>) => void;
  onContextMenuRow?: (payload: KmsfRowEventPayload<TData>) => void;
  onDoubleClickCell?: (payload: KmsfCellEventPayload<TData>) => void;
  onDoubleClickRow?: (payload: KmsfRowEventPayload<TData>) => void;
  onKeyDownCell?: (payload: KmsfCellKeyboardEventPayload<TData>) => void;
  onKeyDownRow?: (payload: KmsfRowKeyboardEventPayload<TData>) => void;
  pagination?: Partial<KmsfPaginationState>;
  rowHeight?: number;
  rowProps?: KmsfDataTableRowProps<TData>;
  showHeader?: boolean;
  style?: React.CSSProperties;
  theme?: KmsfDataTableTheme;
  virtualized?: boolean;
};

type VisibleRowEntry<TData> = {
  dataIndex: number;
  row: TData;
  rowId: KmsfRowId;
  visibleIndex: number;
};

function createVisibleRowEntries<TData>(
  sortedRowIndexes: number[] | null,
  rows: TData[],
  rowIds: KmsfRowId[],
  startIndex: number,
  endIndex: number,
) {
  const safeStartIndex = Math.max(0, startIndex);
  const visibleRowCount = sortedRowIndexes?.length ?? rows.length;
  const safeEndIndex = Math.min(visibleRowCount, Math.max(safeStartIndex, endIndex));
  const entries: Array<VisibleRowEntry<TData>> = [];

  for (let visibleIndex = safeStartIndex; visibleIndex < safeEndIndex; visibleIndex += 1) {
    const dataIndex = sortedRowIndexes?.[visibleIndex] ?? visibleIndex;
    const row = rows[dataIndex];
    const rowId = rowIds[dataIndex];

    if (row !== undefined && rowId !== undefined) {
      entries.push({ dataIndex, row, rowId, visibleIndex });
    }
  }

  return entries;
}

function toClassName(value: KmsfClassValue) {
  if (!value || typeof value === "string") {
    return value;
  }

  return Object.entries(value)
    .filter(([, enabled]) => enabled)
    .map(([className]) => className)
    .join(" ");
}

function resolveRowProp<TData, TValue>(
  value: KmsfRowPropValue<TData, TValue> | undefined,
  row: TData,
  index: number,
) {
  return typeof value === "function" ? (value as (row: TData, index: number) => TValue)(row, index) : value;
}

function resolveRowProps<TData>(
  rowProps: KmsfDataTableRowProps<TData> | undefined,
  row: TData,
  index: number,
) {
  const disabled = resolveRowProp(rowProps?.disabled, row, index) === true;

  return {
    className: toClassName(resolveRowProp(rowProps?.className, row, index)),
    disabled,
    draggable: !disabled && resolveRowProp(rowProps?.draggable, row, index) !== false,
    style: resolveRowProp(rowProps?.style, row, index),
  };
}

function createEventRow<TData>(entry: VisibleRowEntry<TData>): KmsfEventRow<TData> {
  return {
    data: entry.row,
    dataIndex: entry.dataIndex,
    id: entry.rowId,
    index: entry.visibleIndex,
  };
}

function createEventColumn<TData>(
  column: KmsfDataTableRuntimeColumn<TData>,
  index: number,
): KmsfEventColumn<TData> {
  return {
    definition: column,
    field: column.field,
    id: column.id,
    index,
    label: column.label,
  };
}

function createRowPayload<TData, TEvent>(
  event: TEvent,
  entry: VisibleRowEntry<TData>,
): KmsfRowEventPayload<TData, TEvent> {
  return {
    event,
    index: entry.visibleIndex,
    row: createEventRow(entry),
  };
}

function createCellPayload<TData, TEvent>(
  event: TEvent,
  entry: VisibleRowEntry<TData>,
  column: KmsfDataTableRuntimeColumn<TData>,
  columnIndex: number,
  value: unknown,
): KmsfCellEventPayload<TData, unknown, TEvent> {
  return {
    column: createEventColumn(column, columnIndex),
    event,
    index: entry.visibleIndex,
    row: createEventRow(entry),
    value,
  };
}

function createComponentColumnPayload<TData>(
  column: KmsfDataTableRuntimeColumn<TData>,
  columnIndex: number,
): KmsfCellComponentPayload<TData>["column"] {
  return {
    definition: column,
    field: column.field,
    id: column.id,
    index: columnIndex,
    label: column.label,
  };
}

function createCellComponentPayload<TData>(
  entry: VisibleRowEntry<TData>,
  rowDisabled: boolean,
  rowSelected: boolean,
  selectedRowCount: number,
  column: KmsfDataTableRuntimeColumn<TData>,
  columnIndex: number,
  value: unknown,
): KmsfCellComponentPayload<TData> {
  return {
    column: createComponentColumnPayload(column, columnIndex),
    row: {
      data: entry.row,
      dataIndex: entry.dataIndex,
      disabled: rowDisabled,
      id: entry.rowId,
      index: entry.visibleIndex,
      selected: rowSelected,
    },
    selection: {
      selectedRowCount,
    },
    value,
  };
}

function createHeaderComponentPayload<TData>(
  state: KmsfDataTableState<TData>,
  column: KmsfDataTableRuntimeColumn<TData>,
  columnIndex: number,
): KmsfHeaderComponentPayload<TData> {
  const columnState = state.columnState[column.id];

  return {
    column: createComponentColumnPayload(column, columnIndex),
    layout: {
      hidden: columnState?.hidden === true || column.hidden === true,
      width: columnState?.width ?? column.width,
    },
    sort: {
      direction: state.sort?.columnId === column.id ? state.sort.direction : null,
      enabled: Boolean(column.sort),
    },
  };
}

type KmsfRenderableComponent<TData> = KmsfCellComponent<TData> | KmsfHeaderComponent<TData>;
type KmsfRenderablePayload<TData> = KmsfCellComponentPayload<TData> | KmsfHeaderComponentPayload<TData>;

function isKmsfCellComponentPayload<TData>(
  payload: KmsfRenderablePayload<TData>,
): payload is KmsfCellComponentPayload<TData> {
  return "row" in payload && "selection" in payload;
}

function shouldRenderKmsfComponent<TData>(
  component: KmsfRenderableComponent<TData>,
  payload: KmsfRenderablePayload<TData>,
) {
  if (!isKmsfCellComponentPayload(payload) || (component.type !== "input" && component.type !== "select")) {
    return true;
  }

  return payload.selection.selectedRowCount === 1 && payload.row.selected;
}

function getRenderableKmsfComponents<TData>(
  components: ReadonlyArray<KmsfRenderableComponent<TData>> | undefined,
  payload: KmsfRenderablePayload<TData>,
) {
  return (components ?? []).filter((component) => shouldRenderKmsfComponent(component, payload));
}

function renderKmsfComponentSlots<TData>(
  components: ReadonlyArray<KmsfRenderableComponent<TData>> | undefined,
  payload: KmsfRenderablePayload<TData>,
  direction: "left" | "right",
) {
  return getRenderableKmsfComponents(components, payload)
    .map((component, index) => ({ component, index }))
    .filter(({ component }) => (component.direction ?? "left") === direction)
    .map(({ component, index }) => (
      <span
        className="kmsf-data-table__component-slot"
        data-kmsf-component-align={component.align ?? "center"}
        data-kmsf-component-direction={direction}
        data-kmsf-component-id={component.id ?? `${component.type}-${index}`}
        key={component.id ?? `${component.type}-${index}`}
      >
        {renderKmsfBuiltInComponent(component as never, payload as never)}
      </span>
    ));
}

function renderKmsfContentWithComponents<TData>(
  content: React.ReactNode,
  components: ReadonlyArray<KmsfRenderableComponent<TData>> | undefined,
  payload: KmsfRenderablePayload<TData>,
  options: { showContent?: boolean } = {},
) {
  if (!components?.length) {
    return content;
  }

  const showContent = options.showContent ?? true;
  const renderableComponents = getRenderableKmsfComponents(components, payload);

  if (!renderableComponents.length) {
    return content;
  }

  const leftSlots = renderKmsfComponentSlots(renderableComponents, payload, "left");
  const rightSlots = renderKmsfComponentSlots(renderableComponents, payload, "right");

  if (!showContent) {
    return (
      <span className="kmsf-data-table__component-layout" data-kmsf-component-only="true">
        <span className="kmsf-data-table__component-group" data-kmsf-component-direction="all">
          {leftSlots}
          {rightSlots}
        </span>
      </span>
    );
  }

  return (
    <span className="kmsf-data-table__component-layout">
      <span className="kmsf-data-table__component-group" data-kmsf-component-direction="left">
        {leftSlots}
      </span>
      <span className="kmsf-data-table__component-content">{content}</span>
      <span className="kmsf-data-table__component-group" data-kmsf-component-direction="right">
        {rightSlots}
      </span>
    </span>
  );
}

function getEffectiveColumnMinWidth<TData>(column: KmsfDataTableRuntimeColumn<TData>) {
  return Math.max(KMSF_MIN_COLUMN_WIDTH, column.minWidth ?? KMSF_MIN_COLUMN_WIDTH);
}

function getEffectiveColumnMaxWidth<TData>(column: KmsfDataTableRuntimeColumn<TData>) {
  return column.maxWidth ?? Number.POSITIVE_INFINITY;
}

function getRuntimeColumnWidth<TData>(
  state: KmsfDataTableState<TData>,
  column: KmsfDataTableRuntimeColumn<TData>,
) {
  return state.columnState[column.id]?.width ?? column.width ?? 100;
}

function clampColumnWidth(width: number, minWidth: number, maxWidth: number) {
  return Math.min(maxWidth, Math.max(minWidth, width));
}

function distributeRuntimeColumnWidths<TData>(
  state: KmsfDataTableState<TData>,
  columns: Array<KmsfDataTableRuntimeColumn<TData>>,
  targetWidth: number,
) {
  const widths = columns.map((column) =>
    clampColumnWidth(getRuntimeColumnWidth(state, column), getEffectiveColumnMinWidth(column), getEffectiveColumnMaxWidth(column)),
  );
  const active = new Set(columns.map((_column, index) => index));
  const minWidths = columns.map(getEffectiveColumnMinWidth);
  const maxWidths = columns.map(getEffectiveColumnMaxWidth);
  const boundedTargetWidth = clampColumnWidth(
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
      const clampedWidth = clampColumnWidth(nextWidth, minWidths[index] ?? 0, maxWidths[index] ?? Number.POSITIVE_INFINITY);

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

function setColumnWidthInsideParentGroup<TData>(
  state: KmsfDataTableState<TData>,
  columnId: string,
  width: number,
) {
  const group = state.columnGroups.find((candidate) => candidate.children.includes(columnId));

  if (!group || state.columnGroupState[group.id]?.hidden === true) {
    return setKmsfColumnWidth(state, columnId, width);
  }

  const childColumns = group.children
    .map((childId) => state.columns.find((column) => column.id === childId))
    .filter((column): column is KmsfDataTableRuntimeColumn<TData> => Boolean(column))
    .filter((column) => state.columnState[column.id]?.hidden !== true);
  const targetColumn = childColumns.find((column) => column.id === columnId);

  if (!targetColumn) {
    return setKmsfColumnWidth(state, columnId, width);
  }

  const siblingColumns = childColumns.filter((column) => column.id !== columnId);

  if (siblingColumns.length === 0) {
    const currentGroupWidth = getRuntimeColumnWidth(state, targetColumn);

    return setKmsfColumnWidth(
      state,
      columnId,
      clampColumnWidth(width, getEffectiveColumnMinWidth(targetColumn), Math.min(getEffectiveColumnMaxWidth(targetColumn), currentGroupWidth)),
    );
  }

  const currentGroupWidth = childColumns.reduce((sum, column) => sum + getRuntimeColumnWidth(state, column), 0);
  const siblingMinWidth = siblingColumns.reduce((sum, column) => sum + getEffectiveColumnMinWidth(column), 0);
  const siblingMaxWidth = siblingColumns.reduce((sum, column) => sum + getEffectiveColumnMaxWidth(column), 0);
  const minWidth = Math.max(getEffectiveColumnMinWidth(targetColumn), currentGroupWidth - siblingMaxWidth);
  const maxWidth = Math.max(minWidth, Math.min(getEffectiveColumnMaxWidth(targetColumn), currentGroupWidth - siblingMinWidth));
  const nextTargetWidth = clampColumnWidth(width, minWidth, maxWidth);
  const nextSiblingWidths = distributeRuntimeColumnWidths(state, siblingColumns, currentGroupWidth - nextTargetWidth);
  let next = setKmsfColumnWidth(state, columnId, nextTargetWidth);

  siblingColumns.forEach((column, index) => {
    next = setKmsfColumnWidth(next, column.id, nextSiblingWidths[index] ?? getRuntimeColumnWidth(next, column));
  });

  return next;
}

function setKmsfNestedInputValue<TData>(row: TData, field: string, value: string): TData {
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

function getNextSort(current: KmsfSortState | null, columnId: string): KmsfSortState | null {
  if (current?.columnId !== columnId) {
    return { columnId, direction: "asc" };
  }

  if (current.direction === "asc") {
    return { columnId, direction: "desc" };
  }

  return null;
}

function getSortIndicatorState(current: KmsfSortState | null, columnId: string) {
  if (current?.columnId !== columnId) {
    return "none";
  }

  return current.direction;
}

function getAriaSortState(current: KmsfSortState | null, columnId: string) {
  if (current?.columnId !== columnId) {
    return "none";
  }

  return current.direction === "asc" ? "ascending" : "descending";
}

function areRowIdSequencesEqual(left: readonly KmsfRowId[], right: readonly KmsfRowId[]) {
  return left.length === right.length && left.every((id, index) => id === right[index]);
}

function canPreserveSelection<TData>(
  current: KmsfDataTableState<TData>,
  next: KmsfDataTableState<TData>,
) {
  if (!areRowIdSequencesEqual(current.rowIds, next.rowIds)) {
    return false;
  }

  const nextColumnIds = new Set(next.columns.map((column) => column.id));
  const selectedCell = current.selection.cell;
  const selectedRange = current.selection.range;

  if (selectedCell && !nextColumnIds.has(selectedCell.columnId)) {
    return false;
  }

  if (
    selectedRange &&
    (!nextColumnIds.has(selectedRange.anchor.columnId) || !nextColumnIds.has(selectedRange.focus.columnId))
  ) {
    return false;
  }

  return true;
}

function KmsfDataTableInner<TData>(
  {
    "buffer-size": bufferSize,
    cellSelection = true,
    className,
    columnGroups,
    columns,
    data,
    "data-testid": dataTestId,
    getRowId,
    onChangeColumnLayout,
    onChangeData,
    onChangeSelection,
    onChangeSort,
    onClickCell,
    onClickRow,
    onContextMenuCell,
    onContextMenuRow,
    onDoubleClickCell,
    onDoubleClickRow,
    onKeyDownCell,
    onKeyDownRow,
    pagination,
    rowHeight = 36,
    rowProps,
    showHeader = true,
    style,
    theme,
    virtualized = false,
  }: KmsfDataTableProps<TData>,
  ref: React.ForwardedRef<KmsfDataTableRef<TData>>,
) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const headerRef = useRef<HTMLDivElement | null>(null);
  const copiedCellRef = useRef<KmsfCopiedCell | null>(null);
  const copiedRangeRef = useRef<KmsfCopiedCellRange | null>(null);
  const copiedRowRef = useRef<KmsfCopiedRow<TData> | null>(null);
  const columnPointerInteractionRef = useRef<KmsfColumnPointerInteraction | null>(null);
  const lastCellAnchorRef = useRef<KmsfCellAddress | null>(null);
  const lastRowAnchorRef = useRef<KmsfRowId | null>(null);
  const rangeDragAnchorRef = useRef<KmsfCellAddress | null>(null);
  const rangeDragLastAddressRef = useRef<KmsfCellAddress | null>(null);
  const rangeDragMovedRef = useRef(false);
  const rowMoveStateRef = useRef<KmsfRowMoveState | null>(null);
  const pendingScrollTopRef = useRef(0);
  const scrollCommitTimeoutRef = useRef<number | null>(null);
  const scrollFrameRef = useRef<number | null>(null);
  const suppressedSortColumnIdRef = useRef<string | null>(null);
  const [containerHeight, setContainerHeight] = useState(0);
  const [containerWidth, setContainerWidth] = useState(0);
  const [movingColumnId, setMovingColumnId] = useState<string | null>(null);
  const [movingGroupId, setMovingGroupId] = useState<string | null>(null);
  const [columnMovePointer, setColumnMovePointer] = useState<{ x: number; y: number } | null>(null);
  const [columnMoveTargetId, setColumnMoveTargetId] = useState<string | null>(null);
  const [resizingColumnId, setResizingColumnId] = useState<string | null>(null);
  const [rowMoveState, setRowMoveState] = useState<KmsfRowMoveState | null>(null);
  const [scrollTop, setScrollTop] = useState(0);
  const [state, setState] = useState(() =>
    createKmsfDataTableState({
      columnGroups,
      columns,
      getRowId,
      pagination,
      rows: data,
      showHeader,
      theme,
    }),
  );
  const stateRef = useRef(state);
  const stateInputRef = useRef({ columnGroups, columns, data, getRowId, pagination, showHeader, theme });
  const virtualBufferSize = Math.max(0, Math.floor(Number.isFinite(bufferSize) ? Number(bufferSize) : 25));

  useEffect(() => {
    const previousInput = stateInputRef.current;

    if (
      previousInput.columns === columns &&
      previousInput.columnGroups === columnGroups &&
      previousInput.data === data &&
      previousInput.getRowId === getRowId &&
      previousInput.pagination === pagination &&
      previousInput.showHeader === showHeader &&
      previousInput.theme === theme
    ) {
      return;
    }

    stateInputRef.current = { columnGroups, columns, data, getRowId, pagination, showHeader, theme };
    setState((current) => {
      const next = createKmsfDataTableState({
        columnLayout: serializeKmsfColumnLayout(current),
        columnGroups,
        columns,
        getRowId,
        pagination: pagination ?? current.pagination,
        rows: data,
        showHeader,
        sort: current.sort,
        theme: theme ?? current.theme,
      });

      return canPreserveSelection(current, next) ? { ...next, selection: current.selection } : next;
    });
  }, [columnGroups, columns, data, getRowId, pagination, showHeader, theme]);

  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  useEffect(() => {
    return () => {
      if (scrollFrameRef.current !== null) {
        window.cancelAnimationFrame(scrollFrameRef.current);
      }

      if (scrollCommitTimeoutRef.current !== null) {
        window.clearTimeout(scrollCommitTimeoutRef.current);
      }
    };
  }, []);

  useEffect(() => {
    const element = containerRef.current;

    if (!element || typeof ResizeObserver === "undefined") {
      return undefined;
    }

    const observer = new ResizeObserver(([entry]) => {
      if (entry) {
        setContainerHeight(entry.contentRect.height);
        setContainerWidth(entry.contentRect.width);
      }
    });
    observer.observe(element);

    return () => observer.disconnect();
  }, []);

  const notifyChanges = (
    current: KmsfDataTableState<TData>,
    next: KmsfDataTableState<TData>,
    options: { columnLayoutChanged?: boolean; sortChanged?: boolean } = {},
  ) => {
    if (next.rows !== current.rows) {
      onChangeData?.(next.rows);
    }

    if (next.selection !== current.selection) {
      onChangeSelection?.(next.selection);
    }

    if (options.columnLayoutChanged) {
      onChangeColumnLayout?.(serializeKmsfColumnLayout(next));
    }

    if (options.sortChanged || next.sort !== current.sort) {
      onChangeSort?.(next.sort);
    }
  };

  const commitState = (
    updater: KmsfDataTableState<TData> | ((current: KmsfDataTableState<TData>) => KmsfDataTableState<TData>),
    options: { columnLayoutChanged?: boolean; sortChanged?: boolean } = {},
  ) => {
    const current = stateRef.current;
    const next = typeof updater === "function" ? updater(current) : updater;

    stateRef.current = next;
    setState(next);
    notifyChanges(current, next, options);
  };

  const visibleColumns = useMemo(() => getKmsfVisibleColumns(state), [state]);
  const headerRows = useMemo(() => getKmsfHeaderRows(state), [state]);
  const sortedRowIndexes = useMemo(() => (state.sort ? getKmsfSortedRowIndexes(state) : null), [state]);
  const visibleRowCount = sortedRowIndexes?.length ?? state.rows.length;
  const pageStartIndex = Math.max(0, state.pagination.pageIndex) * Math.max(1, state.pagination.pageSize);
  const rowWindow = useMemo(() => {
    if (virtualized) {
      const safeRowHeight = Math.max(1, rowHeight);
      const viewportHeight = containerHeight || rowHeight * 12;
      const totalHeight = visibleRowCount * safeRowHeight;
      const maxPhysicalTotalHeight = 1_500_000;
      const physicalTotalHeight = Math.min(totalHeight, maxPhysicalTotalHeight);
      const logicalScrollableHeight = Math.max(0, totalHeight - viewportHeight);
      const physicalScrollableHeight = Math.max(0, physicalTotalHeight - viewportHeight);
      const scrollScale =
        logicalScrollableHeight > 0 && physicalScrollableHeight > 0
          ? logicalScrollableHeight / physicalScrollableHeight
          : 1;
      const logicalScrollTop = Math.min(logicalScrollableHeight, Math.max(0, scrollTop) * scrollScale);
      const startIndex = Math.max(0, Math.floor(logicalScrollTop / safeRowHeight) - virtualBufferSize);
      const endIndex = Math.min(
        visibleRowCount,
        Math.ceil((logicalScrollTop + Math.max(0, viewportHeight)) / safeRowHeight) + virtualBufferSize,
      );
      const logicalTopSpacerHeight = startIndex * safeRowHeight;
      const renderOffset = scrollScale > 0 ? logicalTopSpacerHeight / scrollScale : logicalTopSpacerHeight;

      return {
        entries: createVisibleRowEntries(sortedRowIndexes, state.rows, state.rowIds, startIndex, endIndex),
        renderOffset,
        scrollHeight: physicalTotalHeight,
      };
    }

    return {
      entries: createVisibleRowEntries(
        sortedRowIndexes,
        state.rows,
        state.rowIds,
        pageStartIndex,
        pageStartIndex + Math.max(1, state.pagination.pageSize),
      ),
      renderOffset: 0,
      scrollHeight: 0,
    };
  }, [
    containerHeight,
    pageStartIndex,
    rowHeight,
    scrollTop,
    sortedRowIndexes,
    state.pagination.pageSize,
    state.rowIds,
    state.rows,
    virtualBufferSize,
    virtualized,
    visibleRowCount,
  ]);
  const densityClass =
    state.theme.density === "compact"
      ? "text-[11px]"
      : state.theme.density === "spacious"
        ? "text-[13px]"
        : "text-[length:var(--kmsf-font-size-base,12px)]";
  const columnWidths = useMemo(() => {
    const columnCount = visibleColumns.length;

    if (columnCount === 0) {
      return [];
    }

    const configuredWidths = visibleColumns.map((column) => state.columnState[column.id]?.width ?? column.width);

    if (containerWidth <= 0) {
      const fallbackWidth = `${100 / columnCount}%`;

      return configuredWidths.map((width) => width ?? fallbackWidth);
    }

    let fixedTotal = 0;

    for (const width of configuredWidths) {
      fixedTotal += width ?? 0;
    }

    const flexibleColumns = visibleColumns.filter((_column, index) => configuredWidths[index] === undefined);
    const flexibleWidth =
      flexibleColumns.length > 0 ? Math.max(0, (containerWidth - fixedTotal) / flexibleColumns.length) : 0;

    return visibleColumns.map((column, index) => {
      const width = configuredWidths[index] ?? flexibleWidth;
      const minWidth = getEffectiveColumnMinWidth(column);
      const maxWidth = column.maxWidth ?? Number.POSITIVE_INFINITY;

      return Math.min(maxWidth, Math.max(minWidth, width));
    });
  }, [containerWidth, state.columnState, visibleColumns]);
  const columnWidthTotal = useMemo(() => {
    let totalWidth = 0;

    for (const width of columnWidths) {
      if (typeof width !== "number") {
        return undefined;
      }

      totalWidth += width;
    }

    return totalWidth;
  }, [columnWidths]);
  const tableWidth = useMemo(() => {
    if (typeof columnWidthTotal !== "number") {
      return undefined;
    }

    return Math.max(containerWidth, columnWidthTotal);
  }, [columnWidthTotal, containerWidth]);
  const hasHorizontalOverflow =
    typeof columnWidthTotal === "number" && containerWidth > 0 ? columnWidthTotal > containerWidth + 1 : false;
  const renderedRowsHeight = rowWindow.entries.length * rowHeight;
  const emptyFillerHeight = virtualized ? 0 : Math.max(0, containerHeight - renderedRowsHeight);

  const isCopyPasteKey = (event: React.KeyboardEvent, key: "c" | "v") =>
    (event.ctrlKey || event.metaKey) && event.key.toLowerCase() === key;
  const getVisibleEntryByRenderedIndex = (index: number) => rowWindow.entries[index];
  const getVisibleRowIdsBetween = (
    current: KmsfDataTableState<TData>,
    anchorRowId: KmsfRowId,
    focusRowId: KmsfRowId,
  ) => {
    const visibleEntries = getKmsfSortedRowIndexes(current).flatMap<VisibleRowEntry<TData>>((dataIndex, visibleIndex) => {
        const row = current.rows[dataIndex];
        const rowId = current.rowIds[dataIndex];

        return row === undefined || rowId === undefined ? [] : [{ dataIndex, row, rowId, visibleIndex }];
      });
    const anchorIndex = visibleEntries.findIndex((entry) => entry.rowId === anchorRowId);
    const focusIndex = visibleEntries.findIndex((entry) => entry.rowId === focusRowId);

    if (anchorIndex < 0 || focusIndex < 0) {
      return [focusRowId];
    }

    const start = Math.min(anchorIndex, focusIndex);
    const end = Math.max(anchorIndex, focusIndex);

    return visibleEntries.slice(start, end + 1).map((entry) => entry.rowId);
  };
  const selectRowRangeByIds = (anchorRowId: KmsfRowId, focusRowId: KmsfRowId) => {
    commitState((current) => selectRows(current, getVisibleRowIdsBetween(current, anchorRowId, focusRowId)));
  };
  const selectRowsByVisibleIndexes = (indexes: readonly number[]) => {
    commitState((current) => {
      const rowIds = indexes.flatMap((index) => {
        const entry = getVisibleEntryByRenderedIndex(index);

        return entry ? [entry.rowId] : [];
      });

      return selectRows(current, rowIds);
    });
  };
  const activateHeaderSort = (column: KmsfDataTableRuntimeColumn<TData>) => {
    if (suppressedSortColumnIdRef.current === column.id) {
      suppressedSortColumnIdRef.current = null;
      return;
    }

    if (!column.sort) {
      return;
    }

    commitState((current) => setKmsfSortState(current, getNextSort(current.sort, column.id)), {
      sortChanged: true,
    });
  };

  const getColumnMoveTargetId = (clientX: number, clientY: number) => {
    const targetHeader = document
      .elementFromPoint(clientX, clientY)
      ?.closest<HTMLElement>("[data-kmsf-column-id], [data-kmsf-column-group-id]");

    if (!targetHeader) {
      return null;
    }

    if (targetHeader.dataset.kmsfColumnId) {
      return targetHeader.dataset.kmsfColumnId;
    }

    const groupId = targetHeader.dataset.kmsfColumnGroupId;
    const targetGroup = groupId ? stateRef.current.columnGroups.find((group) => group.id === groupId) : undefined;

    return targetGroup?.children.find((childId) => visibleColumns.some((column) => column.id === childId)) ?? null;
  };

  useImperativeHandle(
    ref,
    () => ({
      clearSort: () => commitState((current) => clearKmsfSortState(current), { sortChanged: true }),
      getColumnLayout: () => serializeKmsfColumnLayout(state),
      getSortState: () => state.sort,
      setColumnLayout: (layout) =>
        commitState((current) => applyKmsfColumnLayout(current, layout), { columnLayoutChanged: true }),
      setMoveTargetRow: (targetIdx, sourceIdx) =>
        commitState(
          (current) => {
            const visibleRowIds = getKmsfSortedRowIndexes(current).flatMap((dataIndex) => {
              const rowId = current.rowIds[dataIndex];

              return rowId === undefined ? [] : [rowId];
            });
            const sourceRowId = visibleRowIds[sourceIdx];

            if (sourceRowId === undefined || targetIdx < 0 || sourceIdx < 0) {
              return current;
            }

            const nextVisibleRowIds = visibleRowIds.filter((rowId) => rowId !== sourceRowId);
            const targetPosition = Math.min(nextVisibleRowIds.length, targetIdx);
            nextVisibleRowIds.splice(targetPosition, 0, sourceRowId);

            const rowById = new Map(current.rowIds.map((rowId, index) => [rowId, current.rows[index]] as const));
            const nextRows = nextVisibleRowIds.flatMap((rowId) => {
              const row = rowById.get(rowId);

              return row === undefined ? [] : [row];
            });

            if (nextRows.length !== current.rows.length) {
              return current;
            }

            return {
              ...current,
              rowIds: nextVisibleRowIds,
              rows: nextRows,
              sort: null,
            };
          },
          { sortChanged: true },
        ),
      setSelectedRow: (index) => selectRowsByVisibleIndexes([index]),
      setSelectedRows: (indexes) => selectRowsByVisibleIndexes(indexes),
      setSortState: (sort) => commitState((current) => setKmsfSortState(current, sort), { sortChanged: true }),
    }),
    [rowWindow.entries, state],
  );

  const clearColumnPointerInteraction = () => {
    const interaction = columnPointerInteractionRef.current;

    if (interaction) {
      window.clearTimeout(interaction.timer);
    }

    columnPointerInteractionRef.current = null;
    setMovingColumnId(null);
    setMovingGroupId(null);
    setColumnMovePointer(null);
    setColumnMoveTargetId(null);
  };

  const beginHeaderPointerInteraction = (
    event: React.PointerEvent<HTMLTableCellElement>,
    column: KmsfDataTableRuntimeColumn<TData>,
  ) => {
    if (event.button !== 0) {
      return;
    }

    const activateColumnMove = (current: KmsfColumnPointerInteraction, x: number, y: number) => {
      current.active = true;
      current.cancelSort = true;
      suppressedSortColumnIdRef.current = column.id;
      setColumnMovePointer({ x, y });
      setColumnMoveTargetId(column.id);
      setMovingGroupId(null);
      setMovingColumnId(column.id);
    };
    const interaction: KmsfColumnPointerInteraction = {
      active: false,
      cancelSort: false,
      id: column.id,
      kind: "column",
      movedBeforeLongPress: false,
      startedAt: performance.now(),
      startX: event.clientX,
      startY: event.clientY,
      timer: window.setTimeout(() => {
        const current = columnPointerInteractionRef.current;

        if (!current || current.id !== column.id || current.kind !== "column" || current.movedBeforeLongPress) {
          return;
        }

        activateColumnMove(current, current.startX, current.startY);
      }, 1000),
    };

    const handlePointerMove = (moveEvent: PointerEvent) => {
      const current = columnPointerInteractionRef.current;

      if (!current || current.id !== column.id || current.kind !== "column") {
        return;
      }

      const distance = Math.hypot(moveEvent.clientX - current.startX, moveEvent.clientY - current.startY);

      if (!current.active && performance.now() - current.startedAt >= 1000 && !current.movedBeforeLongPress) {
        activateColumnMove(current, moveEvent.clientX, moveEvent.clientY);
      }

      if (!current.active && distance > 4) {
        current.movedBeforeLongPress = true;
        current.cancelSort = true;
        suppressedSortColumnIdRef.current = column.id;
        window.clearTimeout(current.timer);
        return;
      }

      if (current.active) {
        moveEvent.preventDefault();
        setColumnMovePointer({ x: moveEvent.clientX, y: moveEvent.clientY });

        setColumnMoveTargetId(getColumnMoveTargetId(moveEvent.clientX, moveEvent.clientY));
      }
    };

    const handlePointerUp = (upEvent: PointerEvent) => {
      const current = columnPointerInteractionRef.current;

      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);

      if (!current || current.id !== column.id || current.kind !== "column") {
        clearColumnPointerInteraction();
        return;
      }

      window.clearTimeout(current.timer);

      if (current.active) {
        const targetColumnId = getColumnMoveTargetId(upEvent.clientX, upEvent.clientY);

        if (targetColumnId) {
          const targetIndex = visibleColumns.findIndex((visibleColumn) => visibleColumn.id === targetColumnId);

          if (targetIndex >= 0) {
            commitState((stateCurrent) => moveKmsfColumn(stateCurrent, column.id, targetIndex), {
              columnLayoutChanged: true,
            });
          }
        }
      }

      if (current.cancelSort || current.active) {
        suppressedSortColumnIdRef.current = column.id;
      }

      clearColumnPointerInteraction();
    };

    clearColumnPointerInteraction();
    columnPointerInteractionRef.current = interaction;
    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", handlePointerUp);
  };

  const beginGroupPointerInteraction = (
    event: React.PointerEvent<HTMLTableCellElement>,
    group: KmsfDataTableRuntimeColumnGroup,
  ) => {
    if (event.button !== 0) {
      return;
    }

    const activateGroupMove = (current: KmsfColumnPointerInteraction, x: number, y: number) => {
      current.active = true;
      current.cancelSort = true;
      setColumnMovePointer({ x, y });
      setColumnMoveTargetId(group.children[0] ?? null);
      setMovingColumnId(null);
      setMovingGroupId(group.id);
    };
    const interaction: KmsfColumnPointerInteraction = {
      active: false,
      cancelSort: false,
      id: group.id,
      kind: "group",
      movedBeforeLongPress: false,
      startedAt: performance.now(),
      startX: event.clientX,
      startY: event.clientY,
      timer: window.setTimeout(() => {
        const current = columnPointerInteractionRef.current;

        if (!current || current.id !== group.id || current.kind !== "group" || current.movedBeforeLongPress) {
          return;
        }

        activateGroupMove(current, current.startX, current.startY);
      }, 1000),
    };

    const handlePointerMove = (moveEvent: PointerEvent) => {
      const current = columnPointerInteractionRef.current;

      if (!current || current.id !== group.id || current.kind !== "group") {
        return;
      }

      const distance = Math.hypot(moveEvent.clientX - current.startX, moveEvent.clientY - current.startY);

      if (!current.active && performance.now() - current.startedAt >= 1000 && !current.movedBeforeLongPress) {
        activateGroupMove(current, moveEvent.clientX, moveEvent.clientY);
      }

      if (!current.active && distance > 4) {
        current.movedBeforeLongPress = true;
        current.cancelSort = true;
        window.clearTimeout(current.timer);
        return;
      }

      if (current.active) {
        moveEvent.preventDefault();
        setColumnMovePointer({ x: moveEvent.clientX, y: moveEvent.clientY });

        setColumnMoveTargetId(getColumnMoveTargetId(moveEvent.clientX, moveEvent.clientY));
      }
    };

    const handlePointerUp = (upEvent: PointerEvent) => {
      const current = columnPointerInteractionRef.current;

      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);

      if (!current || current.id !== group.id || current.kind !== "group") {
        clearColumnPointerInteraction();
        return;
      }

      window.clearTimeout(current.timer);

      if (current.active) {
        const targetColumnId = getColumnMoveTargetId(upEvent.clientX, upEvent.clientY);

        if (targetColumnId) {
          const targetIndex = visibleColumns.findIndex((visibleColumn) => visibleColumn.id === targetColumnId);

          if (targetIndex >= 0) {
            commitState((stateCurrent) => moveKmsfColumnGroup(stateCurrent, group.id, targetIndex), {
              columnLayoutChanged: true,
            });
          }
        }
      }

      clearColumnPointerInteraction();
    };

    clearColumnPointerInteraction();
    columnPointerInteractionRef.current = interaction;
    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", handlePointerUp);
  };

  const selectRowFromClick = (event: React.MouseEvent, entry: VisibleRowEntry<TData>) => {
    if (event.shiftKey && lastRowAnchorRef.current !== null) {
      selectRowRangeByIds(lastRowAnchorRef.current, entry.rowId);
      lastRowAnchorRef.current = entry.rowId;
      return;
    }

    commitState((current) =>
      selectRow(current, entry.rowId, {
        multi: event.ctrlKey || event.metaKey,
        toggle: event.ctrlKey || event.metaKey,
      }),
    );
    lastRowAnchorRef.current = entry.rowId;
  };

  const handleRowKeyDown = (
    event: React.KeyboardEvent<HTMLTableRowElement>,
    entry: VisibleRowEntry<TData>,
    disabled: boolean,
  ) => {
    if (disabled) {
      event.preventDefault();
      return;
    }

    onKeyDownRow?.(createRowPayload(event, entry));

    if (event.defaultPrevented || event.target !== event.currentTarget) {
      return;
    }

    if (isCopyPasteKey(event, "c")) {
      event.preventDefault();
      copiedRowRef.current = copyKmsfRow(state, entry.rowId);
      return;
    }

    if (isCopyPasteKey(event, "v") && copiedRowRef.current) {
      event.preventDefault();
      commitState((current) => pasteKmsfRow(current, copiedRowRef.current!, { mode: "insert-after", targetRowId: entry.rowId }));
    }
  };
  const handleCellKeyDown = (
    event: React.KeyboardEvent<HTMLTableCellElement>,
    entry: VisibleRowEntry<TData>,
    column: KmsfDataTableRuntimeColumn<TData>,
    columnIndex: number,
    address: KmsfCellAddress,
    disabled: boolean,
  ) => {
    if (disabled) {
      event.preventDefault();
      event.stopPropagation();
      return;
    }

    onKeyDownCell?.(createCellPayload(event, entry, column, columnIndex, getKmsfCellValue(state, entry.row, column.id)));

    if (event.defaultPrevented) {
      return;
    }

    if (isCopyPasteKey(event, "c")) {
      event.preventDefault();
      event.stopPropagation();
      copiedRangeRef.current = state.selection.range ? copyKmsfCellRange(state) : null;
      copiedCellRef.current = copiedRangeRef.current ? null : copyKmsfCell(state, address);
      return;
    }

    if (isCopyPasteKey(event, "v") && (copiedRangeRef.current || copiedCellRef.current)) {
      event.preventDefault();
      event.stopPropagation();
      commitState((current) =>
        copiedRangeRef.current
          ? pasteKmsfCellRange(current, address, copiedRangeRef.current)
          : pasteKmsfCell(current, address, copiedCellRef.current),
      );
    }
  };
  const beginCellRangeDrag = (
    event: { button: number; shiftKey: boolean },
    address: KmsfCellAddress,
    disabled: boolean,
  ) => {
    if (!cellSelection) {
      return;
    }

    if (disabled || event.button !== 0 || event.shiftKey) {
      return;
    }

    rangeDragAnchorRef.current = address;
    rangeDragLastAddressRef.current = address;
    rangeDragMovedRef.current = false;
  };
  const getCellAddressFromPoint = (clientX: number, clientY: number): KmsfCellAddress | null => {
    const element = document
      .elementFromPoint(clientX, clientY)
      ?.closest<HTMLElement>("[data-kmsf-cell-column-id][data-kmsf-data-index]");
    const columnId = element?.dataset.kmsfCellColumnId;
    const dataIndex = element?.dataset.kmsfDataIndex === undefined ? NaN : Number(element.dataset.kmsfDataIndex);
    const rowId = Number.isInteger(dataIndex) ? state.rowIds[dataIndex] : undefined;

    return columnId && rowId !== undefined ? { columnId, rowId } : null;
  };
  const updateCellRangeDrag = (address: KmsfCellAddress) => {
    if (!cellSelection) {
      return;
    }

    const anchor = rangeDragAnchorRef.current;

    if (!anchor || (anchor.rowId === address.rowId && anchor.columnId === address.columnId)) {
      return;
    }

    rangeDragMovedRef.current = true;
    rangeDragLastAddressRef.current = address;
    lastCellAnchorRef.current = anchor;
    commitState((current) => selectCellRange(current, { anchor, focus: address }));
  };
  const endCellRangeDrag = () => {
    if (!cellSelection) {
      return;
    }

    rangeDragAnchorRef.current = null;
    rangeDragLastAddressRef.current = null;
  };
  const beginCellRangePointerDrag = (
    event: React.PointerEvent<HTMLTableCellElement>,
    address: KmsfCellAddress,
    disabled: boolean,
  ) => {
    beginCellRangeDrag(event, address, disabled);

    if (disabled || event.button !== 0 || event.shiftKey) {
      return;
    }

    const handlePointerMove = (moveEvent: PointerEvent) => {
      if (moveEvent.buttons !== 1) {
        return;
      }

      const nextAddress = getCellAddressFromPoint(moveEvent.clientX, moveEvent.clientY);

      if (nextAddress) {
        updateCellRangeDrag(nextAddress);
      }
    };
    const handlePointerUp = () => {
      endCellRangeDrag();
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
    };

    event.preventDefault();
    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", handlePointerUp);
  };
  const beginRowHandlePointerDrag = (
    event: React.PointerEvent<HTMLElement>,
    entry: VisibleRowEntry<TData>,
    disabled: boolean,
    draggable: boolean,
  ) => {
    if (disabled || !draggable || event.button !== 0) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();

    const sourceRowId = entry.rowId;
    const setActiveRowMoveState = (next: KmsfRowMoveState | null) => {
      rowMoveStateRef.current = next;
      setRowMoveState(next);
    };
    const updateTarget = (clientX: number, clientY: number) => {
      const targetRow = document
        .elementFromPoint(clientX, clientY)
        ?.closest<HTMLElement>("[data-kmsf-row-data-index]");

      if (!targetRow || targetRow.dataset.kmsfRowDataIndex === undefined) {
        return;
      }

      const targetDataIndex = Number(targetRow.dataset.kmsfRowDataIndex);

      if (Number.isInteger(targetDataIndex)) {
        setActiveRowMoveState({ sourceRowId, targetDataIndex });
      }
    };
    const handlePointerMove = (moveEvent: PointerEvent) => {
      if (moveEvent.buttons !== 1) {
        return;
      }

      updateTarget(moveEvent.clientX, moveEvent.clientY);
    };
    const handlePointerUp = (upEvent: PointerEvent) => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
      updateTarget(upEvent.clientX, upEvent.clientY);

      const targetIndex = rowMoveStateRef.current?.targetDataIndex;
      setActiveRowMoveState(null);

      if (targetIndex !== undefined) {
        commitState((current) => moveKmsfRow(current, sourceRowId, targetIndex));
      }
    };

    updateTarget(event.clientX, event.clientY);
    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", handlePointerUp);
  };
  const movingColumn = movingColumnId
    ? visibleColumns.find((visibleColumn) => visibleColumn.id === movingColumnId)
    : undefined;
  const movingGroup = movingGroupId ? state.columnGroups.find((group) => group.id === movingGroupId) : undefined;
  const movingHeaderLabel = movingColumn?.label ?? movingGroup?.label;

  const renderHeaderCell = (cell: KmsfHeaderCell<TData>, fallbackIndex: number) => {
    if (cell.kind === "group") {
      return (
        <th
          className={[
            "kmsf-data-table__th kmsf-data-table__group-th px-3 py-2 text-left font-semibold",
            movingGroupId === cell.groupId ? "kmsf-column-moving" : undefined,
          ]
            .filter(Boolean)
            .join(" ")}
          colSpan={cell.colSpan}
          data-column-moving={movingGroupId === cell.groupId ? "true" : undefined}
          data-kmsf-column-group-id={cell.groupId}
          data-testid={`header-group-${cell.groupId}`}
          key={`group-${cell.groupId}`}
          onPointerDown={(event) => beginGroupPointerInteraction(event, cell.group)}
          rowSpan={cell.rowSpan}
          scope="colgroup"
        >
          <span aria-hidden="true" className="kmsf-column-drop-marker" />
          <span className="kmsf-data-table__header-content" data-kmsf-header-body="true">
            <span className="kmsf-data-table__header-label">{cell.group.label}</span>
          </span>
          <span
            aria-hidden="true"
            className="kmsf-data-table__resize"
            data-resizing={resizingColumnId === cell.groupId ? "true" : undefined}
            data-testid={`resize-group-${cell.groupId}`}
            onClick={(event) => event.stopPropagation()}
            onPointerDown={(event) => {
              event.preventDefault();
              event.stopPropagation();
              const startX = event.clientX;
              const measuredWidth = event.currentTarget.closest<HTMLTableCellElement>("th")?.getBoundingClientRect().width;
              const visibleWidthSnapshot = new Map<string, number>();

              for (const childId of cell.group.children) {
                const visibleColumn = visibleColumns.find((column) => column.id === childId);

                if (!visibleColumn) {
                  continue;
                }

                const headerCell = Array.from(
                  headerRef.current?.querySelectorAll<HTMLTableCellElement>("[data-kmsf-column-id]") ?? [],
                ).find((element) => element.dataset.kmsfColumnId === visibleColumn.id);
                const measuredColumnWidth = headerCell?.getBoundingClientRect().width;
                const fallbackWidth = stateRef.current.columnState[visibleColumn.id]?.width ?? visibleColumn.width ?? 160;

                visibleWidthSnapshot.set(
                  visibleColumn.id,
                  measuredColumnWidth && Number.isFinite(measuredColumnWidth) ? measuredColumnWidth : fallbackWidth,
                );
              }

              const fallbackGroupWidth = [...visibleWidthSnapshot.values()].reduce((sum, width) => sum + width, 0);
              const startWidth =
                measuredWidth && Number.isFinite(measuredWidth) ? measuredWidth : Math.max(1, fallbackGroupWidth);
              setResizingColumnId(cell.groupId);
              const handlePointerMove = (moveEvent: PointerEvent) => {
                commitState(
                  (current) => {
                    let next = current;

                    for (const [visibleColumnId, visibleColumnWidth] of visibleWidthSnapshot) {
                      next = setKmsfColumnWidth(next, visibleColumnId, visibleColumnWidth);
                    }

                    return setKmsfColumnGroupWidth(next, cell.groupId, startWidth + moveEvent.clientX - startX);
                  },
                  { columnLayoutChanged: true },
                );
              };
              const handlePointerUp = () => {
                setResizingColumnId(null);
                window.removeEventListener("pointermove", handlePointerMove);
                window.removeEventListener("pointerup", handlePointerUp);
              };
              window.addEventListener("pointermove", handlePointerMove);
              window.addEventListener("pointerup", handlePointerUp);
            }}
          >
            <span className="kmsf-data-table__resize-line" />
          </span>
        </th>
      );
    }

    const column = cell.column;
    const index = visibleColumns.findIndex((visibleColumn) => visibleColumn.id === column.id);
    const safeIndex = index >= 0 ? index : fallbackIndex;
    const columnState = state.columnState[column.id];
    const headerProps = column.header?.props ?? {};
    const sortIndicatorState = getSortIndicatorState(state.sort, column.id);
    const sortIndicatorVisible = sortIndicatorState === "asc" || sortIndicatorState === "desc";
    const headerClassName = [
      "kmsf-data-table__th px-3 py-2 text-left font-semibold",
      movingColumnId === column.id ? "kmsf-column-moving" : undefined,
      headerProps.className,
    ]
      .filter(Boolean)
      .join(" ");
    const headerPayload = createHeaderComponentPayload(state, column, safeIndex);
    const headerRendererBody = column.header?.renderer ? column.header.renderer(headerPayload) : null;
    const headerLeftSlots = !column.header?.renderer
      ? renderKmsfComponentSlots(column.header?.components, headerPayload, "left")
      : [];
    const headerRightSlots = !column.header?.renderer
      ? renderKmsfComponentSlots(column.header?.components, headerPayload, "right")
      : [];
    const hasHeaderComponents = headerLeftSlots.length > 0 || headerRightSlots.length > 0;

    return (
      <th
        {...headerProps}
        className={headerClassName}
        colSpan={cell.colSpan}
        data-column-drop-target={columnMoveTargetId === column.id ? "true" : undefined}
        data-column-moving={movingColumnId === column.id ? "true" : undefined}
        data-kmsf-column-id={column.id}
        data-kmsf-column-index={safeIndex}
        data-sort-direction={state.sort?.columnId === column.id ? state.sort.direction : undefined}
        data-sortable={column.sort ? "true" : "false"}
        data-testid={`header-${column.id}`}
        aria-sort={column.sort ? getAriaSortState(state.sort, column.id) : undefined}
        key={`column-${column.id}`}
        onClick={(event) => {
          headerProps.onClick?.(event);

          if (event.defaultPrevented || !column.sort) {
            return;
          }

          activateHeaderSort(column);
        }}
        onKeyDown={(event) => {
          headerProps.onKeyDown?.(event);

          if (event.defaultPrevented || !column.sort) {
            return;
          }

          if (event.key === "Enter" || event.key === " " || event.key === "Spacebar") {
            event.preventDefault();
            activateHeaderSort(column);
          }
        }}
        onPointerDown={(event) => beginHeaderPointerInteraction(event, column)}
        rowSpan={cell.rowSpan}
        scope="col"
        style={{ width: columnState?.width ?? column.width, ...headerProps.style }}
        tabIndex={column.sort ? 0 : undefined}
      >
        <span aria-hidden="true" className="kmsf-column-drop-marker" />
        <span
          className="kmsf-data-table__header-content"
          data-kmsf-header-body="true"
          data-kmsf-header-components={hasHeaderComponents ? "true" : undefined}
          data-kmsf-sort-indicator-visible={sortIndicatorVisible ? "true" : undefined}
        >
          <span className="kmsf-data-table__header-slot" data-kmsf-header-slot="left">
            {headerLeftSlots}
          </span>
          <span className="kmsf-data-table__header-label">
            {column.header?.renderer ? headerRendererBody : column.label}
          </span>
          <span
            aria-hidden="true"
            className="kmsf-sort-indicator"
            data-sort-state={sortIndicatorState}
            data-sort-visible={sortIndicatorVisible ? "true" : undefined}
            data-testid={`sort-indicator-${column.id}`}
          >
            <ArrowUp className="kmsf-sort-icon" focusable="false" size={14} strokeWidth={2.25} />
          </span>
          <span className="kmsf-data-table__header-slot" data-kmsf-header-slot="right">
            {headerRightSlots}
          </span>
        </span>
        <span
          aria-hidden="true"
          className="kmsf-data-table__resize"
          data-resizing={resizingColumnId === column.id ? "true" : undefined}
          data-testid={`resize-${column.id}`}
          onClick={(event) => event.stopPropagation()}
          onPointerDown={(event) => {
            event.preventDefault();
            event.stopPropagation();
            const startX = event.clientX;
            const measuredWidth = event.currentTarget.closest<HTMLTableCellElement>("th")?.getBoundingClientRect().width;
            const visibleWidthSnapshot = new Map<string, number>();

            for (const visibleColumn of visibleColumns) {
              const headerCell = Array.from(
                headerRef.current?.querySelectorAll<HTMLTableCellElement>("[data-kmsf-column-id]") ?? [],
              ).find((element) => element.dataset.kmsfColumnId === visibleColumn.id);
              const measuredColumnWidth = headerCell?.getBoundingClientRect().width;
              const fallbackWidth = stateRef.current.columnState[visibleColumn.id]?.width ?? visibleColumn.width ?? 160;

              visibleWidthSnapshot.set(
                visibleColumn.id,
                measuredColumnWidth && Number.isFinite(measuredColumnWidth) ? measuredColumnWidth : fallbackWidth,
              );
            }

            const startWidth =
              visibleWidthSnapshot.get(column.id) ??
              (measuredWidth && Number.isFinite(measuredWidth) ? measuredWidth : (columnState?.width ?? column.width ?? 160));
            setResizingColumnId(column.id);
            const handlePointerMove = (moveEvent: PointerEvent) => {
              commitState(
                (current) => {
                  let next = current;

                  for (const [visibleColumnId, visibleColumnWidth] of visibleWidthSnapshot) {
                    next = setKmsfColumnWidth(next, visibleColumnId, visibleColumnWidth);
                  }

                  return setColumnWidthInsideParentGroup(
                    next,
                    column.id,
                    Math.max(getEffectiveColumnMinWidth(column), startWidth + moveEvent.clientX - startX),
                  );
                },
                { columnLayoutChanged: true },
              );
            };
            const handlePointerUp = () => {
              setResizingColumnId(null);
              window.removeEventListener("pointermove", handlePointerMove);
              window.removeEventListener("pointerup", handlePointerUp);
            };
            window.addEventListener("pointermove", handlePointerMove);
            window.addEventListener("pointerup", handlePointerUp);
          }}
        >
          <span className="kmsf-data-table__resize-line" />
        </span>
      </th>
    );
  };

  const renderColumnSizing = () => (
    <colgroup>
      {visibleColumns.map((column, index) => (
        <col key={column.id} style={{ width: columnWidths[index] }} />
      ))}
    </colgroup>
  );
  const commitPendingScrollTop = () => {
    setScrollTop((current) => {
      const next = pendingScrollTopRef.current;

      return Math.abs(current - next) > 0.5 ? next : current;
    });
  };
  const handleBodyScroll = (event: React.UIEvent<HTMLDivElement>) => {
    const bodyViewport = event.currentTarget;

    pendingScrollTopRef.current = bodyViewport.scrollTop;

    if (scrollCommitTimeoutRef.current !== null) {
      window.clearTimeout(scrollCommitTimeoutRef.current);
      scrollCommitTimeoutRef.current = null;
    }

    if (scrollFrameRef.current === null) {
      scrollFrameRef.current = window.requestAnimationFrame(() => {
        scrollFrameRef.current = null;
        commitPendingScrollTop();
      });
    }

    if (headerRef.current) {
      const headerMaxScrollLeft = Math.max(0, headerRef.current.scrollWidth - headerRef.current.clientWidth);
      const bodyMaxScrollLeft = Math.max(0, bodyViewport.scrollWidth - bodyViewport.clientWidth);
      const sharedMaxScrollLeft = Math.min(headerMaxScrollLeft, bodyMaxScrollLeft);
      const nextScrollLeft = Math.min(sharedMaxScrollLeft, Math.max(0, bodyViewport.scrollLeft));

      if (Math.abs(bodyViewport.scrollLeft - nextScrollLeft) > 0.5) {
        bodyViewport.scrollLeft = nextScrollLeft;
      }

      headerRef.current.scrollLeft = nextScrollLeft;
    }
  };

  return (
    <div
      className={["kmsf-data-table kmsf-typography-base h-full w-full overflow-hidden", densityClass, state.theme.className, className]
        .filter(Boolean)
        .join(" ")}
      data-show-header={state.showHeader ? "true" : undefined}
      style={{ ...state.theme.style, ...style }}
    >
      {state.showHeader ? (
        <div className="kmsf-data-table__header" ref={headerRef}>
          <table
            className="kmsf-data-table__table kmsf-data-table__header-table min-w-full table-fixed"
            style={{ width: tableWidth }}
          >
            {renderColumnSizing()}
            <thead className="kmsf-data-table__thead">
              {headerRows.map((headerRow, rowIndex) => (
                <tr key={`header-row-${rowIndex}`}>
                  {headerRow.map((cell, cellIndex) => renderHeaderCell(cell, cellIndex))}
                </tr>
              ))}
            </thead>
          </table>
        </div>
      ) : null}
      <div
        className="kmsf-data-table__body-viewport"
        data-horizontal-overflow={hasHorizontalOverflow ? "true" : undefined}
        data-virtualized={virtualized ? "true" : undefined}
        data-testid={dataTestId}
        onScroll={handleBodyScroll}
        ref={containerRef}
      >
        <table
          className={[
            "kmsf-data-table__table kmsf-data-table__body-table min-w-full table-fixed",
            virtualized ? "kmsf-data-table__body-table--virtualized" : undefined,
          ]
            .filter(Boolean)
            .join(" ")}
          style={
            virtualized
              ? {
                  transform: `translate3d(0, ${rowWindow.renderOffset}px, 0)`,
                  width: tableWidth,
                }
              : { width: tableWidth }
          }
        >
          {renderColumnSizing()}
        <tbody>
          {rowWindow.entries.map((entry, entryIndex) => {
            const rowRuntimeProps = resolveRowProps(rowProps, entry.row, entry.visibleIndex);
            const isRowSelected = state.selection.rowIds.includes(entry.rowId);
            const isViewportEndRow = emptyFillerHeight === 0 && entryIndex === rowWindow.entries.length - 1;
            const rowRenderKey = virtualized ? `virtual-row-slot-${entryIndex}` : String(entry.rowId);

            return (
              <Fragment key={rowRenderKey}>
                {rowMoveState?.targetDataIndex === entry.dataIndex && rowMoveState.sourceRowId !== entry.rowId ? (
                  <tr aria-hidden="true" className="kmsf-row-move-placeholder">
                    <td colSpan={Math.max(1, visibleColumns.length)} data-testid="row-move-placeholder">
                      이 위치로 이동
                    </td>
                  </tr>
                ) : null}
              <tr
                aria-disabled={rowRuntimeProps.disabled ? "true" : undefined}
                aria-selected={isRowSelected}
                className={[
                  "kmsf-data-table__tr",
                  isViewportEndRow ? "kmsf-data-table__tr--viewport-end" : undefined,
                  isRowSelected ? "kmsf-row-selected" : undefined,
                  rowRuntimeProps.className,
                ]
                  .filter(Boolean)
                  .join(" ")}
	                data-disabled={rowRuntimeProps.disabled ? "true" : undefined}
	                data-kmsf-row-data-index={entry.dataIndex}
	                data-row-draggable={rowRuntimeProps.draggable ? "true" : "false"}
	                data-selected-row={isRowSelected ? "true" : undefined}
	                data-testid={`row-${String(entry.rowId)}`}
                draggable={false}
                key={rowRenderKey}
                onClick={(event) => {
                  if (rowRuntimeProps.disabled) {
                    event.preventDefault();
                    return;
                  }

                  if (!(event as React.MouseEvent<HTMLTableRowElement> & { __kmsfCellSelectionHandled?: boolean })
                    .__kmsfCellSelectionHandled) {
                    selectRowFromClick(event, entry);
                  }
                  onClickRow?.(createRowPayload(event, entry));
                }}
                onContextMenu={(event) => {
                  if (rowRuntimeProps.disabled) {
                    event.preventDefault();
                    return;
                  }

                  commitState((current) => selectRow(current, entry.rowId));
                  lastRowAnchorRef.current = entry.rowId;
                  onContextMenuRow?.(createRowPayload(event, entry));
                }}
                onDoubleClick={(event) => {
                  if (rowRuntimeProps.disabled) {
                    event.preventDefault();
                    return;
                  }

                  onDoubleClickRow?.(createRowPayload(event, entry));
                }}
                onKeyDown={(event) => handleRowKeyDown(event, entry, rowRuntimeProps.disabled)}
                style={{ height: rowHeight, ...rowRuntimeProps.style }}
                tabIndex={rowRuntimeProps.disabled ? -1 : 0}
              >
                {visibleColumns.map((column, columnIndex) => {
                  const rawValue = getKmsfCellValue(state, entry.row, column.id);
                  const address = { columnId: column.id, rowId: entry.rowId };
                  const cellDisabled =
                    rowRuntimeProps.disabled || isKmsfCellDisabled(state, entry.row, entry.rowId, column);
                  const cellClassName = toClassName(getKmsfCellClassName(state, entry.row, entry.rowId, column));
                  const cellStyle = getKmsfCellStyle(state, entry.row, entry.rowId, column);
                  const isCellInRange = cellSelection && isKmsfCellInSelectedRange(state, address);
                  const isCellSelected =
                    cellSelection &&
                    state.selection.cell?.rowId === entry.rowId &&
                    state.selection.cell.columnId === column.id;
	                  const cellPayload = createCellComponentPayload(
	                    entry,
	                    rowRuntimeProps.disabled,
                    isRowSelected,
                    state.selection.rowIds.length,
                    column,
                    columnIndex,
                    rawValue,
	                  );
	                  const hasCellComponents = Boolean(column.cell?.components?.length);
	                  const formattedCellValue = formatKmsfCellValue(state, entry.row, entry.rowId, column);
	                  const cellComponents = column.cell?.components?.map((component) => {
	                    if (component.type !== "input") {
	                      return component;
	                    }

	                    const onValueChange = component.onValueChange;

	                    return {
	                      ...component,
	                      onValueChange: (payload) => {
	                        commitState((current) =>
	                          updateKmsfRows(current, [
	                            {
	                              id: payload.row.id,
	                              patch: (currentRow) =>
	                                setKmsfNestedInputValue(currentRow, payload.column.field, payload.value),
	                            },
	                          ]),
	                        );
	                        onValueChange?.(payload);
	                      },
	                    } satisfies KmsfCellComponent<TData>;
	                  });
	                  const visibleCellComponents = getRenderableKmsfComponents(cellComponents, cellPayload);
	                  const cellContent = column.cell?.renderer ? (
	                    column.cell.renderer(cellPayload)
	                  ) : hasCellComponents ? (
                    renderKmsfContentWithComponents(formattedCellValue, cellComponents, cellPayload, {
                      showContent: false,
                    })
                  ) : (
                    <span className="kmsf-data-table__cell-value">{formattedCellValue}</span>
                  );
                  const tooltip =
                    typeof column.cell?.tooltip === "function" ? column.cell.tooltip(cellPayload) : column.cell?.tooltip;

                  return (
                    <td
                      aria-disabled={cellDisabled ? "true" : undefined}
                      className={[
                        "kmsf-data-table__td px-3 py-2",
                        columnIndex === 0 ? "kmsf-data-table__td--with-row-handle" : undefined,
                        isCellInRange ? "kmsf-cell-range-selected" : undefined,
                        cellClassName,
                      ]
                        .filter(Boolean)
                        .join(" ")}
	                      data-disabled={cellDisabled ? "true" : undefined}
	                      data-kmsf-cell-column-id={column.id}
	                      data-kmsf-component-cell={visibleCellComponents.length > 0 ? "true" : undefined}
                      data-kmsf-data-index={entry.dataIndex}
                      data-range-selected={isCellInRange ? "true" : undefined}
                      data-selected={isCellSelected ? "true" : undefined}
                      data-testid={`cell-${String(entry.rowId)}-${column.id}`}
                      draggable={false}
                      key={column.id}
                      onClick={(event) => {
                        if (onClickCell) {
                          event.stopPropagation();
                        }

                        if (cellDisabled) {
                          event.preventDefault();
                          event.stopPropagation();
                          return;
                        }

                        if (rangeDragMovedRef.current) {
                          rangeDragMovedRef.current = false;
                          (event as React.MouseEvent<HTMLTableCellElement> & { __kmsfCellSelectionHandled?: boolean })
                            .__kmsfCellSelectionHandled = true;
                          return;
                        }

                        const anchor = cellSelection ? (state.selection.cell ?? lastCellAnchorRef.current) : null;

                        if (event.shiftKey && anchor) {
                          (event as React.MouseEvent<HTMLTableCellElement> & { __kmsfCellSelectionHandled?: boolean })
                            .__kmsfCellSelectionHandled = true;
                          lastCellAnchorRef.current = anchor;
                          commitState((current) => {
                            const nextRows =
                              lastRowAnchorRef.current !== null
                                ? selectRows(
                                    current,
                                    getVisibleRowIdsBetween(current, lastRowAnchorRef.current, entry.rowId),
                                  )
                                : selectRow(current, entry.rowId);

                            return selectCellRange(nextRows, { anchor, focus: address });
                          });
                          lastRowAnchorRef.current = entry.rowId;
                          return;
                        }

                        if (cellSelection) {
                          lastCellAnchorRef.current = address;
                        }

                        commitState((current) => {
                          const nextRows = selectRow(current, entry.rowId, {
                            multi: event.ctrlKey || event.metaKey,
                            toggle: event.ctrlKey || event.metaKey,
                          });

                          return cellSelection ? selectCell(nextRows, address) : nextRows;
                        });
                        (event as React.MouseEvent<HTMLTableCellElement> & { __kmsfCellSelectionHandled?: boolean })
                          .__kmsfCellSelectionHandled = true;
                        lastRowAnchorRef.current = entry.rowId;
                        onClickCell?.(createCellPayload(event, entry, column, columnIndex, rawValue));
                      }}
                      onContextMenu={(event) => {
                        if (cellDisabled) {
                          event.preventDefault();
                          event.stopPropagation();
                          return;
                        }

                        commitState((current) => {
                          const nextRows = selectRow(current, entry.rowId);

                          return cellSelection ? selectCell(nextRows, address) : nextRows;
                        });
                        lastRowAnchorRef.current = entry.rowId;

                        if (cellSelection) {
                          lastCellAnchorRef.current = address;
                        }

                        if (onContextMenuCell) {
                          event.stopPropagation();
                          onContextMenuCell(createCellPayload(event, entry, column, columnIndex, rawValue));
                        }
                      }}
                      onDoubleClick={(event) => {
                        if (onDoubleClickCell) {
                          event.stopPropagation();
                        }

                        if (cellDisabled) {
                          event.preventDefault();
                          event.stopPropagation();
                          return;
                        }

                        onDoubleClickCell?.(createCellPayload(event, entry, column, columnIndex, rawValue));
                      }}
                      onKeyDown={(event) => handleCellKeyDown(event, entry, column, columnIndex, address, cellDisabled)}
                      onMouseDown={(event) => beginCellRangeDrag(event, address, cellDisabled)}
                      onMouseOver={() => updateCellRangeDrag(address)}
                      onMouseUp={endCellRangeDrag}
                      onPointerDown={(event) => beginCellRangePointerDrag(event, address, cellDisabled)}
                      onPointerEnter={() => updateCellRangeDrag(address)}
                      onPointerMove={(event) => {
                        if (event.buttons === 1) {
                          updateCellRangeDrag(address);
                        }
                      }}
                      onPointerUp={endCellRangeDrag}
                      style={{ height: rowHeight, ...cellStyle }}
                      title={typeof tooltip === "string" ? tooltip : undefined}
                      tabIndex={cellDisabled ? -1 : 0}
                    >
                      {columnIndex === 0 && rowRuntimeProps.draggable ? (
                        <span
                          aria-hidden="true"
                          className="kmsf-row-drag-handle"
                          data-testid={`row-drag-handle-${String(entry.rowId)}`}
                          draggable={false}
                          onClick={(event) => event.stopPropagation()}
                          onMouseDown={(event) => event.stopPropagation()}
                          onPointerDown={(event) =>
                            beginRowHandlePointerDrag(
                              event,
                              entry,
                              rowRuntimeProps.disabled,
                              rowRuntimeProps.draggable,
                            )
                          }
                        />
                      ) : null}
                      {cellContent}
                    </td>
                  );
                })}
              </tr>
              </Fragment>
            );
          })}
          {emptyFillerHeight > 0 ? (
            <tr aria-hidden="true" className="kmsf-table-empty-filler">
              <td
                colSpan={Math.max(1, visibleColumns.length)}
                data-testid="table-empty-filler"
                style={{ height: emptyFillerHeight }}
              />
            </tr>
          ) : null}
        </tbody>
      </table>
        {virtualized ? (
          <div
            aria-hidden="true"
            className="kmsf-data-table__body-virtual-sizer"
            style={{ height: rowWindow.scrollHeight, width: tableWidth }}
          />
        ) : null}
      </div>
      {movingHeaderLabel && columnMovePointer ? (
        <div
          aria-hidden="true"
          className="kmsf-column-move-ghost"
          data-testid="column-move-ghost"
          style={{ left: columnMovePointer.x + 12, top: columnMovePointer.y + 12 }}
        >
          {movingHeaderLabel}
        </div>
      ) : null}
    </div>
  );
}

export const KmsfDataTable = forwardRef(KmsfDataTableInner) as <TData>(
  props: KmsfDataTableProps<TData> & React.RefAttributes<KmsfDataTableRef<TData>>,
) => React.ReactElement | null;

export const kmsfDataTablePackage = "@kmsf/data-table";
