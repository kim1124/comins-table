import type { CominsTableTheme, CominsTableRuntimeColumn } from "../react-types";
export type { CominsColumnPinned } from "../column-pinning";

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
} from "../model";

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
} from "../react-types";
export { parseCominsClipboardText } from "../clipboard-text";
import type {
  CominsCopiedRow, CominsCopiedCell, CominsCopiedCellRange, CominsPasteRowOptions, CominsFillCellRangeOptions,
} from "../model";
import * as cells from "../core/editing/cells";
import * as clipboard from "../core/editing/clipboard";
import { createCellComponentParams, resolveCellProps, resolveGuard } from "./edit-policy";
import type {
  CominsTableState,
  CominsTableStateInput,
  CominsHeaderCell,
} from "../react-types";
import type {
  CominsRowId,
  CominsSortState,
  CominsSortModel,
  CominsColumnLayout,
  CominsPaginationState,
  CominsRowUpdate,
  CominsVirtualRowsOptions,
  CominsVirtualRows,
  CominsCellAddress,
  CominsCellRange,
  CominsRowSelectionOptions,
  CominsCellSelectionOptions,
} from "../core/model";
import * as table from "../core/state/table";
import * as columns from "../core/layout/columns";
import * as selection from "../core/selection/state";
import {
  projectReactState,
  restoreReactState,
  projectReactColumn,
  projectReactGroup,
} from "./model";
export type { CominsRowGroupMoveOptions } from "../core/state/table";
import type {
  CominsRowGroupMoveOptions,
} from "../core/state/table";

export function setCominsColumnWidth<TData>(
  state: CominsTableState<TData>,
  columnId: string,
  width: number,
) {
  const bridge = projectReactState(state);
  const next = columns.setCominsColumnWidth(bridge.core, columnId, width);
  return restoreReactState(bridge, next);
}

export function setCominsColumnHidden<TData>(
  state: CominsTableState<TData>,
  columnId: string,
  hidden: boolean,
) {
  const bridge = projectReactState(state);
  const next = columns.setCominsColumnHidden(bridge.core, columnId, hidden);
  return restoreReactState(bridge, next);
}

export function setCominsColumnGroupHidden<TData>(
  state: CominsTableState<TData>,
  groupId: string,
  hidden: boolean,
) {
  const bridge = projectReactState(state);
  const next = columns.setCominsColumnGroupHidden(bridge.core, groupId, hidden);
  return restoreReactState(bridge, next);
}

export function setCominsColumnGroupWidth<TData>(
  state: CominsTableState<TData>,
  groupId: string,
  width: number,
) {
  const bridge = projectReactState(state);
  const next = columns.setCominsColumnGroupWidth(bridge.core, groupId, width);
  return restoreReactState(bridge, next);
}

export function moveCominsColumn<TData>(
  state: CominsTableState<TData>,
  columnId: string,
  targetIndex: number,
) {
  const bridge = projectReactState(state);
  const next = columns.moveCominsColumn(bridge.core, columnId, targetIndex);
  return restoreReactState(bridge, next);
}

export function moveCominsColumnGroup<TData>(
  state: CominsTableState<TData>,
  groupId: string,
  targetIndex: number,
) {
  const bridge = projectReactState(state);
  const next = columns.moveCominsColumnGroup(bridge.core, groupId, targetIndex);
  return restoreReactState(bridge, next);
}

export function serializeCominsColumnLayout<TData>(state: CominsTableState<TData>): CominsColumnLayout {
  const bridge = projectReactState(state);
  const next = columns.serializeCominsColumnLayout(bridge.core);
  return next;
}

export function applyCominsColumnLayout<TData>(state: CominsTableState<TData>, layout: CominsColumnLayout) {
  const bridge = projectReactState(state);
  const next = columns.applyCominsColumnLayout(bridge.core, layout);
  return restoreReactState(bridge, next);
}

export function selectRow<TData>(
  state: CominsTableState<TData>,
  rowId: CominsRowId,
  options: CominsRowSelectionOptions = {},
) {
  const bridge = projectReactState(state);
  const next = selection.selectRow(bridge.core, rowId, options);
  return restoreReactState(bridge, next);
}

export function selectRows<TData>(state: CominsTableState<TData>, rowIds: readonly CominsRowId[]) {
  const bridge = projectReactState(state);
  const next = selection.selectRows(bridge.core, rowIds);
  return restoreReactState(bridge, next);
}

export function selectCell<TData>(
  state: CominsTableState<TData>,
  cell: CominsCellAddress,
  options: CominsCellSelectionOptions = {},
) {
  const bridge = projectReactState(state);
  const next = selection.selectCell(bridge.core, cell, options);
  return { ...restoreReactState(bridge, next), selection: next.selection };
}

export function selectCellRange<TData>(state: CominsTableState<TData>, range: CominsCellRange) {
  const bridge = projectReactState(state);
  const next = selection.selectCellRange(bridge.core, range);
  return { ...restoreReactState(bridge, next), selection: next.selection };
}

