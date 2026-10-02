import type { CominsColumnLayout, CominsSelectionState, CominsSortModel, CominsSortState } from "../model";
import type { CominsTableState, CominsTableStateInput } from "../react-types";
import { normalizeColumns, normalizeColumnGroups } from "../core/layout/columns";
import { reconcileCoreState, type CoreReconciliationOptions } from "../core/state/reconcile";
import { getCoreStateChanges } from "../core/state/changes";
import { projectReactColumn, projectReactGroup, projectReactState } from "./model";
import { serializeCominsColumnLayout } from "./core-compat";

type ReactReconciliationOptions<TData> = Omit<CoreReconciliationOptions<TData>, "current" | "nextInput"> & {
  current: CominsTableState<TData>;
  nextInput: Pick<CominsTableStateInput<TData>, "columnGroups" | "columns" | "rows" | "getRowId" | "pagination" | "showHeader">;
};

export function reconcileReactState<TData>(options: ReactReconciliationOptions<TData>) {
  const columns = normalizeColumns(options.nextInput.columns);
  const columnGroups = normalizeColumnGroups(columns, options.nextInput.columnGroups);
  const result = reconcileCoreState({
    ...options,
    current: projectReactState(options.current).core,
    nextInput: { ...options.nextInput, columns: columns.map(projectReactColumn), columnGroups: columnGroups.map(projectReactGroup) },
  });
  // New definitions do not belong to the old bridge. Restore their React metadata directly.
  return { ...result, state: { ...result.state, columns, columnGroups, theme: options.current.theme } };
}

type ChangeCallbacks<TData> = {
  onChangeData?: (data: TData[]) => void;
  onChangeSelection?: (selection: CominsSelectionState) => void;
  onChangeColumnLayout?: (layout: CominsColumnLayout) => void;
  onChangeSort?: (sort: CominsSortState | null) => void;
  onChangeSortModel?: (sortModel: CominsSortModel) => void;
};

export function notifyReactStateChanges<TData>(current: CominsTableState<TData>, next: CominsTableState<TData>, callbacks: ChangeCallbacks<TData>, options: { columnLayoutChanged?: boolean } = {}) {
  const changes = getCoreStateChanges(current, next, options);
  if (changes.data) callbacks.onChangeData?.(next.rows);
  if (changes.selection) callbacks.onChangeSelection?.(next.selection);
  if (changes.columnLayout) callbacks.onChangeColumnLayout?.(serializeCominsColumnLayout(next));
  if (changes.sort) callbacks.onChangeSort?.(next.sort);
  if (changes.sortModel) callbacks.onChangeSortModel?.(next.sortModel);
}

/** Prop synchronization deliberately does not notify data or column layout. */
export function notifyReactInputChanges<TData>(current: CominsTableState<TData>, next: CominsTableState<TData>, callbacks: ChangeCallbacks<TData>, isViewport: boolean) {
  const changes = getCoreStateChanges(current, next);
  if (isViewport && changes.selection) callbacks.onChangeSelection?.(next.selection);
  if (changes.sort) callbacks.onChangeSort?.(next.sort);
  if (changes.sortModel) callbacks.onChangeSortModel?.(next.sortModel);
}
