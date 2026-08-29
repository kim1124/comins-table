import type React from "react";
import {
  Fragment,
  forwardRef,
  isValidElement,
  useEffect,
  useId,
  useImperativeHandle,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";

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
  moveCominsRowToGroup,
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
  setCominsSortModel,
  setCominsSortState,
  updateCominsRows,
} from "./core";
import { getCominsColumnMouseIntent } from "./column-pointer";
import { CominsColumnFilterControl } from "./column-filter";
import {
  getCominsPinnedBlockResizeMaxWidth,
  getCominsColumnPinningSpanFragments,
  resolveCominsColumnPinning,
} from "./column-pinning";
import { renderCominsBuiltInComponent, type CominsBuiltInComponentInteraction } from "./component-renderer";
import {
  getCominsDragAutoScrollTop,
  getCominsDragAutoScrollVelocity,
} from "./drag-autoscroll";
import { CominsRowDetailRow, CominsRowDetailToggle } from "./row-detail";
import { CominsTableIcon, CominsTableIconButton } from "./table-icons";
import {
  createCominsGroupModel,
  getCominsAggregateValue,
  moveCominsRowGroup,
  normalizeCominsRowGrouping,
  orderCominsGroupModel,
  projectCominsGroups,
} from "./grouping";
import {
  getCominsFilteredRowIndexes,
  normalizeCominsColumnFilterModel,
} from "./filtering";
import {
  emitCominsTableTransfer,
  emitCominsTableTransferRejected,
  getCominsTableTransferRegistration,
  isCominsTableTransferCoordinator,
  registerCominsTableTransfer,
  transferCominsGroupBetweenTables,
  transferCominsRowBetweenTables,
} from "./table-transfer";
import { CominsPointerTooltip } from "./tooltip";
import { getCominsSummaryValues } from "./summary";
import {
  flattenCominsTree,
  getCominsTreeLeafItems,
  sortCominsTreeSiblings,
  toggleCominsTreeNode,
  updateCominsTreeItem,
} from "./tree";
import {
  CominsHeightIndex,
  captureCominsScrollAnchor,
  createCominsDataVirtualSlot,
  getCominsDataSlotKey,
  getCominsMixedVirtualRange,
  getCominsPhysicalScrollTop,
  getCominsScrollScale,
  getCominsSlotHeight,
  normalizeCominsDetailEstimate,
  normalizeCominsDetailHeight,
  reconcileCominsDetailMeasurements,
  resolveCominsAnchorTarget,
  resolveCominsMeasuredDetailHeight,
  type CominsDataVirtualSlot,
  type CominsDetailMeasurement,
  type CominsScrollAnchor,
  type CominsVirtualSlot,
} from "./virtual-layout";

export * from "./core";
export * from "./summary";
export * from "./tree";
export type {
  CominsColumnFilterConfig,
  CominsColumnFilterKind,
  CominsColumnFilterModel,
  CominsColumnFilterOperator,
  CominsColumnFilterRule,
  CominsColumnFilteringConfig,
} from "./filtering";
export { moveCominsRowGroup } from "./grouping";
export type {
  CominsRowGroupAggregation,
  CominsRowGroupDropPosition,
  CominsRowGroupMoveDetails,
  CominsRowGroupProps,
  CominsRowGroupRenderParams,
  CominsRowGroupingConfig,
  CominsRowGroupingSourceRow,
  CominsSetRowGroupIdParams,
} from "./grouping";
export {
  createCominsTableTransferCoordinator,
  transferCominsGroupBetweenTables,
  transferCominsRowBetweenTables,
} from "./table-transfer";
export type {
  CominsGroupBetweenTablesInput,
  CominsRowBetweenTablesInput,
  CominsTableGroupTransferDetails,
  CominsTableRowTransferDetails,
  CominsTableTransferConfig,
  CominsTableTransferConflict,
  CominsTableTransferConflictPolicy,
  CominsTableTransferConflictResolver,
  CominsTableTransferCoordinator,
  CominsTableTransferCoordinatorOptions,
  CominsTableTransferDetails,
  CominsTableTransferDropPosition,
  CominsTableTransferEndpoint,
  CominsTableTransferGroupEndpoint,
  CominsTableTransferIntent,
  CominsTableTransferResolvedConflict,
  CominsTableTransferRejection,
  CominsTableTransferRejectionFeedback,
  CominsTableTransferResult,
  CominsTableTransferRowEndpoint,
} from "./table-transfer";

import type { CominsTableSummaryConfig } from "./summary";
import type { CominsTreeNode, CominsVisibleTreeRow } from "./tree";
import type {
  CominsGroupingProjectionEntry,
  CominsRowGroupingConfig,
} from "./grouping";
import type {
  CominsColumnFilterKind,
  CominsColumnFilterRule,
  CominsColumnFilteringConfig,
} from "./filtering";
import type {
  CominsTableTransferConfig,
  CominsTableTransferConflict,
  CominsTableTransferEndpoint,
  CominsTableTransferIntent,
  CominsTableTransferRejection,
  CominsTableTransferRegistrationSnapshot,
} from "./table-transfer";

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
  CominsSortModel,
  CominsSortState,
} from "./core";

type CominsClassValue = string | Record<string, boolean> | undefined;
type CominsRowPropValue<TData, TValue> = TValue | ((row: TData, index: number) => TValue);
type CominsColumnPointerInteraction = {
  active: boolean;
  blocked: boolean;
  cancelSort: boolean;
  cleanup: () => void;
  id: string;
  kind: "column" | "group";
  pointerType: string;
  startX: number;
  startY: number;
  timer: number | null;
};
type CominsColumnDropStatus = "invalid" | "neutral" | "valid";
type CominsColumnMoveHeader = {
  depth: 0 | 1;
  id: string;
  kind: "column" | "group";
  parentGroupId?: string;
};
type CominsColumnMoveTarget = CominsColumnMoveHeader & {
  status: CominsColumnDropStatus;
};
type CominsColumnPointerOptions = {
  activateImmediately?: boolean;
  activate: (x: number, y: number) => void;
  commitTarget: (target: CominsColumnMoveHeader) => void;
  event: React.PointerEvent<HTMLElement>;
  id: string;
  kind: "column" | "group";
  resolveTarget: (target: CominsColumnMoveHeader) => CominsColumnDropStatus;
  sortColumnId?: string;
  source: CominsColumnMoveHeader;
};
type CominsSuppressedSortClick = {
  cleanup: () => void;
  columnId: string;
  timer: number | null;
};
type CominsRowMoveState = {
  sourceRowId: CominsRowId;
  targetDataIndex?: number;
  targetGroupId?: CominsRowId;
  targetTableId?: string;
  valid: boolean;
};
type CominsRowGroupMoveState = {
  position: "after" | "append" | "before";
  sourceGroupId: CominsRowId;
  targetGroupId?: CominsRowId;
  targetTableId?: string;
};
type CominsTransferTableHit<TData, TGroup> = {
  element: HTMLElement;
  root: HTMLElement;
  snapshot: CominsTableTransferRegistrationSnapshot<TData, TGroup>;
};
type CominsCrossTableRowTarget<TData, TGroup> = CominsTransferTableHit<TData, TGroup> & {
  marker: HTMLElement;
  targetGroupId?: CominsRowId;
  targetRowId?: CominsRowId;
  valid: boolean;
};
type CominsCrossTableGroupTarget<TData, TGroup> = CominsTransferTableHit<TData, TGroup> & {
  marker: HTMLElement;
  position: "after" | "append" | "before";
  targetGroupId?: CominsRowId;
  valid: boolean;
};
type CominsTransferRejectionFeedbackState = {
  content: React.ReactNode;
  x: number;
  y: number;
};

function isCominsGroupedTransferEndpoint<TData, TGroup>(
  endpoint: CominsTableTransferEndpoint<TData, TGroup>,
): endpoint is CominsTableTransferEndpoint<TData, TGroup> & {
  getGroupId: (group: TGroup) => CominsRowId;
  getRowGroupId: (row: TData, dataIndex: number) => CominsRowId;
  groups: readonly TGroup[];
} {
  return (
    Array.isArray(endpoint.groups) &&
    typeof endpoint.getGroupId === "function" &&
    typeof endpoint.getRowGroupId === "function"
  );
}

function getCominsTransferIdentity(id: CominsRowId) {
  return `${typeof id}:${String(id)}`;
}

const COMINS_MIN_COLUMN_WIDTH = 88;
function getCominsColumnDropStatus(
  source: CominsColumnMoveHeader,
  target: CominsColumnMoveHeader,
  orderChanged: boolean,
): CominsColumnDropStatus {
  if (source.id === target.id && source.kind === target.kind) {
    return "neutral";
  }

  if (source.depth !== target.depth || source.parentGroupId !== target.parentGroupId) {
    return "invalid";
  }

  return orderChanged ? "valid" : "invalid";
}

function selectRowForContextMenu<TData>(state: CominsTableState<TData>, rowId: CominsRowId) {
  return state.selection.rowIds.includes(rowId) ? state : selectRow(state, rowId);
}

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

export type CominsRowDetailParams<TData> = {
  row: CominsEventRow<TData>;
};

export type CominsRowDetailHeight = number | "auto";

export type CominsRowDetailProps<TData> = {
  estimatedRowDetailHeight?: number;
  expandedRowIds?: readonly CominsRowId[];
  getRowDetailHeight?: (params: CominsRowDetailParams<TData>) => CominsRowDetailHeight;
  isRowExpandable?: (params: CominsRowDetailParams<TData>) => boolean;
  onChangeExpandedRowIds?: (rowIds: CominsRowId[]) => void;
  renderRowDetail?: (params: CominsRowDetailParams<TData>) => React.ReactNode;
};

export type CominsTableRef<TData = unknown> = {
  clearSort: () => void;
  expand: (nodeIds?: readonly CominsRowId[]) => void;
  expandGroups: (groupIds?: readonly CominsRowId[]) => void;
  fold: (nodeIds?: readonly CominsRowId[]) => void;
  foldGroups: (groupIds?: readonly CominsRowId[]) => void;
  getColumnLayout: () => CominsColumnLayout;
  getSortModel: () => CominsSortModel;
  getSortState: () => CominsSortState | null;
  setColumnLayout: (layout: CominsColumnLayout) => void;
  setMoveTargetRow: (targetIdx: number, sourceIdx: number) => void;
  setSelectedRow: (index: number) => void;
  setSelectedRows: (indexes: number[]) => void;
  setSortModel: (sortModel: CominsSortModel) => void;
  setSortState: (sort: CominsSortState | null) => void;
};

export type CominsLazyLoadReason = "initial" | "scroll" | "refresh";

export type CominsLazyLoadRequest = {
  limit: number;
  offset: number;
  reason: CominsLazyLoadReason;
  signal: AbortSignal;
};

type CominsFlatTableBaseProps<TData> = {
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
  multiSort?: boolean;
  onChangeColumnLayout?: (layout: CominsColumnLayout) => void;
  onChangeData?: (data: TData[]) => void;
  onChangeSelection?: (selection: CominsSelectionState) => void;
  onChangeSort?: (sort: CominsSortState | null) => void;
  onChangeSortModel?: (sortModel: CominsSortModel) => void;
  onClickCell?: (payload: CominsCellEventPayload<TData>) => void;
  onClickRow?: (payload: CominsRowEventPayload<TData>) => void;
  onContextMenuCell?: (payload: CominsCellEventPayload<TData>) => void;
  onContextMenuRow?: (payload: CominsRowEventPayload<TData>) => void;
  onDoubleClickCell?: (payload: CominsCellEventPayload<TData>) => void;
  onDoubleClickRow?: (payload: CominsRowEventPayload<TData>) => void;
  onKeyDownCell?: (payload: CominsCellKeyboardEventPayload<TData>) => void;
  onKeyDownRow?: (payload: CominsRowKeyboardEventPayload<TData>) => void;
  onLazyLoad?: (request: CominsLazyLoadRequest) => Promise<void> | void;
  onLoadMore?: () => void;
  pagination?: Partial<CominsPaginationState>;
  persistHeaderWhenEmpty?: boolean;
  rowHeight?: number;
  rowProps?: CominsTableRowProps<TData>;
  showColumnMoveHandle?: boolean;
  showHeader?: boolean;
  skeletonRowCount?: number;
  style?: React.CSSProperties;
  summary?: CominsTableSummaryConfig<TData>;
  theme?: CominsTableTheme;
  tree?: false;
  virtualized?: boolean;
};

type CominsUngroupedTableWithoutTransferProps<TData> = CominsFlatTableBaseProps<TData> & {
  columnFiltering?: undefined;
  rowGrouping?: undefined;
  tableTransfer?: undefined;
};

type CominsTransferableUngroupedTableProps<TData> = Omit<
  CominsFlatTableBaseProps<TData>,
  | "hasMoreRows"
  | "infiniteScroll"
  | "infiniteScrollThreshold"
  | "lazyLoad"
  | "lazyLoadBatchSize"
  | "lazyLoadMode"
  | "lazyLoadThreshold"
  | "loadingMore"
  | "onLazyLoad"
  | "onLoadMore"
> & {
  columnFiltering?: undefined;
  hasMoreRows?: never;
  infiniteScroll?: never;
  infiniteScrollThreshold?: never;
  lazyLoad?: never;
  lazyLoadBatchSize?: never;
  lazyLoadMode?: never;
  lazyLoadThreshold?: never;
  loadingMore?: never;
  onLazyLoad?: never;
  onLoadMore?: never;
  rowGrouping?: undefined;
  tableTransfer: CominsTableTransferConfig<TData>;
};

type CominsUngroupedTableProps<TData> =
  | CominsTransferableUngroupedTableProps<TData>
  | CominsUngroupedTableWithoutTransferProps<TData>;

type CominsNonDraggableRowProps<TData> = Omit<CominsTableRowProps<TData>, "draggable"> & {
  draggable?: never;
};

type CominsFilteredTableProps<TData> = Omit<
  CominsFlatTableBaseProps<TData>,
  | "hasMoreRows"
  | "infiniteScroll"
  | "infiniteScrollThreshold"
  | "lazyLoad"
  | "lazyLoadBatchSize"
  | "lazyLoadMode"
  | "lazyLoadThreshold"
  | "loadingMore"
  | "onLazyLoad"
  | "onLoadMore"
  | "rowProps"
> & {
  columnFiltering: CominsColumnFilteringConfig;
  hasMoreRows?: never;
  infiniteScroll?: never;
  infiniteScrollThreshold?: never;
  lazyLoad?: never;
  lazyLoadBatchSize?: never;
  lazyLoadMode?: never;
  lazyLoadThreshold?: never;
  loadingMore?: never;
  onLazyLoad?: never;
  onLoadMore?: never;
  rowGrouping?: undefined;
  rowProps?: CominsNonDraggableRowProps<TData>;
  tableTransfer?: never;
};

type CominsGroupedTableBaseProps<TData, TGroup> = Omit<
  CominsFlatTableBaseProps<TData>,
  | "hasMoreRows"
  | "infiniteScroll"
  | "infiniteScrollThreshold"
  | "lazyLoad"
  | "lazyLoadBatchSize"
  | "lazyLoadMode"
  | "lazyLoadThreshold"
  | "loadingMore"
  | "onLazyLoad"
  | "onLoadMore"
  | "pagination"
> & {
  hasMoreRows?: never;
  infiniteScroll?: never;
  infiniteScrollThreshold?: never;
  lazyLoad?: never;
  lazyLoadBatchSize?: never;
  lazyLoadMode?: never;
  lazyLoadThreshold?: never;
  loadingMore?: never;
  onLazyLoad?: never;
  onLoadMore?: never;
  pagination?: never;
  rowGrouping: CominsRowGroupingConfig<TData, TGroup>;
  tableTransfer?: CominsTableTransferConfig<TData, TGroup>;
};

type CominsGroupedTableProps<TData, TGroup> = CominsGroupedTableBaseProps<TData, TGroup> & {
  columnFiltering?: undefined;
};

type CominsFilteredGroupedTableProps<TData, TGroup> = Omit<
  CominsGroupedTableBaseProps<TData, TGroup>,
  "rowProps"
> & {
  columnFiltering: CominsColumnFilteringConfig;
  rowProps?: CominsNonDraggableRowProps<TData>;
  tableTransfer?: never;
};

export type CominsTableProps<TData, TGroup = unknown> = (
  | CominsFilteredGroupedTableProps<TData, TGroup>
  | CominsFilteredTableProps<TData>
  | CominsGroupedTableProps<TData, TGroup>
  | CominsUngroupedTableProps<TData>
) & CominsRowDetailProps<TData>;

export type CominsTreeTableProps<TData> = Omit<
  CominsFlatTableBaseProps<TData>,
  | "data"
  | "columnFiltering"
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
  | "rowGrouping"
  | "tableTransfer"
  | "estimatedRowDetailHeight"
  | "expandedRowIds"
  | "getRowDetailHeight"
  | "isRowExpandable"
  | "onChangeExpandedRowIds"
  | "renderRowDetail"
  | "tree"
> & {
  data: readonly CominsTreeNode<TData>[];
  columnFiltering?: never;
  defaultExpandAll?: boolean;
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
  estimatedRowDetailHeight?: never;
  expandedRowIds?: never;
  getRowDetailHeight?: never;
  isRowExpandable?: never;
  onChangeExpandedRowIds?: never;
  renderRowDetail?: never;
  rowGrouping?: never;
  tableTransfer?: never;
  tree: true;
};

type VisibleRowEntry<TData> = {
  dataIndex: number;
  row: TData;
  rowId: CominsRowId;
  visibleIndex: number;
};

type CominsVirtualWindow<TData> = {
  mixed: boolean;
  renderOffset: number;
  scrollHeight: number;
  slots: Array<CominsVirtualSlot<TData>>;
};

type CominsMixedVirtualProjection<TData> = {
  heightIndex: CominsHeightIndex;
  keys: string[];
  slotIndexByRowId: Map<CominsRowId, number>;
  slots: Array<CominsVirtualSlot<TData>>;
};

type CominsCommittedDetailObserverSnapshot<TData> = Readonly<{
  contentWidth: number;
  projection: CominsMixedVirtualProjection<TData> | null;
  viewportHeight: number;
}>;

type CominsVirtualProjection = {
  keys: readonly string[];
  mixed: false;
  rowHeight: number;
  visibleRowCount: number;
} | {
  heightIndex: CominsHeightIndex;
  keys: readonly string[];
  mixed: true;
};

type CominsPendingVirtualAnchor = {
  anchor: CominsScrollAnchor;
  previousKeys: readonly string[];
  previousLogicalScrollTop: number;
  previousPhysicalScrollTop: number;
  previousViewportHeight: number;
};

type CominsPendingDetailAnchor = CominsPendingVirtualAnchor & {
  revision: number;
  status: "cancelled" | "pending";
};

type CominsLogicalAnchorTransaction = {
  actualPhysical: number;
  requestedPhysical: number;
  revision: number;
  targetLogical: number;
};

type CominsObservedDetail = {
  element: HTMLDivElement;
  rowId: CominsRowId;
};

type CominsTreeRenderContext<TData> = {
  entriesByRowId: Map<CominsRowId, CominsVisibleTreeRow<TData>>;
  onExpand: (nodeIds?: readonly CominsRowId[]) => void;
  onFold: (nodeIds?: readonly CominsRowId[]) => void;
  onToggle: (rowId: CominsRowId) => void;
  summaryRows: readonly TData[];
  treeColumnId: string | null;
};

type CominsTableInnerProps<TData, TGroup = unknown> = CominsFlatTableBaseProps<TData> & CominsRowDetailProps<TData> & {
  columnFiltering?: CominsColumnFilteringConfig;
  rowGrouping?: CominsRowGroupingConfig<TData, TGroup>;
  tableTransfer?:
    | CominsTableTransferConfig<TData, TGroup>
    | CominsTableTransferConfig<TData, never>;
  treeContext?: CominsTreeRenderContext<TData>;
};

function getCominsVirtualProjectionKeys(projection: CominsVirtualProjection) {
  if (projection.mixed) {
    return projection.keys;
  }

  return projection.keys;
}

function captureCominsVirtualAnchor(input: {
  logicalScrollTop?: number;
  physicalScrollTop: number;
  projection: CominsVirtualProjection;
  viewportHeight: number;
}): CominsPendingVirtualAnchor | undefined {
  const previousKeys = getCominsVirtualProjectionKeys(input.projection);
  const previousLogicalScrollTop =
    input.logicalScrollTop ??
    (input.projection.mixed
      ? getCominsMixedVirtualRange({
          heightIndex: input.projection.heightIndex,
          overscan: 0,
          physicalScrollTop: input.physicalScrollTop,
          viewportHeight: input.viewportHeight,
        }).logicalScrollTop
      : (() => {
          const metrics = getCominsScrollScale(
            input.projection.visibleRowCount * input.projection.rowHeight,
            input.viewportHeight,
          );

          return Math.min(
            metrics.logicalScrollableHeight,
            Math.max(0, input.physicalScrollTop) * metrics.scrollScale,
          );
        })());
  const anchor = input.projection.mixed
    ? captureCominsScrollAnchor({
        heightIndex: input.projection.heightIndex,
        keys: previousKeys,
        logicalScrollTop: previousLogicalScrollTop,
      })
    : (() => {
        if (input.projection.visibleRowCount === 0) {
          return undefined;
        }

        const previousIndex = Math.min(
          input.projection.visibleRowCount - 1,
          Math.floor(previousLogicalScrollTop / input.projection.rowHeight),
        );
        const key = previousKeys[previousIndex];

        return key === undefined
          ? undefined
          : {
              key,
              offsetWithinSlot:
                previousLogicalScrollTop - previousIndex * input.projection.rowHeight,
              previousIndex,
            };
      })();

  return anchor
    ? {
        anchor,
        previousKeys,
        previousLogicalScrollTop,
        previousPhysicalScrollTop: input.physicalScrollTop,
        previousViewportHeight: input.viewportHeight,
      }
    : undefined;
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
  const sortRule = getSortRule(state.sortModel, column.id);

  return {
    column: createComponentColumnPayload(column, columnIndex),
    layout: {
      hidden: columnState?.hidden === true || column.hidden === true,
      width: columnState?.width ?? column.width,
    },
    sort: {
      count: state.sortModel.length,
      direction: sortRule?.rule.direction ?? null,
      enabled: Boolean(column.sort),
      priority: sortRule?.priority ?? null,
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
  interaction?: CominsBuiltInComponentInteraction,
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
        {renderCominsBuiltInComponent(component as never, payload as never, interaction)}
      </span>
    ));
}

function blockCominsColumnPlaceholderInteraction(event: React.SyntheticEvent<HTMLElement>) {
  event.preventDefault();
  event.stopPropagation();
}

function blurCominsColumnPlaceholderFocus(event: React.FocusEvent<HTMLElement>) {
  event.stopPropagation();

  if (event.target instanceof HTMLElement) {
    event.target.blur();
  }
}

const cominsColumnPlaceholderNativeBoundaries = new WeakSet<HTMLElement>();

