import type React from "react";
import { Fragment } from "react";
import type { CominsCellAddress, CominsRowId, CominsEventRow } from "../model";
import type { CominsCellComponent, CominsCellComponentPayload, CominsHeaderComponent, CominsHeaderComponentPayload, CominsColumnProps, CominsTableRuntimeColumn, CominsTableState } from "../react-types";
import type { CominsDataVirtualSlot, CominsVirtualSlot, CominsPlaceholderVirtualSlot } from "../virtual-layout";
import type { CominsGroupModel, CominsRowGroupingConfig } from "../grouping";
import { getCominsAggregateValue } from "../grouping";
import type { CominsBuiltInComponentInteraction } from "../component-renderer";
import type { CominsTableRowProps, CominsRowDetailParams, CominsRowEventPayload, CominsCellEventPayload, CominsTreeSlots, CominsTreeSlotParams } from "../index";
import type { CominsRowHeight, CominsRowHeightParams } from "../row-height";
import type { CominsVisibleTreeRow } from "../tree";
import type { useCominsTreeDrag } from "../tree-drag";
import type { useCominsCellFill } from "../cell-fill";
import type { useCominsCellTooltip } from "./cell-tooltip";
import type { createCominsDetailFocusRestorer } from "../browser/scroll";
import type { CominsHeaderRenderEnvironment } from "./header-renderer";
import { CominsRowDetailRow, CominsRowDetailToggle } from "../row-detail";
import { CominsTableIconButton } from "../table-icons";
import { getCominsCellValue, isCominsCellInSelectedRange, isCominsCellSelected, selectCell, selectCellRange, selectRow, selectRows, updateCominsRows } from "./core-compat";
import { setCominsNestedInputValue } from "../row-value";

// Shared with the adapter formatter; remains a single private module sentinel.
export const deferredDefaultCellValue = Symbol("deferredDefaultCellValue");
type MutableRef<T> = { current: T };
type RenderableComponent<TData> = CominsCellComponent<TData> | CominsHeaderComponent<TData>;
type RenderablePayload<TData> = CominsCellComponentPayload<TData> | CominsHeaderComponentPayload<TData>;
type RowEntry<TData> = Pick<CominsDataVirtualSlot<TData>, "absoluteIndex" | "dataIndex" | "row" | "rowId" | "visibleIndex">;
type RowRuntimeProps = { className: string | undefined; disabled: boolean; draggable: boolean; style: React.CSSProperties | undefined };
type RowMoveState = { sourceRowId: CominsRowId; targetDataIndex?: number; targetGroupId?: CominsRowId; targetTableId?: string; valid: boolean };
type RowGroupMoveState = { position: "after" | "append" | "before"; sourceGroupId: CominsRowId; targetGroupId?: CominsRowId; targetTableId?: string };
type TreeRenderContext<TData> = { drag: ReturnType<typeof useCominsTreeDrag<TData>>; entriesByRowId: Map<CominsRowId, CominsVisibleTreeRow<TData>>; onToggle: (rowId: CominsRowId) => void; treeColumnId: string | null; slots?: CominsTreeSlots<TData> };

