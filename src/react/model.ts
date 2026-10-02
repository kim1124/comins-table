import type * as Core from "../core/model";
import type * as React from "../react-types";
import { createReactEditPolicy } from "./edit-policy";

/** Only data options cross the boundary; state-dependent cell policies are attached by the bridge. */
export function projectReactColumn<TData>(column: React.CominsTableRuntimeColumn<TData>): Core.CominsTableRuntimeColumn<TData> {
  const sort = column.sort;
  const filter = column.filter;
  return {
    id: column.id, field: column.field,
    label: typeof column.label === "string" ? column.label : column.id,
    hidden: column.hidden, lockPosition: column.lockPosition,
    minWidth: column.minWidth, maxWidth: column.maxWidth, width: column.width, pinned: column.pinned,
    sort: typeof sort === "function" ? (left, right, leftRow, rightRow) => sort.call(column, left, right, leftRow, rightRow) : sort,
    filter: filter && { ...filter, getValue: filter.getValue
      ? params => filter.getValue!({ ...params, column }) : undefined },
  };
}

export function projectReactGroup(group: React.CominsTableRuntimeColumnGroup): Core.CominsTableRuntimeColumnGroup {
  return { id: group.id, children: group.children, hidden: group.hidden, lockPosition: group.lockPosition,
    pinned: group.pinned, label: typeof group.label === "string" ? group.label : group.id };
}

export type ReactStateBridge<TData> = {
  source: React.CominsTableState<TData>;
  core: Core.CominsTableState<TData>;
  restoreColumn: (column: Core.CominsTableRuntimeColumn<TData>) => React.CominsTableRuntimeColumn<TData>;
  restoreGroup: (group: Core.CominsTableRuntimeColumnGroup) => React.CominsTableRuntimeColumnGroup;
};

export function projectReactState<TData>(source: React.CominsTableState<TData>): ReactStateBridge<TData> {
  const columnSources = new Map<Core.CominsTableRuntimeColumn<TData>, React.CominsTableRuntimeColumn<TData>>();
  const groupSources = new Map<Core.CominsTableRuntimeColumnGroup, React.CominsTableRuntimeColumnGroup>();
  const columns = source.columns.map(column => {
    const projected = projectReactColumn(column);
    if (column.cell) projected.cell = createReactEditPolicy(source, column);
    columnSources.set(projected, column);
    return projected;
  });
  const columnGroups = source.columnGroups.map(group => {
    const projected = projectReactGroup(group);
    groupSources.set(projected, group);
    return projected;
  });
  return {
    source,
    core: {
      columns, columnGroups, columnOrder: source.columnOrder,
      columnState: source.columnState, columnGroupState: source.columnGroupState,
      rows: source.rows, rowIds: source.rowIds, getRowId: source.getRowId,
      pagination: source.pagination, selection: source.selection, showHeader: source.showHeader,
      sort: source.sort, sortModel: source.sortModel,
    },
    restoreColumn(column) {
      const original = columnSources.get(column);
      if (!original) throw new Error("Cannot restore a column from a different React state bridge.");
      return original;
    },
    restoreGroup(group) {
      const original = groupSources.get(group);
      if (!original) throw new Error("Cannot restore a group from a different React state bridge.");
      return original;
    },
  };
}

export function restoreReactState<TData>(bridge: ReactStateBridge<TData>, next: Core.CominsTableState<TData>): React.CominsTableState<TData> {
  if (next === bridge.core) return bridge.source;
  return {
    ...bridge.source, ...next,
    columns: next.columns === bridge.core.columns ? bridge.source.columns : next.columns.map(bridge.restoreColumn),
    columnGroups: next.columnGroups === bridge.core.columnGroups ? bridge.source.columnGroups : next.columnGroups.map(bridge.restoreGroup),
  };
}
