import type React from "react";
import { Fragment, forwardRef, useEffect, useImperativeHandle, useMemo, useRef, useState } from "react";
import { ArrowUp } from "lucide-react";

import {
  applyCominsColumnLayout,
  clearCominsSortState,
  copyCominsCell,
  copyCominsCellRange,
  copyCominsRow,
  createCominsTableState,
  getCominsCellValue,
  getCominsHeaderRows,
  getCominsSortedRowIndexes,
  getCominsVisibleColumns,
  isCominsCellInSelectedRange,
  moveCominsColumn,
  moveCominsColumnGroup,
  moveCominsRow,
  pasteCominsCell,
  pasteCominsCellRange,
  pasteCominsRow,
  selectCell,
  selectCellRange,
  selectRow,
  selectRows,
  serializeCominsColumnLayout,
  setCominsColumnWidth,
  setCominsColumnGroupWidth,
  setCominsSortState,
  updateCominsRows,
} from "./core";
import { renderCominsBuiltInComponent } from "./component-renderer";
import { getCominsSummaryValues } from "./summary";
import {
  flattenCominsTree,
  getCominsTreeLeafItems,
  sortCominsTreeSiblings,
  toggleCominsTreeNode,
  updateCominsTreeItem,
} from "./tree";

export * from "./core";
export * from "./summary";
export * from "./tree";

import type { CominsTableSummaryConfig } from "./summary";
import type { CominsTreeNode, CominsVisibleTreeRow } from "./tree";

import type {
  CominsCellAddress,
  CominsCellComponent,
  CominsCellComponentPayload,
  CominsClipboardGuard,
  CominsColumnLayout,
  CominsColumnProps,
  CominsCopiedCell,
  CominsCopiedCellRange,
  CominsCopiedRow,
  CominsTableColumn,
  CominsTableColumnGroup,
  CominsTableRuntimeColumn,
  CominsTableRuntimeColumnGroup,
  CominsHeaderCell,
  CominsTableState,
  CominsTableTheme,
  CominsEventColumn,
  CominsHeaderComponent,
  CominsHeaderComponentPayload,
  CominsPaginationState,
  CominsRowId,
  CominsSelectionState,
  CominsSortState,
} from "./core";

