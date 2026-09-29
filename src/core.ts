import {
  getCominsVisibleColumns,
  addCominsRows,
  updateCominsRows,
  getCominsCellValue,
  withRows,
  getCellRangeBounds,
} from "./react/core-compat";
export {
  setCominsColumnWidth,
  setCominsColumnHidden,
  setCominsColumnGroupHidden,
  setCominsColumnGroupWidth,
  moveCominsColumn,
  moveCominsColumnGroup,
  serializeCominsColumnLayout,
  applyCominsColumnLayout,
  getCominsVisibleColumns,
  getCominsHeaderRows,
  selectRow,
  selectRows,
  selectCell,
  selectCellRange,
  clearCominsCellRange,
  clearCominsSelection,
  isCominsRowSelected,
  isCominsCellSelected,
  getCominsSelectedCellRange,
  isCominsCellInSelectedRange,
  createCominsTableState,
  queryCominsRows,
  replaceCominsRows,
  addCominsRows,
  updateCominsRows,
  deleteCominsRows,
  setCominsHeaderVisible,
  setCominsPagination,
  setCominsSortState,
  setCominsSortModel,
  clearCominsSortState,
  getCominsSortedRowIndexes,
  sortCominsRows,
  getCominsPageRows,
  getCominsVirtualRows,
  moveCominsRow,
  moveCominsRowToGroup,
  getCominsCellValue,
} from "./react/core-compat";
import {
  findColumn,
  findRowIndex,
  getNestedFieldValue,
} from "./core/state/access";

import {
  parseCominsClipboardText,
  MAX_CLIPBOARD_CELLS,
} from "./clipboard-text";
export {
  parseCominsClipboardText,
} from "./clipboard-text";

export type { CominsColumnPinned } from "./column-pinning";

import type {
  CominsRowId,
  CominsCopiedRow,
  CominsCopiedCell,
  CominsCopiedCellRangeCell,
  CominsCopiedCellRange,
  CominsExportValueSource,
  CominsExportColumn,
  CominsExportRowsOptions,
  CominsCellAddress,
  CominsCellRange,
  CominsPasteRowOptions,
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
  CominsCellComponentPayload,
  CominsClipboardGuard,
  CominsTableRuntimeColumn,
  CominsTableState,
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

export function setCominsTableTheme<TData>(state: CominsTableState<TData>, theme: CominsTableTheme) {
  return {
    ...state,
    theme: { ...state.theme, ...theme },
  };
}

export type { CominsRowGroupMoveOptions } from "./core/state/table";

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