export function clearCominsCellRange<TData>(state: CominsTableState<TData>) {
  const bridge = projectReactState(state);
  const next = selection.clearCominsCellRange(bridge.core);
  return { ...restoreReactState(bridge, next), selection: next.selection };
}

export function clearCominsSelection<TData>(state: CominsTableState<TData>) {
  const bridge = projectReactState(state);
  const next = selection.clearCominsSelection(bridge.core);
  return restoreReactState(bridge, next);
}

export function isCominsRowSelected<TData>(state: CominsTableState<TData>, rowId: CominsRowId) {
  return selection.isCominsRowSelected(state, rowId);
}

export function isCominsCellSelected<TData>(state: CominsTableState<TData>, cell: CominsCellAddress) {
  return selection.isCominsCellSelected(state, cell);
}

export function getCominsSelectedCellRange<TData>(
  state: CominsTableState<TData>,
  range: CominsCellRange | null = state.selection.range,
  rowIds: readonly CominsRowId[] = state.rowIds,
) {
  const bridge = projectReactState(state);
  const next = selection.getCominsSelectedCellRange(bridge.core, range, rowIds);
  return next;
}

export function isCominsCellInSelectedRange<TData>(
  state: CominsTableState<TData>,
  cell: CominsCellAddress,
  rowIds: readonly CominsRowId[] = state.rowIds,
) {
  const bridge = projectReactState(state);
  const next = selection.isCominsCellInSelectedRange(bridge.core, cell, rowIds);
  return next;
}

export function queryCominsRows<TData>(
  state: CominsTableState<TData>,
  predicate?: (row: TData, index: number) => boolean,
) {
  return table.queryCominsRows(state, predicate);
}

export function replaceCominsRows<TData>(state: CominsTableState<TData>, rows: readonly TData[]) {
  const bridge = projectReactState(state);
  const next = table.replaceCominsRows(bridge.core, rows);
  return restoreReactState(bridge, next);
}

export function addCominsRows<TData>(state: CominsTableState<TData>, rows: readonly TData[]) {
  const bridge = projectReactState(state);
  const next = table.addCominsRows(bridge.core, rows);
  return restoreReactState(bridge, next);
}

export function updateCominsRows<TData>(
  state: CominsTableState<TData>,
  updates: ReadonlyArray<CominsRowUpdate<TData>>,
) {
  const bridge = projectReactState(state);
  const next = table.updateCominsRows(bridge.core, updates);
  return restoreReactState(bridge, next);
}

export function deleteCominsRows<TData>(state: CominsTableState<TData>, rowIds: readonly CominsRowId[]) {
  const bridge = projectReactState(state);
  const next = table.deleteCominsRows(bridge.core, rowIds);
  return restoreReactState(bridge, next);
}

export function setCominsHeaderVisible<TData>(state: CominsTableState<TData>, showHeader: boolean) {
  const bridge = projectReactState(state);
  const next = table.setCominsHeaderVisible(bridge.core, showHeader);
  return restoreReactState(bridge, next);
}

export function setCominsPagination<TData>(
  state: CominsTableState<TData>,
  pagination: Partial<CominsPaginationState>,
) {
  const bridge = projectReactState(state);
  const next = table.setCominsPagination(bridge.core, pagination);
  return restoreReactState(bridge, next);
}

export function setCominsSortState<TData>(
  state: CominsTableState<TData>,
  sort: CominsSortState | null,
) {
  const bridge = projectReactState(state);
  const next = table.setCominsSortState(bridge.core, sort);
  return restoreReactState(bridge, next);
}

export function setCominsSortModel<TData>(
  state: CominsTableState<TData>,
  sortModel: CominsSortModel,
) {
  const bridge = projectReactState(state);
  const next = table.setCominsSortModel(bridge.core, sortModel);
  return restoreReactState(bridge, next);
}

export function clearCominsSortState<TData>(state: CominsTableState<TData>) {
  const bridge = projectReactState(state);
  const next = table.clearCominsSortState(bridge.core);
  return restoreReactState(bridge, next);
}

export function getCominsSortedRowIndexes<TData>(
  state: CominsTableState<TData>,
  sourceIndexes: readonly number[] = state.rows.map((_row, index) => index),
) {
  const bridge = projectReactState(state);
  const next = table.getCominsSortedRowIndexes(bridge.core, sourceIndexes);
  return next;
}

export function sortCominsRows<TData>(
  state: CominsTableState<TData>,
  sort: CominsSortState | null,
) {
  const bridge = projectReactState(state);
  const next = table.sortCominsRows(bridge.core, sort);
  return restoreReactState(bridge, next);
}

export function getCominsPageRows<TData>(
  state: CominsTableState<TData>,
  pagination: Partial<CominsPaginationState> = {},
) {
  const bridge = projectReactState(state);
  const next = table.getCominsPageRows(bridge.core, pagination);
  return next;
}