type CominsClassValue = string | Record<string, boolean> | undefined;
type CominsRowPropValue<TData, TValue> = TValue | ((row: TData, index: number) => TValue);
type CominsColumnPointerInteraction = {
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
type CominsRowMoveState = {
  sourceRowId: CominsRowId;
  targetDataIndex: number;
};

const COMINS_MIN_COLUMN_WIDTH = 50;

export type CominsTableRowProps<TData> = {
  className?: CominsRowPropValue<TData, CominsClassValue>;
  disabled?: CominsRowPropValue<TData, boolean | undefined>;
  draggable?: CominsRowPropValue<TData, boolean | undefined>;
  style?: CominsRowPropValue<TData, React.CSSProperties | undefined>;
};

export type CominsEventRow<TData> = {
  data: TData;
  dataIndex: number;
  id: CominsRowId;
  index: number;
};

export type CominsRowEventPayload<TData, TEvent = React.MouseEvent<HTMLTableRowElement>> = {
  event: TEvent;
  index: number;
  row: CominsEventRow<TData>;
};

export type CominsCellEventPayload<TData, TValue = unknown, TEvent = React.MouseEvent<HTMLTableCellElement>> = {
  column: CominsEventColumn<TData, TValue>;
  event: TEvent;
  index: number;
  row: CominsEventRow<TData>;
  value: TValue;
};

export type CominsRowKeyboardEventPayload<TData> = CominsRowEventPayload<
  TData,
  React.KeyboardEvent<HTMLTableRowElement>
>;

export type CominsCellKeyboardEventPayload<TData, TValue = unknown> = CominsCellEventPayload<
  TData,
  TValue,
  React.KeyboardEvent<HTMLTableCellElement>
>;

export type CominsTableRef<TData = unknown> = {
  clearSort: () => void;
  getColumnLayout: () => CominsColumnLayout;
  getSortState: () => CominsSortState | null;
  setColumnLayout: (layout: CominsColumnLayout) => void;
  setMoveTargetRow: (targetIdx: number, sourceIdx: number) => void;
  setSelectedRow: (index: number) => void;
  setSelectedRows: (indexes: number[]) => void;
  setSortState: (sort: CominsSortState | null) => void;
};

export type CominsLazyLoadReason = "initial" | "scroll" | "refresh";

export type CominsLazyLoadRequest = {
  limit: number;
  offset: number;
  reason: CominsLazyLoadReason;
  signal: AbortSignal;
};

export type CominsLazyLoadResult<TData> = {
  rows: readonly TData[];
  total?: number;
};

export type CominsTableProps<TData> = {
  "buffer-size"?: number;
  cellSelection?: boolean;
  className?: string;
  columnGroups?: Array<CominsTableColumnGroup>;
  columns: Array<CominsTableColumn<TData>>;
  data: readonly TData[];
  "data-testid"?: string;
  emptyComponent?: React.ReactNode;
  getRowId?: (row: TData, index: number) => CominsRowId;
  hasMoreRows?: boolean;
  infiniteScroll?: boolean;
  infiniteScrollThreshold?: number;
  lazyLoad?: boolean;
  lazyLoadBatchSize?: number;
  lazyLoadMode?: "append";
  lazyLoadThreshold?: number;
  loading?: boolean;
  loadingComponent?: React.ReactNode;
  loadingMore?: boolean;
  onChangeColumnLayout?: (layout: CominsColumnLayout) => void;
  onChangeData?: (data: TData[]) => void;
  onChangeSelection?: (selection: CominsSelectionState) => void;
  onChangeSort?: (sort: CominsSortState | null) => void;
  onClickCell?: (payload: CominsCellEventPayload<TData>) => void;
  onClickRow?: (payload: CominsRowEventPayload<TData>) => void;
  onContextMenuCell?: (payload: CominsCellEventPayload<TData>) => void;
  onContextMenuRow?: (payload: CominsRowEventPayload<TData>) => void;
  onDoubleClickCell?: (payload: CominsCellEventPayload<TData>) => void;
  onDoubleClickRow?: (payload: CominsRowEventPayload<TData>) => void;
  onKeyDownCell?: (payload: CominsCellKeyboardEventPayload<TData>) => void;
  onKeyDownRow?: (payload: CominsRowKeyboardEventPayload<TData>) => void;
  onLazyLoad?: (request: CominsLazyLoadRequest) => Promise<CominsLazyLoadResult<TData>>;
  onLoadMore?: () => void;
  pagination?: Partial<CominsPaginationState>;
  persistHeaderWhenEmpty?: boolean;
  rowHeight?: number;
  rowProps?: CominsTableRowProps<TData>;
  showHeader?: boolean;
  skeletonRowCount?: number;
  style?: React.CSSProperties;
  summary?: CominsTableSummaryConfig<TData>;
  theme?: CominsTableTheme;
  tree?: false;
  virtualized?: boolean;
};

export type CominsTreeTableProps<TData> = Omit<
  CominsTableProps<TData>,
  | "data"
  | "getRowId"
  | "hasMoreRows"
  | "infiniteScroll"
  | "infiniteScrollThreshold"
  | "lazyLoad"
  | "lazyLoadBatchSize"
  | "lazyLoadMode"
  | "lazyLoadThreshold"
  | "loadingMore"
  | "onChangeData"
  | "onLazyLoad"
  | "onLoadMore"
  | "pagination"
  | "rowProps"
  | "tree"
> & {
  data: readonly CominsTreeNode<TData>[];
  getRowId: (item: TData, index: number) => CominsRowId;
  hasMoreRows?: never;
  infiniteScroll?: never;
  infiniteScrollThreshold?: never;
  lazyLoad?: never;
  lazyLoadBatchSize?: never;
  lazyLoadMode?: never;
  lazyLoadThreshold?: never;
  loadingMore?: never;
  onChangeData?: (data: CominsTreeNode<TData>[]) => void;
  onLazyLoad?: never;
  onLoadMore?: never;
  pagination?: never;
  rowProps?: Omit<CominsTableRowProps<TData>, "draggable"> & { draggable?: never };
  tree: true;
};

type VisibleRowEntry<TData> = {
  dataIndex: number;
  row: TData;
  rowId: CominsRowId;
  visibleIndex: number;
};

type CominsTreeRenderContext<TData> = {
  entriesByRowId: Map<CominsRowId, CominsVisibleTreeRow<TData>>;
  onToggle: (rowId: CominsRowId) => void;
  summaryRows: readonly TData[];
};

type CominsTableInnerProps<TData> = CominsTableProps<TData> & {
  treeContext?: CominsTreeRenderContext<TData>;
};

function createVisibleRowEntries<TData>(
  sortedRowIndexes: number[] | null,
  rows: TData[],
  rowIds: CominsRowId[],
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

function toClassName(value: CominsClassValue) {
  if (!value || typeof value === "string") {
    return value;
  }

  return Object.entries(value)
    .filter(([, enabled]) => enabled)
    .map(([className]) => className)
    .join(" ");
}

function resolveRowProp<TData, TValue>(
  value: CominsRowPropValue<TData, TValue> | undefined,
  row: TData,
  index: number,
) {
  return typeof value === "function" ? (value as (row: TData, index: number) => TValue)(row, index) : value;
}

function resolveRowProps<TData>(
  rowProps: CominsTableRowProps<TData> | undefined,
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

function getRowCustomBackground(style: React.CSSProperties | undefined) {
  const background = style?.background ?? style?.backgroundColor;

  return typeof background === "string" || typeof background === "number" ? background : undefined;
}

function getResolvedRowStyle(
  rowHeight: number,
  style: React.CSSProperties | undefined,
  customBackground: string | number | undefined,
) {
  const resolvedStyle = { height: rowHeight, ...style };

  if (customBackground === undefined) {
    return resolvedStyle;
  }

  return {
    ...resolvedStyle,
    "--comins-table-row-custom-background": customBackground,
  } as React.CSSProperties;
}

function createEventRow<TData>(entry: VisibleRowEntry<TData>): CominsEventRow<TData> {
  return {
    data: entry.row,
    dataIndex: entry.dataIndex,
    id: entry.rowId,
    index: entry.visibleIndex,
  };
}

function createEventColumn<TData>(
  column: CominsTableRuntimeColumn<TData>,
  index: number,
): CominsEventColumn<TData> {
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
): CominsRowEventPayload<TData, TEvent> {
  return {
    event,
    index: entry.visibleIndex,
    row: createEventRow(entry),
  };
}

function createCellPayload<TData, TEvent>(
  event: TEvent,
  entry: VisibleRowEntry<TData>,
  column: CominsTableRuntimeColumn<TData>,
  columnIndex: number,
  value: unknown,
): CominsCellEventPayload<TData, unknown, TEvent> {
  return {
    column: createEventColumn(column, columnIndex),
    event,
    index: entry.visibleIndex,
    row: createEventRow(entry),
    value,
  };
}

function createComponentColumnPayload<TData>(
  column: CominsTableRuntimeColumn<TData>,
  columnIndex: number,
): CominsCellComponentPayload<TData>["column"] {
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
  column: CominsTableRuntimeColumn<TData>,
  columnIndex: number,
  value: unknown,
): CominsCellComponentPayload<TData> {
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

function resolveRenderableCellProps<TData>(
  column: CominsTableRuntimeColumn<TData>,
  payload: CominsCellComponentPayload<TData>,
): CominsColumnProps<TData> | undefined {
  const props = column.cell?.props;

  return typeof props === "function" ? props(payload) : props;
}

function resolveRenderableCellGuard<TData>(
  guard: CominsClipboardGuard<TData> | undefined,
  payload: CominsCellComponentPayload<TData>,
) {
  if (guard === undefined) {
    return true;
  }

  return typeof guard === "boolean" ? guard : guard(payload);
}

function isRenderableCellDisabled<TData>(
  props: CominsColumnProps<TData> | undefined,
  payload: CominsCellComponentPayload<TData>,
) {
  return props?.disabled !== undefined && resolveRenderableCellGuard(props.disabled, payload) === true;
}

function getRenderableCellClassName<TData>(
  props: CominsColumnProps<TData> | undefined,
  payload: CominsCellComponentPayload<TData>,
) {
  const className = props?.className;

  return typeof className === "function" ? className(payload) : className;
}

function getRenderableCellStyle<TData>(
  props: CominsColumnProps<TData> | undefined,
  payload: CominsCellComponentPayload<TData>,
) {
  const style = props?.style;

  return typeof style === "function" ? style(payload) : style;
}

function formatRenderableCellValue<TData>(
  column: CominsTableRuntimeColumn<TData>,
  rawValue: unknown,
  payload: CominsCellComponentPayload<TData>,
) {
  if (column.cell?.format) {
    return column.cell.format(payload);
  }

  return rawValue == null ? "" : String(rawValue);
}

function createHeaderComponentPayload<TData>(
  state: CominsTableState<TData>,
  column: CominsTableRuntimeColumn<TData>,
  columnIndex: number,
): CominsHeaderComponentPayload<TData> {
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

type CominsRenderableComponent<TData> = CominsCellComponent<TData> | CominsHeaderComponent<TData>;
type CominsRenderablePayload<TData> = CominsCellComponentPayload<TData> | CominsHeaderComponentPayload<TData>;

function isCominsCellComponentPayload<TData>(
  payload: CominsRenderablePayload<TData>,
): payload is CominsCellComponentPayload<TData> {
  return "row" in payload && "selection" in payload;
}

function shouldRenderCominsComponent<TData>(
  component: CominsRenderableComponent<TData>,
  payload: CominsRenderablePayload<TData>,
) {
  if (!isCominsCellComponentPayload(payload) || (component.type !== "input" && component.type !== "select")) {
    return true;
  }

  return payload.selection.selectedRowCount === 1 && payload.row.selected;
}

function getRenderableCominsComponents<TData>(
  components: ReadonlyArray<CominsRenderableComponent<TData>> | undefined,
  payload: CominsRenderablePayload<TData>,
) {
  return (components ?? []).filter((component) => shouldRenderCominsComponent(component, payload));
}

function renderCominsComponentSlots<TData>(
  components: ReadonlyArray<CominsRenderableComponent<TData>> | undefined,
  payload: CominsRenderablePayload<TData>,
  direction: "left" | "right",
) {
  return getRenderableCominsComponents(components, payload)
    .map((component, index) => ({ component, index }))
    .filter(({ component }) => (component.direction ?? "left") === direction)
    .map(({ component, index }) => (
      <span
        className="comins-table__component-slot"
        data-comins-component-align={component.align ?? "center"}
        data-comins-component-direction={direction}
        data-comins-component-id={component.id ?? `${component.type}-${index}`}
        key={component.id ?? `${component.type}-${index}`}
      >
        {renderCominsBuiltInComponent(component as never, payload as never)}
      </span>
    ));
}

function renderCominsContentWithComponents<TData>(
  content: React.ReactNode,
  components: ReadonlyArray<CominsRenderableComponent<TData>> | undefined,
  payload: CominsRenderablePayload<TData>,
  options: { showContent?: boolean } = {},
) {
  if (!components?.length) {
    return content;
  }

  const showContent = options.showContent ?? true;
  const renderableComponents = getRenderableCominsComponents(components, payload);

  if (!renderableComponents.length) {
    return content;
  }

  const leftSlots = renderCominsComponentSlots(renderableComponents, payload, "left");
  const rightSlots = renderCominsComponentSlots(renderableComponents, payload, "right");

  if (!showContent) {
    return (
      <span className="comins-table__component-layout" data-comins-component-only="true">
        <span className="comins-table__component-group" data-comins-component-direction="all">
          {leftSlots}
          {rightSlots}
        </span>
      </span>
    );
  }

  return (
    <span className="comins-table__component-layout">
      <span className="comins-table__component-group" data-comins-component-direction="left">
        {leftSlots}
      </span>
      <span className="comins-table__component-content">{content}</span>
      <span className="comins-table__component-group" data-comins-component-direction="right">
        {rightSlots}
      </span>
    </span>
  );
}

function getEffectiveColumnMinWidth<TData>(column: CominsTableRuntimeColumn<TData>) {
  return Math.max(COMINS_MIN_COLUMN_WIDTH, column.minWidth ?? COMINS_MIN_COLUMN_WIDTH);
}

function getEffectiveColumnMaxWidth<TData>(column: CominsTableRuntimeColumn<TData>) {
  return column.maxWidth ?? Number.POSITIVE_INFINITY;
}

function getRuntimeColumnWidth<TData>(
  state: CominsTableState<TData>,
  column: CominsTableRuntimeColumn<TData>,
) {
  return state.columnState[column.id]?.width ?? column.width ?? 100;
}

function clampColumnWidth(width: number, minWidth: number, maxWidth: number) {
  return Math.min(maxWidth, Math.max(minWidth, width));
}

function distributeRuntimeColumnWidths<TData>(
  state: CominsTableState<TData>,
  columns: Array<CominsTableRuntimeColumn<TData>>,
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
  state: CominsTableState<TData>,
  columnId: string,
  width: number,
) {
  const group = state.columnGroups.find((candidate) => candidate.children.includes(columnId));

  if (!group || state.columnGroupState[group.id]?.hidden === true) {
    return setCominsColumnWidth(state, columnId, width);
  }

  const childColumns = group.children
    .map((childId) => state.columns.find((column) => column.id === childId))
    .filter((column): column is CominsTableRuntimeColumn<TData> => Boolean(column))
    .filter((column) => state.columnState[column.id]?.hidden !== true);
  const targetColumn = childColumns.find((column) => column.id === columnId);

  if (!targetColumn) {
    return setCominsColumnWidth(state, columnId, width);
  }

  const siblingColumns = childColumns.filter((column) => column.id !== columnId);

  if (siblingColumns.length === 0) {
    const currentGroupWidth = getRuntimeColumnWidth(state, targetColumn);

    return setCominsColumnWidth(
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
  let next = setCominsColumnWidth(state, columnId, nextTargetWidth);

  siblingColumns.forEach((column, index) => {
    next = setCominsColumnWidth(next, column.id, nextSiblingWidths[index] ?? getRuntimeColumnWidth(next, column));
  });

  return next;
}

function setCominsNestedInputValue<TData>(row: TData, field: string, value: string): TData {
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

function getNextSort(current: CominsSortState | null, columnId: string): CominsSortState | null {
  if (current?.columnId !== columnId) {
    return { columnId, direction: "asc" };
  }

  if (current.direction === "asc") {
    return { columnId, direction: "desc" };
  }

  return null;
}

function getSortIndicatorState(current: CominsSortState | null, columnId: string) {
  if (current?.columnId !== columnId) {
    return "none";
  }

  return current.direction;
}

function getAriaSortState(current: CominsSortState | null, columnId: string) {
  if (current?.columnId !== columnId) {
    return "none";
  }

  return current.direction === "asc" ? "ascending" : "descending";
}

function areRowIdSequencesEqual(left: readonly CominsRowId[], right: readonly CominsRowId[]) {
  return left.length === right.length && left.every((id, index) => id === right[index]);
}

function canPreserveSelection<TData>(
  current: CominsTableState<TData>,
  next: CominsTableState<TData>,
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

function getTreeNestedFieldValue(row: unknown, field: string): unknown {
  return field.split(".").reduce<unknown>((value, key) => {
    if (value == null || typeof value !== "object") {
      return undefined;
    }

    return (value as Record<string, unknown>)[key];
  }, row);
}

function compareTreeValues(left: unknown, right: unknown) {
  if (typeof left === "number" && typeof right === "number") {
    return left - right;
  }

  return String(left ?? "").localeCompare(String(right ?? ""));
}

function getSortedCominsTree<TData>(
  data: readonly CominsTreeNode<TData>[],
  columns: readonly CominsTableColumn<TData>[],
  sort: CominsSortState | null,
) {
  if (!sort) {
    return data;
  }

  const column = columns.find((candidate) => (candidate.id ?? candidate.field) === sort.columnId);

  if (!column?.sort) {
    return data;
  }

  return sortCominsTreeSiblings(data, (leftRow, rightRow) => {
    const leftValue = getTreeNestedFieldValue(leftRow, column.field);
    const rightValue = getTreeNestedFieldValue(rightRow, column.field);
    const result =
      typeof column.sort === "function"
        ? column.sort(leftValue, rightValue, leftRow, rightRow)
        : compareTreeValues(leftValue, rightValue);

    return sort.direction === "desc" ? result * -1 : result;
  });
}

function CominsTableInner<TData>(
  {
    "buffer-size": bufferSize,
    cellSelection = true,
    className,
    columnGroups,
    columns,
    data,
    "data-testid": dataTestId,
    emptyComponent,
    getRowId,
    hasMoreRows = false,
    infiniteScroll = false,
    infiniteScrollThreshold = 160,
    lazyLoad = false,
    lazyLoadBatchSize = 30,
    lazyLoadMode = "append",
    lazyLoadThreshold,
    loading = false,
    loadingComponent,
    loadingMore = false,
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
    onLazyLoad,
    onLoadMore,
    pagination,
    persistHeaderWhenEmpty = true,
    rowHeight = 36,
    rowProps,
    showHeader = true,
    skeletonRowCount,
    style,
    summary,
    theme,
    treeContext,
    virtualized = false,
  }: CominsTableInnerProps<TData>,
  ref: React.ForwardedRef<CominsTableRef<TData>>,
) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const footerRef = useRef<HTMLDivElement | null>(null);
  const headerRef = useRef<HTMLDivElement | null>(null);
  const copiedCellRef = useRef<CominsCopiedCell | null>(null);
  const copiedRangeRef = useRef<CominsCopiedCellRange | null>(null);
  const copiedRowRef = useRef<CominsCopiedRow<TData> | null>(null);
  const columnPointerInteractionRef = useRef<CominsColumnPointerInteraction | null>(null);
  const lastCellAnchorRef = useRef<CominsCellAddress | null>(null);
  const lazyAbortControllerRef = useRef<AbortController | null>(null);
  const lazyLoadingReasonRef = useRef<CominsLazyLoadReason | null>(null);
  const lazyRequestIdRef = useRef(0);
  const lazyRowsRef = useRef<readonly TData[]>(data);
  const lazyTotalRowsRef = useRef<number | undefined>(undefined);
  const lastLoadMoreRowCountRef = useRef<number | null>(null);
  const lastRowAnchorRef = useRef<CominsRowId | null>(null);
  const rangeDragAnchorRef = useRef<CominsCellAddress | null>(null);
  const rangeDragLastAddressRef = useRef<CominsCellAddress | null>(null);
  const rangeDragMovedRef = useRef(false);
  const rowMoveStateRef = useRef<CominsRowMoveState | null>(null);
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
  const [lazyLoadingReason, setLazyLoadingReason] = useState<CominsLazyLoadReason | null>(null);
  const [lazyRows, setLazyRows] = useState<readonly TData[]>(data);
  const [lazyTotalRows, setLazyTotalRows] = useState<number | undefined>(undefined);
  const [resizingColumnId, setResizingColumnId] = useState<string | null>(null);
  const [rowMoveState, setRowMoveState] = useState<CominsRowMoveState | null>(null);
  const [scrollTop, setScrollTop] = useState(0);
  const effectiveData = lazyLoad ? lazyRows : data;
  const [state, setState] = useState(() =>
    createCominsTableState({
      columnGroups,
      columns,
      getRowId,
      pagination,
      rows: effectiveData,
      showHeader,
      theme,
    }),
  );
  const stateRef = useRef(state);
  const stateInputRef = useRef({ columnGroups, columns, data: effectiveData, getRowId, pagination, showHeader });
  const virtualBufferSize = Math.max(0, Math.floor(Number.isFinite(bufferSize) ? Number(bufferSize) : 10));
  const resolvedLazyLoadBatchSize = Math.max(1, Math.floor(lazyLoadBatchSize));
  const resolvedLazyLoadThreshold = Math.max(0, Math.floor(lazyLoadThreshold ?? infiniteScrollThreshold));

  const requestLazyLoad = (reason: CominsLazyLoadReason) => {
    if (!lazyLoad || lazyLoadMode !== "append" || !onLazyLoad || lazyLoadingReasonRef.current) {
      return;
    }

    const currentRowsLength = stateRef.current.rows.length;

    if (reason === "scroll" && lazyTotalRowsRef.current !== undefined && currentRowsLength >= lazyTotalRowsRef.current) {
      return;
    }

    const controller = new AbortController();
    const requestId = lazyRequestIdRef.current + 1;
    const offset = reason === "scroll" ? currentRowsLength : 0;

    lazyRequestIdRef.current = requestId;
    lazyAbortControllerRef.current?.abort();
    lazyAbortControllerRef.current = controller;
    lazyLoadingReasonRef.current = reason;
    if (reason !== "scroll") {
      pendingScrollTopRef.current = 0;
      setScrollTop(0);
      if (containerRef.current) {
        containerRef.current.scrollTop = 0;
      }
    }
    setLazyLoadingReason(reason);

    void onLazyLoad({
      limit: resolvedLazyLoadBatchSize,
      offset,
      reason,
      signal: controller.signal,
    })
      .then((result) => {
        if (controller.signal.aborted || lazyRequestIdRef.current !== requestId) {
          return;
        }

        const nextRows = reason === "scroll" ? [...lazyRowsRef.current, ...result.rows] : [...result.rows];

        lazyRowsRef.current = nextRows;
        lazyTotalRowsRef.current = result.total;
        setLazyRows(nextRows);
        setLazyTotalRows(result.total);
      })
      .catch(() => {
        // Error and retry UI are intentionally left to the consumer in this API pass.
      })
      .finally(() => {
        if (lazyRequestIdRef.current !== requestId) {
          return;
        }

        lazyLoadingReasonRef.current = null;
        lazyAbortControllerRef.current = null;
        setLazyLoadingReason(null);
      });
  };

  useEffect(() => {
    lazyRowsRef.current = lazyRows;
  }, [lazyRows]);

  useEffect(() => {
    lazyTotalRowsRef.current = lazyTotalRows;
  }, [lazyTotalRows]);

  useEffect(() => {
    if (lazyLoad) {
      return;
    }

    lazyRowsRef.current = data;
    setLazyRows(data);
    lazyTotalRowsRef.current = undefined;
    setLazyTotalRows(undefined);
  }, [data, lazyLoad]);

  useEffect(() => {
    if (!lazyLoad || !onLazyLoad) {
      return undefined;
    }

    requestLazyLoad("initial");

    return () => {
      lazyRequestIdRef.current += 1;
      lazyLoadingReasonRef.current = null;
      lazyAbortControllerRef.current?.abort();
      lazyAbortControllerRef.current = null;
    };
  }, [lazyLoad, onLazyLoad, resolvedLazyLoadBatchSize]);

  useEffect(() => {
    const previousInput = stateInputRef.current;

    if (
      previousInput.columns === columns &&
      previousInput.columnGroups === columnGroups &&
      previousInput.data === effectiveData &&
      previousInput.getRowId === getRowId &&
      previousInput.pagination === pagination &&
      previousInput.showHeader === showHeader
    ) {
      return;
    }

    stateInputRef.current = { columnGroups, columns, data: effectiveData, getRowId, pagination, showHeader };
    setState((current) => {
      const next = createCominsTableState({
        columnLayout: serializeCominsColumnLayout(current),
        columnGroups,
        columns,
        getRowId,
        pagination: pagination ?? current.pagination,
        rows: effectiveData,
        showHeader,
        sort: current.sort,
        theme: current.theme,
      });

      return canPreserveSelection(current, next) ? { ...next, selection: current.selection } : next;
    });
  }, [columnGroups, columns, effectiveData, getRowId, pagination, showHeader]);

  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  useEffect(() => {
    if (lastLoadMoreRowCountRef.current !== null && lastLoadMoreRowCountRef.current !== state.rows.length) {
      lastLoadMoreRowCountRef.current = null;
    }
  }, [state.rows.length]);

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
    current: CominsTableState<TData>,
    next: CominsTableState<TData>,
    options: { columnLayoutChanged?: boolean; sortChanged?: boolean } = {},
  ) => {
    if (next.rows !== current.rows) {
      onChangeData?.(next.rows);
    }

    if (next.selection !== current.selection) {
      onChangeSelection?.(next.selection);
    }

    if (options.columnLayoutChanged) {
      onChangeColumnLayout?.(serializeCominsColumnLayout(next));
    }

    if (options.sortChanged || next.sort !== current.sort) {
      onChangeSort?.(next.sort);
    }
  };

  const commitState = (
    updater: CominsTableState<TData> | ((current: CominsTableState<TData>) => CominsTableState<TData>),
    options: { columnLayoutChanged?: boolean; sortChanged?: boolean } = {},
  ) => {
    const current = stateRef.current;
    const next = typeof updater === "function" ? updater(current) : updater;

    stateRef.current = next;
    setState(next);
    notifyChanges(current, next, options);
  };

  const visibleColumns = useMemo(() => getCominsVisibleColumns(state), [state]);
  const headerRows = useMemo(() => getCominsHeaderRows(state), [state]);
  const summaryValues = useMemo(
    () => (summary ? getCominsSummaryValues(treeContext?.summaryRows ?? state.rows, visibleColumns, summary) : null),
    [state.rows, summary, treeContext?.summaryRows, visibleColumns],
  );
  const sortedRowIndexes = useMemo(
    () => (treeContext || !state.sort ? null : getCominsSortedRowIndexes(state)),
    [state, treeContext],
  );
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
  const currentTheme = theme ?? state.theme;
  const densityClass =
    currentTheme.density === "compact"
      ? "text-[11px]"
      : currentTheme.density === "spacious"
        ? "text-[13px]"
        : "text-[length:var(--comins-font-size-base,12px)]";
  const selectedRowIdSet = useMemo(() => new Set(state.selection.rowIds), [state.selection.rowIds]);
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
  const lazyHasMoreRows = lazyLoad && (lazyTotalRows === undefined || visibleRowCount < lazyTotalRows);
  const resolvedHasMoreRows = lazyLoad ? lazyHasMoreRows : hasMoreRows;
  const resolvedLoading = loading || lazyLoadingReason === "initial" || lazyLoadingReason === "refresh";
  const resolvedLoadingMore = loadingMore || lazyLoadingReason === "scroll";
  const isEmpty = visibleRowCount === 0;
  const shouldRenderSkeleton = resolvedLoading && isEmpty;
  const shouldRenderEmpty = !resolvedLoading && isEmpty;
  const shouldRenderInfiniteLoadingRow =
    (infiniteScroll || lazyLoad) && resolvedLoadingMore && resolvedHasMoreRows && !isEmpty;
  const resolvedSkeletonRowCount = Math.max(
    1,
    Math.floor(skeletonRowCount ?? Math.min(Math.max(1, state.pagination.pageSize), 5)),
  );
  const stateRowCount =
    (shouldRenderSkeleton ? resolvedSkeletonRowCount : shouldRenderEmpty ? 1 : 0) +
    (shouldRenderInfiniteLoadingRow ? 1 : 0);
  const renderedRowsHeight = (rowWindow.entries.length + stateRowCount) * rowHeight;
  const emptyFillerHeight = virtualized ? 0 : Math.max(0, containerHeight - renderedRowsHeight);
  const renderedHeaderVisible = state.showHeader && (persistHeaderWhenEmpty || !isEmpty || resolvedLoading);

  const isCopyPasteKey = (event: React.KeyboardEvent, key: "c" | "v") =>
    (event.ctrlKey || event.metaKey) && event.key.toLowerCase() === key;
  const getVisibleEntryByRenderedIndex = (index: number) => rowWindow.entries[index];
  const getVisibleRowIdsBetween = (
    current: CominsTableState<TData>,
    anchorRowId: CominsRowId,
    focusRowId: CominsRowId,
  ) => {
    const visibleRowIndexes = treeContext ? current.rows.map((_row, index) => index) : getCominsSortedRowIndexes(current);
    const visibleEntries = visibleRowIndexes.flatMap<VisibleRowEntry<TData>>((dataIndex, visibleIndex) => {
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
  const selectRowRangeByIds = (anchorRowId: CominsRowId, focusRowId: CominsRowId) => {
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
  const activateHeaderSort = (column: CominsTableRuntimeColumn<TData>) => {
    if (suppressedSortColumnIdRef.current === column.id) {
      suppressedSortColumnIdRef.current = null;
      return;
    }

    if (!column.sort) {
      return;
    }

    commitState((current) => setCominsSortState(current, getNextSort(current.sort, column.id)), {
      sortChanged: true,
    });
  };

  const getColumnMoveTargetId = (clientX: number, clientY: number) => {
    const targetHeader = document
      .elementFromPoint(clientX, clientY)
      ?.closest<HTMLElement>("[data-comins-column-id], [data-comins-column-group-id]");

    if (!targetHeader) {
      return null;
    }

    if (targetHeader.dataset.cominsColumnId) {
      return targetHeader.dataset.cominsColumnId;
    }

    const groupId = targetHeader.dataset.cominsColumnGroupId;
    const targetGroup = groupId ? stateRef.current.columnGroups.find((group) => group.id === groupId) : undefined;

    return targetGroup?.children.find((childId) => visibleColumns.some((column) => column.id === childId)) ?? null;
  };

  useImperativeHandle(
    ref,
    () => ({
      clearSort: () => commitState((current) => clearCominsSortState(current), { sortChanged: true }),
      getColumnLayout: () => serializeCominsColumnLayout(state),
      getSortState: () => state.sort,
      setColumnLayout: (layout) =>
        commitState((current) => applyCominsColumnLayout(current, layout), { columnLayoutChanged: true }),
      setMoveTargetRow: (targetIdx, sourceIdx) =>
        commitState(
          (current) => {
            if (treeContext) {
              return current;
            }

            const visibleRowIds = getCominsSortedRowIndexes(current).flatMap((dataIndex) => {
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
      setSortState: (sort) => commitState((current) => setCominsSortState(current, sort), { sortChanged: true }),
    }),
    [rowWindow.entries, state, treeContext],
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
    column: CominsTableRuntimeColumn<TData>,
  ) => {
    if (event.button !== 0) {
      return;
    }

    const activateColumnMove = (current: CominsColumnPointerInteraction, x: number, y: number) => {
      current.active = true;
      current.cancelSort = true;
      suppressedSortColumnIdRef.current = column.id;
      setColumnMovePointer({ x, y });
      setColumnMoveTargetId(column.id);
      setMovingGroupId(null);
      setMovingColumnId(column.id);
    };
    const interaction: CominsColumnPointerInteraction = {
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
            commitState((stateCurrent) => moveCominsColumn(stateCurrent, column.id, targetIndex), {
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
    group: CominsTableRuntimeColumnGroup,
  ) => {
    if (event.button !== 0) {
      return;
    }

    const activateGroupMove = (current: CominsColumnPointerInteraction, x: number, y: number) => {
      current.active = true;
      current.cancelSort = true;
      setColumnMovePointer({ x, y });
      setColumnMoveTargetId(group.children[0] ?? null);
      setMovingColumnId(null);
      setMovingGroupId(group.id);
    };
    const interaction: CominsColumnPointerInteraction = {
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
            commitState((stateCurrent) => moveCominsColumnGroup(stateCurrent, group.id, targetIndex), {
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

    if (treeContext && (isCopyPasteKey(event, "c") || isCopyPasteKey(event, "v"))) {
      event.preventDefault();
      return;
    }

    if (isCopyPasteKey(event, "c")) {
      event.preventDefault();
      copiedRowRef.current = copyCominsRow(state, entry.rowId);
      return;
    }

    if (isCopyPasteKey(event, "v") && copiedRowRef.current) {
      event.preventDefault();
      commitState((current) => pasteCominsRow(current, copiedRowRef.current!, { mode: "insert-after", targetRowId: entry.rowId }));
    }
  };
  const handleCellKeyDown = (
    event: React.KeyboardEvent<HTMLTableCellElement>,
    entry: VisibleRowEntry<TData>,
    column: CominsTableRuntimeColumn<TData>,
    columnIndex: number,
    address: CominsCellAddress,
    disabled: boolean,
  ) => {
    if (disabled) {
      event.preventDefault();
      event.stopPropagation();
      return;
    }

    onKeyDownCell?.(createCellPayload(event, entry, column, columnIndex, getCominsCellValue(state, entry.row, column.id)));

    if (event.defaultPrevented) {
      return;
    }

    if (isCopyPasteKey(event, "c")) {
      event.preventDefault();
      event.stopPropagation();
      copiedRangeRef.current = state.selection.range ? copyCominsCellRange(state) : null;
      copiedCellRef.current = copiedRangeRef.current ? null : copyCominsCell(state, address);
      return;
    }

    if (isCopyPasteKey(event, "v") && (copiedRangeRef.current || copiedCellRef.current)) {
      event.preventDefault();
      event.stopPropagation();
      commitState((current) =>
        copiedRangeRef.current
          ? pasteCominsCellRange(current, address, copiedRangeRef.current)
          : pasteCominsCell(current, address, copiedCellRef.current),
      );
    }
  };
  const beginCellRangeDrag = (
    event: { button: number; shiftKey: boolean },
    address: CominsCellAddress,
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
  const getCellAddressFromPoint = (clientX: number, clientY: number): CominsCellAddress | null => {
    const element = document
      .elementFromPoint(clientX, clientY)
      ?.closest<HTMLElement>("[data-comins-cell-column-id][data-comins-data-index]");
    const columnId = element?.dataset.cominsCellColumnId;
    const dataIndex = element?.dataset.cominsDataIndex === undefined ? NaN : Number(element.dataset.cominsDataIndex);
    const rowId = Number.isInteger(dataIndex) ? state.rowIds[dataIndex] : undefined;

    return columnId && rowId !== undefined ? { columnId, rowId } : null;
  };
  const updateCellRangeDrag = (address: CominsCellAddress) => {
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
    address: CominsCellAddress,
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
    const setActiveRowMoveState = (next: CominsRowMoveState | null) => {
      rowMoveStateRef.current = next;
      setRowMoveState(next);
    };
    const updateTarget = (clientX: number, clientY: number) => {
      const targetRow = document
        .elementFromPoint(clientX, clientY)
        ?.closest<HTMLElement>("[data-comins-row-data-index]");

      if (!targetRow || targetRow.dataset.cominsRowDataIndex === undefined) {
        return;
      }

      const targetDataIndex = Number(targetRow.dataset.cominsRowDataIndex);

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
        commitState((current) => moveCominsRow(current, sourceRowId, targetIndex));
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

  const renderHeaderCell = (cell: CominsHeaderCell<TData>, fallbackIndex: number) => {
    if (cell.kind === "group") {
      return (
        <th
          className={[
            "comins-table__th comins-table__group-th px-3 py-2 text-left font-semibold",
            movingGroupId === cell.groupId ? "comins-column-moving" : undefined,
          ]
            .filter(Boolean)
            .join(" ")}
          colSpan={cell.colSpan}
          data-column-moving={movingGroupId === cell.groupId ? "true" : undefined}
          data-comins-column-group-id={cell.groupId}
          data-testid={`header-group-${cell.groupId}`}
          key={`group-${cell.groupId}`}
          onPointerDown={(event) => beginGroupPointerInteraction(event, cell.group)}
          rowSpan={cell.rowSpan}
          scope="colgroup"
        >
          <span aria-hidden="true" className="comins-column-drop-marker" />
          <span className="comins-table__header-content" data-comins-header-body="true">
            <span className="comins-table__header-label">{cell.group.label}</span>
          </span>
          <span
            aria-hidden="true"
            className="comins-table__resize"
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
                  headerRef.current?.querySelectorAll<HTMLTableCellElement>("[data-comins-column-id]") ?? [],
                ).find((element) => element.dataset.cominsColumnId === visibleColumn.id);
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
                      next = setCominsColumnWidth(next, visibleColumnId, visibleColumnWidth);
                    }

                    return setCominsColumnGroupWidth(next, cell.groupId, startWidth + moveEvent.clientX - startX);
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
            <span className="comins-table__resize-line" />
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
      "comins-table__th px-3 py-2 text-left font-semibold",
      movingColumnId === column.id ? "comins-column-moving" : undefined,
      headerProps.className,
    ]
      .filter(Boolean)
      .join(" ");
    const headerPayload = createHeaderComponentPayload(state, column, safeIndex);
    const headerRendererBody = column.header?.renderer ? column.header.renderer(headerPayload) : null;
    const headerLeftSlots = !column.header?.renderer
      ? renderCominsComponentSlots(column.header?.components, headerPayload, "left")
      : [];
    const headerRightSlots = !column.header?.renderer
      ? renderCominsComponentSlots(column.header?.components, headerPayload, "right")
      : [];
    const hasHeaderComponents = headerLeftSlots.length > 0 || headerRightSlots.length > 0;

    return (
      <th
        {...headerProps}
        className={headerClassName}
        colSpan={cell.colSpan}
        data-column-drop-target={columnMoveTargetId === column.id ? "true" : undefined}
        data-column-moving={movingColumnId === column.id ? "true" : undefined}
        data-comins-column-id={column.id}
        data-comins-column-index={safeIndex}
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
        <span aria-hidden="true" className="comins-column-drop-marker" />
        <span
          className="comins-table__header-content"
          data-comins-header-body="true"
          data-comins-header-components={hasHeaderComponents ? "true" : undefined}
          data-comins-sort-indicator-visible={sortIndicatorVisible ? "true" : undefined}
        >
          <span className="comins-table__header-slot" data-comins-header-slot="left">
            {headerLeftSlots}
          </span>
          <span className="comins-table__header-label">
            {column.header?.renderer ? headerRendererBody : column.label}
          </span>
          <span
            aria-hidden="true"
            className="comins-sort-indicator"
            data-sort-state={sortIndicatorState}
            data-sort-visible={sortIndicatorVisible ? "true" : undefined}
            data-testid={`sort-indicator-${column.id}`}
          >
            <ArrowUp className="comins-sort-icon" focusable="false" size={14} strokeWidth={2.25} />
          </span>
          <span className="comins-table__header-slot" data-comins-header-slot="right">
            {headerRightSlots}
          </span>
        </span>
        <span
          aria-hidden="true"
          className="comins-table__resize"
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
                headerRef.current?.querySelectorAll<HTMLTableCellElement>("[data-comins-column-id]") ?? [],
              ).find((element) => element.dataset.cominsColumnId === visibleColumn.id);
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
                    next = setCominsColumnWidth(next, visibleColumnId, visibleColumnWidth);
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
          <span className="comins-table__resize-line" />
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
  const requestInfiniteLoadIfNeeded = (bodyViewport: HTMLDivElement) => {
    if (lazyLoad) {
      if (!onLazyLoad || lazyLoadingReasonRef.current) {
        return;
      }

      const remainingScroll = bodyViewport.scrollHeight - bodyViewport.scrollTop - bodyViewport.clientHeight;

      if (remainingScroll <= resolvedLazyLoadThreshold) {
        requestLazyLoad("scroll");
      }

      return;
    }

    if (!infiniteScroll || !hasMoreRows || loadingMore || !onLoadMore) {
      return;
    }

    const safeThreshold = Math.max(0, infiniteScrollThreshold);
    const remainingScroll = bodyViewport.scrollHeight - bodyViewport.scrollTop - bodyViewport.clientHeight;

    if (remainingScroll > safeThreshold) {
      return;
    }

    const currentRowCount = stateRef.current.rows.length;

    if (lastLoadMoreRowCountRef.current === currentRowCount) {
      return;
    }

    lastLoadMoreRowCountRef.current = currentRowCount;
    onLoadMore();
  };
  const handleBodyScroll = (event: React.UIEvent<HTMLDivElement>) => {
    const bodyViewport = event.currentTarget;

    pendingScrollTopRef.current = bodyViewport.scrollTop;
    requestInfiniteLoadIfNeeded(bodyViewport);

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

    let nextScrollLeft = Math.max(0, bodyViewport.scrollLeft);

    if (headerRef.current) {
      const headerMaxScrollLeft = Math.max(0, headerRef.current.scrollWidth - headerRef.current.clientWidth);
      const bodyMaxScrollLeft = Math.max(0, bodyViewport.scrollWidth - bodyViewport.clientWidth);
      const sharedMaxScrollLeft = Math.min(headerMaxScrollLeft, bodyMaxScrollLeft);
      nextScrollLeft = Math.min(sharedMaxScrollLeft, nextScrollLeft);

      if (Math.abs(bodyViewport.scrollLeft - nextScrollLeft) > 0.5) {
        bodyViewport.scrollLeft = nextScrollLeft;
      }

      headerRef.current.scrollLeft = nextScrollLeft;
    }

    if (footerRef.current) {
      footerRef.current.scrollLeft = nextScrollLeft;
    }
  };

  return (
    <div
      className={["comins-table comins-typography-base h-full w-full overflow-hidden", densityClass, currentTheme.className, className]
        .filter(Boolean)
        .join(" ")}
      aria-busy={resolvedLoading || resolvedLoadingMore ? "true" : undefined}
      data-loading={resolvedLoading || resolvedLoadingMore ? "true" : undefined}
      data-show-header={renderedHeaderVisible ? "true" : undefined}
      style={{ ...currentTheme.style, ...style }}
    >
      {renderedHeaderVisible ? (
        <div className="comins-table__header" ref={headerRef}>
          <table
            className="comins-table__table comins-table__header-table min-w-full table-fixed"
            style={{ width: tableWidth }}
          >
            {renderColumnSizing()}
            <thead className="comins-table__thead">
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
        className="comins-table__body-viewport"
        data-horizontal-overflow={hasHorizontalOverflow ? "true" : undefined}
        data-virtualized={virtualized ? "true" : undefined}
        data-testid={dataTestId}
        onScroll={handleBodyScroll}
        ref={containerRef}
      >
        <table
          className={[
            "comins-table__table comins-table__body-table min-w-full table-fixed",
            virtualized ? "comins-table__body-table--virtualized" : undefined,
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
          {shouldRenderSkeleton
            ? Array.from({ length: resolvedSkeletonRowCount }).map((_, skeletonIndex) => (
                <tr
                  aria-hidden="true"
                  className="comins-table__tr comins-table__skeleton-row"
                  data-comins-row-parity={skeletonIndex % 2 === 0 ? "even" : "odd"}
                  data-testid="loading-skeleton-row"
                  key={`loading-skeleton-${skeletonIndex}`}
                  style={{ height: rowHeight }}
                >
                  {visibleColumns.length > 0 ? (
                    visibleColumns.map((column) => (
                      <td
                        className="comins-table__td comins-table__skeleton-cell px-3 py-2"
                        data-testid={`loading-skeleton-cell-${skeletonIndex}-${column.id}`}
                        key={column.id}
                        style={{ height: rowHeight }}
                      >
                        <span className="comins-table__skeleton-block" />
                      </td>
                    ))
                  ) : (
                    <td className="comins-table__td comins-table__skeleton-cell px-3 py-2">
                      <span className="comins-table__skeleton-block" />
                    </td>
                  )}
                </tr>
              ))
            : null}
          {shouldRenderEmpty ? (
            <tr className="comins-table__tr comins-table__empty-state-row" style={{ height: rowHeight }}>
              <td className="comins-table__td comins-table__empty-state-cell" colSpan={Math.max(1, visibleColumns.length)}>
                <div data-testid="data-table-empty-state" className="comins-table__empty-state">
                  {emptyComponent ?? "표시할 데이터가 없습니다."}
                </div>
              </td>
            </tr>
          ) : null}
          {rowWindow.entries.map((entry, entryIndex) => {
            const rowRuntimeProps = resolveRowProps(rowProps, entry.row, entry.visibleIndex);
            const isRowSelected = selectedRowIdSet.has(entry.rowId);
            const isViewportEndRow = emptyFillerHeight === 0 && entryIndex === rowWindow.entries.length - 1;
            const rowCustomBackground = getRowCustomBackground(rowRuntimeProps.style);
            const rowRenderKey = virtualized ? `virtual-row-slot-${entryIndex}` : String(entry.rowId);

            return (
              <Fragment key={rowRenderKey}>
                {rowMoveState?.targetDataIndex === entry.dataIndex && rowMoveState.sourceRowId !== entry.rowId ? (
                  <tr aria-hidden="true" className="comins-row-move-placeholder">
                    <td colSpan={Math.max(1, visibleColumns.length)} data-testid="row-move-placeholder">
                      이 위치로 이동
                    </td>
                  </tr>
                ) : null}
              <tr
                aria-disabled={rowRuntimeProps.disabled ? "true" : undefined}
                aria-selected={isRowSelected}
                className={[
                  "comins-table__tr",
                  isViewportEndRow ? "comins-table__tr--viewport-end" : undefined,
                  isRowSelected ? "comins-row-selected" : undefined,
                  rowRuntimeProps.className,
                ]
                  .filter(Boolean)
                  .join(" ")}
                data-disabled={rowRuntimeProps.disabled ? "true" : undefined}
                data-comins-row-custom-background={rowCustomBackground === undefined ? undefined : "true"}
                data-comins-row-data-index={entry.dataIndex}
                data-comins-row-parity={entry.visibleIndex % 2 === 0 ? "even" : "odd"}
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

                  if (!(event as React.MouseEvent<HTMLTableRowElement> & { __cominsCellSelectionHandled?: boolean })
                    .__cominsCellSelectionHandled) {
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
                style={getResolvedRowStyle(rowHeight, rowRuntimeProps.style, rowCustomBackground)}
                tabIndex={rowRuntimeProps.disabled ? -1 : 0}
              >
                {visibleColumns.map((column, columnIndex) => {
                  const rawValue = getCominsCellValue(state, entry.row, column.id);
                  const address = { columnId: column.id, rowId: entry.rowId };
                  const isCellInRange = cellSelection && isCominsCellInSelectedRange(state, address);
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
                  const cellProps = resolveRenderableCellProps(column, cellPayload);
                  const cellDisabled = rowRuntimeProps.disabled || isRenderableCellDisabled(cellProps, cellPayload);
                  const cellClassName = toClassName(getRenderableCellClassName(cellProps, cellPayload));
                  const cellStyle = getRenderableCellStyle(cellProps, cellPayload);
                  const hasCellComponents = Boolean(column.cell?.components?.length);
                  const formattedCellValue = formatRenderableCellValue(column, rawValue, cellPayload);
                  const cellComponents = column.cell?.components?.map((component) => {
                    if (component.type !== "input") {
                      return component;
                    }

                    const onValueChange = component.onValueChange;

                    return {
                      ...component,
                      onValueChange: (payload) => {
                        commitState((current) =>
                          updateCominsRows(current, [
                            {
                              id: payload.row.id,
                              patch: (currentRow) =>
                                setCominsNestedInputValue(currentRow, payload.column.field, payload.value),
                            },
                          ]),
                        );
                        onValueChange?.(payload);
                      },
                    } satisfies CominsCellComponent<TData>;
                  });
                  const visibleCellComponents = getRenderableCominsComponents(cellComponents, cellPayload);
                  const cellContent = column.cell?.renderer ? (
                    column.cell.renderer(cellPayload)
                  ) : hasCellComponents ? (
                    renderCominsContentWithComponents(formattedCellValue, cellComponents, cellPayload, {
                      showContent: false,
                    })
                  ) : (
                    <span className="comins-table__cell-value">{formattedCellValue}</span>
                  );
                  const tooltip =
                    typeof column.cell?.tooltip === "function" ? column.cell.tooltip(cellPayload) : column.cell?.tooltip;
                  const treeEntry = columnIndex === 0 ? treeContext?.entriesByRowId.get(entry.rowId) : undefined;
                  const renderedCellContent = treeEntry ? (
                    <span
                      className="comins-tree-cell-content"
                      style={{ "--comins-tree-depth": treeEntry.depth } as React.CSSProperties}
                    >
                      {treeEntry.hasChildren ? (
                        <button
                          aria-expanded={treeEntry.expanded}
                          aria-label={`${treeEntry.expanded ? "Collapse" : "Expand"} ${String(entry.rowId)}`}
                          className="comins-tree-expander"
                          data-testid={`tree-expander-${String(entry.rowId)}`}
                          onClick={(event) => {
                            event.preventDefault();
                            event.stopPropagation();
                            treeContext?.onToggle(entry.rowId);
                          }}
                          onMouseDown={(event) => event.stopPropagation()}
                          onPointerDown={(event) => event.stopPropagation()}
                          type="button"
                        >
                          {treeEntry.expanded ? "▾" : "▸"}
                        </button>
                      ) : (
                        <span aria-hidden="true" className="comins-tree-expander-spacer" />
                      )}
                      <span className="comins-tree-cell-value">{cellContent}</span>
                    </span>
                  ) : (
                    cellContent
                  );

                  return (
                    <td
                      aria-disabled={cellDisabled ? "true" : undefined}
                      className={[
                        "comins-table__td px-3 py-2",
                        columnIndex === 0 ? "comins-table__td--with-row-handle" : undefined,
                        isCellInRange ? "comins-cell-range-selected" : undefined,
                        cellClassName,
                      ]
                        .filter(Boolean)
                        .join(" ")}
	                      data-disabled={cellDisabled ? "true" : undefined}
	                      data-comins-cell-column-id={column.id}
	                      data-comins-component-cell={visibleCellComponents.length > 0 ? "true" : undefined}
                      data-comins-data-index={entry.dataIndex}
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
                          (event as React.MouseEvent<HTMLTableCellElement> & { __cominsCellSelectionHandled?: boolean })
                            .__cominsCellSelectionHandled = true;
                          return;
                        }

                        const anchor = cellSelection ? (state.selection.cell ?? lastCellAnchorRef.current) : null;

                        if (event.shiftKey && anchor) {
                          (event as React.MouseEvent<HTMLTableCellElement> & { __cominsCellSelectionHandled?: boolean })
                            .__cominsCellSelectionHandled = true;
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
                        (event as React.MouseEvent<HTMLTableCellElement> & { __cominsCellSelectionHandled?: boolean })
                          .__cominsCellSelectionHandled = true;
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
                          className="comins-row-drag-handle"
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
                      {renderedCellContent}
                    </td>
                  );
                })}
              </tr>
              </Fragment>
            );
          })}
          {shouldRenderInfiniteLoadingRow ? (
            <tr className="comins-table__tr comins-table__infinite-loading-row" style={{ height: rowHeight }}>
              <td
                className="comins-table__td comins-table__infinite-loading-cell"
                colSpan={Math.max(1, visibleColumns.length)}
                data-testid="data-table-infinite-loading-row"
              >
                <span className="comins-table__loading-spinner" data-testid="data-table-infinite-loading-spinner" />
                <span>데이터를 불러오는 중입니다.</span>
              </td>
            </tr>
          ) : null}
          {emptyFillerHeight > 0 ? (
            <tr aria-hidden="true" className="comins-table-empty-filler">
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
            className="comins-table__body-virtual-sizer"
            style={{ height: rowWindow.scrollHeight, width: tableWidth }}
          />
        ) : null}
        {resolvedLoading && !isEmpty ? (
          <div
            className="comins-table__loading-overlay"
            data-testid="data-table-loading-overlay"
            role="status"
            style={scrollTop > 0 ? { transform: `translateY(${scrollTop}px)` } : undefined}
          >
            <span className="comins-table__loading-spinner" data-testid="data-table-loading-spinner" />
            <span>{loadingComponent ?? "불러오는 중입니다."}</span>
          </div>
        ) : null}
      </div>
      {summary ? (
        <div aria-label="Table summary" className="comins-table__summary" ref={footerRef}>
          <table className="comins-table__table comins-table__summary-table min-w-full table-fixed" style={{ width: tableWidth }}>
            {renderColumnSizing()}
            <tfoot>
              <tr className="comins-table__summary-row">
                {visibleColumns.map((column, index) => (
                  <td className="comins-table__summary-cell px-3 py-2" data-testid={`summary-cell-${column.id}`} key={column.id}>
                    {summaryValues?.[column.id] ?? (index === 0 ? summary.label : null)}
                  </td>
                ))}
              </tr>
            </tfoot>
          </table>
        </div>
      ) : null}
      {movingHeaderLabel && columnMovePointer ? (
        <div
          aria-hidden="true"
          className="comins-column-move-ghost"
          data-testid="column-move-ghost"
          style={{ left: columnMovePointer.x + 12, top: columnMovePointer.y + 12 }}
        >
          {movingHeaderLabel}
        </div>
      ) : null}
    </div>
  );
}

function CominsTreeTableInner<TData>(
  {
    data,
    getRowId,
    hasMoreRows: _hasMoreRows,
    infiniteScroll: _infiniteScroll,
    infiniteScrollThreshold: _infiniteScrollThreshold,
    lazyLoad: _lazyLoad,
    lazyLoadBatchSize: _lazyLoadBatchSize,
    lazyLoadMode: _lazyLoadMode,
    lazyLoadThreshold: _lazyLoadThreshold,
    loadingMore: _loadingMore,
    onChangeData,
    onChangeSort,
    onLazyLoad: _onLazyLoad,
    onLoadMore: _onLoadMore,
    rowProps,
    tree: _tree,
    ...props
  }: CominsTreeTableProps<TData>,
  ref: React.ForwardedRef<CominsTableRef<TData>>,
) {
  const [treeSort, setTreeSort] = useState<CominsSortState | null>(null);
  const sortedTree = useMemo(() => getSortedCominsTree(data, props.columns, treeSort), [data, props.columns, treeSort]);
  const visibleTreeRows = useMemo(() => flattenCominsTree(sortedTree, getRowId), [getRowId, sortedTree]);
  const entriesByRowId = useMemo(
    () => new Map(visibleTreeRows.map((entry) => [entry.rowId, entry] as const)),
    [visibleTreeRows],
  );
  const treeContext = useMemo<CominsTreeRenderContext<TData>>(
    () => ({
      entriesByRowId,
      onToggle: (rowId) => onChangeData?.(toggleCominsTreeNode(data, rowId, getRowId)),
      summaryRows: getCominsTreeLeafItems(data),
    }),
    [data, entriesByRowId, getRowId, onChangeData],
  );
  const handleFlatDataChange = (nextRows: TData[]) => {
    let nextTree: readonly CominsTreeNode<TData>[] = data;

    nextRows.forEach((nextItem, index) => {
      const entry = visibleTreeRows[index];

      if (entry && entry.item !== nextItem) {
        nextTree = updateCominsTreeItem(nextTree, entry.rowId, getRowId, () => nextItem);
      }
    });

    if (nextTree !== data) {
      onChangeData?.([...nextTree]);
    }
  };
  const flatProps: CominsTableProps<TData> = {
    ...props,
    data: visibleTreeRows.map((entry) => entry.item),
    getRowId,
    hasMoreRows: false,
    infiniteScroll: false,
    infiniteScrollThreshold: undefined,
    lazyLoad: false,
    lazyLoadBatchSize: undefined,
    lazyLoadMode: undefined,
    lazyLoadThreshold: undefined,
    loadingMore: false,
    onChangeData: handleFlatDataChange,
    onChangeSort: (nextSort) => {
      setTreeSort(nextSort);
      onChangeSort?.(nextSort);
    },
    onLazyLoad: undefined,
    onLoadMore: undefined,
    pagination: { pageIndex: 0, pageSize: Math.max(1, visibleTreeRows.length) },
    rowProps: { ...rowProps, draggable: false },
    tree: false,
  };

  return <ForwardedCominsTableInner {...flatProps} ref={ref} treeContext={treeContext} />;
}

const ForwardedCominsTableInner = forwardRef(CominsTableInner) as <TData>(
  props: CominsTableInnerProps<TData> & React.RefAttributes<CominsTableRef<TData>>,
) => React.ReactElement | null;

const ForwardedCominsTreeTableInner = forwardRef(CominsTreeTableInner) as <TData>(
  props: CominsTreeTableProps<TData> & React.RefAttributes<CominsTableRef<TData>>,
) => React.ReactElement | null;

function CominsTableAdapter<TData>(
  props: CominsTableProps<TData> | CominsTreeTableProps<TData>,
  ref: React.ForwardedRef<CominsTableRef<TData>>,
) {
  return props.tree ? <ForwardedCominsTreeTableInner {...props} ref={ref} /> : <ForwardedCominsTableInner {...props} ref={ref} />;
}

export const CominsTable = forwardRef(CominsTableAdapter) as <TData>(
  props: (CominsTableProps<TData> | CominsTreeTableProps<TData>) & React.RefAttributes<CominsTableRef<TData>>,
) => React.ReactElement | null;

export const cominsTablePackage = "comins-table";
