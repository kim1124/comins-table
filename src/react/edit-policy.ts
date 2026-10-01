import type { CoreCellDataConfig, CominsCellComponentPayload as CorePayload } from "../core/model";
import type {
  CominsTableState, CominsTableRuntimeColumn, CominsCellComponentPayload, CominsClipboardGuard,
} from "../react-types";
import type { CominsRowId } from "../model";
import { getCominsCellValue } from "../core/state/table";

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

export function resolveCellProps<TData>(
  state: CominsTableState<TData>,
  row: TData,
  rowId: CominsRowId,
  column: CominsTableRuntimeColumn<TData>,
) {
  const params = createCellComponentParams(state, row, rowId, column);
  const props = column.cell?.props;

  return typeof props === "function" ? props(params) : props;
}

/** Interpret React props once per guard evaluation, retaining the original payload and receiver. */
export function createReactEditPolicy<TData>(
  state: CominsTableState<TData>,
  column: CominsTableRuntimeColumn<TData>,
): CoreCellDataConfig<TData> {
  const evaluations = new WeakMap<CorePayload<TData>, {
    params: CominsCellComponentPayload<TData>;
    props: ReturnType<typeof resolveCellProps<TData>>;
  }>();
  const evaluate = (payload: CorePayload<TData>) => {
    const cached = evaluations.get(payload);
    if (cached) return cached;
    const params = createCellComponentParams(state, payload.row.data, payload.row.id, column, payload.row.dataIndex);
    const definition = column.cell?.props;
    const result = { params, props: typeof definition === "function" ? definition(params) : definition };
    evaluations.set(payload, result);
    return result;
  };
  return {
    disabled: payload => {
      const { params, props } = evaluate(payload);
      return props?.disabled !== undefined && resolveGuard(props.disabled, params) === true;
    },
    copyable: payload => {
      const { params, props } = evaluate(payload);
      return resolveGuard(props?.copyable, params);
    },
    pasteable: payload => {
      const { params, props } = evaluate(payload);
      return resolveGuard(props?.pasteable, params);
    },
    parseClipboard: column.cell?.parseClipboard ? payload => column.cell!.parseClipboard!({
      ...createCellComponentParams(state, payload.row.data, payload.row.id, column, payload.row.dataIndex),
      text: payload.text,
    }) : undefined,
    validateFill: column.cell?.validateFill ? payload => column.cell!.validateFill!({
      ...createCellComponentParams(state, payload.row.data, payload.row.id, column, payload.row.dataIndex),
      value: payload.value,
    }) : undefined,
  };
}
