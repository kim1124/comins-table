import type React from "react";
import type {
  CominsHeaderCell,
  CominsHeaderComponent,
  CominsHeaderComponentPayload,
  CominsTableRuntimeColumn,
  CominsTableRuntimeColumnGroup,
  CominsTableState,
} from "../react-types";
import type {
  CominsColumnFilterKind,
  CominsColumnFilterRule,
  CominsColumnFilterOptionsInput,
  CominsColumnFilteringConfig,
  CominsNormalizedColumnFilterRule,
} from "../filtering";
import type { CominsColumnPinningBlock, CominsResolvedColumnPinning, CominsColumnPinned } from "../column-pinning";
import { getCominsPinnedBlockResizeMaxWidth } from "../column-pinning";
import { getEffectiveColumnMinWidth, setColumnWidthInsideParentGroup } from "../column-layout";
import { getCominsElementRect } from "../browser/measurements";
import { getAriaSortState, getSortIndicatorState, getSortRule } from "../table-state";
import { setCominsColumnWidth, setCominsColumnGroupWidth } from "./core-compat";
import { CominsColumnFilterControl } from "../column-filter";
import { CominsTableIcon, CominsTableIconButton } from "../table-icons";

type HeaderState<TData> = Pick<CominsTableState<TData>, "columns" | "columnState" | "columnGroupState" | "sortModel">;
type MutableRef<T> = { current: T };
type HeaderRendererBody = { body: React.ReactNode; renderer: unknown; kind: "render" | "legacy" };
type PointerGestureCleanup = (unmounting?: boolean) => void;

/** Per-render input only. No module cache, renderer factory, or deferred action publication. */
export type CominsHeaderRenderEnvironment<TData> = {
  state: HeaderState<TData>;
  visibleColumns: CominsTableRuntimeColumn<TData>[];
  columnMoveTarget: { kind: "column" | "group"; id: string; status: "invalid" | "neutral" | "valid" } | null;
  movingGroupId: string | null;
  movingColumnId: string | null;
  movingGroup: CominsTableRuntimeColumnGroup | undefined;
  resizingColumnId: string | null;
  showColumnMoveHandle: boolean;
  getPinnedColumnAttributes: (columnId: string) => { boundary?: boolean; pinned?: CominsColumnPinned; style?: React.CSSProperties };
  getCominsColumnPlaceholderText: (label: React.ReactNode, fallback: string) => string;
  COMINS_COLUMN_PLACEHOLDER_INTERACTION_PROPS: React.HTMLAttributes<HTMLElement>;
  bindCominsColumnPlaceholderNativeBoundary: (element: HTMLElement | null) => void;
  beginGroupPointerInteraction: (event: React.PointerEvent<HTMLElement>, group: CominsTableRuntimeColumnGroup, activateImmediately?: boolean) => void;
  beginHeaderPointerInteraction: (event: React.PointerEvent<HTMLElement>, cell: Extract<CominsHeaderCell<TData>, { kind: "column" }>, activateImmediately?: boolean) => void;
  headerRef: MutableRef<HTMLDivElement | null>;
  tableRootRef: MutableRef<HTMLDivElement | null>;
  stateRef: MutableRef<CominsTableState<TData>>;
  columnPinningBlocks: CominsColumnPinningBlock[];
  columnPinning: CominsResolvedColumnPinning;
  containerWidth: number;
  setResizingColumnId: React.Dispatch<React.SetStateAction<string | null>>;
  commitState: (updater: CominsTableState<TData> | ((current: CominsTableState<TData>) => CominsTableState<TData>), options?: { columnLayoutChanged?: boolean }) => void;
  activePointerGestureCleanupRef: MutableRef<PointerGestureCleanup | null>;
  registerActivePointerGesture: (cleanup: PointerGestureCleanup) => void;
  createHeaderComponentPayload: (state: HeaderState<TData>, column: CominsTableRuntimeColumn<TData>, columnIndex: number) => CominsHeaderComponentPayload<TData>;
  headerRendererBodyRef: MutableRef<Map<string, HeaderRendererBody>>;
  renderedHeaderRendererBodies: Map<string, HeaderRendererBody>;
  renderCominsComponentSlots: (components: readonly CominsHeaderComponent<TData>[] | undefined, payload: CominsHeaderComponentPayload<TData>, direction: "left" | "right") => React.ReactNode[];
  filteringRequested: boolean;
  normalizedColumnFilterById: Map<string, CominsNormalizedColumnFilterRule<TData>>;
  consumeSuppressedSortClick: (columnId: string) => boolean;
  activateHeaderSort: (column: CominsTableRuntimeColumn<TData>, additive: boolean) => void;
  filterSourceRows: CominsColumnFilterOptionsInput<TData>["rows"];
  columnFiltering: CominsColumnFilteringConfig | undefined;
  changeColumnFilterRule: (columnId: string, rule: CominsColumnFilterRule | null) => void;
};