/** Render-local output; read at the original tooltip JSX position only. */
export type CominsBodyRenderOutput = { activeCellTooltipContent: React.ReactNode };
export type CominsBodyRenderEnvironment<TData, TGroup> = {
  state: CominsTableState<TData>;
  rowWindow: { mixed: boolean; scrollHeight: number; slots: CominsVirtualSlot<TData>[] };
  orderedGroupModel: CominsGroupModel<TGroup> | null;
  expandedGroupIdSet: ReadonlySet<CominsRowId>;
  fullProjectionSlots: readonly CominsVirtualSlot<TData>[];
  containerHeight: number;
  virtualized: boolean;
  emptyFillerHeight: number;
  rowGrouping: CominsRowGroupingConfig<TData, TGroup> | undefined;
  normalizedTableTransfer: unknown;
  rowGroupMoveState: RowGroupMoveState | null;
  rowMoveState: RowMoveState | null;
  rowHeight: number;
  visibleColumns: CominsTableRuntimeColumn<TData>[];
  getCominsTransferIdentity: (id: CominsRowId) => string;
  beginRowGroupHandlePointerDrag: (event: React.PointerEvent<HTMLElement>, groupId: CominsRowId) => void;
  toggleRowGroup: (groupId: CominsRowId) => void;
  createDisclosureElementRef: (elementsRef: MutableRef<Map<CominsRowId, HTMLButtonElement>>, rowId: CominsRowId) => (element: HTMLButtonElement | null) => void;
  groupDisclosureElementsRef: MutableRef<Map<CominsRowId, HTMLButtonElement>>;
  viewportContext: { data: { requests: readonly { startIndex: number; endIndex: number; status: string }[] } } | undefined;
  getPinnedColumnAttributes: CominsHeaderRenderEnvironment<TData>["getPinnedColumnAttributes"];
  retryViewport: (index: number) => void;
  resolveRowProps: (props: CominsTableRowProps<TData> | undefined, row: TData, index: number) => RowRuntimeProps;
  effectiveRowProps: CominsTableRowProps<TData> | undefined;
  selectedRowIdSet: ReadonlySet<CominsRowId>;
  getRowCustomBackground: (style: React.CSSProperties | undefined) => string | number | undefined;
  rowDetailEnabled: boolean;
  createEventRow: (entry: RowEntry<TData>) => CominsEventRow<TData>;
  isRowExpandable: ((params: CominsRowDetailParams<TData>) => boolean) | undefined;
  effectiveExpandedRowIdSet: ReadonlySet<CominsRowId>;
  rowDetailIdPrefix: string;
  registerDetailElement: (rowId: CominsRowId, mode: "auto" | "fixed", element: HTMLElement | null, kind?: "row") => void;
  treeContext: TreeRenderContext<TData> | undefined;
  rowSelectionOnClick: boolean;
  selectRowFromInteraction: (event: Pick<React.KeyboardEvent | React.MouseEvent, "ctrlKey" | "metaKey" | "shiftKey">, entry: RowEntry<TData>) => void;
  onClickRow: ((payload: CominsRowEventPayload<TData>) => void) | undefined;
  createRowPayload: <TEvent>(event: TEvent, entry: RowEntry<TData>) => CominsRowEventPayload<TData, TEvent>;
  commitState: CominsHeaderRenderEnvironment<TData>["commitState"];
  selectRowForContextMenu: (state: CominsTableState<TData>, rowId: CominsRowId) => CominsTableState<TData>;
  lastRowAnchorRef: MutableRef<CominsRowId | null>;
  onContextMenuRow: ((payload: CominsRowEventPayload<TData>) => void) | undefined;
  onDoubleClickRow: ((payload: CominsRowEventPayload<TData>) => void) | undefined;
  handleRowKeyDown: (event: React.KeyboardEvent<HTMLTableRowElement>, entry: RowEntry<TData>, disabled: boolean) => void;
  getResolvedRowStyle: (rowHeight: number, style: React.CSSProperties | undefined, background: string | number | undefined) => React.CSSProperties;
  getRowHeight: ((params: CominsRowHeightParams<TData>) => CominsRowHeight | undefined) | undefined;
  cellSelection: boolean;
  getSelectionRowOrder: () => readonly CominsRowId[];
  createCellComponentPayload: (entry: RowEntry<TData>, disabled: boolean, selected: boolean, selectedRowCount: number, column: CominsTableRuntimeColumn<TData>, columnIndex: number, value: unknown) => CominsCellComponentPayload<TData>;
  resolveRenderableCellProps: (column: CominsTableRuntimeColumn<TData>, payload: CominsCellComponentPayload<TData>) => CominsColumnProps<TData> | undefined;
  isRenderableCellDisabled: (props: CominsColumnProps<TData> | undefined, payload: CominsCellComponentPayload<TData>) => boolean;
  toClassName: (value: string | Record<string, boolean> | undefined) => string | undefined;
  getRenderableCellClassName: (props: CominsColumnProps<TData> | undefined, payload: CominsCellComponentPayload<TData>) => string | Record<string, boolean> | undefined;
  getRenderableCellStyle: (props: CominsColumnProps<TData> | undefined, payload: CominsCellComponentPayload<TData>) => React.CSSProperties | undefined;
  formatRenderableCellValue: (column: CominsTableRuntimeColumn<TData>, payload: CominsCellComponentPayload<TData>) => React.ReactNode | typeof deferredDefaultCellValue;
  getRenderableCominsComponents: (components: readonly RenderableComponent<TData>[] | undefined, payload: RenderablePayload<TData>) => RenderableComponent<TData>[];
  renderCominsContentWithComponents: (content: React.ReactNode, components: readonly RenderableComponent<TData>[] | undefined, payload: RenderablePayload<TData>, options?: { interaction?: CominsBuiltInComponentInteraction; showContent?: boolean }) => React.ReactNode;
  cellTooltip: ReturnType<typeof useCominsCellTooltip>;
  renderTreeSlot: (name: "leading" | "content" | "trailing", content: React.ReactNode) => React.ReactNode;
  resolveTreeSlotContent: (slot: NonNullable<CominsTreeSlots<TData>["content"]>, params: CominsTreeSlotParams<TData>, defaultContent?: React.ReactNode) => React.ReactNode;
  cellFill: ReturnType<typeof useCominsCellFill<TData>>;
  onClickCell: ((payload: CominsCellEventPayload<TData>) => void) | undefined;
  rangeDragMovedRef: MutableRef<boolean>;
  lastCellAnchorRef: MutableRef<CominsCellAddress | null>;
  isLoadedCellRange: (anchorId: CominsRowId, focusId: CominsRowId) => boolean;
  getVisibleRowIdsBetween: (state: CominsTableState<TData>, anchorId: CominsRowId, focusId: CominsRowId) => CominsRowId[];
  createCellPayload: <TEvent>(event: TEvent, entry: RowEntry<TData>, column: CominsTableRuntimeColumn<TData>, index: number, value: unknown) => CominsCellEventPayload<TData, unknown, TEvent>;
  onContextMenuCell: ((payload: CominsCellEventPayload<TData>) => void) | undefined;
  onDoubleClickCell: ((payload: CominsCellEventPayload<TData>) => void) | undefined;
  handleCellKeyDown: (event: React.KeyboardEvent<HTMLTableCellElement>, entry: RowEntry<TData>, column: CominsTableRuntimeColumn<TData>, index: number, address: CominsCellAddress, disabled: boolean) => void;
  beginCellRangeDrag: (event: React.MouseEvent<HTMLTableCellElement>, address: CominsCellAddress, disabled: boolean) => void;
  activePointerGestureCleanupRef: MutableRef<((unmounting?: boolean) => void) | null>;
  updateCellRangeDrag: (address: CominsCellAddress) => void;
  endCellRangeDrag: () => void;
  beginCellRangePointerDrag: (event: React.PointerEvent<HTMLTableCellElement>, address: CominsCellAddress, disabled: boolean) => void;
  onChangeExpandedRowIds: ((rowIds: CominsRowId[]) => void) | undefined;
  rowDetailToggleElementsRef: MutableRef<Map<CominsRowId, HTMLButtonElement>>;
  toggleRowDetail: (rowId: CominsRowId, expandable: boolean) => void;
  beginRowHandlePointerDrag: (event: React.PointerEvent<HTMLElement>, entry: RowEntry<TData>, disabled: boolean, draggable: boolean) => void;
  detailFocusRestorer: ReturnType<typeof createCominsDetailFocusRestorer>;
  resolvedRowDetailRender: ((params: CominsRowDetailParams<TData>) => React.ReactNode) | undefined;
};