function bindCominsColumnPlaceholderNativeBoundary(element: HTMLElement | null) {
  if (!element || cominsColumnPlaceholderNativeBoundaries.has(element)) {
    return;
  }

  const blockActiveInput = (event: Event) => {
    if (element.hasAttribute("inert") && element.getAttribute("aria-hidden") === "true") {
      event.preventDefault();
      event.stopPropagation();
    }
  };

  element.addEventListener("change", blockActiveInput, true);
  element.addEventListener("input", blockActiveInput, true);
  cominsColumnPlaceholderNativeBoundaries.add(element);
}

const COMINS_COLUMN_PLACEHOLDER_INTERACTION_PROPS = {
  onBeforeInputCapture: blockCominsColumnPlaceholderInteraction,
  onBlurCapture: blockCominsColumnPlaceholderInteraction,
  onChangeCapture: blockCominsColumnPlaceholderInteraction,
  onClickCapture: blockCominsColumnPlaceholderInteraction,
  onContextMenuCapture: blockCominsColumnPlaceholderInteraction,
  onDoubleClickCapture: blockCominsColumnPlaceholderInteraction,
  onFocusCapture: blurCominsColumnPlaceholderFocus,
  onInputCapture: blockCominsColumnPlaceholderInteraction,
  onKeyDownCapture: blockCominsColumnPlaceholderInteraction,
  onKeyPressCapture: blockCominsColumnPlaceholderInteraction,
  onKeyUpCapture: blockCominsColumnPlaceholderInteraction,
  onMouseDownCapture: blockCominsColumnPlaceholderInteraction,
  onMouseMoveCapture: blockCominsColumnPlaceholderInteraction,
  onMouseOutCapture: blockCominsColumnPlaceholderInteraction,
  onMouseOverCapture: blockCominsColumnPlaceholderInteraction,
  onMouseUpCapture: blockCominsColumnPlaceholderInteraction,
  onPointerCancelCapture: blockCominsColumnPlaceholderInteraction,
  onPointerDownCapture: blockCominsColumnPlaceholderInteraction,
  onPointerMoveCapture: blockCominsColumnPlaceholderInteraction,
  onPointerOutCapture: blockCominsColumnPlaceholderInteraction,
  onPointerOverCapture: blockCominsColumnPlaceholderInteraction,
  onPointerUpCapture: blockCominsColumnPlaceholderInteraction,
  onResetCapture: blockCominsColumnPlaceholderInteraction,
  onScrollCapture: blockCominsColumnPlaceholderInteraction,
  onSubmitCapture: blockCominsColumnPlaceholderInteraction,
  onTouchCancelCapture: blockCominsColumnPlaceholderInteraction,
  onTouchEndCapture: blockCominsColumnPlaceholderInteraction,
  onTouchMoveCapture: blockCominsColumnPlaceholderInteraction,
  onTouchStartCapture: blockCominsColumnPlaceholderInteraction,
  onWheelCapture: blockCominsColumnPlaceholderInteraction,
} satisfies React.HTMLAttributes<HTMLElement>;

function getCominsColumnPlaceholderText(label: React.ReactNode, fallback: string): string {
  const collectPlainText = (node: React.ReactNode): string => {
    if (typeof node === "string" || typeof node === "number") {
      return String(node);
    }

    if (Array.isArray(node)) {
      return node.map(collectPlainText).join("");
    }

    if (isValidElement<{ children?: React.ReactNode }>(node) && typeof node.type === "string") {
      return collectPlainText(node.props.children);
    }

    return "";
  };
  const plainText = collectPlainText(label).trim();

  return plainText || fallback;
}