/** Direct module function: its function object does not capture a Table render context. */
export function renderCominsHeaderCell<TData>(
  env: CominsHeaderRenderEnvironment<TData>,
  cell: CominsHeaderCell<TData>,
  fallbackIndex: number,
) {
  const {
    columnMoveTarget,
    movingGroupId,
    state,
    visibleColumns,
    getPinnedColumnAttributes,
    getCominsColumnPlaceholderText,
    showColumnMoveHandle,
    COMINS_COLUMN_PLACEHOLDER_INTERACTION_PROPS,
    bindCominsColumnPlaceholderNativeBoundary,
    beginGroupPointerInteraction,
    resizingColumnId,
    headerRef,
    stateRef,
    columnPinningBlocks,
    columnPinning,
    containerWidth,
    setResizingColumnId,
    commitState,
    activePointerGestureCleanupRef,
    registerActivePointerGesture,
    movingGroup,
    movingColumnId,
    createHeaderComponentPayload,
    headerRendererBodyRef,
    renderedHeaderRendererBodies,
    renderCominsComponentSlots,
    filteringRequested,
    normalizedColumnFilterById,
    consumeSuppressedSortClick,
    activateHeaderSort,
    beginHeaderPointerInteraction,
    filterSourceRows,
    columnFiltering,
    tableRootRef,
    changeColumnFilterRule,
  } = env;
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
        data-comins-column-end={groupColumnIds.at(-1) === visibleColumns.at(-1)?.id ? "true" : undefined}
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
            const measuredWidth = getCominsElementRect(event.currentTarget.closest<HTMLTableCellElement>("th"))?.width;
            const visibleWidthSnapshot = new Map<string, number>();

            for (const childId of cell.group.children) {
              const visibleColumn = visibleColumns.find((column) => column.id === childId);

              if (!visibleColumn) {
                continue;
              }

              const headerCell = Array.from(
                headerRef.current?.querySelectorAll<HTMLTableCellElement>("[data-comins-column-id]") ?? [],
              ).find((element) => element.dataset.cominsColumnId === visibleColumn.id);
              const measuredColumnWidth = getCominsElementRect(headerCell)?.width;
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
  const headerRenderer = column.header?.render ?? column.header?.renderer;
  const headerRendererKind = column.header?.render ? "render" : "legacy";
  const cachedHeaderRendererBody = headerRenderer ? headerRendererBodyRef.current.get(column.id) : undefined;

  const shouldRefreshHeaderRendererBody =
    Boolean(headerRenderer) && (!isColumnPlaceholder || cachedHeaderRendererBody?.renderer !== headerRenderer || cachedHeaderRendererBody?.kind !== headerRendererKind);
  const headerRendererBody = headerRenderer
    ? shouldRefreshHeaderRendererBody
      ? headerRenderer(headerPayload)
      : cachedHeaderRendererBody?.body
    : null;

  if (headerRenderer && shouldRefreshHeaderRendererBody) {
    renderedHeaderRendererBodies.set(column.id, { body: headerRendererBody, renderer: headerRenderer, kind: headerRendererKind });
  } else if (headerRenderer && cachedHeaderRendererBody) {
    renderedHeaderRendererBodies.set(column.id, cachedHeaderRendererBody);
  }
  const useDefaultHeader = !headerRenderer || (headerRendererKind === "render" && headerRendererBody === undefined);
  const headerLeftSlots = useDefaultHeader
    ? renderCominsComponentSlots(column.header?.components, headerPayload, "left")
    : [];
  const headerRightSlots = useDefaultHeader
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
      aria-label={isColumnPlaceholder ? columnPlaceholderLabel : headerProps["aria-label"] ?? (column.sort ? columnPlaceholderLabel : undefined)}
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
      data-comins-column-end={column.id === visibleColumns.at(-1)?.id ? "true" : undefined}
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
          {!useDefaultHeader ? headerRendererBody : isColumnPlaceholder ? null : column.label}
        </span>
        <span className="comins-sort-meta" data-sort-visible={sortIndicatorVisible ? "true" : undefined}>
          {column.sort ? <CominsTableIconButton
            aria-label={`Sort ${columnPlaceholderLabel}`}
            className="comins-sort-indicator"
            data-sort-state={sortIndicatorState}
            data-sort-visible={sortIndicatorVisible ? "true" : undefined}
            data-testid={`sort-indicator-${column.id}`}
            onPointerDown={event => event.stopPropagation()}
            onKeyDown={event => event.stopPropagation()}
            icon={sortIndicatorState === "asc" ? "sortAscending" : sortIndicatorState === "desc" ? "sortDescending" : "sortUnsorted"}
          /> : null}
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
              column={column}
              valueSource={{ columns: state.columns, rows: filterSourceRows, model: columnFiltering?.model ?? [], columnId: column.id }}
              onChangeModel={columnFiltering?.onChangeModel}
              getPortalContainer={() => tableRootRef.current}
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
          const measuredWidth = getCominsElementRect(event.currentTarget.closest<HTMLTableCellElement>("th"))?.width;
          const visibleWidthSnapshot = new Map<string, number>();

          for (const visibleColumn of visibleColumns) {
            const headerCell = Array.from(
              headerRef.current?.querySelectorAll<HTMLTableCellElement>("[data-comins-column-id]") ?? [],
            ).find((element) => element.dataset.cominsColumnId === visibleColumn.id);
            const measuredColumnWidth = getCominsElementRect(headerCell)?.width;
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
}

/** Avoid per-render header map callbacks appearing in JSX development stacks. */
export function renderCominsHeaderRows<TData>(
  env: CominsHeaderRenderEnvironment<TData>,
  headerRows: CominsHeaderCell<TData>[][],
) {
  const rows: React.ReactNode[] = [];
  for (let rowIndex = 0; rowIndex < headerRows.length; rowIndex++) {
    const headerRow = headerRows[rowIndex]!;
    const cells: React.ReactNode[] = [];
    for (let cellIndex = 0; cellIndex < headerRow.length; cellIndex++) {
      cells.push(renderCominsHeaderCell(env, headerRow[cellIndex]!, cellIndex));
    }
    rows.push(<tr key={`header-row-${rowIndex}`}>{cells}</tr>);
  }
  return rows;
}

/** Module-level sizing JSX without a Table-render map callback in its stack. */
export function renderCominsColumnSizing<TData>(
  visibleColumns: readonly Pick<CominsTableRuntimeColumn<TData>, "id">[],
  columnWidths: readonly (number | string | undefined)[],
) {
  const columns: React.ReactNode[] = [];
  for (let index = 0; index < visibleColumns.length; index++) {
    const column = visibleColumns[index]!;
    columns.push(<col key={column.id} style={{ width: columnWidths[index] }} />);
  }
  return <colgroup>{columns}</colgroup>;
}