type DataRowRenderView<TData> = {
  entry: CominsDataVirtualSlot<TData>;
  actualRowStyleHeight: number | "auto";
  rowRuntimeProps: RowRuntimeProps;
  isRowSelected: boolean;
  rowDetailContentId: string;
  rowDetailToggleId: string;
  rowDetailExpandable: boolean;
  rowDetailExpanded: boolean;
};

/** Direct module functions only; inputs remain this render's snapshots. */
export function renderCominsBodySlot<TData, TGroup>(
  env: CominsBodyRenderEnvironment<TData, TGroup>,
  slot: CominsVirtualSlot<TData>,
  entryIndex: number,
  output: CominsBodyRenderOutput,
) {
  const {
    state,
    rowWindow,
    orderedGroupModel,
    expandedGroupIdSet,
    fullProjectionSlots,
    containerHeight,
    virtualized,
    emptyFillerHeight,
    rowGrouping,
    normalizedTableTransfer,
    rowGroupMoveState,
    rowMoveState,
    rowHeight,
    visibleColumns,
    getCominsTransferIdentity,
    beginRowGroupHandlePointerDrag,
    toggleRowGroup,
    createDisclosureElementRef,
    groupDisclosureElementsRef,
    viewportContext,
    getPinnedColumnAttributes,
    retryViewport,
    resolveRowProps,
    effectiveRowProps,
    selectedRowIdSet,
    getRowCustomBackground,
    rowDetailEnabled,
    createEventRow,
    isRowExpandable,
    effectiveExpandedRowIdSet,
    rowDetailIdPrefix,
    registerDetailElement,
    treeContext,
    rowSelectionOnClick,
    selectRowFromInteraction,
    onClickRow,
    createRowPayload,
    commitState,
    selectRowForContextMenu,
    lastRowAnchorRef,
    onContextMenuRow,
    onDoubleClickRow,
    handleRowKeyDown,
    getResolvedRowStyle,
    getRowHeight,
    cellSelection,
    getSelectionRowOrder,
    createCellComponentPayload,
    resolveRenderableCellProps,
    isRenderableCellDisabled,
    toClassName,
    getRenderableCellClassName,
    getRenderableCellStyle,
    formatRenderableCellValue,
    getRenderableCominsComponents,
    renderCominsContentWithComponents,
    cellTooltip,
    renderTreeSlot,
    resolveTreeSlotContent,
    cellFill,
    onClickCell,
    rangeDragMovedRef,
    lastCellAnchorRef,
    isLoadedCellRange,
    getVisibleRowIdsBetween,
    createCellPayload,
    onContextMenuCell,
    onDoubleClickCell,
    handleCellKeyDown,
    beginCellRangeDrag,
    activePointerGestureCleanupRef,
    updateCellRangeDrag,
    endCellRangeDrag,
    beginCellRangePointerDrag,
    onChangeExpandedRowIds,
    rowDetailToggleElementsRef,
    toggleRowDetail,
    beginRowHandlePointerDrag,
    detailFocusRestorer,
    resolvedRowDetailRender,
  } = env;
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
    const groupRender = rowGrouping?.content?.render ?? rowGrouping?.renderGroupContent;
    const customContent = groupRender?.(groupRenderParams);
    const useDefaultGroupContent = !groupRender || (Boolean(rowGrouping?.content?.render) && customContent === undefined);
    const aggregateContent = renderCominsGroupAggregates(env, aggregateValues);
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
              ref={createDisclosureElementRef(groupDisclosureElementsRef, slot.groupId)}
            />
            <span className="comins-row-group-content">
              {!useDefaultGroupContent ? customContent : (
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

  if (slot.kind === "placeholder") {
    const request = viewportContext?.data.requests.find(request => request.startIndex <= slot.absoluteIndex && request.endIndex > slot.absoluteIndex);
    return (
    <tr className="comins-table__tr comins-table__skeleton-row" data-testid="viewport-placeholder" data-comins-absolute-index={slot.absoluteIndex} key={slot.key} style={{ height: slot.height }}>
      {renderCominsPlaceholderCells(env, slot, request)}
    </tr>
  ); }
  const entry = slot;
  const actualRowStyleHeight = entry.autoHeight ? "auto" : entry.rowHeight ?? rowHeight;
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
    virtualized && (rowWindow.mixed || rowDetailEnabled)
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
          <td colSpan={Math.max(1, visibleColumns.length)}>
            <div data-testid="row-move-placeholder">이 위치로 이동</div>
          </td>
        </tr>
      ) : null}
    <tr
      aria-disabled={rowRuntimeProps.disabled ? "true" : undefined}
      ref={entry.autoHeight ? element => registerDetailElement(entry.rowId, "auto", element, "row") : undefined}
      data-comins-row-auto-height={entry.autoHeight ? "true" : undefined}
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
      data-comins-absolute-index={entry.absoluteIndex}
      data-comins-tree-drop={treeContext?.drag.preview?.context.target.rowId === entry.rowId ? treeContext.drag.preview.context.position : undefined}
      data-comins-tree-drop-valid={treeContext?.drag.preview?.context.target.rowId === entry.rowId ? String(treeContext.drag.preview.valid) : undefined}
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

        if (rowSelectionOnClick && !(event as React.MouseEvent<HTMLTableRowElement> & { __cominsCellSelectionHandled?: boolean })
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

        if (rowSelectionOnClick) commitState((current) => selectRowForContextMenu(current, entry.rowId));
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
      style={{ ...getResolvedRowStyle(rowHeight, rowRuntimeProps.style, rowCustomBackground), ...(getRowHeight ? { height: actualRowStyleHeight } : {}) }}
      tabIndex={rowRuntimeProps.disabled ? -1 : 0}
    >
      {renderCominsDataCells(env, { entry, actualRowStyleHeight, rowRuntimeProps, isRowSelected, rowDetailContentId, rowDetailToggleId, rowDetailExpandable, rowDetailExpanded }, output)}
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
        restoreFocus={detailFocusRestorer.restore}
      >
        {resolvedRowDetailRender?.(rowDetailParams)}
      </CominsRowDetailRow>
    ) : null}
    </Fragment>
  );
}

