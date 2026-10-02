import type {
  CominsTableState, CominsRowId, CominsTableRuntimeColumn,
  CominsCellComponentPayload, CominsClipboardGuard, CominsCellAddress, CominsCopiedCell,
} from "../model";
import { findColumn, findRowIndex } from "../state/access";
import { getCominsCellValue, updateCominsRows } from "../state/table";

export function setNestedFieldValue<TData>(row: TData, field: string, value: unknown): TData {
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

export function createCellComponentParams<TData>(
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

export function resolveGuard<TData>(
  guard: CominsClipboardGuard<TData> | undefined,
  params: CominsCellComponentPayload<TData>,
) {
  if (guard === undefined) {
    return true;
  }

  return typeof guard === "boolean" ? guard : guard(params);
}

export function canUseCellClipboard<TData>(
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
  const props = column.cell;

  if (props?.disabled !== undefined && resolveGuard(props.disabled, params) === true) {
    return false;
  }

  return resolveGuard(kind === "copy" ? props?.copyable : props?.pasteable, params);
}

export function isCominsCellDisabled<TData>(
  state: CominsTableState<TData>, row: TData, rowId: CominsRowId, column: CominsTableRuntimeColumn<TData>,
) {
  const disabled = column.cell?.disabled;
  return disabled !== undefined && resolveGuard(disabled, createCellComponentParams(state, row, rowId, column)) === true;
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