export function getCominsVirtualRows<TData>(
  state: CominsTableState<TData>,
  { overscan = 2, rowHeight, scrollTop, viewportHeight }: CominsVirtualRowsOptions,
): CominsVirtualRows<TData> {
  const bridge = projectReactState(state);
  const next = table.getCominsVirtualRows(bridge.core, { overscan, rowHeight, scrollTop, viewportHeight });
  return next;
}

export function moveCominsRow<TData>(
  state: CominsTableState<TData>,
  rowId: CominsRowId,
  targetIndex: number,
) {
  const bridge = projectReactState(state);
  const next = table.moveCominsRow(bridge.core, rowId, targetIndex);
  return restoreReactState(bridge, next);
}

export function moveCominsRowToGroup<TData>(
  state: CominsTableState<TData>,
  options: CominsRowGroupMoveOptions<TData>,
) {
  const bridge = projectReactState(state);
  const next = table.moveCominsRowToGroup(bridge.core, options);
  return restoreReactState(bridge, next);
}

export function getCominsCellValue<TData>(
  state: CominsTableState<TData>,
  row: TData,
  columnId: string,
) {
  return table.getCominsCellValue(state, row, columnId);
}

export function createCominsTableState<TData>(input: CominsTableStateInput<TData>): CominsTableState<TData> {
  const runtimeColumns = columns.normalizeColumns(input.columns);
  const runtimeGroups = columns.normalizeColumnGroups(runtimeColumns, input.columnGroups);
  const state = table.createCominsTableState({ ...input, columns: runtimeColumns.map(projectReactColumn), columnGroups: runtimeGroups.map(projectReactGroup) });
  return { ...state, columns: runtimeColumns, columnGroups: runtimeGroups, theme: input.theme ?? {} };
}

export function getCominsVisibleColumns<TData>(state: CominsTableState<TData>) {
  const bridge = projectReactState(state);
  return columns.getCominsVisibleColumns(bridge.core).map(bridge.restoreColumn);
}

export function getCominsHeaderRows<TData>(state: CominsTableState<TData>): Array<Array<CominsHeaderCell<TData>>> {
  const bridge = projectReactState(state);
  return columns.getCominsHeaderRows(bridge.core).map(row => row.map(cell => cell.kind === "column"
    ? { ...cell, column: bridge.restoreColumn(cell.column) }
    : { ...cell, group: bridge.restoreGroup(cell.group) }));
}

export function setCominsTableTheme<TData>(state: CominsTableState<TData>, theme: CominsTableTheme) {
  return {
    ...state,
    theme: { ...state.theme, ...theme },
  };
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
  const bridge = projectReactState(state);
  return clipboard.copyCominsRow(bridge.core, rowId);
}

export function pasteCominsRow<TData>(
  state: CominsTableState<TData>,
  copied: CominsCopiedRow<TData>,
  options: CominsPasteRowOptions<TData>,
) {
  const bridge = projectReactState(state);
  const next = clipboard.pasteCominsRow(bridge.core, copied, options);
  return restoreReactState(bridge, next);
}

export function copyCominsCell<TData>(
  state: CominsTableState<TData>,
  { columnId, rowId }: CominsCellAddress,
): CominsCopiedCell | null {
  const bridge = projectReactState(state);
  return cells.copyCominsCell(bridge.core, { columnId, rowId });
}

export function pasteCominsCell<TData>(
  state: CominsTableState<TData>,
  { columnId, rowId }: CominsCellAddress,
  copied: CominsCopiedCell | null,
) {
  const bridge = projectReactState(state);
  const next = cells.pasteCominsCell(bridge.core, { columnId, rowId }, copied);
  return restoreReactState(bridge, next);
}

export function copyCominsCellRange<TData>(
  state: CominsTableState<TData>,
  range: CominsCellRange | null = state.selection.range,
  rowIds: readonly CominsRowId[] = state.rowIds,
): CominsCopiedCellRange | null {
  const bridge = projectReactState(state);
  return clipboard.copyCominsCellRange(bridge.core, range, rowIds);
}

export function pasteCominsCellRange<TData>(
  state: CominsTableState<TData>,
  target: CominsCellAddress,
  copied: CominsCopiedCellRange | null,
  rowIds: readonly CominsRowId[] = state.rowIds,
) {
  const bridge = projectReactState(state);
  const next = clipboard.pasteCominsCellRange(bridge.core, target, copied, rowIds);
  return restoreReactState(bridge, next);
}

export function pasteCominsText<TData>(
  state: CominsTableState<TData>,
  target: CominsCellAddress,
  text: string,
  rowIds: readonly CominsRowId[] = state.rowIds,
) {
  const bridge = projectReactState(state);
  const next = clipboard.pasteCominsText(bridge.core, target, text, rowIds);
  return restoreReactState(bridge, next);
}

export function fillCominsCellRange<TData>(
  state: CominsTableState<TData>,
  { source, target }: CominsFillCellRangeOptions,
  rowIds: readonly CominsRowId[] = state.rowIds,
) {
  const bridge = projectReactState(state);
  const next = clipboard.fillCominsCellRange(bridge.core, { source, target }, rowIds);
  return restoreReactState(bridge, next);
}