function renderCominsContentWithComponents<TData>(
  content: React.ReactNode,
  components: ReadonlyArray<CominsRenderableComponent<TData>> | undefined,
  payload: CominsRenderablePayload<TData>,
  options: {
    interaction?: CominsBuiltInComponentInteraction;
    showContent?: boolean;
  } = {},
) {
  if (!components?.length) {
    return content;
  }

  const showContent = options.showContent ?? true;
  const renderableComponents = getRenderableCominsComponents(components, payload);

  if (!renderableComponents.length) {
    return content;
  }

  const leftSlots = renderCominsComponentSlots(renderableComponents, payload, "left", options.interaction);
  const rightSlots = renderCominsComponentSlots(renderableComponents, payload, "right", options.interaction);

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

function getNextSortModel(current: CominsSortModel, columnId: string, additive: boolean): CominsSortState[] {
  const currentIndex = current.findIndex((rule) => rule.columnId === columnId);
  const currentRule = currentIndex < 0 ? null : current[currentIndex] ?? null;
  const nextRule = getNextSort(currentRule, columnId);

  if (!additive) {
    return nextRule ? [nextRule] : [];
  }

  if (!nextRule) {
    return current.filter((rule) => rule.columnId !== columnId);
  }

  if (currentIndex < 0) {
    return [...current, nextRule];
  }

  return current.map((rule, index) => (index === currentIndex ? nextRule : rule));
}

function getSortRule(current: CominsSortModel, columnId: string) {
  const index = current.findIndex((rule) => rule.columnId === columnId);

  return index < 0 ? null : { priority: index + 1, rule: current[index]! };
}

function getSortIndicatorState(current: CominsSortModel, columnId: string) {
  const currentRule = getSortRule(current, columnId)?.rule;

  if (!currentRule) {
    return "none";
  }

  return currentRule.direction;
}

function getAriaSortState(current: CominsSortModel, columnId: string) {
  const currentRule = getSortRule(current, columnId);

  if (!currentRule) {
    return current.length > 1 ? undefined : "none";
  }

  if (currentRule.priority > 1) {
    return undefined;
  }

  return currentRule.rule.direction === "asc" ? "ascending" : "descending";
}

function areSortStatesEqual(left: CominsSortState | null, right: CominsSortState | null) {
  if (!left || !right) {
    return left === right;
  }

  return left.columnId === right.columnId && left.direction === right.direction;
}

function areSortModelsEqual(left: CominsSortModel, right: CominsSortModel) {
  if (left.length !== right.length) {
    return false;
  }

  return left.every(
    (rule, index) => rule.columnId === right[index]?.columnId && rule.direction === right[index]?.direction,
  );
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
  sortModel: CominsSortModel,
) {
  if (sortModel.length === 0) {
    return data;
  }

  return sortCominsTreeSiblings(data, (leftRow, rightRow) => {
    for (const rule of sortModel) {
      const column = columns.find((candidate) => (candidate.id ?? candidate.field) === rule.columnId);

      if (!column?.sort) {
        continue;
      }

      const leftValue = getTreeNestedFieldValue(leftRow, column.field);
      const rightValue = getTreeNestedFieldValue(rightRow, column.field);
      const result =
        typeof column.sort === "function"
          ? column.sort(leftValue, rightValue, leftRow, rightRow)
          : compareTreeValues(leftValue, rightValue);

      if (result !== 0) {
        return rule.direction === "desc" ? result * -1 : result;
      }
    }

    return 0;
  });
}

function setCominsTreeExpansion<TData>(
  data: readonly CominsTreeNode<TData>[],
  nodeIds: readonly CominsRowId[] | undefined,
  expanded: boolean,
  getRowId: (item: TData, index: number) => CominsRowId,
  defaultExpandAll: boolean,
): readonly CominsTreeNode<TData>[] {
  if (nodeIds?.length === 0) {
    return data;
  }

  type ExpansionEntry = {
    ancestorIds: readonly CominsRowId[];
    hasChildren: boolean;
    node: CominsTreeNode<TData>;
    rowId: CominsRowId;
  };

  const entries: ExpansionEntry[] = [];
  const idByNode = new Map<CominsTreeNode<TData>, CominsRowId>();
  let itemIndex = 0;

  const visit = (nodes: readonly CominsTreeNode<TData>[], ancestorIds: readonly CominsRowId[]) => {
    nodes.forEach((node) => {
      const rowId = getRowId(node.item, itemIndex);
      const hasChildren = Boolean(node.children?.length);
      itemIndex += 1;
      entries.push({ ancestorIds, hasChildren, node, rowId });
      idByNode.set(node, rowId);

      if (node.children?.length) {
        visit(node.children, [...ancestorIds, rowId]);
      }
    });
  };

  visit(data, []);

  const requestedIds = nodeIds ? new Set(nodeIds) : null;
  const targets = entries.filter((entry) => entry.hasChildren && (!requestedIds || requestedIds.has(entry.rowId)));
  const requestedBranchIds = new Set(targets.map((entry) => entry.rowId));
  const expandedById = new Map(
    entries.map((entry) => [entry.rowId, entry.node.expand ?? defaultExpandAll] as const),
  );
  const changes = new Map<CominsRowId, boolean>();

  targets.forEach((entry) => {
    const ancestorsAllowExpand =
      !expanded ||
      !requestedIds ||
      entry.ancestorIds.every((ancestorId) => expandedById.get(ancestorId) === true || requestedBranchIds.has(ancestorId));
    const currentExpanded = entry.node.expand ?? defaultExpandAll;

    if (ancestorsAllowExpand && currentExpanded !== expanded) {
      changes.set(entry.rowId, expanded);
    }
  });

  if (changes.size === 0) {
    return data;
  }

  const applyChanges = (nodes: readonly CominsTreeNode<TData>[]): readonly CominsTreeNode<TData>[] => {
    let changed = false;
    const nextNodes = nodes.map((node) => {
      const rowId = idByNode.get(node);
      const nextExpanded = rowId === undefined ? undefined : changes.get(rowId);
      const nextChildren = node.children ? applyChanges(node.children) : node.children;

      if (nextExpanded === undefined && nextChildren === node.children) {
        return node;
      }

      changed = true;
      return {
        ...node,
        children: nextChildren,
        ...(nextExpanded === undefined ? {} : { expand: nextExpanded }),
      };
    });

    return changed ? nextNodes : nodes;
  };

  return applyChanges(data);
}

function CominsTableInner<TData, TGroup>(
  {
    "buffer-size": bufferSize,
    cellSelection = true,
    className,
    columnFiltering,
    columnGroups,
    columns,
    data,
    "data-testid": dataTestId,
    emptyComponent,
    estimatedRowDetailHeight,
    expandedRowIds,
    getRowDetailHeight,
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
    multiSort = false,
    onChangeColumnLayout,
    onChangeData,
    onChangeSelection,
    onChangeSort,
    onChangeSortModel,
    onClickCell,
    onClickRow,
    onContextMenuCell,
    onContextMenuRow,
    onChangeExpandedRowIds,
    onDoubleClickCell,
    onDoubleClickRow,
    onKeyDownCell,
    onKeyDownRow,
    onLazyLoad,
    onLoadMore,
    pagination,
    persistHeaderWhenEmpty = true,
    rowHeight = 36,
    rowGrouping,
    rowProps,
    isRowExpandable,
    renderRowDetail,
    showColumnMoveHandle = true,
    showHeader = true,
    skeletonRowCount,
    style,
    summary,
    tableTransfer,
    theme,
    treeContext,
    virtualized = false,
  }: CominsTableInnerProps<TData, TGroup>,
  ref: React.ForwardedRef<CominsTableRef<TData>>,
) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const footerRef = useRef<HTMLDivElement | null>(null);
  const headerRef = useRef<HTMLDivElement | null>(null);
  const horizontalScrollbarRef = useRef<HTMLDivElement | null>(null);
  const tableRootRef = useRef<HTMLDivElement | null>(null);
  const copiedCellRef = useRef<CominsCopiedCell | null>(null);
  const copiedRangeRef = useRef<CominsCopiedCellRange | null>(null);
  const copiedRowRef = useRef<CominsCopiedRow<TData> | null>(null);
  const detailMeasurementsRef = useRef(
    new Map<CominsRowId, CominsDetailMeasurement>(),
  );
  const detailElementsRef = useRef(
    new Map<Element, CominsObservedDetail>(),
  );
  const fallbackMeasuredDetailElementsRef = useRef(new Set<Element>());
  const detailObserverRef = useRef<ResizeObserver | null>(null);
  const detailObserverTargetsRef = useRef(new Set<Element>());
  const committedDetailObserverSnapshotRef = useRef<
    CominsCommittedDetailObserverSnapshot<TData> | null
  >(null);
  const rowDetailToggleElementsRef = useRef(new Map<CominsRowId, HTMLButtonElement>());
  const activePointerGestureCleanupRef = useRef<(() => void) | null>(null);
  const columnPointerInteractionRef = useRef<CominsColumnPointerInteraction | null>(null);
  const columnMoveAnimationCleanupRef = useRef<(() => void) | null>(null);
  const columnMoveAnimationSnapshotRef = useRef<Map<HTMLElement, number> | null>(null);
  const headerRendererBodyRef = useRef(new Map<string, { body: React.ReactNode; renderer: unknown }>());
  const lastCellAnchorRef = useRef<CominsCellAddress | null>(null);
  const lazyAbortControllerRef = useRef<AbortController | null>(null);
  const lazyLoadingReasonRef = useRef<CominsLazyLoadReason | null>(null);
  const onLazyLoadRef = useRef(onLazyLoad);
  const lazyRequestIdRef = useRef(0);
  const lastLoadMoreRowCountRef = useRef<number | null>(null);
  const lastRowAnchorRef = useRef<CominsRowId | null>(null);
  const rangeDragAnchorRef = useRef<CominsCellAddress | null>(null);
  const rangeDragLastAddressRef = useRef<CominsCellAddress | null>(null);
  const rangeDragMovedRef = useRef(false);
  const rowMoveStateRef = useRef<CominsRowMoveState | null>(null);
  const rowGroupMoveStateRef = useRef<CominsRowGroupMoveState | null>(null);
  const transferSnapshotRef = useRef<
    CominsTableTransferRegistrationSnapshot<TData, TGroup> | null
  >(null);
  const externalDropMarkerRef = useRef<HTMLElement | null>(null);
  const transferRejectionTargetRef = useRef<HTMLElement | null>(null);
  const transferRejectionTimerRef = useRef<number | null>(null);
  const pendingTransferFocusFrameRef = useRef<number | null>(null);
  const groupDisclosureElementsRef = useRef(new Map<CominsRowId, HTMLButtonElement>());
  const pendingGroupDisclosureFocusRef = useRef<CominsRowId | null>(null);
  const focusedLeafDataIndexRef = useRef<number | null>(null);
  const previousGroupedDataIndexesRef = useRef<ReadonlySet<number> | null>(null);
  const anchorRevisionRef = useRef(0);
  const logicalAnchorTransactionRef = useRef<CominsLogicalAnchorTransaction | null>(null);
  const pendingDetailAnchorRef = useRef<CominsPendingDetailAnchor | null>(null);
  const pendingScrollTopRef = useRef(0);
  const previousVirtualProjectionRef = useRef<CominsVirtualProjection | null>(null);
  const scrollCommitTimeoutRef = useRef<number | null>(null);
  const scrollFrameRef = useRef<number | null>(null);
  const suppressedSortClickRef = useRef<CominsSuppressedSortClick | null>(null);
  const [containerHeight, setContainerHeight] = useState(0);
  const [containerWidth, setContainerWidth] = useState(0);
  const [horizontalScrollContentWidth, setHorizontalScrollContentWidth] = useState(0);
  const [horizontalViewportOuterWidth, setHorizontalViewportOuterWidth] = useState(0);
  const [horizontalViewportWidth, setHorizontalViewportWidth] = useState(0);
  const [detailLayoutVersion, setDetailLayoutVersion] = useState(0);
  const [movingColumnId, setMovingColumnId] = useState<string | null>(null);
  const [movingGroupId, setMovingGroupId] = useState<string | null>(null);
  const [columnMovePointer, setColumnMovePointer] = useState<{ x: number; y: number } | null>(null);
  const [columnMoveTarget, setColumnMoveTarget] = useState<CominsColumnMoveTarget | null>(null);
  const [logicalAnchorTransaction, setLogicalAnchorTransaction] =
    useState<CominsLogicalAnchorTransaction | null>(null);
  const [resizingColumnId, setResizingColumnId] = useState<string | null>(null);
  const [rowMoveState, setRowMoveState] = useState<CominsRowMoveState | null>(null);
  const [rowGroupMoveState, setRowGroupMoveState] = useState<CominsRowGroupMoveState | null>(null);
  const [transferRejectionFeedback, setTransferRejectionFeedback] =
    useState<CominsTransferRejectionFeedbackState | null>(null);
  const [scrollTop, setScrollTop] = useState(0);
  const tableInstanceId = useId();
  const rowDetailIdPrefix = useId();
  const effectiveData = data;
  const groupingRequested =
    !treeContext &&
    rowGrouping !== null &&
    typeof rowGrouping === "object" &&
    rowGrouping !== undefined &&
    Array.isArray(rowGrouping.groups) &&
    typeof rowGrouping.getGroupId === "function" &&
    typeof rowGrouping.getRowGroupId === "function";
  const filteringRequested =
    !treeContext &&
    columnFiltering !== null &&
    typeof columnFiltering === "object" &&
    columnFiltering !== undefined &&
    Array.isArray(columnFiltering.model);
  const normalizedTableTransfer =
    !treeContext &&
    !filteringRequested &&
    !infiniteScroll &&
    !lazyLoad &&
    tableTransfer !== null &&
    typeof tableTransfer === "object" &&
    typeof tableTransfer.scope === "string" &&
    tableTransfer.scope.length > 0 &&
    typeof tableTransfer.tableId === "string" &&
    tableTransfer.tableId.length > 0 &&
    isCominsTableTransferCoordinator<TData, TGroup>(tableTransfer.coordinator)
      ? tableTransfer as CominsTableTransferConfig<TData, TGroup>
      : undefined;
  const effectivePagination = useMemo(
    () => groupingRequested
      ? { pageIndex: 0, pageSize: Math.max(1, effectiveData.length) }
      : pagination,
    [effectiveData.length, groupingRequested, pagination],
  );
  const effectiveRowProps = filteringRequested
    ? { ...rowProps, draggable: false }
    : rowProps;
  const [state, setState] = useState(() =>
    createCominsTableState({
      columnGroups,
      columns,
      getRowId,
      pagination: effectivePagination,
      rows: effectiveData,
      showHeader,
      theme,
    }),
  );
  const stateRef = useRef(state);
  const stateInputRef = useRef({ columnGroups, columns, data: effectiveData, getRowId, pagination: effectivePagination, showHeader });
  const virtualBufferSize = Math.max(0, Math.floor(Number.isFinite(bufferSize) ? Number(bufferSize) : 10));
  const resolvedLazyLoadBatchSize = Math.max(1, Math.floor(lazyLoadBatchSize));
  const resolvedLazyLoadThreshold = Math.max(0, Math.floor(lazyLoadThreshold ?? infiniteScrollThreshold));
  const hasLazyLoadHandler = typeof onLazyLoad === "function";
  const rowDetailEnabled = typeof renderRowDetail === "function" && !treeContext;
  const normalizedExpandedRowIds = useMemo(() => {
    const seen = new Set<CominsRowId>();

    return (expandedRowIds ?? []).filter((rowId) => {
      if (seen.has(rowId)) {
        return false;
      }

      seen.add(rowId);
      return true;
    });
  }, [expandedRowIds]);
  const expandedRowIdSet = useMemo(
    () => new Set(normalizedExpandedRowIds),
    [normalizedExpandedRowIds],
  );
  const toggleRowDetail = (rowId: CominsRowId, expandable: boolean) => {
    if (!rowDetailEnabled || !expandable || !onChangeExpandedRowIds) {
      return;
    }

    onChangeExpandedRowIds(
      expandedRowIdSet.has(rowId)
        ? normalizedExpandedRowIds.filter((current) => current !== rowId)
        : [...normalizedExpandedRowIds, rowId],
    );
  };
  const clearActivePointerGesture = () => {
    const cleanup = activePointerGestureCleanupRef.current;

    activePointerGestureCleanupRef.current = null;
    cleanup?.();
  };
  const registerActivePointerGesture = (cleanup: () => void) => {
    clearActivePointerGesture();
    activePointerGestureCleanupRef.current = cleanup;
  };
  const clearExternalDropMarker = () => {
    const marker = externalDropMarkerRef.current;

    if (!marker) {
      return;
    }

    marker.removeAttribute("data-comins-cross-row-drop-position");
    marker.removeAttribute("data-comins-group-drop-position");
    marker.removeAttribute("data-comins-group-drop-valid");
    marker.removeAttribute("data-comins-row-drop-valid");
    externalDropMarkerRef.current = null;
  };
  const clearTransferRejectionFeedback = (updateState = true) => {
    if (transferRejectionTimerRef.current !== null) {
      window.clearTimeout(transferRejectionTimerRef.current);
      transferRejectionTimerRef.current = null;
    }

    transferRejectionTargetRef.current?.removeAttribute("data-comins-transfer-rejected");
    transferRejectionTargetRef.current = null;

    if (updateState) {
      setTransferRejectionFeedback(null);
    }
  };
  const showTransferRejectionFeedback = (
    rejection: CominsTableTransferRejection<TData, TGroup>,
    targetSnapshot: CominsTableTransferRegistrationSnapshot<TData, TGroup>,
    clientX: number,
    clientY: number,
  ) => {
    const feedback = targetSnapshot.config.rejectionFeedback;

    if (feedback === false) {
      return;
    }

    clearTransferRejectionFeedback();
    const duplicateId = rejection.conflict.kind === "group"
      ? rejection.conflict.groupId
      : rejection.conflict.rowId;
    const content = feedback?.renderTooltip?.(rejection) ?? (
      <>
        <strong>Duplicate ID</strong>
        <span>{`The ID "${String(duplicateId)}" already exists.`}</span>
      </>
    );
    const requestedDuration = feedback?.duration ?? 1800;
    const duration = Number.isFinite(requestedDuration)
      ? Math.max(500, Math.min(10000, requestedDuration))
      : 1800;

    targetSnapshot.root?.setAttribute("data-comins-transfer-rejected", "true");
    transferRejectionTargetRef.current = targetSnapshot.root;
    setTransferRejectionFeedback({ content, x: clientX, y: clientY });
    transferRejectionTimerRef.current = window.setTimeout(
      () => clearTransferRejectionFeedback(),
      duration,
    );
  };
  const setExternalDropMarker = (
    element: HTMLElement,
    kind: "group" | "row",
    valid: boolean,
    position?: "after" | "append" | "before",
  ) => {
    clearExternalDropMarker();
    externalDropMarkerRef.current = element;

    if (kind === "group") {
      element.dataset.cominsGroupDropValid = valid ? "true" : "false";

      if (position === "after" || position === "before") {
        element.dataset.cominsGroupDropPosition = position;
      }
      return;
    }

    element.dataset.cominsRowDropValid = valid ? "true" : "false";

    if (element.dataset.cominsRowDataIndex !== undefined) {
      element.dataset.cominsCrossRowDropPosition = "before";
    }
  };
  const getRegisteredTransferSnapshot = (tableId: string) => {
    if (!normalizedTableTransfer) {
      return null;
    }

    const registration = getCominsTableTransferRegistration(
      normalizedTableTransfer.coordinator,
      normalizedTableTransfer.scope,
      tableId,
    );
    const snapshot = registration?.getSnapshot() ?? null;

    if (
      !snapshot ||
      snapshot.config.coordinator !== normalizedTableTransfer.coordinator ||
      snapshot.config.scope !== normalizedTableTransfer.scope ||
      snapshot.config.tableId !== tableId ||
      snapshot.endpoint.tableId !== tableId
    ) {
      return null;
    }

    return snapshot;
  };
  const getCrossTableTransferHit = (
    clientX: number,
    clientY: number,
  ): CominsTransferTableHit<TData, TGroup> | null => {
    if (!normalizedTableTransfer) {
      return null;
    }

    const sourceSnapshot = getRegisteredTransferSnapshot(normalizedTableTransfer.tableId);
    const element = document.elementFromPoint(clientX, clientY) as HTMLElement | null;
    const root = element?.closest<HTMLElement>("[data-comins-table-instance-id]") ?? null;
    const tableId = root?.dataset.cominsTransferTableId;

    if (
      !sourceSnapshot ||
      sourceSnapshot.instanceId !== tableInstanceId ||
      sourceSnapshot.root !== tableRootRef.current ||
      !element ||
      !root ||
      !tableId ||
      tableId === normalizedTableTransfer.tableId ||
      root.dataset.cominsTransferScope !== normalizedTableTransfer.scope
    ) {
      return null;
    }

    const snapshot = getRegisteredTransferSnapshot(tableId);

    if (
      !snapshot ||
      snapshot.root !== root ||
      snapshot.instanceId !== root.dataset.cominsTableInstanceId ||
      !snapshot.viewport ||
      !root.contains(snapshot.viewport)
    ) {
      return null;
    }

    return { element, root, snapshot };
  };
  const scheduleTransferFocus = (
    targetTableId: string,
    kind: "group" | "row",
    id: CominsRowId,
  ) => {
    if (pendingTransferFocusFrameRef.current !== null) {
      window.cancelAnimationFrame(pendingTransferFocusFrameRef.current);
    }

    let remainingAttempts = 3;
    const attemptFocus = () => {
      pendingTransferFocusFrameRef.current = null;
      const snapshot = getRegisteredTransferSnapshot(targetTableId);
      const root = snapshot?.root;

      if (!root) {
        return;
      }

      const identity = getCominsTransferIdentity(id);
      const row = [...root.querySelectorAll<HTMLElement>(
        kind === "row"
          ? "[data-comins-transfer-row-id]"
          : "[data-comins-transfer-group-id]",
      )].find((candidate) =>
        (kind === "row"
          ? candidate.dataset.cominsTransferRowId
          : candidate.dataset.cominsTransferGroupId) === identity,
      );
      const focusTarget = kind === "group"
        ? row?.querySelector<HTMLElement>(
            ".comins-row-group-drag-handle, .comins-row-group-expander",
          )
        : row;

      if (focusTarget) {
        focusTarget.focus({ preventScroll: true });
        return;
      }

      remainingAttempts -= 1;

      if (remainingAttempts > 0) {
        pendingTransferFocusFrameRef.current = window.requestAnimationFrame(attemptFocus);
        return;
      }

      root.focus({ preventScroll: true });
    };

    pendingTransferFocusFrameRef.current = window.requestAnimationFrame(attemptFocus);
  };
  const createCrossTableAutoScroll = (
    resolveTarget: (clientX: number, clientY: number) => void,
  ) => {
    let animationFrame: number | null = null;
    let clientX = 0;
    let clientY = 0;
    let lastTimestamp: number | null = null;
    let viewport: HTMLElement | null = null;

    const stop = () => {
      if (animationFrame !== null) {
        window.cancelAnimationFrame(animationFrame);
      }

      animationFrame = null;
      lastTimestamp = null;
      viewport = null;
    };
    const runFrame = (timestamp: number) => {
      animationFrame = null;
      const currentViewport = viewport;

      if (!currentViewport?.isConnected) {
        stop();
        return;
      }

      if (lastTimestamp === null) {
        lastTimestamp = timestamp;
        animationFrame = window.requestAnimationFrame(runFrame);
        return;
      }

      const bounds = currentViewport.getBoundingClientRect();
      const velocity = getCominsDragAutoScrollVelocity({ bottom: bounds.bottom, clientY, top: bounds.top });
      const nextScrollTop = getCominsDragAutoScrollTop({
        clientHeight: currentViewport.clientHeight,
        deltaMs: timestamp - lastTimestamp,
        scrollHeight: currentViewport.scrollHeight,
        scrollTop: currentViewport.scrollTop,
        velocity,
      });
      const moved = Math.abs(nextScrollTop - currentViewport.scrollTop) > 0.01;

      lastTimestamp = timestamp;

      if (!moved) {
        stop();
        return;
      }

      currentViewport.scrollTop = nextScrollTop;
      resolveTarget(clientX, clientY);
    };
    const update = (
      nextViewport: HTMLElement | null,
      nextClientX: number,
      nextClientY: number,
      valid: boolean,
    ) => {
      if (!valid || !nextViewport?.isConnected) {
        stop();
        return;
      }

      const bounds = nextViewport.getBoundingClientRect();
      const velocity = getCominsDragAutoScrollVelocity({
        bottom: bounds.bottom,
        clientY: nextClientY,
        top: bounds.top,
      });
      const maxScrollTop = Math.max(0, nextViewport.scrollHeight - nextViewport.clientHeight);
      const canScroll = velocity < 0
        ? nextViewport.scrollTop > 0
        : velocity > 0 && nextViewport.scrollTop < maxScrollTop;

      if (!canScroll) {
        stop();
        return;
      }

      if (viewport !== nextViewport) {
        lastTimestamp = null;
      }

      viewport = nextViewport;
      clientX = nextClientX;
      clientY = nextClientY;

      if (animationFrame === null) {
        animationFrame = window.requestAnimationFrame(runFrame);
      }
    };

    return { stop, update };
  };

  useLayoutEffect(() => {
    onLazyLoadRef.current = onLazyLoad;
  }, [onLazyLoad]);

  const requestLazyLoad = (reason: CominsLazyLoadReason) => {
    const lazyLoadHandler = onLazyLoadRef.current;

    if (groupingRequested || filteringRequested || !lazyLoad || lazyLoadMode !== "append" || !lazyLoadHandler || lazyLoadingReasonRef.current) {
      return;
    }

    const currentRowsLength = stateRef.current.rows.length;

    if (reason === "scroll" && (!hasMoreRows || loading || loadingMore)) {
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
    let result: Promise<void> | void;

    try {
      result = lazyLoadHandler({
        limit: resolvedLazyLoadBatchSize,
        offset,
        reason,
        signal: controller.signal,
      });
    } catch {
      lazyLoadingReasonRef.current = null;
      lazyAbortControllerRef.current = null;
      return;
    }

    void Promise.resolve(result)
      .catch(() => {
        // Error and retry UI are intentionally left to the consumer in this API pass.
      })
      .finally(() => {
        if (lazyRequestIdRef.current !== requestId) {
          return;
        }

        lazyLoadingReasonRef.current = null;
        lazyAbortControllerRef.current = null;
      });
  };

  useEffect(() => {
    if (groupingRequested || filteringRequested || !lazyLoad || !hasLazyLoadHandler) {
      return undefined;
    }

    requestLazyLoad("initial");

    return () => {
      lazyRequestIdRef.current += 1;
      lazyLoadingReasonRef.current = null;
      lazyAbortControllerRef.current?.abort();
      lazyAbortControllerRef.current = null;
    };
  }, [filteringRequested, groupingRequested, hasLazyLoadHandler, lazyLoad, resolvedLazyLoadBatchSize]);

  useEffect(() => {
    const previousInput = stateInputRef.current;

    if (
      previousInput.columns === columns &&
      previousInput.columnGroups === columnGroups &&
      previousInput.data === effectiveData &&
      previousInput.getRowId === getRowId &&
      previousInput.pagination === effectivePagination &&
      previousInput.showHeader === showHeader
    ) {
      return;
    }

    stateInputRef.current = { columnGroups, columns, data: effectiveData, getRowId, pagination: effectivePagination, showHeader };
    const current = stateRef.current;
    const nextState = createCominsTableState({
      columnLayout: serializeCominsColumnLayout(current),
      columnGroups,
      columns,
      getRowId,
      pagination: effectivePagination,
      rows: effectiveData,
      showHeader,
      sortModel: current.sortModel,
      theme: current.theme,
    });
    const next = canPreserveSelection(current, nextState)
      ? { ...nextState, selection: current.selection }
      : nextState;

    if (previousInput.getRowId !== getRowId) {
      const previousRowById = new Map(
        current.rowIds.map((rowId, index) => [rowId, current.rows[index]]),
      );

      next.rowIds.forEach((rowId, index) => {
        if (previousRowById.has(rowId) && previousRowById.get(rowId) !== next.rows[index]) {
          detailMeasurementsRef.current.delete(rowId);
        }
      });
    }

    stateRef.current = next;
    setState(next);

    if (!areSortStatesEqual(next.sort, current.sort)) {
      onChangeSort?.(next.sort);
    }

    if (!areSortModelsEqual(next.sortModel, current.sortModel)) {
      onChangeSortModel?.(next.sortModel);
    }
  }, [columnGroups, columns, effectiveData, effectivePagination, getRowId, showHeader]);

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
      clearActivePointerGesture();
      clearExternalDropMarker();
      clearTransferRejectionFeedback(false);

      if (pendingTransferFocusFrameRef.current !== null) {
        window.cancelAnimationFrame(pendingTransferFocusFrameRef.current);
      }

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
        setHorizontalScrollContentWidth(element.scrollWidth);
        setHorizontalViewportOuterWidth(element.offsetWidth);
        setHorizontalViewportWidth(element.clientWidth);
      }
    });
    observer.observe(element);

    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    reconcileCominsDetailMeasurements(
      detailMeasurementsRef.current,
      new Set(state.rowIds),
    );
  }, [state.rowIds]);

  const updateMixedProjectionDetailHeight = (
    snapshot: CominsCommittedDetailObserverSnapshot<TData>,
    rowId: CominsRowId,
    height: number,
    width: number,
  ) => {
    const projection = snapshot.projection;

    if (!projection || width !== snapshot.contentWidth) {
      return false;
    }

    const slotIndex = projection.slotIndexByRowId.get(rowId);
    const slot = slotIndex === undefined ? undefined : projection.slots[slotIndex];

    if (slotIndex === undefined || slot?.kind !== "data" || slot.detail?.mode !== "auto") {
      return false;
    }

    const nextSlotHeight =
      projection.heightIndex.getHeight(slotIndex) - slot.detail.height + height;
    const delta = projection.heightIndex.updateHeight(slotIndex, nextSlotHeight);

    slot.detail.estimated = false;
    slot.detail.height = height;
    return delta !== 0;
  };

  const applyDetailMeasurementUpdates = (
    updates: ReadonlyArray<{
      height: number;
      rowId: CominsRowId;
      width: number;
    }>,
  ) => {
    const snapshot = committedDetailObserverSnapshotRef.current;

    if (!snapshot) {
      return;
    }

    const accepted = updates.filter(({ height, rowId, width }) => {
      const current = detailMeasurementsRef.current.get(rowId);

      return (
        !current ||
        current.width !== width ||
        Math.abs(current.height - height) >= 0.5
      );
    });

    if (accepted.length === 0) {
      return;
    }

    const projection = snapshot.projection;
    const viewport = containerRef.current;
    const viewportHeight = viewport?.clientHeight || snapshot.viewportHeight;
    const currentPendingDetailAnchor = pendingDetailAnchorRef.current;
    const pendingAnchor =
      currentPendingDetailAnchor?.status === "pending"
        ? currentPendingDetailAnchor
        : !currentPendingDetailAnchor && projection && viewport
        ? captureCominsVirtualAnchor({
            logicalScrollTop:
              logicalAnchorTransactionRef.current &&
              Math.abs(
                viewport.scrollTop -
                  logicalAnchorTransactionRef.current.actualPhysical,
              ) <= 0.5
                ? logicalAnchorTransactionRef.current.targetLogical
                : undefined,
            physicalScrollTop: viewport.scrollTop,
            projection: {
              heightIndex: projection.heightIndex,
              keys: projection.keys,
              mixed: true,
            },
            viewportHeight,
          })
        : undefined;
    let updatedActiveIndex = false;

    for (const update of accepted) {
      detailMeasurementsRef.current.set(update.rowId, {
        height: update.height,
        width: update.width,
      });
      updatedActiveIndex =
        updateMixedProjectionDetailHeight(
          snapshot,
          update.rowId,
          update.height,
          update.width,
        ) || updatedActiveIndex;
    }

    if (
      pendingAnchor &&
      updatedActiveIndex &&
      currentPendingDetailAnchor?.status !== "pending"
    ) {
      const revision = anchorRevisionRef.current + 1;

      anchorRevisionRef.current = revision;
      pendingDetailAnchorRef.current = {
        ...pendingAnchor,
        revision,
        status: "pending",
      };
    }

    if (updatedActiveIndex || !projection) {
      setDetailLayoutVersion((current) => current + 1);
    }
  };

  const createDetailObserver = () => {
    if (typeof ResizeObserver === "undefined") {
      return null;
    }

    const observer = new ResizeObserver((entries) => {
      const updates: Array<{
        height: number;
        rowId: CominsRowId;
        width: number;
      }> = [];

      for (const entry of entries) {
        const observed = detailElementsRef.current.get(entry.target);

        if (!observed) {
          continue;
        }

        const borderBox = Array.isArray(entry.borderBoxSize)
          ? entry.borderBoxSize[0]
          : entry.borderBoxSize;
        const height =
          borderBox?.blockSize ??
          (entry.target as HTMLElement).getBoundingClientRect().height;
        const width = Math.round(
          (entry.target as HTMLElement).getBoundingClientRect().width,
        );

        if (Number.isFinite(height) && height > 0) {
          updates.push({ height, rowId: observed.rowId, width });
        }
      }

      applyDetailMeasurementUpdates(updates);
    });

    detailObserverRef.current = observer;

    for (const observed of detailElementsRef.current.values()) {
      detailObserverTargetsRef.current.add(observed.element);
      observer.observe(observed.element);
    }

    return observer;
  };

  useLayoutEffect(() => {
    return () => {
      detailObserverRef.current?.disconnect();
      detailObserverRef.current = null;
      detailObserverTargetsRef.current.clear();
      detailElementsRef.current.clear();
      fallbackMeasuredDetailElementsRef.current.clear();
      committedDetailObserverSnapshotRef.current = null;
    };
  }, []);

  const disconnectDetailObserverIfIdle = () => {
    if (detailElementsRef.current.size === 0) {
      detailObserverRef.current?.disconnect();
      detailObserverRef.current = null;
      detailObserverTargetsRef.current.clear();
    }
  };

  const registerDetailElement = (
    rowId: CominsRowId,
    mode: "auto" | "fixed",
    element: HTMLDivElement | null,
  ) => {
    for (const [currentElement, observed] of detailElementsRef.current) {
      if (observed.rowId === rowId && currentElement !== element) {
        detailObserverRef.current?.unobserve(currentElement);
        detailObserverTargetsRef.current.delete(currentElement);
        detailElementsRef.current.delete(currentElement);
        fallbackMeasuredDetailElementsRef.current.delete(currentElement);
      }
    }

    if (!element || mode === "fixed") {
      disconnectDetailObserverIfIdle();
      return;
    }

    detailElementsRef.current.set(element, { element, rowId });
  };

  const notifyChanges = (
    current: CominsTableState<TData>,
    next: CominsTableState<TData>,
    options: { columnLayoutChanged?: boolean } = {},
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

    if (!areSortStatesEqual(next.sort, current.sort)) {
      onChangeSort?.(next.sort);
    }

    if (!areSortModelsEqual(next.sortModel, current.sortModel)) {
      onChangeSortModel?.(next.sortModel);
    }
  };

  const commitState = (
    updater: CominsTableState<TData> | ((current: CominsTableState<TData>) => CominsTableState<TData>),
    options: { columnLayoutChanged?: boolean } = {},
  ) => {
    const current = stateRef.current;
    const next = typeof updater === "function" ? updater(current) : updater;

    stateRef.current = next;
    setState(next);
    notifyChanges(current, next, options);
  };

  const visibleColumns = useMemo(() => getCominsVisibleColumns(state), [state]);
  const renderedHeaderRendererBodies = new Map<string, { body: React.ReactNode; renderer: unknown }>();

  useEffect(() => {
    headerRendererBodyRef.current = renderedHeaderRendererBodies;
  });

  const columnWidths = useMemo(() => {
    const columnCount = visibleColumns.length;

    if (columnCount === 0) {
      return [];
    }

    const configuredWidths = visibleColumns.map((column) => state.columnState[column.id]?.width ?? column.width);

    if (containerWidth <= 0) {
      const fallbackWidth = `${100 / columnCount}%`;

      return configuredWidths.map((width, index) => {
        if (width === undefined) {
          return fallbackWidth;
        }

        const column = visibleColumns[index]!;

        return clampColumnWidth(
          width,
          getEffectiveColumnMinWidth(column),
          getEffectiveColumnMaxWidth(column),
        );
      });
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
  const columnPinningBlocks = useMemo(() => {
    const groupIdByColumnId = new Map<string, string>();

    for (const group of state.columnGroups) {
      for (const columnId of group.children) {
        groupIdByColumnId.set(columnId, group.id);
      }
    }

    const visibleColumnIds = new Set(visibleColumns.map((column) => column.id));
    const widthByColumnId = new Map(
      visibleColumns.map((column, index) => [
        column.id,
        typeof columnWidths[index] === "number" ? columnWidths[index] : 0,
      ] as const),
    );
    const emittedGroups = new Set<string>();
    return visibleColumns.flatMap((column) => {
      const groupId = groupIdByColumnId.get(column.id);

      if (!groupId) {
        return [{
          columnIds: [column.id],
          columnWidths: [widthByColumnId.get(column.id) ?? 0],
          id: `column:${column.id}`,
          pinned: state.columnState[column.id]?.pinned,
        }];
      }

      if (emittedGroups.has(groupId)) {
        return [];
      }

      emittedGroups.add(groupId);
      const group = state.columnGroups.find((candidate) => candidate.id === groupId);
      const columnIds = visibleColumns
        .map((candidate) => candidate.id)
        .filter((columnId) => visibleColumnIds.has(columnId) && group?.children.includes(columnId));

      return [{
        columnIds,
        columnWidths: columnIds.map((columnId) => widthByColumnId.get(columnId) ?? 0),
        id: `group:${groupId}`,
        pinned: state.columnGroupState[groupId]?.pinned,
      }];
    });

  }, [columnWidths, state.columnGroupState, state.columnGroups, state.columnState, visibleColumns]);
  const columnPinning = useMemo(
    () => resolveCominsColumnPinning(columnPinningBlocks, containerWidth),
    [columnPinningBlocks, containerWidth],
  );
  const getPinnedColumnAttributes = (columnId: string) => {
    const pin = columnPinning.columns.get(columnId);

    return {
      boundary: pin?.boundary,
      pinned: pin?.pinned,
      style: pin?.pinned
        ? {
            [pin.pinned]: pin.offset,
            position: "sticky",
          } as React.CSSProperties
        : undefined,
    };
  };
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
  const detailContentWidth =
    typeof tableWidth === "number" && Number.isFinite(tableWidth)
      ? Math.round(tableWidth)
      : 0;
  const headerRows = useMemo(() => getCominsHeaderRows(state), [state]);
  const normalizedColumnFilters = useMemo(
    () => filteringRequested
      ? normalizeCominsColumnFilterModel({
          columns: state.columns,
          model: columnFiltering?.model,
        })
      : [],
    [columnFiltering?.model, filteringRequested, state.columns],
  );
  const filteringActive = normalizedColumnFilters.length > 0;
  const normalizedColumnFilterById = useMemo(
    () => new Map(normalizedColumnFilters.map((rule) => [rule.column.id, rule] as const)),
    [normalizedColumnFilters],
  );
  const filteredDataIndexes = useMemo(
    () => filteringRequested
      ? getCominsFilteredRowIndexes({
          columns: state.columns,
          model: columnFiltering?.model,
          rows: state.rows.map((data, dataIndex) => ({
            data,
            dataIndex,
            id: state.rowIds[dataIndex]!,
          })),
        })
      : state.rows.map((_row, index) => index),
    [columnFiltering?.model, filteringRequested, state.columns, state.rowIds, state.rows],
  );
  const filteredRows = useMemo(
    () => filteredDataIndexes.flatMap((dataIndex) => {
      const row = state.rows[dataIndex];

      return row === undefined ? [] : [row];
    }),
    [filteredDataIndexes, state.rows],
  );
  const summaryValues = useMemo(
    () => (summary ? getCominsSummaryValues(treeContext?.summaryRows ?? filteredRows, visibleColumns, summary) : null),
    [filteredRows, summary, treeContext?.summaryRows, visibleColumns],
  );
  const summaryCells = useMemo(() => {
    if (!summary) {
      return [];
    }

    const cells: Array<{
      className?: string;
      colSpan: number;
      column: CominsTableRuntimeColumn<TData>;
      startIndex: number;
      style?: React.CSSProperties;
      value: React.ReactNode;
    }> = [];
    let columnIndex = 0;

    while (columnIndex < visibleColumns.length) {
      const column = visibleColumns[columnIndex]!;
      const configuredColumn = summary.columns[column.id];
      const config =
        typeof configuredColumn === "object" && configuredColumn !== null ? configuredColumn : undefined;
      const requestedColSpan = config?.colSpan;
      const normalizedColSpan =
        typeof requestedColSpan === "number" && Number.isFinite(requestedColSpan)
          ? Math.max(1, Math.floor(requestedColSpan))
          : 1;
      const colSpan = Math.min(normalizedColSpan, visibleColumns.length - columnIndex);

      cells.push({
        className: config?.className,
        colSpan,
        column,
        startIndex: columnIndex,
        style: config?.style,
        value: summaryValues?.[column.id] ?? (cells.length === 0 ? summary.label : null),
      });
      columnIndex += colSpan;
    }

    return cells;
  }, [summary, summaryValues, visibleColumns]);
  const groupingAggregations = rowGrouping?.aggregations;
  const groupingGetGroupId = rowGrouping?.getGroupId;
  const groupingGetGroupLabel = rowGrouping?.getGroupLabel;
  const groupingGetRowGroupId = rowGrouping?.getRowGroupId;
  const groupingGroups = rowGrouping?.groups;
  const normalizedGrouping = useMemo(
    () => groupingRequested && groupingGetGroupId && groupingGetRowGroupId && groupingGroups
      ? normalizeCominsRowGrouping({
          columns: state.columns,
          config: {
            aggregations: groupingAggregations,
            getGroupId: groupingGetGroupId,
            getGroupLabel: groupingGetGroupLabel,
            getRowGroupId: groupingGetRowGroupId,
            groups: groupingGroups,
          },
        })
      : null,
    [
      groupingAggregations,
      groupingGetGroupId,
      groupingGetGroupLabel,
      groupingGetRowGroupId,
      groupingGroups,
      groupingRequested,
      state.columns,
    ],
  );
  const groupModel = useMemo(
    () => normalizedGrouping && groupingGetRowGroupId
      ? createCominsGroupModel({
          ...normalizedGrouping,
          getRowGroupId: groupingGetRowGroupId,
          rows: filteredDataIndexes.flatMap((dataIndex) => {
            const data = state.rows[dataIndex];
            const id = state.rowIds[dataIndex];

            return data === undefined || id === undefined
              ? []
              : [{ data, dataIndex, id }];
          }),
        })
      : null,
    [filteredDataIndexes, groupingGetRowGroupId, normalizedGrouping, state.rowIds, state.rows],
  );
  const orderedGroupModel = useMemo(
    () => groupModel
      ? orderCominsGroupModel({
          columns: state.columns,
          model: groupModel,
          rows: state.rows,
          sortModel: state.sortModel,
        })
      : null,
    [groupModel, state.columns, state.rows, state.sortModel],
  );
  const normalizedExpandedGroupIds = useMemo(() => {
    const seen = new Set<CominsRowId>();
    const suppliedGroupIds = Array.isArray(rowGrouping?.expandedGroupIds)
      ? rowGrouping.expandedGroupIds
      : [];

    return suppliedGroupIds.filter((groupId) => {
      if (!orderedGroupModel?.groupsById.has(groupId) || seen.has(groupId)) {
        return false;
      }

      seen.add(groupId);
      return true;
    });
  }, [orderedGroupModel, rowGrouping?.expandedGroupIds]);
  const expandedGroupIdSet = useMemo(
    () => new Set(normalizedExpandedGroupIds),
    [normalizedExpandedGroupIds],
  );
  const toggleRowGroup = (groupId: CominsRowId) => {
    const onChangeExpandedGroupIds = rowGrouping?.onChangeExpandedGroupIds;

    if (typeof onChangeExpandedGroupIds !== "function" || !orderedGroupModel?.groupsById.has(groupId)) {
      return;
    }

    onChangeExpandedGroupIds(
      expandedGroupIdSet.has(groupId)
        ? normalizedExpandedGroupIds.filter((current) => current !== groupId)
        : [...normalizedExpandedGroupIds, groupId],
    );
  };
  const groupingProjection = useMemo(
    () => orderedGroupModel
      ? projectCominsGroups({
          expandedGroupIds: normalizedExpandedGroupIds,
          model: orderedGroupModel,
          rowIds: state.rowIds,
        })
      : null,
    [normalizedExpandedGroupIds, orderedGroupModel, state.rowIds],
  );
  const groupingActive = groupingProjection !== null;
  const transferEndpoint: CominsTableTransferEndpoint<TData, TGroup> | null =
    normalizedTableTransfer
      ? groupingActive && rowGrouping
        ? {
            data: state.rows,
            getGroupId: rowGrouping.getGroupId,
            getRowGroupId: rowGrouping.getRowGroupId,
            getRowId: state.getRowId,
            groups: rowGrouping.groups,
            setRowGroupId: rowGrouping.setRowGroupId,
            tableId: normalizedTableTransfer.tableId,
          }
        : {
            data: state.rows,
            getRowId: state.getRowId,
            tableId: normalizedTableTransfer.tableId,
          }
      : null;

  transferSnapshotRef.current = normalizedTableTransfer && transferEndpoint
    ? {
        config: normalizedTableTransfer,
        endpoint: transferEndpoint,
        instanceId: tableInstanceId,
        root: tableRootRef.current,
        viewport: containerRef.current,
      }
    : null;

  const transferCoordinator = normalizedTableTransfer?.coordinator;
  const transferScope = normalizedTableTransfer?.scope;
  const transferTableId = normalizedTableTransfer?.tableId;
  useEffect(() => {
    if (!transferCoordinator || !transferScope || !transferTableId) {
      return undefined;
    }

    return registerCominsTableTransfer(
      transferCoordinator,
      transferScope,
      transferTableId,
      {
        getSnapshot: () => {
          const snapshot = transferSnapshotRef.current;

          return snapshot
            ? {
                ...snapshot,
                root: tableRootRef.current,
                viewport: containerRef.current,
              }
            : null;
        },
      },
    );
  }, [transferCoordinator, transferScope, transferTableId]);

  useLayoutEffect(() => {
    if (!groupingProjection || !orderedGroupModel) {
      previousGroupedDataIndexesRef.current = null;
      pendingGroupDisclosureFocusRef.current = null;
      return;
    }

    const pendingGroupId = pendingGroupDisclosureFocusRef.current;

    if (pendingGroupId !== null) {
      const disclosure = groupDisclosureElementsRef.current.get(pendingGroupId);

      if (disclosure) {
        pendingGroupDisclosureFocusRef.current = null;
        focusedLeafDataIndexRef.current = null;
        disclosure.focus();
      }
    }

    const nextDataIndexes = new Set(
      groupingProjection.entries.flatMap((entry) =>
        entry.kind === "data" ? [entry.dataIndex] : [],
      ),
    );
    const previousDataIndexes = previousGroupedDataIndexesRef.current;
    const focusedDataIndex = focusedLeafDataIndexRef.current;

    previousGroupedDataIndexesRef.current = nextDataIndexes;

    if (
      focusedDataIndex === null ||
      !previousDataIndexes?.has(focusedDataIndex) ||
      nextDataIndexes.has(focusedDataIndex)
    ) {
      return;
    }

    const activeElement = document.activeElement;
    const focusWasInTable = activeElement
      ? containerRef.current?.contains(activeElement) || activeElement === document.body
      : false;

    if (!focusWasInTable) {
      return;
    }

    const leafGroup = [...orderedGroupModel.groupsById.values()].find((group) =>
      group.leafSourceIndexes.includes(focusedDataIndex),
    );
    const fallbackGroupId = leafGroup?.groupId;

    if (fallbackGroupId !== undefined) {
      groupDisclosureElementsRef.current.get(fallbackGroupId)?.focus();
    }
  }, [groupingProjection, orderedGroupModel]);
  const sortedRowIndexes = useMemo(
    () => (treeContext || groupingActive ? null : getCominsSortedRowIndexes(state, filteredDataIndexes)),
    [filteredDataIndexes, groupingActive, state, treeContext],
  );
  const projectedDataIndexes = useMemo(
    () => groupingProjection
      ? groupingProjection.entries.flatMap((entry) => entry.kind === "data" ? [entry.dataIndex] : [])
      : sortedRowIndexes ?? filteredDataIndexes,
    [filteredDataIndexes, groupingProjection, sortedRowIndexes],
  );
  const visibleRowCount = projectedDataIndexes.length;
  const visibleSlotCount = groupingProjection?.entries.length ?? visibleRowCount;
  const pageSize = Math.max(1, state.pagination.pageSize);
  const maxPageIndex = Math.max(0, Math.ceil(visibleRowCount / pageSize) - 1);
  const effectivePageIndex = Math.min(Math.max(0, state.pagination.pageIndex), maxPageIndex);
  const pageStartIndex = effectivePageIndex * pageSize;
  useEffect(() => {
    if (!groupingProjection && !filteringRequested) {
      return;
    }

    const visibleRowIds = new Set(
      groupingProjection?.visibleLeafRowIds ?? projectedDataIndexes.flatMap((dataIndex) => {
        const rowId = state.rowIds[dataIndex];

        return rowId === undefined ? [] : [rowId];
      }),
    );
    const current = stateRef.current;
    const cellHidden = current.selection.cell !== null && !visibleRowIds.has(current.selection.cell.rowId);
    const rangeHidden = current.selection.range !== null && (
      !visibleRowIds.has(current.selection.range.anchor.rowId) ||
      !visibleRowIds.has(current.selection.range.focus.rowId)
    );

    if (!cellHidden && !rangeHidden) {
      return;
    }

    if (cellHidden) {
      lastCellAnchorRef.current = null;
    }
    rangeDragAnchorRef.current = null;
    rangeDragLastAddressRef.current = null;
    commitState({
      ...current,
      selection: {
        ...current.selection,
        cell: cellHidden ? null : current.selection.cell,
        range: rangeHidden || cellHidden ? null : current.selection.range,
      },
    });
  }, [filteringRequested, groupingProjection, projectedDataIndexes, state.rowIds]);
  const effectiveExpandedRowIdSet = useMemo(() => {
    if (!rowDetailEnabled) {
      return new Set<CominsRowId>();
    }

    const next = new Set<CominsRowId>();
    const startIndex = virtualized || groupingActive ? 0 : pageStartIndex;
    const endIndex = virtualized
      ? projectedDataIndexes.length
      : groupingActive
        ? projectedDataIndexes.length
      : Math.min(projectedDataIndexes.length, pageStartIndex + pageSize);

    for (let visibleIndex = startIndex; visibleIndex < endIndex; visibleIndex += 1) {
      const dataIndex = projectedDataIndexes[visibleIndex];

      if (dataIndex === undefined) {
        continue;
      }

      const row = state.rows[dataIndex];
      const rowId = state.rowIds[dataIndex];

      if (
        row === undefined ||
        rowId === undefined ||
        !expandedRowIdSet.has(rowId)
      ) {
        continue;
      }

      const entry = { dataIndex, row, rowId, visibleIndex };
      const params = { row: createEventRow(entry) };

      if (isRowExpandable?.(params) !== false) {
        next.add(rowId);
      }
    }

    return next;
  }, [
    expandedRowIdSet,
    groupingActive,
    isRowExpandable,
    pageSize,
    pageStartIndex,
    projectedDataIndexes,
    rowDetailEnabled,
    state.rowIds,
    state.rows,
    virtualized,
  ]);
  const fullProjectionSlots = useMemo<Array<CominsVirtualSlot<TData>>>(() => {
    const safeRowHeight = Math.max(1, rowHeight);
    const entries: readonly CominsGroupingProjectionEntry[] = groupingProjection?.entries ?? projectedDataIndexes.map(
      (dataIndex, visibleLeafIndex) => {
        const rowId = state.rowIds[dataIndex];

        return rowId === undefined
          ? null
          : {
              dataIndex,
              key: getCominsDataSlotKey(rowId),
              kind: "data" as const,
              rowId,
              visibleLeafIndex,
            };
      },
    ).filter((entry): entry is Extract<CominsGroupingProjectionEntry, { kind: "data" }> => entry !== null);

    return entries.flatMap<CominsVirtualSlot<TData>>((projectionEntry) => {
      if (projectionEntry.kind === "group") {
        return [{
          groupId: projectionEntry.groupId,
          height: safeRowHeight,
          key: projectionEntry.key,
          kind: "group",
        }];
      }

      const { dataIndex, rowId, visibleLeafIndex: visibleIndex } = projectionEntry;
        const row = state.rows[dataIndex];

        if (row === undefined || rowId === undefined) {
          return [];
        }

        let detail: CominsDataVirtualSlot<TData>["detail"] | null = null;

        if (effectiveExpandedRowIdSet.has(rowId)) {
          const params = { row: createEventRow({ dataIndex, row, rowId, visibleIndex }) };
          const normalized = normalizeCominsDetailHeight(getRowDetailHeight?.(params));

          detail =
            normalized.mode === "auto"
              ? {
                  ...resolveCominsMeasuredDetailHeight(
                    detailMeasurementsRef.current,
                    rowId,
                    detailContentWidth,
                    normalizeCominsDetailEstimate(estimatedRowDetailHeight, rowHeight),
                  ),
                  mode: "auto",
                }
              : { estimated: false, height: normalized.height, mode: "fixed" };
        }

        return [
          createCominsDataVirtualSlot({
            dataIndex,
            detail,
            row,
            rowHeight: safeRowHeight,
            rowId,
            visibleIndex,
          }),
        ];
    });
  }, [
    detailContentWidth,
    virtualized ? 0 : detailLayoutVersion,
    effectiveExpandedRowIdSet,
    estimatedRowDetailHeight,
    getRowDetailHeight,
    groupingProjection,
    projectedDataIndexes,
    rowHeight,
    state.rowIds,
    state.rows,
  ]);
  const mixedProjection = useMemo<CominsMixedVirtualProjection<TData> | null>(() => {
    if (!virtualized || effectiveExpandedRowIdSet.size === 0) {
      return null;
    }

    const safeRowHeight = Math.max(1, rowHeight);
    const slots = fullProjectionSlots;
    const heightIndex = CominsHeightIndex.from(
      slots.map((slot) => getCominsSlotHeight(slot, safeRowHeight)),
    );
    const slotIndexByRowId = new Map<CominsRowId, number>();

    for (let slotIndex = 0; slotIndex < slots.length; slotIndex += 1) {
      const slot = slots[slotIndex];
      const rowId = slot?.kind === "data" ? slot.rowId : undefined;

      if (rowId !== undefined && !slotIndexByRowId.has(rowId)) {
        slotIndexByRowId.set(rowId, slotIndex);
      }
    }

    return {
      heightIndex,
      keys: slots.map((slot) => slot.key),
      slotIndexByRowId,
      slots,
    };
  }, [
    effectiveExpandedRowIdSet,
    fullProjectionSlots,
    rowHeight,
    virtualized,
  ]);
  const detailObserverSnapshotCandidate = useMemo<
    CominsCommittedDetailObserverSnapshot<TData>
  >(
    () => ({
      contentWidth: detailContentWidth,
      projection: mixedProjection,
      viewportHeight:
        containerHeight || Math.max(1, rowHeight) * 12,
    }),
    [containerHeight, detailContentWidth, mixedProjection, rowHeight],
  );

  useLayoutEffect(() => {
    committedDetailObserverSnapshotRef.current =
      detailObserverSnapshotCandidate;

    if (detailElementsRef.current.size === 0) {
      disconnectDetailObserverIfIdle();
      return;
    }

    if (typeof ResizeObserver !== "undefined") {
      const currentObserver = detailObserverRef.current;
      const observer = currentObserver ?? createDetailObserver();

      if (currentObserver) {
        for (const observed of detailElementsRef.current.values()) {
          if (!detailObserverTargetsRef.current.has(observed.element)) {
            detailObserverTargetsRef.current.add(observed.element);
            observer?.observe(observed.element);
          }
        }
      }
      return;
    }

    const updates: Array<{
      height: number;
      rowId: CominsRowId;
      width: number;
    }> = [];

    for (const observed of detailElementsRef.current.values()) {
      if (fallbackMeasuredDetailElementsRef.current.has(observed.element)) {
        continue;
      }

      fallbackMeasuredDetailElementsRef.current.add(observed.element);
      const rect = observed.element.getBoundingClientRect();

      if (Number.isFinite(rect.height) && rect.height > 0) {
        updates.push({
          height: rect.height,
          rowId: observed.rowId,
          width: Math.round(rect.width),
        });
      }
    }

    applyDetailMeasurementUpdates(updates);
  });
  const rowWindow = useMemo<CominsVirtualWindow<TData>>(() => {
    if (virtualized) {
      const safeRowHeight = Math.max(1, rowHeight);
      const viewportHeight = containerHeight || rowHeight * 12;

      if (mixedProjection) {
        const activeAnchorTransaction =
          logicalAnchorTransaction &&
          Math.abs(
            scrollTop - logicalAnchorTransaction.actualPhysical,
          ) <= 0.5
            ? logicalAnchorTransaction
            : null;
        const range = getCominsMixedVirtualRange({
          heightIndex: mixedProjection.heightIndex,
          overscan: virtualBufferSize,
          physicalScrollTop:
            activeAnchorTransaction?.requestedPhysical ?? scrollTop,
          viewportHeight,
        });

        return {
          mixed: true,
          renderOffset: activeAnchorTransaction
            ? activeAnchorTransaction.actualPhysical -
              (activeAnchorTransaction.targetLogical -
                range.logicalStartOffset)
            : range.renderOffset,
          scrollHeight: range.physicalScrollHeight,
          slots: mixedProjection.slots.slice(range.startIndex, range.endIndex),
        };
      }

      const totalHeight = visibleSlotCount * safeRowHeight;
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
        visibleSlotCount,
        Math.ceil((logicalScrollTop + Math.max(0, viewportHeight)) / safeRowHeight) + virtualBufferSize,
      );
      const logicalTopSpacerHeight = startIndex * safeRowHeight;
      const renderOffset = scrollScale > 0 ? logicalTopSpacerHeight / scrollScale : logicalTopSpacerHeight;

      return {
        mixed: false,
        renderOffset,
        scrollHeight: physicalTotalHeight,
        slots: fullProjectionSlots.slice(startIndex, endIndex),
      };
    }

    return {
      mixed: false,
      renderOffset: 0,
      scrollHeight: 0,
      slots: groupingActive
        ? fullProjectionSlots
        : fullProjectionSlots.slice(pageStartIndex, pageStartIndex + pageSize),
    };
  }, [
    containerHeight,
    detailLayoutVersion,
    fullProjectionSlots,
    groupingActive,
    logicalAnchorTransaction,
    mixedProjection,
    pageStartIndex,
    rowHeight,
    scrollTop,
    pageSize,
    virtualBufferSize,
    virtualized,
    visibleSlotCount,
  ]);
  const currentVirtualProjection = useMemo<CominsVirtualProjection | null>(
    () =>
      !virtualized
        ? null
        : mixedProjection
          ? {
              heightIndex: mixedProjection.heightIndex,
              keys: mixedProjection.keys,
              mixed: true,
            }
          : {
              keys: fullProjectionSlots.map((slot) => slot.key),
              mixed: false,
              rowHeight: Math.max(1, rowHeight),
              visibleRowCount: visibleSlotCount,
            },
    [
      mixedProjection,
      fullProjectionSlots,
      rowHeight,
      virtualized,
      visibleSlotCount,
    ],
  );
  const previousVirtualProjection = previousVirtualProjectionRef.current;
  const pendingDetailAnchor = pendingDetailAnchorRef.current;
  const pendingVirtualAnchor =
    !pendingDetailAnchor &&
    currentVirtualProjection &&
    previousVirtualProjection &&
    currentVirtualProjection !== previousVirtualProjection &&
    containerRef.current
      ? captureCominsVirtualAnchor({
          logicalScrollTop:
            logicalAnchorTransaction &&
            Math.abs(
              containerRef.current.scrollTop -
                logicalAnchorTransaction.actualPhysical,
            ) <= 0.5
              ? logicalAnchorTransaction.targetLogical
              : undefined,
          physicalScrollTop: containerRef.current.scrollTop,
          projection: previousVirtualProjection,
          viewportHeight:
            containerRef.current.clientHeight || containerHeight || rowHeight * 12,
        })
      : undefined;
  const pendingAnchorTransaction =
    pendingDetailAnchor?.status === "pending"
      ? pendingDetailAnchor
      : pendingVirtualAnchor;
  useLayoutEffect(() => {
    if (!currentVirtualProjection) {
      previousVirtualProjectionRef.current = null;
      pendingDetailAnchorRef.current = null;
      logicalAnchorTransactionRef.current = null;
      setLogicalAnchorTransaction(null);
      return;
    }

    previousVirtualProjectionRef.current = currentVirtualProjection;

    if (pendingDetailAnchor?.status === "cancelled") {
      const currentPendingDetailAnchor = pendingDetailAnchorRef.current;

      if (
        currentPendingDetailAnchor?.revision ===
          pendingDetailAnchor.revision &&
        currentPendingDetailAnchor.status === "cancelled"
      ) {
        pendingDetailAnchorRef.current = null;
      }
      return;
    }

    const viewport = containerRef.current;

    if (!viewport || !pendingAnchorTransaction) {
      return;
    }

    const nextKeys = getCominsVirtualProjectionKeys(currentVirtualProjection);
    const target = resolveCominsAnchorTarget({
      anchor: pendingAnchorTransaction.anchor,
      getNextHeight: (index) =>
        currentVirtualProjection.mixed
          ? currentVirtualProjection.heightIndex.getHeight(index)
          : currentVirtualProjection.rowHeight,
      nextKeys,
      previousKeys: pendingAnchorTransaction.previousKeys,
    });
    const nextLogicalScrollTop = target
      ? (currentVirtualProjection.mixed
          ? currentVirtualProjection.heightIndex.getPrefixHeight(target.index)
          : target.index * currentVirtualProjection.rowHeight) +
        target.offsetWithinSlot
      : 0;
    const nextLogicalTotalHeight = currentVirtualProjection.mixed
      ? currentVirtualProjection.heightIndex.getTotalHeight()
      : currentVirtualProjection.visibleRowCount * currentVirtualProjection.rowHeight;
    const nextPhysicalScrollTop = getCominsPhysicalScrollTop(
      nextLogicalScrollTop,
      nextLogicalTotalHeight,
      viewport.clientHeight || pendingAnchorTransaction.previousViewportHeight,
    );

    if (pendingDetailAnchor) {
      const currentPendingDetailAnchor = pendingDetailAnchorRef.current;

      if (
        currentPendingDetailAnchor?.revision !==
          pendingDetailAnchor.revision ||
        currentPendingDetailAnchor.status !== "pending"
      ) {
        return;
      }
    }

    if (scrollFrameRef.current !== null) {
      window.cancelAnimationFrame(scrollFrameRef.current);
      scrollFrameRef.current = null;
    }

    viewport.scrollTop = nextPhysicalScrollTop;

    if (pendingDetailAnchor) {
      const currentPendingDetailAnchor = pendingDetailAnchorRef.current;

      if (
        currentPendingDetailAnchor?.revision !==
          pendingDetailAnchor.revision ||
        currentPendingDetailAnchor.status !== "pending"
      ) {
        return;
      }
    }

    const actualPhysicalScrollTop = viewport.scrollTop;
    const revision =
      pendingDetailAnchor?.revision ??
      anchorRevisionRef.current + 1;
    const nextAnchorTransaction = currentVirtualProjection.mixed
      ? {
          actualPhysical: actualPhysicalScrollTop,
          requestedPhysical: nextPhysicalScrollTop,
          revision,
          targetLogical: nextLogicalScrollTop,
        }
      : null;

    anchorRevisionRef.current = Math.max(
      anchorRevisionRef.current,
      revision,
    );
    if (pendingDetailAnchor) {
      pendingDetailAnchorRef.current = null;
    }
    logicalAnchorTransactionRef.current = nextAnchorTransaction;
    pendingScrollTopRef.current = actualPhysicalScrollTop;
    setLogicalAnchorTransaction(nextAnchorTransaction);
    setScrollTop(actualPhysicalScrollTop);
  }, [currentVirtualProjection, pendingAnchorTransaction]);
  const currentTheme = theme ?? state.theme;
  const densityClass =
    currentTheme.density === "compact"
      ? "text-[11px]"
      : currentTheme.density === "spacious"
        ? "text-[13px]"
        : "text-[length:var(--comins-font-size-base,12px)]";
  const selectedRowIdSet = useMemo(() => new Set(state.selection.rowIds), [state.selection.rowIds]);
  const hasHorizontalOverflow =
    typeof columnWidthTotal === "number" && containerWidth > 0 ? columnWidthTotal > containerWidth + 1 : false;
  useLayoutEffect(() => {
    const nextContentWidth = containerRef.current?.scrollWidth ?? 0;
    const nextViewportOuterWidth = containerRef.current?.offsetWidth ?? 0;
    const nextViewportWidth = containerRef.current?.clientWidth ?? 0;

    setHorizontalScrollContentWidth((current) =>
      Math.abs(current - nextContentWidth) > 0.5 ? nextContentWidth : current);
    setHorizontalViewportOuterWidth((current) =>
      Math.abs(current - nextViewportOuterWidth) > 0.5 ? nextViewportOuterWidth : current);
    setHorizontalViewportWidth((current) =>
      Math.abs(current - nextViewportWidth) > 0.5 ? nextViewportWidth : current);
  }, [containerWidth, hasHorizontalOverflow, tableWidth]);
  const synchronizedHorizontalViewportWidth =
    horizontalViewportWidth > 0
      ? horizontalViewportWidth
      : containerWidth > 0
        ? containerWidth
        : undefined;
  const synchronizedHorizontalScrollbarWidth =
    horizontalViewportOuterWidth > 0
      ? horizontalViewportOuterWidth
      : synchronizedHorizontalViewportWidth;
  const synchronizedHorizontalContentWidth = horizontalScrollContentWidth > 0
    ? Math.max(typeof tableWidth === "number" ? tableWidth : 0, horizontalScrollContentWidth)
    : tableWidth;
  const resolvedHasMoreRows = groupingRequested || filteringRequested ? false : hasMoreRows;
  const resolvedLoading = loading;
  const resolvedLoadingMore = groupingRequested || filteringRequested ? false : loadingMore;
  const isEmpty = visibleSlotCount === 0;
  const shouldRenderSkeleton = resolvedLoading && isEmpty;
  const shouldRenderEmpty = !resolvedLoading && isEmpty;
  const shouldRenderInfiniteLoadingRow =
    !groupingRequested &&
    !filteringRequested &&
    (infiniteScroll || lazyLoad) &&
    resolvedLoadingMore &&
    resolvedHasMoreRows &&
    !isEmpty;
  const resolvedSkeletonRowCount = Math.max(
    1,
    Math.floor(skeletonRowCount ?? Math.min(Math.max(1, state.pagination.pageSize), 5)),
  );
  const stateRowCount =
    (shouldRenderSkeleton ? resolvedSkeletonRowCount : shouldRenderEmpty ? 1 : 0) +
    (shouldRenderInfiniteLoadingRow ? 1 : 0);
  const renderedRowsHeight =
    rowWindow.slots.reduce(
      (height, slot) => height + getCominsSlotHeight(slot, rowHeight),
      0,
    ) + stateRowCount * rowHeight;
  const emptyFillerHeight = virtualized ? 0 : Math.max(0, containerHeight - renderedRowsHeight);
  const renderedHeaderVisible = state.showHeader && (persistHeaderWhenEmpty || !isEmpty || resolvedLoading);

  const isCopyPasteKey = (event: React.KeyboardEvent, key: "c" | "v") =>
    (event.ctrlKey || event.metaKey) && event.key.toLowerCase() === key;
  const getVisibleEntryByRenderedIndex = (index: number) => {
    const slot = rowWindow.slots[index];

    return slot?.kind === "data" ? slot : undefined;
  };
  const getVisibleRowIdsBetween = (
    current: CominsTableState<TData>,
    anchorRowId: CominsRowId,
    focusRowId: CominsRowId,
  ) => {
    if (groupingProjection) {
      const anchorIndex = groupingProjection.visibleLeafRowIds.indexOf(anchorRowId);
      const focusIndex = groupingProjection.visibleLeafRowIds.indexOf(focusRowId);

      if (anchorIndex < 0 || focusIndex < 0) {
        return [focusRowId];
      }

      const start = Math.min(anchorIndex, focusIndex);
      const end = Math.max(anchorIndex, focusIndex);

      return groupingProjection.visibleLeafRowIds.slice(start, end + 1);
    }

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
        if (groupingProjection) {
          const rowId = groupingProjection.visibleLeafRowIds[index];

          return rowId === undefined ? [] : [rowId];
        }

        const entry = getVisibleEntryByRenderedIndex(index);

        return entry ? [entry.rowId] : [];
      });

      return selectRows(current, rowIds);
    });
  };
  const clearSuppressedSortClick = () => {
    const suppressed = suppressedSortClickRef.current;

    if (!suppressed) {
      return;
    }

    suppressed.cleanup();

    if (suppressed.timer !== null) {
      window.clearTimeout(suppressed.timer);
    }

    suppressedSortClickRef.current = null;
  };
  const suppressNextSortClick = (columnId: string) => {
    if (suppressedSortClickRef.current?.columnId === columnId) {
      return;
    }

    clearSuppressedSortClick();
    suppressedSortClickRef.current = { cleanup: () => undefined, columnId, timer: null };
  };
  const scheduleSuppressedSortClickClear = () => {
    const suppressed = suppressedSortClickRef.current;

    if (!suppressed) {
      return;
    }

    suppressed.cleanup();
    suppressed.cleanup = () => undefined;
    suppressed.timer = window.setTimeout(() => {
      if (suppressedSortClickRef.current === suppressed) {
        suppressedSortClickRef.current = null;
      }
    }, 0);
  };
  const keepSuppressedSortClickUntilPointerEnd = () => {
    const suppressed = suppressedSortClickRef.current;

    if (!suppressed) {
      return;
    }

    const handlePointerUp = () => scheduleSuppressedSortClickClear();
    const handlePointerCancel = () => clearSuppressedSortClick();
    const handleWindowBlur = () => clearSuppressedSortClick();

    suppressed.cleanup();
    suppressed.cleanup = () => {
      window.removeEventListener("pointerup", handlePointerUp);
      window.removeEventListener("pointercancel", handlePointerCancel);
      window.removeEventListener("blur", handleWindowBlur);
    };
    window.addEventListener("pointerup", handlePointerUp, { once: true });
    window.addEventListener("pointercancel", handlePointerCancel, { once: true });
    window.addEventListener("blur", handleWindowBlur, { once: true });
  };
  const consumeSuppressedSortClick = (columnId: string) => {
    if (suppressedSortClickRef.current?.columnId !== columnId) {
      return false;
    }

    clearSuppressedSortClick();

    return true;
  };
  const activateHeaderSort = (column: CominsTableRuntimeColumn<TData>, additive: boolean) => {
    if (!column.sort) {
      return;
    }

    commitState((current) =>
      setCominsSortModel(current, getNextSortModel(current.sortModel, column.id, multiSort && additive)),
    );
  };

  const getColumnMoveTarget = (clientX: number, clientY: number): CominsColumnMoveHeader | null => {
    const targetHeader = document
      .elementFromPoint(clientX, clientY)
      ?.closest<HTMLElement>("[data-comins-column-id], [data-comins-column-group-id]");

    if (!targetHeader) {
      return null;
    }

    const depth = Number(targetHeader.dataset.cominsColumnDepth);

    if (depth !== 0 && depth !== 1) {
      return null;
    }

    if (targetHeader.dataset.cominsColumnId) {
      return {
        depth,
        id: targetHeader.dataset.cominsColumnId,
        kind: "column",
        parentGroupId: targetHeader.dataset.cominsColumnParentGroupId,
      };
    }

    const groupId = targetHeader.dataset.cominsColumnGroupId;

    return groupId ? { depth, id: groupId, kind: "group" } : null;
  };
  const getColumnMoveTargetIndex = (target: CominsColumnMoveHeader) => {
    const targetColumnId =
      target.kind === "column"
        ? target.id
        : stateRef.current.columnGroups
            .find((group) => group.id === target.id)
            ?.children.find((childId) => visibleColumns.some((column) => column.id === childId));

    return targetColumnId
      ? stateRef.current.columnOrder.indexOf(targetColumnId)
      : -1;
  };
  const getColumnMoveHeaderPinned = (header: CominsColumnMoveHeader) => {
    if (header.kind === "group") {
      return stateRef.current.columnGroupState[header.id]?.pinned;
    }

    return header.parentGroupId
      ? stateRef.current.columnGroupState[header.parentGroupId]?.pinned
      : stateRef.current.columnState[header.id]?.pinned;
  };

  useImperativeHandle(
    ref,
    () => ({
      clearSort: () => commitState((current) => clearCominsSortState(current)),
      expand: (nodeIds) => treeContext?.onExpand(nodeIds),
      expandGroups: (groupIds) => {
        const onChangeExpandedGroupIds = rowGrouping?.onChangeExpandedGroupIds;

        if (!orderedGroupModel || typeof onChangeExpandedGroupIds !== "function") {
          return;
        }

        const requestedIds = groupIds === undefined
          ? orderedGroupModel.groupIds
          : groupIds.filter((groupId) => orderedGroupModel.groupsById.has(groupId));

        if (requestedIds.length === 0) {
          return;
        }

        const nextGroupIds = [...normalizedExpandedGroupIds];
        const nextGroupIdSet = new Set(nextGroupIds);

        for (const groupId of requestedIds) {
          if (!nextGroupIdSet.has(groupId)) {
            nextGroupIdSet.add(groupId);
            nextGroupIds.push(groupId);
          }
        }

        if (nextGroupIds.length !== normalizedExpandedGroupIds.length) {
          onChangeExpandedGroupIds(nextGroupIds);
        }
      },
      fold: (nodeIds) => treeContext?.onFold(nodeIds),
      foldGroups: (groupIds) => {
        const onChangeExpandedGroupIds = rowGrouping?.onChangeExpandedGroupIds;

        if (!orderedGroupModel || typeof onChangeExpandedGroupIds !== "function") {
          return;
        }

        if (groupIds === undefined) {
          if (normalizedExpandedGroupIds.length > 0) {
            onChangeExpandedGroupIds([]);
          }
          return;
        }

        if (groupIds.length === 0) {
          return;
        }

        const groupIdSet = new Set(
          groupIds.filter((groupId) => orderedGroupModel.groupsById.has(groupId)),
        );
        const nextGroupIds = normalizedExpandedGroupIds.filter(
          (groupId) => !groupIdSet.has(groupId),
        );

        if (nextGroupIds.length !== normalizedExpandedGroupIds.length) {
          onChangeExpandedGroupIds(nextGroupIds);
        }
      },
      getColumnLayout: () => serializeCominsColumnLayout(state),
      getSortModel: () => state.sortModel,
      getSortState: () => state.sort,
      setColumnLayout: (layout) =>
        commitState((current) => applyCominsColumnLayout(current, layout), { columnLayoutChanged: true }),
      setMoveTargetRow: (targetIdx, sourceIdx) =>
        commitState((current) => {
          if (treeContext || groupingRequested || filteringRequested) {
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
            sortModel: [],
          };
        }),
      setSelectedRow: (index) => selectRowsByVisibleIndexes([index]),
      setSelectedRows: (indexes) => selectRowsByVisibleIndexes(indexes),
      setSortModel: (sortModel) => commitState((current) => setCominsSortModel(current, sortModel)),
      setSortState: (sort) => commitState((current) => setCominsSortState(current, sort)),
    }),
    [
      groupingProjection,
      groupingRequested,
      filteringRequested,
      normalizedExpandedGroupIds,
      orderedGroupModel,
      rowGrouping,
      rowWindow.slots,
      state,
      treeContext,
    ],
  );

  const clearColumnPointerInteraction = () => {
    const interaction = columnPointerInteractionRef.current;

    if (interaction) {
      interaction.cleanup();

      if (interaction.timer !== null) {
        window.clearTimeout(interaction.timer);
      }
    }

    columnPointerInteractionRef.current = null;
    setMovingColumnId(null);
    setMovingGroupId(null);
    setColumnMovePointer(null);
    setColumnMoveTarget(null);
  };

  useEffect(
    () => () => {
      clearColumnPointerInteraction();
      clearSuppressedSortClick();
      columnMoveAnimationCleanupRef.current?.();
    },
    [],
  );

  const captureColumnMoveAnimationSnapshot = () => {
    columnMoveAnimationCleanupRef.current?.();
    columnMoveAnimationCleanupRef.current = null;
    columnMoveAnimationSnapshotRef.current = null;

    if (typeof window.matchMedia === "function" && window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      return;
    }

    const elements = [headerRef.current, containerRef.current, footerRef.current].flatMap((root) =>
      root
        ? Array.from(
            root.querySelectorAll<HTMLElement>(
              "[data-comins-column-id], [data-comins-cell-column-id], [data-comins-summary-column-id]",
            ),
          )
        : [],
    );
    const snapshot = new Map<HTMLElement, number>();

    for (const element of elements) {
      snapshot.set(element, element.getBoundingClientRect().left);
    }

    columnMoveAnimationSnapshotRef.current = snapshot;
  };

  useLayoutEffect(() => {
    const snapshot = columnMoveAnimationSnapshotRef.current;
    columnMoveAnimationSnapshotRef.current = null;

    if (!snapshot) {
      return undefined;
    }

    const animatedElements: HTMLElement[] = [];

    for (const [element, previousLeft] of snapshot) {
      if (!element.isConnected) {
        continue;
      }

      const offset = previousLeft - element.getBoundingClientRect().left;

      if (Math.abs(offset) < 0.5) {
        continue;
      }

      element.dataset.columnMoveAnimating = "prepare";
      element.style.setProperty("--comins-column-move-offset", `${offset}px`);
      animatedElements.push(element);
    }

    if (animatedElements.length === 0) {
      return undefined;
    }

    void animatedElements[0]?.getBoundingClientRect();
    let frame = 0;
    let timeout = 0;
    const cleanup = () => {
      window.cancelAnimationFrame(frame);
      window.clearTimeout(timeout);

      for (const element of animatedElements) {
        delete element.dataset.columnMoveAnimating;
        element.style.removeProperty("--comins-column-move-offset");
      }

      if (columnMoveAnimationCleanupRef.current === cleanup) {
        columnMoveAnimationCleanupRef.current = null;
      }
    };

    columnMoveAnimationCleanupRef.current = cleanup;
    frame = window.requestAnimationFrame(() => {
      for (const element of animatedElements) {
        element.dataset.columnMoveAnimating = "true";
        element.style.setProperty("--comins-column-move-offset", "0px");
      }
    });
    timeout = window.setTimeout(cleanup, 220);

    return cleanup;
  }, [state.columnOrder]);

  const beginColumnPointerInteraction = (options: CominsColumnPointerOptions) => {
    if (options.event.button !== 0) {
      return;
    }

    const pointerType: string = options.event.pointerType;
    const isMousePointer = pointerType === "mouse" || pointerType === "";
    const suppressPendingSort = () => {
      if (options.sortColumnId) {
        suppressNextSortClick(options.sortColumnId);
      }
    };
    const activateCurrent = (x: number, y: number) => {
      const current = columnPointerInteractionRef.current;

      if (!current || current !== interaction || current.active || current.blocked) {
        return;
      }

      current.active = true;
      current.cancelSort = true;
      suppressPendingSort();
      options.activate(x, y);
      setColumnMoveTarget({ ...options.source, status: "neutral" });
    };
    const handlePointerMove = (moveEvent: PointerEvent) => {
      const current = columnPointerInteractionRef.current;

      if (!current || current !== interaction) {
        return;
      }

      if (!current.active && !current.blocked && isMousePointer) {
        const intent = getCominsColumnMouseIntent({
          clientX: moveEvent.clientX,
          clientY: moveEvent.clientY,
          startX: current.startX,
          startY: current.startY,
        });

        if (intent === "activate") {
          activateCurrent(moveEvent.clientX, moveEvent.clientY);
        } else if (intent === "cancel") {
          current.blocked = true;
          current.cancelSort = true;
          suppressPendingSort();
        }
      }

      if (!current.active && !current.blocked && !isMousePointer) {
        const distance = Math.hypot(moveEvent.clientX - current.startX, moveEvent.clientY - current.startY);

        if (distance > 4) {
          current.blocked = true;
          current.cancelSort = true;
          window.clearTimeout(current.timer ?? undefined);
          suppressPendingSort();
        }
      }

      if (current.active) {
        moveEvent.preventDefault();
        setColumnMovePointer({ x: moveEvent.clientX, y: moveEvent.clientY });
        const target = getColumnMoveTarget(moveEvent.clientX, moveEvent.clientY);
        setColumnMoveTarget(target ? { ...target, status: options.resolveTarget(target) } : null);
      }
    };
    const handlePointerUp = (upEvent: PointerEvent) => {
      const current = columnPointerInteractionRef.current;

      if (current === interaction && current.active) {
        const target = getColumnMoveTarget(upEvent.clientX, upEvent.clientY);

        if (target && options.resolveTarget(target) === "valid") {
          options.commitTarget(target);
        }
      }

      if (current === interaction && current.cancelSort) {
        scheduleSuppressedSortClickClear();
      }

      clearColumnPointerInteraction();
    };
    const handlePointerCancel = () => {
      clearSuppressedSortClick();
      clearColumnPointerInteraction();
    };
    const handleKeyDown = (keyEvent: KeyboardEvent) => {
      if (keyEvent.key === "Escape") {
        keyEvent.preventDefault();

        if (columnPointerInteractionRef.current === interaction && interaction.cancelSort) {
          keepSuppressedSortClickUntilPointerEnd();
        }

        clearColumnPointerInteraction();
      }
    };
    const handleWindowBlur = () => {
      clearSuppressedSortClick();
      clearColumnPointerInteraction();
    };
    const interaction: CominsColumnPointerInteraction = {
      active: false,
      blocked: false,
      cancelSort: false,
      cleanup: () => {
        window.removeEventListener("pointermove", handlePointerMove, true);
        window.removeEventListener("pointerup", handlePointerUp, true);
        window.removeEventListener("pointercancel", handlePointerCancel, true);
        window.removeEventListener("keydown", handleKeyDown);
        window.removeEventListener("blur", handleWindowBlur);
      },
      id: options.id,
      kind: options.kind,
      pointerType,
      startX: options.event.clientX,
      startY: options.event.clientY,
      timer: null,
    };

    clearColumnPointerInteraction();
    clearSuppressedSortClick();

    if (!isMousePointer) {
      interaction.timer = window.setTimeout(() => {
        const current = columnPointerInteractionRef.current;

        if (current === interaction && !current.active && !current.blocked) {
          activateCurrent(current.startX, current.startY);
        }
      }, 1000);
    }

    columnPointerInteractionRef.current = interaction;
    window.addEventListener("pointermove", handlePointerMove, true);
    window.addEventListener("pointerup", handlePointerUp, true);
    window.addEventListener("pointercancel", handlePointerCancel, true);
    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("blur", handleWindowBlur);

    if (options.activateImmediately) {
      activateCurrent(interaction.startX, interaction.startY);
    }
  };

  const beginHeaderPointerInteraction = (
    event: React.PointerEvent<HTMLElement>,
    cell: Extract<CominsHeaderCell<TData>, { kind: "column" }>,
    activateImmediately = false,
  ) => {
    const column = cell.column;

    if (
      column.lockPosition ||
      (!cell.groupId && stateRef.current.columnState[column.id]?.pinned !== undefined)
    ) {
      return;
    }

    const source: CominsColumnMoveHeader = {
      depth: cell.groupId ? 1 : 0,
      id: column.id,
      kind: "column",
      parentGroupId: cell.groupId,
    };
    beginColumnPointerInteraction({
      activateImmediately,
      activate: (x, y) => {
        setColumnMovePointer({ x, y });
        setMovingGroupId(null);
        setMovingColumnId(column.id);
      },
      commitTarget: (target) => {
        if (getColumnMoveHeaderPinned(target) !== getColumnMoveHeaderPinned(source)) {
          return;
        }

        const targetIndex = getColumnMoveTargetIndex(target);

        if (targetIndex >= 0) {
          const current = stateRef.current;
          const next = moveCominsColumn(current, column.id, targetIndex);

          if (
            next !== current &&
            next.columnOrder.some((columnId, index) => columnId !== current.columnOrder[index])
          ) {
            captureColumnMoveAnimationSnapshot();
            commitState(next, { columnLayoutChanged: true });
          }
        }
      },
      event,
      id: column.id,
      kind: "column",
      resolveTarget: (target) => {
        if (getColumnMoveHeaderPinned(target) !== getColumnMoveHeaderPinned(source)) {
          return "invalid";
        }

        const targetIndex = getColumnMoveTargetIndex(target);

        if (targetIndex < 0) {
          return "invalid";
        }

        const current = stateRef.current;
        const next = moveCominsColumn(current, column.id, targetIndex);

        return getCominsColumnDropStatus(
          source,
          target,
          next.columnOrder.some((columnId, index) => columnId !== current.columnOrder[index]),
        );
      },
      sortColumnId: column.id,
      source,
    });
  };

  const beginGroupPointerInteraction = (
    event: React.PointerEvent<HTMLElement>,
    group: CominsTableRuntimeColumnGroup,
    activateImmediately = false,
  ) => {
    if (group.lockPosition || stateRef.current.columnGroupState[group.id]?.pinned !== undefined) {
      return;
    }

    const source: CominsColumnMoveHeader = { depth: 0, id: group.id, kind: "group" };
    beginColumnPointerInteraction({
      activateImmediately,
      activate: (x, y) => {
        setColumnMovePointer({ x, y });
        setMovingColumnId(null);
        setMovingGroupId(group.id);
      },
      commitTarget: (target) => {
        if (getColumnMoveHeaderPinned(target) !== getColumnMoveHeaderPinned(source)) {
          return;
        }

        const targetIndex = getColumnMoveTargetIndex(target);

        if (targetIndex >= 0) {
          const current = stateRef.current;
          const next = moveCominsColumnGroup(current, group.id, targetIndex);

          if (
            next !== current &&
            next.columnOrder.some((columnId, index) => columnId !== current.columnOrder[index])
          ) {
            captureColumnMoveAnimationSnapshot();
            commitState(next, { columnLayoutChanged: true });
          }
        }
      },
      event,
      id: group.id,
      kind: "group",
      resolveTarget: (target) => {
        if (getColumnMoveHeaderPinned(target) !== getColumnMoveHeaderPinned(source)) {
          return "invalid";
        }

        const targetIndex = getColumnMoveTargetIndex(target);

        if (targetIndex < 0) {
          return "invalid";
        }

        const current = stateRef.current;
        const next = moveCominsColumnGroup(current, group.id, targetIndex);

        return getCominsColumnDropStatus(
          source,
          target,
          next.columnOrder.some((columnId, index) => columnId !== current.columnOrder[index]),
        );
      },
      source,
    });
  };

  type CominsRowSelectionModifierEvent = Pick<
    React.KeyboardEvent | React.MouseEvent,
    "ctrlKey" | "metaKey" | "shiftKey"
  >;

  const selectRowFromInteraction = (
    event: CominsRowSelectionModifierEvent,
    entry: VisibleRowEntry<TData>,
  ) => {
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
      copiedRangeRef.current = state.selection.range
        ? copyCominsCellRange(
            state,
            state.selection.range,
            groupingProjection?.visibleLeafRowIds ?? state.rowIds,
          )
        : null;
      copiedCellRef.current = copiedRangeRef.current ? null : copyCominsCell(state, address);
      return;
    }

    if (isCopyPasteKey(event, "v") && (copiedRangeRef.current || copiedCellRef.current)) {
      event.preventDefault();
      event.stopPropagation();
      commitState((current) =>
        copiedRangeRef.current
          ? pasteCominsCellRange(
              current,
              address,
              copiedRangeRef.current,
              groupingProjection?.visibleLeafRowIds ?? current.rowIds,
            )
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
    const cleanup = () => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
      window.removeEventListener("pointercancel", handlePointerCancel);
      window.removeEventListener("blur", handlePointerCancel);

      if (activePointerGestureCleanupRef.current === cleanup) {
        activePointerGestureCleanupRef.current = null;
      }
    };
    const handlePointerUp = () => {
      cleanup();
      endCellRangeDrag();
    };
    const handlePointerCancel = () => {
      cleanup();
      endCellRangeDrag();
    };

    event.preventDefault();
    registerActivePointerGesture(cleanup);
    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", handlePointerUp);
    window.addEventListener("pointercancel", handlePointerCancel);
    window.addEventListener("blur", handlePointerCancel);
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
    let crossTarget: CominsCrossTableRowTarget<TData, TGroup> | null = null;
    let autoScroll: ReturnType<typeof createCrossTableAutoScroll>;
    const setActiveRowMoveState = (next: CominsRowMoveState | null) => {
      rowMoveStateRef.current = next;
      setRowMoveState(next);
    };
    const resolveCrossTarget = (
      clientX: number,
      clientY: number,
    ): CominsCrossTableRowTarget<TData, TGroup> | null => {
      const hit = getCrossTableTransferHit(clientX, clientY);

      if (!hit || !normalizedTableTransfer) {
        return null;
      }

      const sourceSnapshot = getRegisteredTransferSnapshot(normalizedTableTransfer.tableId);
      const sourceEndpoint = sourceSnapshot?.endpoint;
      const targetEndpoint = hit.snapshot.endpoint;
      const sourceGrouped = sourceEndpoint && isCominsGroupedTransferEndpoint(sourceEndpoint)
        ? sourceEndpoint
        : null;
      const targetGrouped = isCominsGroupedTransferEndpoint(targetEndpoint)
        ? targetEndpoint
        : null;
      const sourceDataIndex = sourceEndpoint?.data.findIndex(
        (row, dataIndex) => sourceEndpoint.getRowId(row, dataIndex) === sourceRowId,
      ) ?? -1;
      const sourceRow = sourceDataIndex >= 0 ? sourceEndpoint?.data[sourceDataIndex] : undefined;
      const rowElement = hit.element.closest<HTMLElement>("[data-comins-row-data-index]");
      const groupElement = hit.element.closest<HTMLElement>("[data-comins-group-index]");
      let marker = hit.snapshot.viewport ?? hit.root;
      let targetGroupId: CominsRowId | undefined;
      let targetRowId: CominsRowId | undefined;
      let structurallyValid =
        sourceRow !== undefined &&
        (sourceGrouped === null) === (targetGrouped === null);

      if (
        rowElement &&
        rowElement.closest<HTMLElement>("[data-comins-table-instance-id]") === hit.root
      ) {
        marker = rowElement;
        const targetDataIndex = Number(rowElement.dataset.cominsRowDataIndex);
        const targetRow = Number.isInteger(targetDataIndex)
          ? targetEndpoint.data[targetDataIndex]
          : undefined;

        if (targetRow === undefined) {
          structurallyValid = false;
        } else {
          targetRowId = targetEndpoint.getRowId(targetRow, targetDataIndex);
          targetGroupId = targetGrouped?.getRowGroupId(targetRow, targetDataIndex);
        }
      } else if (
        groupElement &&
        groupElement.closest<HTMLElement>("[data-comins-table-instance-id]") === hit.root
      ) {
        marker = groupElement;
        const targetGroupIndex = Number(groupElement.dataset.cominsGroupIndex);
        const targetGroup = targetGrouped && Number.isInteger(targetGroupIndex)
          ? targetGrouped.groups[targetGroupIndex]
          : undefined;

        if (!targetGrouped || targetGroup === undefined) {
          structurallyValid = false;
        } else {
          targetGroupId = targetGrouped.getGroupId(targetGroup);
        }
      } else if (targetGrouped) {
        structurallyValid = false;
      }

      if (structurallyValid && sourceGrouped && targetGrouped && sourceRow !== undefined) {
        const sourceGroupId = sourceGrouped.getRowGroupId(sourceRow, sourceDataIndex);

        structurallyValid =
          targetGroupId !== undefined &&
          targetGrouped.groups.some(
            (group) => targetGrouped.getGroupId(group) === targetGroupId,
          ) &&
          (sourceGroupId === targetGroupId || typeof targetGrouped.setRowGroupId === "function");
      }

      const intent: CominsTableTransferIntent<TData, TGroup> | null =
        structurallyValid && sourceRow !== undefined
          ? {
              kind: "row",
              row: sourceRow,
              sourceRowId,
              sourceTableId: sourceEndpoint!.tableId,
              targetGroupId,
              targetRowId,
              targetTableId: targetEndpoint.tableId,
            }
          : null;
      const valid = Boolean(intent) && (hit.snapshot.config.canTransfer?.(intent!) ?? true);

      return {
        ...hit,
        marker,
        targetGroupId,
        targetRowId,
        valid,
      };
    };
    const updateTarget = (clientX: number, clientY: number) => {
      const pointElement = document.elementFromPoint(clientX, clientY);
      const target = pointElement
        ?.closest<HTMLElement>("[data-comins-row-data-index], [data-comins-group-index]");
      const targetTableInstanceId = pointElement
        ?.closest<HTMLElement>("[data-comins-table-instance-id]")
        ?.dataset.cominsTableInstanceId;

      if (target && targetTableInstanceId === tableInstanceId) {
        crossTarget = null;
        clearExternalDropMarker();
        autoScroll.stop();

        if (target.dataset.cominsRowDataIndex !== undefined) {
          const targetDataIndex = Number(target.dataset.cominsRowDataIndex);

          if (!Number.isInteger(targetDataIndex)) {
            return;
          }

          const targetRow = stateRef.current.rows[targetDataIndex];
          const targetGroupId = groupingActive && rowGrouping && targetRow !== undefined
            ? rowGrouping.getRowGroupId(targetRow, targetDataIndex)
            : undefined;
          const sourceGroupId = groupingActive && rowGrouping
            ? rowGrouping.getRowGroupId(entry.row, entry.dataIndex)
            : undefined;
          const valid =
            targetGroupId === undefined ||
            sourceGroupId === targetGroupId ||
            (typeof rowGrouping?.setRowGroupId === "function" && typeof onChangeData === "function");

          setActiveRowMoveState({ sourceRowId, targetDataIndex, targetGroupId, valid });
          return;
        }

        const targetGroupIndex = Number(target.dataset.cominsGroupIndex);
        const targetGroupId = Number.isInteger(targetGroupIndex)
          ? orderedGroupModel?.groupIds[targetGroupIndex]
          : undefined;

        if (targetGroupId !== undefined && groupingActive && rowGrouping) {
          const sourceGroupId = rowGrouping.getRowGroupId(entry.row, entry.dataIndex);
          const valid =
            sourceGroupId === targetGroupId ||
            (typeof rowGrouping.setRowGroupId === "function" && typeof onChangeData === "function");

          setActiveRowMoveState({ sourceRowId, targetGroupId, valid });
        }
        return;
      }

      if (targetTableInstanceId === tableInstanceId) {
        crossTarget = null;
        clearExternalDropMarker();
        autoScroll.stop();
        return;
      }

      crossTarget = resolveCrossTarget(clientX, clientY);

      if (crossTarget) {
        setExternalDropMarker(crossTarget.marker, "row", crossTarget.valid);
        setActiveRowMoveState({
          sourceRowId,
          targetGroupId: crossTarget.targetGroupId,
          targetTableId: crossTarget.snapshot.endpoint.tableId,
          valid: crossTarget.valid,
        });
        autoScroll.update(
          crossTarget.snapshot.viewport,
          clientX,
          clientY,
          crossTarget.valid,
        );
        return;
      }

      clearExternalDropMarker();
      autoScroll.stop();
      setActiveRowMoveState({ sourceRowId, valid: false });
    };
    autoScroll = createCrossTableAutoScroll(updateTarget);
    const handlePointerMove = (moveEvent: PointerEvent) => {
      if (moveEvent.buttons !== 1) {
        return;
      }

      updateTarget(moveEvent.clientX, moveEvent.clientY);
    };
    const cleanup = () => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
      window.removeEventListener("pointercancel", handlePointerCancel);
      window.removeEventListener("blur", handlePointerCancel);
      window.removeEventListener("keydown", handleKeyDown);
      autoScroll.stop();

      if (activePointerGestureCleanupRef.current === cleanup) {
        activePointerGestureCleanupRef.current = null;
      }
    };
    const handlePointerUp = (upEvent: PointerEvent) => {
      updateTarget(upEvent.clientX, upEvent.clientY);

      const moveState = rowMoveStateRef.current;
      const finalCrossTarget = crossTarget;
      cleanup();
      clearExternalDropMarker();
      setActiveRowMoveState(null);

      if (!moveState?.valid) {
        return;
      }

      if (moveState.targetTableId && finalCrossTarget && normalizedTableTransfer) {
        const sourceSnapshot = getRegisteredTransferSnapshot(normalizedTableTransfer.tableId);
        const targetSnapshot = getRegisteredTransferSnapshot(moveState.targetTableId);

        if (
          !sourceSnapshot ||
          !targetSnapshot ||
          targetSnapshot.instanceId !== finalCrossTarget.snapshot.instanceId
        ) {
          return;
        }

        const rejectedConflict: {
          conflict?: CominsTableTransferConflict<TData, TGroup>;
        } = {};
        const result = transferCominsRowBetweenTables({
          resolveConflict: (conflict) => {
            const policy = targetSnapshot.config.resolveConflict?.(conflict) === "overwrite"
              ? "overwrite"
              : "reject";

            if (policy === "reject" && rejectedConflict.conflict === undefined) {
              rejectedConflict.conflict = conflict;
            }

            return policy;
          },
          source: sourceSnapshot.endpoint,
          sourceRowId,
          target: targetSnapshot.endpoint,
          targetGroupId: finalCrossTarget.targetGroupId,
          targetRowId: finalCrossTarget.targetRowId,
        });

        if (result && emitCominsTableTransfer(normalizedTableTransfer.coordinator, result)) {
          scheduleTransferFocus(targetSnapshot.endpoint.tableId, "row", sourceRowId);
        } else if (rejectedConflict.conflict) {
          const rejection: CominsTableTransferRejection<TData, TGroup> = Object.freeze({
            conflict: rejectedConflict.conflict,
            kind: "row",
            reason: "duplicate-id",
            sourceTableId: sourceSnapshot.endpoint.tableId,
            targetTableId: targetSnapshot.endpoint.tableId,
          });

          showTransferRejectionFeedback(
            rejection,
            targetSnapshot,
            upEvent.clientX,
            upEvent.clientY,
          );
          emitCominsTableTransferRejected(normalizedTableTransfer.coordinator, rejection);
        }
        return;
      }

      if (groupingActive && rowGrouping && moveState.targetGroupId !== undefined) {
        const sourceGroupId = rowGrouping.getRowGroupId(entry.row, entry.dataIndex);

        if (
          sourceGroupId !== moveState.targetGroupId &&
          !expandedGroupIdSet.has(moveState.targetGroupId)
        ) {
          pendingGroupDisclosureFocusRef.current = moveState.targetGroupId;
        }

        commitState((current) => moveCominsRowToGroup(current, {
          getRowGroupId: rowGrouping.getRowGroupId,
          setRowGroupId: rowGrouping.setRowGroupId,
          sourceRowId,
          targetGroupId: moveState.targetGroupId!,
          targetRowId: moveState.targetDataIndex === undefined
            ? undefined
            : current.rowIds[moveState.targetDataIndex],
        }));
        return;
      }

      if (moveState.targetDataIndex !== undefined) {
        commitState((current) => moveCominsRow(current, sourceRowId, moveState.targetDataIndex!));
      }
    };
    const handlePointerCancel = () => {
      cleanup();
      clearExternalDropMarker();
      setActiveRowMoveState(null);
    };
    const handleKeyDown = (keyEvent: KeyboardEvent) => {
      if (keyEvent.key === "Escape") {
        handlePointerCancel();
      }
    };

    updateTarget(event.clientX, event.clientY);
    registerActivePointerGesture(cleanup);
    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", handlePointerUp);
    window.addEventListener("pointercancel", handlePointerCancel);
    window.addEventListener("blur", handlePointerCancel);
    window.addEventListener("keydown", handleKeyDown);
  };
  const beginRowGroupHandlePointerDrag = (
    event: React.PointerEvent<HTMLElement>,
    sourceGroupId: CominsRowId,
  ) => {
    const onChangeGroups = rowGrouping?.onChangeGroups;
    const crossTableEnabled = Boolean(normalizedTableTransfer);

    if (
      event.button !== 0 ||
      !rowGrouping?.groupDraggable ||
      (typeof onChangeGroups !== "function" && !crossTableEnabled) ||
      !orderedGroupModel?.groupsById.has(sourceGroupId)
    ) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();

    let crossTarget: CominsCrossTableGroupTarget<TData, TGroup> | null = null;
    let autoScroll: ReturnType<typeof createCrossTableAutoScroll>;
    const setActiveGroupMoveState = (next: CominsRowGroupMoveState | null) => {
      rowGroupMoveStateRef.current = next;
      setRowGroupMoveState(next);
    };
    const resolveCrossTarget = (
      clientX: number,
      clientY: number,
    ): CominsCrossTableGroupTarget<TData, TGroup> | null => {
      const hit = getCrossTableTransferHit(clientX, clientY);

      if (!hit || !normalizedTableTransfer) {
        return null;
      }

      const sourceSnapshot = getRegisteredTransferSnapshot(normalizedTableTransfer.tableId);
      const sourceEndpoint = sourceSnapshot?.endpoint;
      const sourceGrouped = sourceEndpoint && isCominsGroupedTransferEndpoint(sourceEndpoint)
        ? sourceEndpoint
        : null;
      const targetGrouped = isCominsGroupedTransferEndpoint(hit.snapshot.endpoint)
        ? hit.snapshot.endpoint
        : null;
      const sourceGroupIndex = sourceGrouped?.groups.findIndex(
        (group) => sourceGrouped.getGroupId(group) === sourceGroupId,
      ) ?? -1;
      const sourceGroup = sourceGroupIndex >= 0
        ? sourceGrouped?.groups[sourceGroupIndex]
        : undefined;
      const groupElement = hit.element.closest<HTMLElement>("[data-comins-group-index]");
      let marker = hit.snapshot.viewport ?? hit.root;
      let position: "after" | "append" | "before" = "append";
      let targetGroupId: CominsRowId | undefined;
      let structurallyValid = Boolean(sourceGrouped && targetGrouped && sourceGroup !== undefined);

      if (
        groupElement &&
        groupElement.closest<HTMLElement>("[data-comins-table-instance-id]") === hit.root
      ) {
        marker = groupElement;
        const targetGroupIndex = Number(groupElement.dataset.cominsGroupIndex);
        const targetGroup = targetGrouped && Number.isInteger(targetGroupIndex)
          ? targetGrouped.groups[targetGroupIndex]
          : undefined;

        if (targetGroup === undefined) {
          structurallyValid = false;
        } else {
          targetGroupId = targetGrouped!.getGroupId(targetGroup);
          const bounds = groupElement.getBoundingClientRect();
          position = clientY >= bounds.top + bounds.height / 2 ? "after" : "before";
        }
      } else if (!targetGrouped || targetGrouped.groups.length > 0) {
        structurallyValid = false;
      }

      const intent: CominsTableTransferIntent<TData, TGroup> | null =
        structurallyValid && sourceGrouped && sourceGroup !== undefined
          ? {
              group: sourceGroup,
              kind: "group",
              rows: sourceGrouped.data.filter(
                (row, dataIndex) =>
                  sourceGrouped.getRowGroupId(row, dataIndex) === sourceGroupId,
              ),
              sourceGroupId,
              sourceTableId: sourceGrouped.tableId,
              targetGroupId,
              targetTableId: hit.snapshot.endpoint.tableId,
            }
          : null;
      const valid = Boolean(intent) && (hit.snapshot.config.canTransfer?.(intent!) ?? true);

      return {
        ...hit,
        marker,
        position,
        targetGroupId,
        valid,
      };
    };
    const updateTarget = (clientX: number, clientY: number) => {
      const pointElement = document.elementFromPoint(clientX, clientY);
      const targetRow = pointElement?.closest<HTMLElement>("[data-comins-group-index]");
      const targetTableInstanceId = pointElement
        ?.closest<HTMLElement>("[data-comins-table-instance-id]")
        ?.dataset.cominsTableInstanceId;

      if (targetRow && targetTableInstanceId === tableInstanceId) {
        crossTarget = null;
        clearExternalDropMarker();
        autoScroll.stop();

        if (typeof onChangeGroups !== "function") {
          setActiveGroupMoveState(null);
          return;
        }

        const targetGroupIndex = Number(targetRow.dataset.cominsGroupIndex);
        const targetGroupId = Number.isInteger(targetGroupIndex)
          ? orderedGroupModel.groupIds[targetGroupIndex]
          : undefined;

        if (targetGroupId === undefined) {
          setActiveGroupMoveState(null);
          return;
        }

        const bounds = targetRow.getBoundingClientRect();
        const position = clientY >= bounds.top + bounds.height / 2 ? "after" : "before";

        setActiveGroupMoveState({ position, sourceGroupId, targetGroupId });
        return;
      }

      crossTarget = resolveCrossTarget(clientX, clientY);

      if (crossTarget) {
        setExternalDropMarker(
          crossTarget.marker,
          "group",
          crossTarget.valid,
          crossTarget.position,
        );
        setActiveGroupMoveState({
          position: crossTarget.position,
          sourceGroupId,
          targetGroupId: crossTarget.targetGroupId,
          targetTableId: crossTarget.snapshot.endpoint.tableId,
        });
        autoScroll.update(
          crossTarget.snapshot.viewport,
          clientX,
          clientY,
          crossTarget.valid,
        );
        return;
      }

      clearExternalDropMarker();
      autoScroll.stop();
      setActiveGroupMoveState(null);
    };
    autoScroll = createCrossTableAutoScroll(updateTarget);
    const handlePointerMove = (moveEvent: PointerEvent) => {
      if (moveEvent.buttons === 1) {
        updateTarget(moveEvent.clientX, moveEvent.clientY);
      }
    };
    const cleanup = () => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
      window.removeEventListener("pointercancel", handlePointerCancel);
      window.removeEventListener("blur", handlePointerCancel);
      window.removeEventListener("keydown", handleKeyDown);
      autoScroll.stop();

      if (activePointerGestureCleanupRef.current === cleanup) {
        activePointerGestureCleanupRef.current = null;
      }
    };
    const handlePointerUp = (upEvent: PointerEvent) => {
      updateTarget(upEvent.clientX, upEvent.clientY);

      const moveState = rowGroupMoveStateRef.current;
      const finalCrossTarget = crossTarget;
      cleanup();
      clearExternalDropMarker();
      setActiveGroupMoveState(null);

      if (
        moveState?.targetTableId &&
        finalCrossTarget?.valid &&
        normalizedTableTransfer
      ) {
        const sourceSnapshot = getRegisteredTransferSnapshot(normalizedTableTransfer.tableId);
        const targetSnapshot = getRegisteredTransferSnapshot(moveState.targetTableId);

        if (
          !sourceSnapshot ||
          !targetSnapshot ||
          targetSnapshot.instanceId !== finalCrossTarget.snapshot.instanceId
        ) {
          return;
        }

        const rejectedConflict: {
          conflict?: CominsTableTransferConflict<TData, TGroup>;
        } = {};
        const result = transferCominsGroupBetweenTables({
          position: finalCrossTarget.position,
          resolveConflict: (conflict) => {
            const policy = targetSnapshot.config.resolveConflict?.(conflict) === "overwrite"
              ? "overwrite"
              : "reject";

            if (policy === "reject" && rejectedConflict.conflict === undefined) {
              rejectedConflict.conflict = conflict;
            }

            return policy;
          },
          source: sourceSnapshot.endpoint,
          sourceGroupId,
          target: targetSnapshot.endpoint,
          targetGroupId: finalCrossTarget.targetGroupId,
        });

        if (result && emitCominsTableTransfer(normalizedTableTransfer.coordinator, result)) {
          scheduleTransferFocus(targetSnapshot.endpoint.tableId, "group", sourceGroupId);
        } else if (rejectedConflict.conflict) {
          const rejection: CominsTableTransferRejection<TData, TGroup> = Object.freeze({
            conflict: rejectedConflict.conflict,
            kind: "group",
            reason: "duplicate-id",
            sourceTableId: sourceSnapshot.endpoint.tableId,
            targetTableId: targetSnapshot.endpoint.tableId,
          });

          showTransferRejectionFeedback(
            rejection,
            targetSnapshot,
            upEvent.clientX,
            upEvent.clientY,
          );
          emitCominsTableTransferRejected(normalizedTableTransfer.coordinator, rejection);
        }
        return;
      }

      if (
        !moveState ||
        moveState.position === "append" ||
        moveState.targetGroupId === undefined ||
        moveState.sourceGroupId === moveState.targetGroupId
      ) {
        return;
      }

      const currentGroups = rowGrouping.groups;
      const fromIndex = currentGroups.findIndex(
        (group) => rowGrouping.getGroupId(group) === moveState.sourceGroupId,
      );
      const nextGroups = moveCominsRowGroup({
        getGroupId: rowGrouping.getGroupId,
        groups: currentGroups,
        position: moveState.position,
        sourceGroupId: moveState.sourceGroupId,
        targetGroupId: moveState.targetGroupId,
      });
      const toIndex = nextGroups.findIndex(
        (group) => rowGrouping.getGroupId(group) === moveState.sourceGroupId,
      );
      const changed =
        fromIndex >= 0 &&
        toIndex >= 0 &&
        currentGroups.some((group, index) => group !== nextGroups[index]);

      if (changed) {
        onChangeGroups?.(nextGroups, {
          fromIndex,
          groupId: moveState.sourceGroupId,
          reason: "move",
          targetGroupId: moveState.targetGroupId,
          toIndex,
        });
      }
    };
    const handlePointerCancel = () => {
      cleanup();
      clearExternalDropMarker();
      setActiveGroupMoveState(null);
    };
    const handleKeyDown = (keyEvent: KeyboardEvent) => {
      if (keyEvent.key === "Escape") {
        handlePointerCancel();
      }
    };

    setActiveGroupMoveState({
      position: "before",
      sourceGroupId,
      targetGroupId: sourceGroupId,
    });
    registerActivePointerGesture(cleanup);
    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", handlePointerUp);
    window.addEventListener("pointercancel", handlePointerCancel);
    window.addEventListener("blur", handlePointerCancel);
    window.addEventListener("keydown", handleKeyDown);
  };
  const movingColumn = movingColumnId
    ? visibleColumns.find((visibleColumn) => visibleColumn.id === movingColumnId)
    : undefined;
  const movingGroup = movingGroupId ? state.columnGroups.find((group) => group.id === movingGroupId) : undefined;
  const movingHeaderLabel = movingColumn
    ? getCominsColumnPlaceholderText(movingColumn.label, movingColumn.id)
    : movingGroup
      ? getCominsColumnPlaceholderText(movingGroup.label, movingGroup.id)
      : undefined;

  const changeColumnFilterRule = (columnId: string, nextRule: CominsColumnFilterRule | null) => {
    const filtering = columnFiltering;
    const onChangeModel = filtering?.onChangeModel;

    if (!filtering || typeof onChangeModel !== "function") {
      return;
    }

    const currentModel = Array.isArray(filtering.model) ? filtering.model : [];
    const currentIndex = currentModel.findIndex((rule) => rule?.columnId === columnId);
    const nextModel = currentModel.filter((rule) => rule?.columnId !== columnId);

    if (nextRule) {
      nextModel.splice(currentIndex < 0 ? nextModel.length : currentIndex, 0, nextRule);
    }

    onChangeModel(nextModel);
  };

  const renderHeaderCell = (cell: CominsHeaderCell<TData>, fallbackIndex: number) => {
    if (cell.kind === "group") {
      const isDropTarget = columnMoveTarget?.kind === "group" && columnMoveTarget.id === cell.groupId;
      const isGroupPlaceholder = movingGroupId === cell.groupId;
      const groupPositionLocked =
        cell.group.lockPosition === true ||
        state.columnGroupState[cell.groupId]?.pinned !== undefined;
      const groupColumnIds = visibleColumns
        .map((column) => column.id)
        .filter((columnId) => cell.group.children.includes(columnId));
      const firstGroupPin = groupColumnIds[0]
        ? getPinnedColumnAttributes(groupColumnIds[0])
        : undefined;
      const lastGroupPin = groupColumnIds.at(-1)
        ? getPinnedColumnAttributes(groupColumnIds.at(-1)!)
        : undefined;
      const groupPinned = firstGroupPin?.pinned && groupColumnIds.every(
        (columnId) => getPinnedColumnAttributes(columnId).pinned === firstGroupPin.pinned,
      )
        ? firstGroupPin.pinned
        : undefined;
      const groupPinStyle = groupPinned === "left"
        ? firstGroupPin?.style
        : groupPinned === "right"
          ? lastGroupPin?.style
          : undefined;
      const groupPinBoundary = groupPinned === "left"
        ? lastGroupPin?.boundary
        : groupPinned === "right"
          ? firstGroupPin?.boundary
          : undefined;
      const groupPlaceholderLabel = getCominsColumnPlaceholderText(cell.group.label, cell.groupId);
      return (
        <th
          aria-label={isGroupPlaceholder ? groupPlaceholderLabel : undefined}
          className={[
            "comins-table__th comins-table__group-th px-3 py-2 text-left font-semibold",
            isGroupPlaceholder ? "comins-column-moving" : undefined,
          ]
            .filter(Boolean)
            .join(" ")}
          colSpan={cell.colSpan}
          data-column-drop-target={isDropTarget ? "true" : undefined}
          data-column-drop-valid={
            isDropTarget && columnMoveTarget.status !== "neutral"
              ? columnMoveTarget.status === "valid"
                ? "true"
                : "false"
              : undefined
          }
          data-column-moving={isGroupPlaceholder ? "true" : undefined}
          data-column-placeholder={isGroupPlaceholder ? "true" : undefined}
          data-column-position-locked={groupPositionLocked ? "true" : undefined}
          data-comins-column-depth="0"
          data-comins-column-group-id={cell.groupId}
          data-comins-pin-boundary={groupPinBoundary ? "true" : undefined}
          data-comins-pinned={groupPinned}
          data-testid={`header-group-${cell.groupId}`}
          key={`group-${cell.groupId}`}
          onPointerDown={(event) => beginGroupPointerInteraction(event, cell.group)}
          rowSpan={cell.rowSpan}
          scope="colgroup"
          style={groupPinStyle}
        >
          <span aria-hidden="true" className="comins-column-drop-marker" />
          <span
            {...(isGroupPlaceholder ? COMINS_COLUMN_PLACEHOLDER_INTERACTION_PROPS : {})}
            aria-hidden={isGroupPlaceholder ? "true" : undefined}
            className="comins-table__header-content"
            data-comins-header-body="true"
            inert={isGroupPlaceholder ? true : undefined}
            ref={bindCominsColumnPlaceholderNativeBoundary}
          >
            {showColumnMoveHandle && !groupPositionLocked ? (
              <span
                aria-hidden="true"
                className="comins-column-move-handle"
                data-comins-column-move-handle="true"
                data-testid={`column-group-move-handle-${cell.groupId}`}
                draggable={false}
                onClick={(event) => event.stopPropagation()}
                onPointerDown={(event) => {
                  event.preventDefault();
                  event.stopPropagation();
                  beginGroupPointerInteraction(event, cell.group, true);
                }}
              >
                <CominsTableIcon name="columnMove" />
              </span>
            ) : null}
            <span className="comins-table__header-label">{isGroupPlaceholder ? null : cell.group.label}</span>
          </span>
          {isGroupPlaceholder ? (
            <span aria-hidden="true" className="comins-column-placeholder-label">
              {groupPlaceholderLabel}
            </span>
          ) : null}
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
              const resizeMaxWidth = getCominsPinnedBlockResizeMaxWidth(
                columnPinningBlocks,
                columnPinning,
                `group:${cell.groupId}`,
                containerWidth,
              );
              setResizingColumnId(cell.groupId);
              const handlePointerMove = (moveEvent: PointerEvent) => {
                commitState(
                  (current) => {
                    let next = current;

                    for (const [visibleColumnId, visibleColumnWidth] of visibleWidthSnapshot) {
                      next = setCominsColumnWidth(next, visibleColumnId, visibleColumnWidth);
                    }

                    return setCominsColumnGroupWidth(
                      next,
                      cell.groupId,
                      Math.min(resizeMaxWidth ?? Number.POSITIVE_INFINITY, startWidth + moveEvent.clientX - startX),
                    );
                  },
                  { columnLayoutChanged: true },
                );
              };
              const cleanup = () => {
                window.removeEventListener("pointermove", handlePointerMove);
                window.removeEventListener("pointerup", handlePointerUp);
                window.removeEventListener("pointercancel", handlePointerCancel);
                window.removeEventListener("blur", handlePointerCancel);

                if (activePointerGestureCleanupRef.current === cleanup) {
                  activePointerGestureCleanupRef.current = null;
                }
              };
              const handlePointerUp = () => {
                cleanup();
                setResizingColumnId(null);
              };
              const handlePointerCancel = () => {
                cleanup();
                setResizingColumnId(null);
              };
              registerActivePointerGesture(cleanup);
              window.addEventListener("pointermove", handlePointerMove);
              window.addEventListener("pointerup", handlePointerUp);
              window.addEventListener("pointercancel", handlePointerCancel);
              window.addEventListener("blur", handlePointerCancel);
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
    const pinnedColumn = getPinnedColumnAttributes(column.id);
    const headerProps = column.header?.props ?? {};
    const sortRule = getSortRule(state.sortModel, column.id);
    const sortIndicatorState = getSortIndicatorState(state.sortModel, column.id);
    const sortIndicatorVisible = sortIndicatorState === "asc" || sortIndicatorState === "desc";
    const showSortPriority = sortRule !== null && state.sortModel.length > 1;
    const isMovingGroupChild = Boolean(movingGroup?.children.includes(column.id));
    const isColumnPlaceholder = movingColumnId === column.id || isMovingGroupChild;
    const columnPlaceholderLabel = getCominsColumnPlaceholderText(column.label, column.id);
    const headerClassName = [
      "comins-table__th px-3 py-2 text-left font-semibold",
      movingColumnId === column.id ? "comins-column-moving" : undefined,
      headerProps.className,
    ]
      .filter(Boolean)
      .join(" ");
    const headerPayload = createHeaderComponentPayload(state, column, safeIndex);
    const headerRenderer = column.header?.renderer;
    const cachedHeaderRendererBody = headerRenderer ? headerRendererBodyRef.current.get(column.id) : undefined;

    const shouldRefreshHeaderRendererBody =
      Boolean(headerRenderer) && (!isColumnPlaceholder || cachedHeaderRendererBody?.renderer !== headerRenderer);
    const headerRendererBody = headerRenderer
      ? shouldRefreshHeaderRendererBody
        ? headerRenderer(headerPayload)
        : cachedHeaderRendererBody?.body
      : null;

    if (headerRenderer && shouldRefreshHeaderRendererBody) {
      renderedHeaderRendererBodies.set(column.id, { body: headerRendererBody, renderer: headerRenderer });
    } else if (headerRenderer && cachedHeaderRendererBody) {
      renderedHeaderRendererBodies.set(column.id, cachedHeaderRendererBody);
    }
    const headerLeftSlots = !column.header?.renderer
      ? renderCominsComponentSlots(column.header?.components, headerPayload, "left")
      : [];
    const headerRightSlots = !column.header?.renderer
      ? renderCominsComponentSlots(column.header?.components, headerPayload, "right")
      : [];
    const hasHeaderComponents = headerLeftSlots.length > 0 || headerRightSlots.length > 0;
    const isDropTarget = columnMoveTarget?.kind === "column" && columnMoveTarget.id === column.id;
    const columnPositionLocked =
      column.lockPosition === true ||
      (!cell.groupId && columnState?.pinned !== undefined);
    const columnFilterKind = column.filter?.kind;
    const columnFilterable =
      filteringRequested &&
      (columnFilterKind === "boolean" ||
        columnFilterKind === "date" ||
        columnFilterKind === "number" ||
        columnFilterKind === "text");

    return (
      <th
        {...headerProps}
        aria-label={isColumnPlaceholder ? columnPlaceholderLabel : headerProps["aria-label"]}
        aria-labelledby={isColumnPlaceholder ? undefined : headerProps["aria-labelledby"]}
        className={headerClassName}
        colSpan={cell.colSpan}
        data-column-drop-target={isDropTarget ? "true" : undefined}
        data-column-drop-valid={
          isDropTarget && columnMoveTarget.status !== "neutral"
            ? columnMoveTarget.status === "valid"
              ? "true"
              : "false"
            : undefined
        }
        data-column-moving={movingColumnId === column.id ? "true" : undefined}
        data-column-placeholder={isColumnPlaceholder ? "true" : undefined}
        data-column-position-locked={columnPositionLocked ? "true" : undefined}
        data-comins-column-depth={cell.groupId ? "1" : "0"}
        data-comins-column-id={column.id}
        data-comins-column-index={safeIndex}
        data-comins-column-parent-group-id={cell.groupId}
        data-comins-pin-boundary={pinnedColumn.boundary ? "true" : undefined}
        data-comins-pinned={pinnedColumn.pinned}
        data-sort-count={sortRule ? state.sortModel.length : undefined}
        data-sort-direction={sortRule?.rule.direction}
        data-sort-priority={sortRule?.priority}
        data-sortable={column.sort ? "true" : "false"}
        data-filter-active={normalizedColumnFilterById.has(column.id) ? "true" : undefined}
        data-testid={`header-${column.id}`}
        aria-sort={column.sort ? getAriaSortState(state.sortModel, column.id) : undefined}
        key={`column-${column.id}`}
        onClick={(event) => {
          if (isColumnPlaceholder) {
            event.preventDefault();
            return;
          }

          headerProps.onClick?.(event);

          if (event.defaultPrevented || !column.sort) {
            return;
          }

          if (consumeSuppressedSortClick(column.id)) {
            return;
          }

          activateHeaderSort(column, event.shiftKey);
        }}
        onKeyDown={(event) => {
          if (isColumnPlaceholder) {
            event.preventDefault();
            return;
          }

          headerProps.onKeyDown?.(event);

          if (event.defaultPrevented || !column.sort) {
            return;
          }

          if (event.key === "Enter" || event.key === " " || event.key === "Spacebar") {
            event.preventDefault();
            activateHeaderSort(column, event.shiftKey);
          }
        }}
        onPointerDown={(event) => beginHeaderPointerInteraction(event, cell)}
        rowSpan={cell.rowSpan}
        scope="col"
        style={{ width: columnState?.width ?? column.width, ...headerProps.style, ...pinnedColumn.style }}
        tabIndex={column.sort && !isColumnPlaceholder ? 0 : undefined}
      >
        <span aria-hidden="true" className="comins-column-drop-marker" />
        <span
          {...(isColumnPlaceholder ? COMINS_COLUMN_PLACEHOLDER_INTERACTION_PROPS : {})}
          aria-hidden={isColumnPlaceholder ? "true" : undefined}
          className="comins-table__header-content"
          data-comins-header-body="true"
          data-comins-header-components={hasHeaderComponents ? "true" : undefined}
          data-comins-sort-indicator-visible={sortIndicatorVisible ? "true" : undefined}
          inert={isColumnPlaceholder ? true : undefined}
          ref={bindCominsColumnPlaceholderNativeBoundary}
        >
          <span className="comins-table__header-slot" data-comins-header-slot="left">
            {showColumnMoveHandle && !columnPositionLocked ? (
              <span
                aria-hidden="true"
                className="comins-column-move-handle"
                data-comins-column-move-handle="true"
                data-testid={`column-move-handle-${column.id}`}
                draggable={false}
                onClick={(event) => event.stopPropagation()}
                onPointerDown={(event) => {
                  event.preventDefault();
                  event.stopPropagation();
                  beginHeaderPointerInteraction(event, cell, true);
                }}
              >
                <CominsTableIcon name="columnMove" />
              </span>
            ) : null}
            {headerLeftSlots}
          </span>
          <span className="comins-table__header-label">
            {column.header?.renderer ? headerRendererBody : isColumnPlaceholder ? null : column.label}
          </span>
          <span className="comins-sort-meta" data-sort-visible={sortIndicatorVisible ? "true" : undefined}>
            <span
              aria-hidden="true"
              className="comins-sort-indicator"
              data-sort-state={sortIndicatorState}
              data-sort-visible={sortIndicatorVisible ? "true" : undefined}
              data-testid={`sort-indicator-${column.id}`}
            >
              <CominsTableIcon
                name={
                  sortIndicatorState === "asc"
                    ? "sortAscending"
                    : sortIndicatorState === "desc"
                      ? "sortDescending"
                      : "sortUnsorted"
                }
              />
            </span>
            {showSortPriority ? (
              <span
                aria-hidden="true"
                className="comins-sort-priority"
                data-testid={`sort-priority-${column.id}`}
              >
                {sortRule.priority}
              </span>
            ) : null}
          </span>
          {showSortPriority ? (
            <span className="comins-table__sort-status">
              {`Sorted ${sortRule.rule.direction === "asc" ? "ascending" : "descending"}, priority ${sortRule.priority} of ${state.sortModel.length}`}
            </span>
          ) : null}
          <span className="comins-table__header-slot" data-comins-header-slot="right">
            {columnFilterable && !isColumnPlaceholder ? (
              <CominsColumnFilterControl
                columnId={column.id}
                columnLabel={columnPlaceholderLabel}
                kind={columnFilterKind as CominsColumnFilterKind}
                onChangeRule={typeof columnFiltering?.onChangeModel === "function"
                  ? (nextRule) => changeColumnFilterRule(column.id, nextRule)
                  : undefined}
                onOpenChange={typeof columnFiltering?.onChangeOpenColumnId === "function"
                  ? columnFiltering.onChangeOpenColumnId
                  : undefined}
                open={columnFiltering?.openColumnId === column.id}
                rule={normalizedColumnFilterById.get(column.id)}
              />
            ) : null}
            {headerRightSlots}
          </span>
        </span>
        {isColumnPlaceholder ? (
          <span aria-hidden="true" className="comins-column-placeholder-label">
            {columnPlaceholderLabel}
          </span>
        ) : null}
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
            const resizeMaxWidth = cell.groupId
              ? undefined
              : getCominsPinnedBlockResizeMaxWidth(
                  columnPinningBlocks,
                  columnPinning,
                  `column:${column.id}`,
                  containerWidth,
                );
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
                    Math.min(
                      resizeMaxWidth ?? Number.POSITIVE_INFINITY,
                      Math.max(getEffectiveColumnMinWidth(column), startWidth + moveEvent.clientX - startX),
                    ),
                  );
                },
                { columnLayoutChanged: true },
              );
            };
            const cleanup = () => {
              window.removeEventListener("pointermove", handlePointerMove);
              window.removeEventListener("pointerup", handlePointerUp);
              window.removeEventListener("pointercancel", handlePointerCancel);
              window.removeEventListener("blur", handlePointerCancel);

              if (activePointerGestureCleanupRef.current === cleanup) {
                activePointerGestureCleanupRef.current = null;
              }
            };
            const handlePointerUp = () => {
              cleanup();
              setResizingColumnId(null);
            };
            const handlePointerCancel = () => {
              cleanup();
              setResizingColumnId(null);
            };
            registerActivePointerGesture(cleanup);
            window.addEventListener("pointermove", handlePointerMove);
            window.addEventListener("pointerup", handlePointerUp);
            window.addEventListener("pointercancel", handlePointerCancel);
            window.addEventListener("blur", handlePointerCancel);
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
    if (groupingRequested || filteringRequested) {
      return;
    }

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
  const syncHorizontalScrollLeft = (requestedScrollLeft: number) => {
    const scrollContainers = [
      headerRef.current,
      containerRef.current,
      footerRef.current,
      horizontalScrollbarRef.current,
    ].filter((element): element is HTMLDivElement => element !== null);
    const sharedMaxScrollLeft = scrollContainers.reduce(
      (current, element) => Math.min(current, Math.max(0, element.scrollWidth - element.clientWidth)),
      Number.POSITIVE_INFINITY,
    );
    const nextScrollLeft = Math.min(
      Number.isFinite(sharedMaxScrollLeft) ? sharedMaxScrollLeft : 0,
      Math.max(0, requestedScrollLeft),
    );

    for (const element of scrollContainers) {
      if (Math.abs(element.scrollLeft - nextScrollLeft) > 0.5) {
        element.scrollLeft = nextScrollLeft;
      }
    }

    return nextScrollLeft;
  };
  const handleBodyScroll = (event: React.UIEvent<HTMLDivElement>) => {
    const bodyViewport = event.currentTarget;
    const activeAnchorTransaction =
      logicalAnchorTransactionRef.current;
    const pendingDetailAnchor = pendingDetailAnchorRef.current;

    pendingScrollTopRef.current = bodyViewport.scrollTop;
    if (
      pendingDetailAnchor?.status === "pending" &&
      Math.abs(
        bodyViewport.scrollTop -
          pendingDetailAnchor.previousPhysicalScrollTop,
      ) > 0.5
    ) {
      pendingDetailAnchorRef.current = {
        ...pendingDetailAnchor,
        status: "cancelled",
      };
    }
    if (
      activeAnchorTransaction &&
      Math.abs(
        bodyViewport.scrollTop -
          activeAnchorTransaction.actualPhysical,
      ) > 0.5
    ) {
      logicalAnchorTransactionRef.current = null;
      setLogicalAnchorTransaction(null);
    }
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

    syncHorizontalScrollLeft(bodyViewport.scrollLeft);
  };
  const handleBodyWheel = (event: React.WheelEvent<HTMLDivElement>) => {
    if (!hasHorizontalOverflow || !horizontalScrollbarRef.current) {
      return;
    }

    const rawDelta = Math.abs(event.deltaX) > 0.01
      ? event.deltaX
      : event.shiftKey
        ? event.deltaY
        : 0;

    if (Math.abs(rawDelta) <= 0.01) {
      return;
    }

    const deltaScale = event.deltaMode === WheelEvent.DOM_DELTA_LINE
      ? 16
      : event.deltaMode === WheelEvent.DOM_DELTA_PAGE
        ? Math.max(1, event.currentTarget.clientWidth)
        : 1;
    const previousScrollLeft = horizontalScrollbarRef.current.scrollLeft;
    const nextScrollLeft = syncHorizontalScrollLeft(previousScrollLeft + rawDelta * deltaScale);

    if (event.shiftKey && Math.abs(nextScrollLeft - previousScrollLeft) > 0.5) {
      event.preventDefault();
    }
  };

  return (
    <div
      className={["comins-table comins-typography-base h-full w-full overflow-hidden", densityClass, currentTheme.className, className]
        .filter(Boolean)
        .join(" ")}
      aria-busy={resolvedLoading || resolvedLoadingMore ? "true" : undefined}
      data-comins-table-instance-id={tableInstanceId}
      data-comins-transfer-scope={normalizedTableTransfer?.scope}
      data-comins-transfer-table-id={normalizedTableTransfer?.tableId}
      data-filter-active={filteringActive ? "true" : undefined}
      data-loading={resolvedLoading || resolvedLoadingMore ? "true" : undefined}
      data-show-header={renderedHeaderVisible ? "true" : undefined}
      ref={tableRootRef}
      style={{ ...currentTheme.style, ...style }}
      tabIndex={-1}
    >
      {renderedHeaderVisible ? (
        <div
          className="comins-table__header"
          ref={headerRef}
          style={{ width: synchronizedHorizontalViewportWidth }}
        >
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
          {hasHorizontalOverflow ? (
            <div
              aria-hidden="true"
              className="comins-table__horizontal-range-spacer"
              style={{ width: synchronizedHorizontalContentWidth }}
            />
          ) : null}
        </div>
      ) : null}
      <div
        className="comins-table__body-viewport"
        data-horizontal-overflow={hasHorizontalOverflow ? "true" : undefined}
        data-virtualized={virtualized ? "true" : undefined}
        data-testid={dataTestId}
        onFocusCapture={(event) => {
          const row = (event.target as Element).closest<HTMLElement>("[data-comins-row-data-index]");
          const dataIndex = row ? Number(row.dataset.cominsRowDataIndex) : Number.NaN;

          focusedLeafDataIndexRef.current = Number.isInteger(dataIndex) ? dataIndex : null;
        }}
        onScroll={handleBodyScroll}
        onWheel={handleBodyWheel}
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
                    visibleColumns.map((column) => {
                      const pinnedColumn = getPinnedColumnAttributes(column.id);

                      return (
                        <td
                          className="comins-table__td comins-table__skeleton-cell px-3 py-2"
                          data-comins-pin-boundary={pinnedColumn.boundary ? "true" : undefined}
                          data-comins-pinned={pinnedColumn.pinned}
                          data-testid={`loading-skeleton-cell-${skeletonIndex}-${column.id}`}
                          key={column.id}
                          style={{ height: rowHeight, ...pinnedColumn.style }}
                        >
                          <span className="comins-table__skeleton-block" />
                        </td>
                      );
                    })
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
          {rowWindow.slots.map((slot, entryIndex) => {
            if (slot.kind === "group") {
              const node = orderedGroupModel?.groupsById.get(slot.groupId);

              if (!node) {
                return null;
              }

              const expanded = expandedGroupIdSet.has(slot.groupId);
              const isLastRenderedSlot = entryIndex === rowWindow.slots.length - 1;
              const isLastLogicalSlot = fullProjectionSlots.at(-1)?.key === slot.key;
              const virtualContentFillsViewport = rowWindow.scrollHeight >= containerHeight - 1;
              const isViewportEndRow =
                isLastRenderedSlot &&
                (virtualized
                  ? isLastLogicalSlot && virtualContentFillsViewport
                  : emptyFillerHeight === 0);
              const aggregateValues = Object.fromEntries(
                [...node.aggregationState].map(([columnId, aggregateState]) => [
                  columnId,
                  getCominsAggregateValue(aggregateState),
                ]),
              );
              const groupRenderParams = {
                aggregateValues,
                expanded,
                group: node.group,
                groupId: node.groupId,
                groupIndex: node.groupIndex,
                isEmpty: node.leafSourceIndexes.length === 0,
                rowCount: node.leafSourceIndexes.length,
              };
              const groupRowProps = rowGrouping?.getGroupRowProps?.(groupRenderParams);
              const customContent = rowGrouping?.renderGroupContent?.(groupRenderParams);
              const aggregateContent = Object.entries(aggregateValues).flatMap(([columnId, value]) => {
                if (value === null) {
                  return [];
                }

                const column = state.columns.find((candidate) => candidate.id === columnId);

                return [
                  <span className="comins-row-group-aggregate" key={columnId}>
                    {String(column?.label ?? columnId)}: {String(value)}
                  </span>,
                ];
              });
              const groupDraggable =
                rowGrouping?.groupDraggable === true &&
                (typeof rowGrouping.onChangeGroups === "function" || Boolean(normalizedTableTransfer));
              const groupDropPosition =
                rowGroupMoveState?.targetTableId === undefined &&
                rowGroupMoveState?.targetGroupId === slot.groupId &&
                rowGroupMoveState.sourceGroupId !== slot.groupId
                  ? rowGroupMoveState.position
                  : undefined;
              const isRowDropTarget =
                rowMoveState?.targetTableId === undefined &&
                rowMoveState?.targetGroupId === slot.groupId;

              return (
                <tr
                  className={[
                    "comins-table__tr comins-table__group-row",
                    groupRowProps?.className,
                    isViewportEndRow ? "comins-table__tr--viewport-end" : undefined,
                  ]
                    .filter(Boolean)
                    .join(" ")}
                  data-comins-group-id={String(slot.groupId)}
                  data-comins-group-index={node.groupIndex}
                  data-comins-group-row="true"
                  data-comins-transfer-group-id={getCominsTransferIdentity(slot.groupId)}
                  data-comins-group-drag-source={
                    rowGroupMoveState?.sourceGroupId === slot.groupId ? "true" : undefined
                  }
                  data-comins-group-drop-position={groupDropPosition}
                  data-comins-row-drop-valid={
                    isRowDropTarget ? (rowMoveState.valid ? "true" : "false") : undefined
                  }
                  data-testid={`group-row-${encodeURIComponent(String(slot.groupId))}`}
                  key={slot.key}
                  style={{ ...groupRowProps?.style, height: rowHeight }}
                >
                  <th
                    className="comins-table__td comins-table__group-cell px-3 py-2"
                    colSpan={Math.max(1, visibleColumns.length)}
                    scope="rowgroup"
                    style={{ height: rowHeight }}
                  >
                    <span className="comins-row-group-cell-content">
                      {groupDraggable ? (
                        <CominsTableIconButton
                          aria-label={`Move ${String(node.label)} group`}
                          className="comins-row-group-drag-handle"
                          data-testid={`group-drag-handle-${encodeURIComponent(String(slot.groupId))}`}
                          icon="columnMove"
                          onPointerDown={(event) => beginRowGroupHandlePointerDrag(event, slot.groupId)}
                        />
                      ) : null}
                      <CominsTableIconButton
                        aria-expanded={expanded}
                        aria-label={`${expanded ? "Collapse" : "Expand"} ${String(node.label)} group`}
                        className="comins-row-group-expander"
                        data-testid={`group-toggle-${encodeURIComponent(String(slot.groupId))}`}
                        disabled={typeof rowGrouping?.onChangeExpandedGroupIds !== "function"}
                        icon={expanded ? "disclosureExpanded" : "disclosureCollapsed"}
                        onClick={(event) => {
                          event.preventDefault();
                          event.stopPropagation();
                          toggleRowGroup(slot.groupId);
                        }}
                        ref={(element) => {
                          if (element) {
                            groupDisclosureElementsRef.current.set(slot.groupId, element);
                          } else {
                            groupDisclosureElementsRef.current.delete(slot.groupId);
                          }
                        }}
                      />
                      <span className="comins-row-group-content">
                        {typeof rowGrouping?.renderGroupContent === "function" ? customContent : (
                          <>
                            <span className="comins-row-group-label">{node.label}</span>
                            <span className="comins-row-group-count">
                              {node.leafSourceIndexes.length} Rows
                            </span>
                            {aggregateContent}
                          </>
                        )}
                      </span>
                    </span>
                  </th>
                </tr>
              );
            }

            const entry = slot;
            const rowRuntimeProps = resolveRowProps(effectiveRowProps, entry.row, entry.visibleIndex);
            const isRowSelected = selectedRowIdSet.has(entry.rowId);
            const isLastRenderedSlot = entryIndex === rowWindow.slots.length - 1;
            const isLastLogicalRow = fullProjectionSlots.at(-1)?.key === entry.key;
            const virtualContentFillsViewport = rowWindow.scrollHeight >= containerHeight - 1;
            const isViewportEndRow =
              isLastRenderedSlot &&
              (virtualized
                ? isLastLogicalRow && virtualContentFillsViewport
                : emptyFillerHeight === 0);
            const rowCustomBackground = getRowCustomBackground(rowRuntimeProps.style);
            const rowRenderKey =
              virtualized && rowWindow.mixed
                ? entry.key
                : virtualized
                  ? `virtual-row-slot-${entryIndex}`
                  : String(entry.rowId);
            const rowDetailParams: CominsRowDetailParams<TData> = { row: createEventRow(entry) };
            const rowDetailExpandable = rowDetailEnabled && (isRowExpandable?.(rowDetailParams) ?? true);
            const rowDetailExpanded = rowDetailExpandable && effectiveExpandedRowIdSet.has(entry.rowId);
            const rowDetailFixedHeight =
              rowDetailExpanded && entry.detail?.mode === "fixed"
                ? entry.detail.height
                : undefined;
            const rowDetailMode = entry.detail?.mode ?? "fixed";
            const rowDetailIdToken = `${typeof entry.rowId}-${encodeURIComponent(String(entry.rowId))}`;
            const rowDetailId = `comins-row-detail-${encodeURIComponent(rowDetailIdPrefix)}-${rowDetailIdToken}`;
            const rowDetailContentId = `${rowDetailId}-content`;
            const rowDetailToggleId = `${rowDetailId}-toggle`;

            return (
              <Fragment key={rowRenderKey}>
                {
                  rowMoveState?.targetTableId === undefined &&
                  rowMoveState?.targetDataIndex === entry.dataIndex &&
                  rowMoveState.sourceRowId !== entry.rowId ? (
                  <tr
                    aria-hidden="true"
                    className="comins-row-move-placeholder"
                    data-comins-row-drop-valid={rowMoveState.valid ? "true" : "false"}
                  >
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
                  isViewportEndRow && !rowDetailExpanded ? "comins-table__tr--viewport-end" : undefined,
                  isRowSelected ? "comins-row-selected" : undefined,
                  rowRuntimeProps.className,
                ]
                  .filter(Boolean)
                  .join(" ")}
                data-disabled={rowRuntimeProps.disabled ? "true" : undefined}
                data-comins-row-custom-background={rowCustomBackground === undefined ? undefined : "true"}
                data-comins-row-data-index={entry.dataIndex}
                data-comins-row-parity={entry.visibleIndex % 2 === 0 ? "even" : "odd"}
                data-comins-transfer-row-id={getCominsTransferIdentity(entry.rowId)}
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
                    selectRowFromInteraction(event, entry);
                  }
                  onClickRow?.(createRowPayload(event, entry));
                }}
                onContextMenu={(event) => {
                  if (rowRuntimeProps.disabled) {
                    event.preventDefault();
                    return;
                  }

                  commitState((current) => selectRowForContextMenu(current, entry.rowId));
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
                  const pinnedColumn = getPinnedColumnAttributes(column.id);
                  const rawValue = getCominsCellValue(state, entry.row, column.id);
                  const address = { columnId: column.id, rowId: entry.rowId };
                  const isCellInRange = cellSelection && isCominsCellInSelectedRange(
                    state,
                    address,
                    groupingProjection?.visibleLeafRowIds ?? state.rowIds,
                  );
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
                  const componentInteraction: CominsBuiltInComponentInteraction = {
                    requestRowSelection: ({ event, mode }) => {
                      if (cellDisabled) {
                        return false;
                      }

                      if (mode === "exclusive") {
                        commitState((current) => selectRow(current, entry.rowId));
                        lastRowAnchorRef.current = entry.rowId;
                        return true;
                      }

                      selectRowFromInteraction(event, entry);
                      return true;
                    },
                  };
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
                      interaction: componentInteraction,
                      showContent: false,
                    })
                  ) : (
                    <span className="comins-table__cell-value">{formattedCellValue}</span>
                  );
                  const tooltip =
                    typeof column.cell?.tooltip === "function" ? column.cell.tooltip(cellPayload) : column.cell?.tooltip;
                  const treeEntry =
                    column.id === treeContext?.treeColumnId
                      ? treeContext.entriesByRowId.get(entry.rowId)
                      : undefined;
                  const renderedCellContent = treeEntry ? (
                    <span
                      className="comins-tree-cell-content"
                      style={{ "--comins-tree-depth": treeEntry.depth } as React.CSSProperties}
                    >
                      {treeEntry.hasChildren ? (
                        <CominsTableIconButton
                          aria-expanded={treeEntry.expanded}
                          aria-label={`${treeEntry.expanded ? "Collapse" : "Expand"} ${String(entry.rowId)}`}
                          className="comins-tree-expander"
                          data-testid={`tree-expander-${String(entry.rowId)}`}
                          icon={treeEntry.expanded ? "disclosureExpanded" : "disclosureCollapsed"}
                          onClick={(event) => {
                            event.preventDefault();
                            event.stopPropagation();
                            treeContext?.onToggle(entry.rowId);
                          }}
                          onMouseDown={(event) => event.stopPropagation()}
                          onPointerDown={(event) => event.stopPropagation()}
                        />
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
                        isCellInRange ? "comins-cell-range-selected" : undefined,
                        cellClassName,
                      ]
                        .filter(Boolean)
                        .join(" ")}
	                      data-disabled={cellDisabled ? "true" : undefined}
	                      data-comins-cell-column-id={column.id}
	                      data-comins-component-cell={visibleCellComponents.length > 0 ? "true" : undefined}
                      data-comins-data-index={entry.dataIndex}
                      data-comins-pin-boundary={pinnedColumn.boundary ? "true" : undefined}
                      data-comins-pinned={pinnedColumn.pinned}
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
                        if ((event.target as Element).closest(".comins-row-detail-expander")) {
                          event.stopPropagation();
                          return;
                        }

                        if (cellDisabled) {
                          event.preventDefault();
                          event.stopPropagation();
                          return;
                        }

                        commitState((current) => {
                          const nextRows = selectRowForContextMenu(current, entry.rowId);

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
                        if ((event.target as Element).closest(".comins-row-detail-expander")) {
                          event.stopPropagation();
                          return;
                        }

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
                      onMouseOver={(event) => {
                        if (event.buttons === 1 && !activePointerGestureCleanupRef.current) {
                          updateCellRangeDrag(address);
                        }
                      }}
                      onMouseUp={endCellRangeDrag}
                      onPointerDown={(event) => beginCellRangePointerDrag(event, address, cellDisabled)}
                      onPointerEnter={(event) => {
                        if (event.buttons === 1) {
                          updateCellRangeDrag(address);
                        }
                      }}
                      onPointerMove={(event) => {
                        if (event.buttons === 1) {
                          updateCellRangeDrag(address);
                        }
                      }}
                      onPointerUp={endCellRangeDrag}
                      style={{ height: rowHeight, ...cellStyle, ...pinnedColumn.style }}
                      title={typeof tooltip === "string" ? tooltip : undefined}
                      tabIndex={cellDisabled ? -1 : 0}
                    >
                      {columnIndex === 0 && (rowDetailEnabled || rowRuntimeProps.draggable) ? (
                        <div className="comins-row-cell-content">
                          <span className="comins-row-leading-controls">
                            {rowDetailEnabled ? (
                              rowDetailExpandable ? (
                                <CominsRowDetailToggle
                                  controlsId={rowDetailContentId}
                                  disabled={!onChangeExpandedRowIds}
                                  expanded={rowDetailExpanded}
                                  id={rowDetailToggleId}
                                  label={`${rowDetailExpanded ? "Collapse" : "Expand"} ${String(entry.rowId)} details`}
                                  onElement={(element) => {
                                    if (element) {
                                      rowDetailToggleElementsRef.current.set(entry.rowId, element);
                                    } else {
                                      rowDetailToggleElementsRef.current.delete(entry.rowId);
                                    }
                                  }}
                                  onToggle={() => toggleRowDetail(entry.rowId, rowDetailExpandable)}
                                  testId={`row-detail-toggle-${String(entry.rowId)}`}
                                />
                              ) : (
                                <span
                                  aria-hidden="true"
                                  className="comins-row-detail-expander-spacer"
                                  data-comins-row-leading-control="disclosure"
                                />
                              )
                            ) : null}
                            {rowRuntimeProps.draggable ? (
                              <span
                                aria-hidden="true"
                                className="comins-row-drag-handle"
                                data-comins-row-leading-control="drag"
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
                          </span>
                          <div className="comins-row-cell-content__value">{renderedCellContent}</div>
                        </div>
                      ) : (
                        renderedCellContent
                      )}
                    </td>
                  );
                })}
              </tr>
              {rowDetailExpanded ? (
                <CominsRowDetailRow
                  colSpan={visibleColumns.length}
                  contentId={rowDetailContentId}
                  fixedHeight={rowDetailFixedHeight}
                  labelId={rowDetailToggleId}
                  onContentElement={(element) =>
                    registerDetailElement(entry.rowId, rowDetailMode, element)
                  }
                  ownerId={String(entry.rowId)}
                  testId={`row-detail-content-${String(entry.rowId)}`}
                  getToggleElement={() => rowDetailToggleElementsRef.current.get(entry.rowId) ?? null}
                >
                  {renderRowDetail?.(rowDetailParams)}
                </CominsRowDetailRow>
              ) : null}
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
        <div
          aria-label="Table summary"
          className="comins-table__summary"
          ref={footerRef}
          style={{ width: synchronizedHorizontalViewportWidth }}
        >
          <table className="comins-table__table comins-table__summary-table min-w-full table-fixed" style={{ width: tableWidth }}>
            {renderColumnSizing()}
            <tfoot>
              <tr
                className={["comins-table__summary-row", summary.className].filter(Boolean).join(" ")}
                style={summary.style}
              >
                {summaryCells.flatMap((cell) =>
                  getCominsColumnPinningSpanFragments(
                    columnPinning,
                    cell.startIndex,
                    cell.colSpan,
                  ).map((fragment, fragmentIndex) => {
                    const fragmentStyle = fragment.pinned
                      ? {
                          [fragment.pinned]: fragment.offset,
                          position: "sticky",
                        } as React.CSSProperties
                      : undefined;

                    return (
                      <td
                        className={["comins-table__summary-cell px-3 py-2", cell.className].filter(Boolean).join(" ")}
                        colSpan={fragment.colSpan}
                        data-comins-pin-boundary={fragment.boundary ? "true" : undefined}
                        data-comins-pinned={fragment.pinned}
                        data-comins-summary-column-id={fragmentIndex === 0 ? cell.column.id : undefined}
                        data-testid={fragmentIndex === 0 ? `summary-cell-${cell.column.id}` : undefined}
                        key={`${cell.column.id}-${fragment.startIndex}`}
                        style={{ ...cell.style, ...fragmentStyle }}
                      >
                        {fragmentIndex === 0 ? cell.value : null}
                      </td>
                    );
                  }),
                )}
              </tr>
            </tfoot>
          </table>
          {hasHorizontalOverflow ? (
            <div
              aria-hidden="true"
              className="comins-table__horizontal-range-spacer"
              style={{ width: synchronizedHorizontalContentWidth }}
            />
          ) : null}
        </div>
      ) : null}
      {hasHorizontalOverflow ? (
        <div
          aria-label="Table horizontal scroll"
          className="comins-table__horizontal-scrollbar"
          data-testid="table-horizontal-scrollbar"
          onScroll={(event) => syncHorizontalScrollLeft(event.currentTarget.scrollLeft)}
          ref={horizontalScrollbarRef}
          role="region"
          style={{ width: synchronizedHorizontalScrollbarWidth }}
          tabIndex={0}
        >
          <div
            aria-hidden="true"
            className="comins-table__horizontal-scrollbar-content"
            style={{ width: synchronizedHorizontalContentWidth }}
          />
        </div>
      ) : null}
      {movingHeaderLabel && columnMovePointer ? (
        <div
          aria-hidden="true"
          className="comins-column-move-ghost"
          data-testid="column-move-ghost"
          style={{ left: columnMovePointer.x + 12, top: columnMovePointer.y + 12 }}
        >
          <CominsTableIcon name="columnMove" />
          <span className="comins-column-move-ghost__label">{movingHeaderLabel}</span>
        </div>
      ) : null}
      {transferRejectionFeedback ? (
        <CominsPointerTooltip
          icon={<span className="comins-tooltip-surface__warning">!</span>}
          tone="danger"
          x={transferRejectionFeedback.x}
          y={transferRejectionFeedback.y}
        >
          {transferRejectionFeedback.content}
        </CominsPointerTooltip>
      ) : null}
    </div>
  );
}

