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
  getKmsfSortedRowIndexes,
  getKmsfVisibleColumns,
  isKmsfCellDisabled,
  isKmsfCellInSelectedRange,
  moveKmsfColumn,
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
  setKmsfSortState,
} from "./core";

export * from "./core";

import type {
  KmsfCellAddress,
  KmsfColumnLayout,
  KmsfCopiedCell,
  KmsfCopiedCellRange,
  KmsfCopiedRow,
  KmsfDataTableColumn,
  KmsfDataTableRuntimeColumn,
  KmsfDataTableState,
  KmsfDataTableTheme,
  KmsfEventColumn,
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
  columnId: string;
  movedBeforeLongPress: boolean;
  startX: number;
  startY: number;
  timer: number;
};
type KmsfRowMoveState = {
  sourceRowId: KmsfRowId;
  targetDataIndex: number;
};

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
  cellSelection?: boolean;
  className?: string;
  columns: Array<KmsfDataTableColumn<TData>>;
  data: TData[];
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
    cellSelection = true,
    className,
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
  const suppressedSortColumnIdRef = useRef<string | null>(null);
  const [containerHeight, setContainerHeight] = useState(0);
  const [containerWidth, setContainerWidth] = useState(0);
  const [movingColumnId, setMovingColumnId] = useState<string | null>(null);
  const [columnMovePointer, setColumnMovePointer] = useState<{ x: number; y: number } | null>(null);
  const [columnMoveTargetId, setColumnMoveTargetId] = useState<string | null>(null);
  const [resizingColumnId, setResizingColumnId] = useState<string | null>(null);
  const [rowMoveState, setRowMoveState] = useState<KmsfRowMoveState | null>(null);
  const [scrollTop, setScrollTop] = useState(0);
  const [state, setState] = useState(() =>
    createKmsfDataTableState({
      columns,
      getRowId,
      pagination,
      rows: data,
      showHeader,
      theme,
    }),
  );
  const stateRef = useRef(state);

  useEffect(() => {
    setState((current) => {
      const next = createKmsfDataTableState({
        columnLayout: serializeKmsfColumnLayout(current),
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
  }, [columns, data, getRowId, pagination, showHeader, theme]);

  useEffect(() => {
    stateRef.current = state;
  }, [state]);

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
  const sortedRowIndexes = useMemo(() => getKmsfSortedRowIndexes(state), [state]);
  const allVisibleEntries = useMemo(
    () =>
      sortedRowIndexes.flatMap<VisibleRowEntry<TData>>((dataIndex, visibleIndex) => {
        const row = state.rows[dataIndex];
        const rowId = state.rowIds[dataIndex];

        return row === undefined || rowId === undefined ? [] : [{ dataIndex, row, rowId, visibleIndex }];
      }),
    [sortedRowIndexes, state.rowIds, state.rows],
  );
  const pageStartIndex = Math.max(0, state.pagination.pageIndex) * Math.max(1, state.pagination.pageSize);
  const rowWindow = useMemo(() => {
    if (virtualized) {
      const safeRowHeight = Math.max(1, rowHeight);
      const viewportHeight = containerHeight || rowHeight * 12;
      const startIndex = Math.max(0, Math.floor(Math.max(0, scrollTop) / safeRowHeight) - 2);
      const endIndex = Math.min(
        allVisibleEntries.length,
        Math.ceil((Math.max(0, scrollTop) + Math.max(0, viewportHeight)) / safeRowHeight) + 2,
      );
      const totalHeight = allVisibleEntries.length * safeRowHeight;
      const topSpacerHeight = startIndex * safeRowHeight;

      return {
        bottomSpacerHeight: Math.max(0, totalHeight - topSpacerHeight - (endIndex - startIndex) * safeRowHeight),
        entries: allVisibleEntries.slice(startIndex, endIndex),
        topSpacerHeight,
      };
    }

    return {
      bottomSpacerHeight: 0,
      entries: allVisibleEntries.slice(pageStartIndex, pageStartIndex + Math.max(1, state.pagination.pageSize)),
      topSpacerHeight: 0,
    };
  }, [allVisibleEntries, containerHeight, pageStartIndex, rowHeight, scrollTop, state.pagination.pageSize, virtualized]);
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
      const minWidth = column.minWidth ?? 48;
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
  const renderedRowsHeight =
    rowWindow.topSpacerHeight + rowWindow.entries.length * rowHeight + rowWindow.bottomSpacerHeight;
  const emptyFillerHeight = Math.max(0, containerHeight - renderedRowsHeight);

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

    const interaction: KmsfColumnPointerInteraction = {
      active: false,
      cancelSort: false,
      columnId: column.id,
      movedBeforeLongPress: false,
      startX: event.clientX,
      startY: event.clientY,
      timer: window.setTimeout(() => {
        const current = columnPointerInteractionRef.current;

        if (!current || current.columnId !== column.id || current.movedBeforeLongPress) {
          return;
        }

        current.active = true;
        current.cancelSort = true;
        suppressedSortColumnIdRef.current = column.id;
        setColumnMovePointer({ x: current.startX, y: current.startY });
        setColumnMoveTargetId(column.id);
        setMovingColumnId(column.id);
      }, 1000),
    };

    const handlePointerMove = (moveEvent: PointerEvent) => {
      const current = columnPointerInteractionRef.current;

      if (!current || current.columnId !== column.id) {
        return;
      }

      const distance = Math.hypot(moveEvent.clientX - current.startX, moveEvent.clientY - current.startY);

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

        const targetHeader = document
          .elementFromPoint(moveEvent.clientX, moveEvent.clientY)
          ?.closest<HTMLElement>("[data-kmsf-column-id]");

        setColumnMoveTargetId(targetHeader?.dataset.kmsfColumnId ?? null);
      }
    };

    const handlePointerUp = (upEvent: PointerEvent) => {
      const current = columnPointerInteractionRef.current;

      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);

      if (!current || current.columnId !== column.id) {
        clearColumnPointerInteraction();
        return;
      }

      window.clearTimeout(current.timer);

      if (current.active) {
        const targetHeader = document
          .elementFromPoint(upEvent.clientX, upEvent.clientY)
          ?.closest<HTMLElement>("[data-kmsf-column-id]");
        const targetColumnId = targetHeader?.dataset.kmsfColumnId;

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
  const renderColumnSizing = () => (
    <colgroup>
      {visibleColumns.map((column, index) => (
        <col key={column.id} style={{ width: columnWidths[index] }} />
      ))}
    </colgroup>
  );
  const handleBodyScroll = (event: React.UIEvent<HTMLDivElement>) => {
    const bodyViewport = event.currentTarget;

    setScrollTop(bodyViewport.scrollTop);

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
            <tr>
              {visibleColumns.map((column, index) => {
                const columnState = state.columnState[column.id];
                const headerProps = column.header?.props ?? {};
                const sortIndicatorState = getSortIndicatorState(state.sort, column.id);
                const headerClassName = [
                  "kmsf-data-table__th px-3 py-2 text-left font-semibold",
                  movingColumnId === column.id ? "kmsf-column-moving" : undefined,
                  headerProps.className,
                ]
                  .filter(Boolean)
                  .join(" ");

                return (
                  <th
                    {...headerProps}
                    className={headerClassName}
                    data-column-drop-target={columnMoveTargetId === column.id ? "true" : undefined}
                    data-column-moving={movingColumnId === column.id ? "true" : undefined}
                    data-kmsf-column-index={index}
	                    data-kmsf-column-id={column.id}
	                    data-sortable={column.sort ? "true" : "false"}
	                    data-sort-direction={state.sort?.columnId === column.id ? state.sort.direction : undefined}
	                    data-testid={`header-${column.id}`}
	                    aria-sort={column.sort ? getAriaSortState(state.sort, column.id) : undefined}
	                    key={column.id}
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
	                    style={{ width: columnState?.width ?? column.width, ...headerProps.style }}
	                    tabIndex={column.sort ? 0 : undefined}
	                  >
                    <span aria-hidden="true" className="kmsf-column-drop-marker" />
                    <span className="kmsf-data-table__header-content" data-kmsf-header-body="true">
                      <span>{column.label}</span>
                      <span
                        aria-hidden="true"
                        className="kmsf-sort-indicator"
                        data-sort-state={sortIndicatorState}
                        data-testid={`sort-indicator-${column.id}`}
                      >
                        <ArrowUp className="kmsf-sort-icon" focusable="false" size={14} strokeWidth={2.25} />
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
                        const measuredWidth = event.currentTarget
                          .closest<HTMLTableCellElement>("th")
                          ?.getBoundingClientRect().width;
                        const startWidth =
                          measuredWidth && Number.isFinite(measuredWidth)
                            ? measuredWidth
                            : (columnState?.width ?? column.width ?? 160);
                        setResizingColumnId(column.id);
                        const handlePointerMove = (moveEvent: PointerEvent) => {
                          commitState(
                            (current) =>
                              setKmsfColumnWidth(
                                current,
                                column.id,
                                Math.max(column.minWidth ?? 48, startWidth + moveEvent.clientX - startX),
                              ),
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
              })}
            </tr>
          </thead>
          </table>
        </div>
      ) : null}
      <div
        className="kmsf-data-table__body-viewport"
        data-horizontal-overflow={hasHorizontalOverflow ? "true" : undefined}
        data-testid={dataTestId}
        onScroll={handleBodyScroll}
        ref={containerRef}
      >
        <table
          className="kmsf-data-table__table kmsf-data-table__body-table min-w-full table-fixed"
          style={{ width: tableWidth }}
        >
          {renderColumnSizing()}
        <tbody>
          {virtualized ? <tr aria-hidden="true" style={{ height: rowWindow.topSpacerHeight }} /> : null}
          {rowWindow.entries.map((entry, entryIndex) => {
            const rowRuntimeProps = resolveRowProps(rowProps, entry.row, entry.visibleIndex);
            const isRowSelected = state.selection.rowIds.includes(entry.rowId);
            const isViewportEndRow = emptyFillerHeight === 0 && entryIndex === rowWindow.entries.length - 1;

            return (
              <Fragment key={String(entry.rowId)}>
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
                key={String(entry.rowId)}
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
                  const formattedValue = formatKmsfCellValue(state, entry.row, entry.rowId, column);
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
                      style={cellStyle}
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
	                      {formattedValue}
	                    </td>
                  );
                })}
              </tr>
              </Fragment>
            );
          })}
          {virtualized ? <tr aria-hidden="true" style={{ height: rowWindow.bottomSpacerHeight }} /> : null}
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
      </div>
      {movingColumn && columnMovePointer ? (
        <div
          aria-hidden="true"
          className="kmsf-column-move-ghost"
          data-testid="column-move-ghost"
          style={{ left: columnMovePointer.x + 12, top: columnMovePointer.y + 12 }}
        >
          {movingColumn.label}
        </div>
      ) : null}
    </div>
  );
}

export const KmsfDataTable = forwardRef(KmsfDataTableInner) as <TData>(
  props: KmsfDataTableProps<TData> & React.RefAttributes<KmsfDataTableRef<TData>>,
) => React.ReactElement | null;

export const kmsfDataTablePackage = "@kmsf/data-table";