export function renderCominsDataCell<TData, TGroup>(
  env: CominsBodyRenderEnvironment<TData, TGroup>,
  view: DataRowRenderView<TData>,
  column: CominsTableRuntimeColumn<TData>,
  columnIndex: number,
  output: CominsBodyRenderOutput,
) {
  const {
    state,
    rowWindow,
    orderedGroupModel,
    expandedGroupIdSet,
    fullProjectionSlots,
    containerHeight,
    virtualized,
    emptyFillerHeight,
    rowGrouping,
    normalizedTableTransfer,
    rowGroupMoveState,
    rowMoveState,
    rowHeight,
    visibleColumns,
    getCominsTransferIdentity,
    beginRowGroupHandlePointerDrag,
    toggleRowGroup,
    createDisclosureElementRef,
    groupDisclosureElementsRef,
    viewportContext,
    getPinnedColumnAttributes,
    retryViewport,
    resolveRowProps,
    effectiveRowProps,
    selectedRowIdSet,
    getRowCustomBackground,
    rowDetailEnabled,
    createEventRow,
    isRowExpandable,
    effectiveExpandedRowIdSet,
    rowDetailIdPrefix,
    registerDetailElement,
    treeContext,
    rowSelectionOnClick,
    selectRowFromInteraction,
    onClickRow,
    createRowPayload,
    commitState,
    selectRowForContextMenu,
    lastRowAnchorRef,
    onContextMenuRow,
    onDoubleClickRow,
    handleRowKeyDown,
    getResolvedRowStyle,
    getRowHeight,
    cellSelection,
    getSelectionRowOrder,
    createCellComponentPayload,
    resolveRenderableCellProps,
    isRenderableCellDisabled,
    toClassName,
    getRenderableCellClassName,
    getRenderableCellStyle,
    formatRenderableCellValue,
    getRenderableCominsComponents,
    renderCominsContentWithComponents,
    cellTooltip,
    renderTreeSlot,
    resolveTreeSlotContent,
    cellFill,
    onClickCell,
    rangeDragMovedRef,
    lastCellAnchorRef,
    isLoadedCellRange,
    getVisibleRowIdsBetween,
    createCellPayload,
    onContextMenuCell,
    onDoubleClickCell,
    handleCellKeyDown,
    beginCellRangeDrag,
    activePointerGestureCleanupRef,
    updateCellRangeDrag,
    endCellRangeDrag,
    beginCellRangePointerDrag,
    onChangeExpandedRowIds,
    rowDetailToggleElementsRef,
    toggleRowDetail,
    beginRowHandlePointerDrag,
    detailFocusRestorer,
    resolvedRowDetailRender,
  } = env;
  const { entry, actualRowStyleHeight, rowRuntimeProps, isRowSelected, rowDetailContentId, rowDetailToggleId, rowDetailExpandable, rowDetailExpanded } = view;
  const pinnedColumn = getPinnedColumnAttributes(column.id);
  const rawValue = getCominsCellValue(state, entry.row, column.id);
  const address = { columnId: column.id, rowId: entry.rowId };
  const isCellInRange = cellSelection && isCominsCellInSelectedRange(
    state,
    address,
    getSelectionRowOrder(),
  );
  const isCellSelected = cellSelection && isCominsCellSelected(state, address);
  // 기본 셀은 콜백용 payload를 사용하지 않으므로 설정이 있을 때만 생성한다.
  const cellPayload = column.cell ? createCellComponentPayload(
    entry,
    rowRuntimeProps.disabled,
    isRowSelected,
    state.selection.rowIds.length,
    column,
    columnIndex,
    rawValue,
  ) : undefined;
  const cellProps = cellPayload ? resolveRenderableCellProps(column, cellPayload) : undefined;
  const cellDisabled = rowRuntimeProps.disabled || (cellPayload !== undefined && isRenderableCellDisabled(cellProps, cellPayload));
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
  const cellClassName = cellPayload ? toClassName(getRenderableCellClassName(cellProps, cellPayload)) : undefined;
  const cellStyle = cellPayload ? getRenderableCellStyle(cellProps, cellPayload) : undefined;
  const hasCellComponents = Boolean(column.cell?.components?.length);
  const configuredCellValue = cellPayload ? formatRenderableCellValue(column, cellPayload) : deferredDefaultCellValue;
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
  const visibleCellComponents = cellPayload ? getRenderableCominsComponents(cellComponents, cellPayload) : [];
  const cellRender = column.cell?.render ?? column.cell?.renderer;
  const customCellContent = cellRender?.(cellPayload!);
  const useDefaultCellContent = !cellRender || (Boolean(column.cell?.render) && customCellContent === undefined);
  const formattedCellValue = configuredCellValue === deferredDefaultCellValue
    ? useDefaultCellContent && visibleCellComponents.length === 0
      ? rawValue == null ? "" : String(rawValue)
      : undefined
    : configuredCellValue;
  const cellContent = !useDefaultCellContent ? customCellContent : hasCellComponents ? (
    renderCominsContentWithComponents(formattedCellValue, cellComponents, cellPayload!, {
      interaction: componentInteraction,
      showContent: false,
    })
  ) : (
    <span className="comins-table__cell-value">{formattedCellValue}</span>
  );
  const tooltip =
    typeof column.cell?.tooltip === "function" ? column.cell.tooltip(cellPayload!) : column.cell?.tooltip;
  const tooltipConfig = column.cell?.tooltip;
  const customTooltip = typeof tooltipConfig === "object" && tooltipConfig !== null ? tooltipConfig : undefined;
  const tooltipKey = JSON.stringify([typeof entry.rowId, entry.rowId, column.id]);
  if (cellTooltip.active?.ready && cellTooltip.active.key === tooltipKey && customTooltip?.render) {
    output.activeCellTooltipContent = customTooltip.render(cellPayload!);
  }
  const treeEntry =
    column.id === treeContext?.treeColumnId
      ? treeContext.entriesByRowId.get(entry.rowId)
      : undefined;
  const treeSlots = treeContext?.slots;
  const treeSlotParams = treeEntry ? { ...treeEntry, defaultContent: cellContent } : null;
  const hasTreeSlots = Boolean(treeSlots?.leading || treeSlots?.content || treeSlots?.trailing);
  const renderedCellContent = treeEntry ? (
    <span
      className={`comins-tree-cell-content${hasTreeSlots ? " comins-tree-cell-content--slots" : ""}`}
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
      {treeSlotParams && treeSlots?.leading ? renderTreeSlot("leading", resolveTreeSlotContent(treeSlots.leading, treeSlotParams)) : null}
      <span className="comins-tree-cell-value">
        {treeSlotParams && treeSlots?.content ? renderTreeSlot("content", resolveTreeSlotContent(treeSlots.content, treeSlotParams, cellContent)) : cellContent}
      </span>
      {treeSlotParams && treeSlots?.trailing ? renderTreeSlot("trailing", resolveTreeSlotContent(treeSlots.trailing, treeSlotParams)) : null}
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
        cellFill.isPreview(address) ? "comins-cell-fill-preview" : undefined,
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
          if (!isLoadedCellRange(anchor.rowId, address.rowId)) { event.preventDefault(); event.stopPropagation(); return; }
          (event as React.MouseEvent<HTMLTableCellElement> & { __cominsCellSelectionHandled?: boolean })
            .__cominsCellSelectionHandled = true;
          lastCellAnchorRef.current = anchor;
          commitState((current) => {
            const nextRows = !rowSelectionOnClick ? current :
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
          const nextRows = !rowSelectionOnClick ? current : selectRow(current, entry.rowId, {
            multi: event.ctrlKey || event.metaKey,
            toggle: event.ctrlKey || event.metaKey,
          });

          return cellSelection
            ? selectCell(nextRows, address, {
                multi: event.ctrlKey || event.metaKey,
                toggle: event.ctrlKey || event.metaKey,
              })
            : nextRows;
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
          const nextRows = rowSelectionOnClick ? selectRowForContextMenu(current, entry.rowId) : current;
          const alreadySelected = isCominsCellSelected(current, address)
            || isCominsCellInSelectedRange(current, address, getSelectionRowOrder());
          return cellSelection && !alreadySelected ? selectCell(nextRows, address) : nextRows;
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
      data-comins-tooltip-key={customTooltip?.render ? tooltipKey : undefined}
      onFocusCapture={(event) => { if (customTooltip?.render) cellTooltip.enter(tooltipKey, event.currentTarget, "focus"); }}
      onBlurCapture={(event) => { if (!event.currentTarget.contains(event.relatedTarget as Node | null)) cellTooltip.leave(tooltipKey, "focus"); }}
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
        if (customTooltip?.render && event.buttons === 0) cellTooltip.enter(tooltipKey, event.currentTarget, "hover");
        if (event.buttons === 1) {
          updateCellRangeDrag(address);
        }
      }}
      onPointerLeave={() => cellTooltip.leave(tooltipKey, "hover")}
      onPointerMove={(event) => {
        if (event.buttons === 1) {
          updateCellRangeDrag(address);
        }
      }}
      onPointerUp={endCellRangeDrag}
      style={{ height: rowHeight, ...cellStyle, ...pinnedColumn.style, ...(getRowHeight ? { height: actualRowStyleHeight } : {}) }}
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
                  onElement={createDisclosureElementRef(rowDetailToggleElementsRef, entry.rowId)}
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
            {rowRuntimeProps.draggable && treeContext ? (
              <button
                type="button"
                aria-label={`Move ${String(entry.rowId)}`}
                className="comins-row-drag-handle"
                data-comins-tree-drag-handle="true"
                data-testid={`row-drag-handle-${String(entry.rowId)}`}
                disabled={rowRuntimeProps.disabled}
                onClick={(event) => { event.preventDefault(); event.stopPropagation(); }}
                onPointerDown={(event) => { if (!rowRuntimeProps.disabled) treeContext.drag.onPointerDown(event, createEventRow(entry)); }}
                onKeyDown={(event) => treeContext.drag.onKeyDown(event, createEventRow(entry))}
              />
            ) : rowRuntimeProps.draggable ? (
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
      {!cellDisabled && cellFill.handleAddress?.rowId === address.rowId && cellFill.handleAddress.columnId === address.columnId ? cellFill.handle : null}
    </td>
  );
}

export function renderCominsDataCells<TData, TGroup>(
  env: CominsBodyRenderEnvironment<TData, TGroup>,
  view: DataRowRenderView<TData>,
  output: CominsBodyRenderOutput,
) {
  const cells: React.ReactNode[] = [];
  for (let columnIndex = 0; columnIndex < env.visibleColumns.length; columnIndex++) {
    cells.push(renderCominsDataCell(env, view, env.visibleColumns[columnIndex]!, columnIndex, output));
  }
  return cells;
}

export function renderCominsGroupAggregates<TData, TGroup>(
  env: CominsBodyRenderEnvironment<TData, TGroup>,
  aggregateValues: Record<string, number | null>,
) {
  const { state } = env;
  const nodes: React.ReactNode[] = [];
  for (const [columnId, value] of Object.entries(aggregateValues)) {
    if (value === null) continue;
    const column = state.columns.find((candidate) => candidate.id === columnId);
    nodes.push(<span className="comins-row-group-aggregate" key={columnId}>
      {String(column?.label ?? columnId)}: {String(value)}
    </span>);
  }
  return nodes;
}

export function renderCominsPlaceholderCells<TData, TGroup>(
  env: CominsBodyRenderEnvironment<TData, TGroup>,
  slot: CominsPlaceholderVirtualSlot,
  request: { status: string } | undefined,
) {
  const { visibleColumns, getPinnedColumnAttributes, retryViewport } = env;
  const cells: React.ReactNode[] = [];
  for (let columnIndex = 0; columnIndex < visibleColumns.length; columnIndex++) {
    const column = visibleColumns[columnIndex]!;
    cells.push(<td className="comins-table__td comins-table__skeleton-cell" key={column.id} style={{ height: slot.height, ...getPinnedColumnAttributes(column.id).style }}>{request?.status === "error" && columnIndex === 0 ? <button type="button" data-testid="viewport-retry" onClick={() => retryViewport(slot.absoluteIndex)}>Retry loading rows</button> : <span className="comins-table__skeleton-block" />}</td>);
  }
  return cells;
}

export function renderCominsBodyRows<TData, TGroup>(
  env: CominsBodyRenderEnvironment<TData, TGroup>,
  output: CominsBodyRenderOutput,
) {
  const rows: React.ReactNode[] = [];
  for (let entryIndex = 0; entryIndex < env.rowWindow.slots.length; entryIndex++) {
    rows.push(renderCominsBodySlot(env, env.rowWindow.slots[entryIndex]!, entryIndex, output));
  }
  return rows;
}