function CominsTreeTableInner<TData>(
  {
    data,
    columnFiltering: _columnFiltering,
    defaultExpandAll = true,
    estimatedRowDetailHeight: _estimatedRowDetailHeight,
    expandedRowIds: _expandedRowIds,
    getRowDetailHeight: _getRowDetailHeight,
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
    onChangeExpandedRowIds: _onChangeExpandedRowIds,
    onChangeSort,
    onChangeSortModel,
    onLazyLoad: _onLazyLoad,
    onLoadMore: _onLoadMore,
    rowGrouping: _rowGrouping,
    tableTransfer: _tableTransfer,
    rowProps,
    isRowExpandable: _isRowExpandable,
    renderRowDetail: _renderRowDetail,
    tree: _tree,
    ...props
  }: CominsTreeTableProps<TData>,
  ref: React.ForwardedRef<CominsTableRef<TData>>,
) {
  const initialDefaultExpandAll = useRef(defaultExpandAll).current;
  const [treeSortModel, setTreeSortModel] = useState<CominsSortModel>([]);
  const treeColumns = useMemo(
    () =>
      props.columns.map((column, index) =>
        ({
          ...column,
          lockPosition: index === 0 ? true : column.lockPosition,
          pinned: undefined,
        }),
      ),
    [props.columns],
  );
  const treeColumnId = treeColumns[0]?.id ?? treeColumns[0]?.field ?? null;
  const sortedTree = useMemo(
    () => getSortedCominsTree(data, treeColumns, treeSortModel),
    [data, treeColumns, treeSortModel],
  );
  const visibleTreeRows = useMemo(
    () => flattenCominsTree(sortedTree, getRowId, { defaultExpandAll: initialDefaultExpandAll }),
    [getRowId, initialDefaultExpandAll, sortedTree],
  );
  const entriesByRowId = useMemo(
    () => new Map(visibleTreeRows.map((entry) => [entry.rowId, entry] as const)),
    [visibleTreeRows],
  );
  const treeContext = useMemo<CominsTreeRenderContext<TData>>(
    () => ({
      entriesByRowId,
      onExpand: (nodeIds) => {
        const nextData = setCominsTreeExpansion(data, nodeIds, true, getRowId, initialDefaultExpandAll);

        if (nextData !== data) {
          onChangeData?.([...nextData]);
        }
      },
      onFold: (nodeIds) => {
        const nextData = setCominsTreeExpansion(data, nodeIds, false, getRowId, initialDefaultExpandAll);

        if (nextData !== data) {
          onChangeData?.([...nextData]);
        }
      },
      onToggle: (rowId) =>
        onChangeData?.(toggleCominsTreeNode(data, rowId, getRowId, { defaultExpandAll: initialDefaultExpandAll })),
      summaryRows: getCominsTreeLeafItems(data),
      treeColumnId,
    }),
    [data, entriesByRowId, getRowId, initialDefaultExpandAll, onChangeData, treeColumnId],
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
    columns: treeColumns,
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
    onChangeSort,
    onChangeSortModel: (nextSortModel) => {
      setTreeSortModel(nextSortModel);
      onChangeSortModel?.(nextSortModel);
    },
    onLazyLoad: undefined,
    onLoadMore: undefined,
    pagination: { pageIndex: 0, pageSize: Math.max(1, visibleTreeRows.length) },
    rowProps: { ...rowProps, draggable: false },
    tree: false,
  };

  return <ForwardedCominsTableInner {...flatProps} ref={ref} treeContext={treeContext} />;
}

const ForwardedCominsTableInner = forwardRef(CominsTableInner) as <TData, TGroup = unknown>(
  props: CominsTableInnerProps<TData, TGroup> & React.RefAttributes<CominsTableRef<TData>>,
) => React.ReactElement | null;

const ForwardedCominsTreeTableInner = forwardRef(CominsTreeTableInner) as <TData>(
  props: CominsTreeTableProps<TData> & React.RefAttributes<CominsTableRef<TData>>,
) => React.ReactElement | null;

function CominsTableAdapter<TData, TGroup = unknown>(
  props: CominsTableProps<TData, TGroup> | CominsTreeTableProps<TData>,
  ref: React.ForwardedRef<CominsTableRef<TData>>,
) {
  return props.tree ? <ForwardedCominsTreeTableInner {...props} ref={ref} /> : <ForwardedCominsTableInner {...props} ref={ref} />;
}

export const CominsTable = forwardRef(CominsTableAdapter) as <TData, TGroup = unknown>(
  props: (CominsTableProps<TData, TGroup> | CominsTreeTableProps<TData>) & React.RefAttributes<CominsTableRef<TData>>,
) => React.ReactElement | null;

export const cominsTablePackage = "comins-table";
