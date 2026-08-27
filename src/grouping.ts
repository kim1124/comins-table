import type React from "react";

import type {
  CominsRowId,
  CominsSortModel,
  CominsTableRuntimeColumn,
} from "./core";

export type CominsRowGroupAggregation = "avg" | "count" | "max" | "min" | "sum";

export type CominsRowGroupDropPosition = "after" | "before";

export type CominsRowGroupMoveDetails = {
  fromIndex: number;
  groupId: CominsRowId;
  reason: "move";
  targetGroupId: CominsRowId;
  toIndex: number;
};

export type CominsSetRowGroupIdParams<TData> = {
  fromGroupId: CominsRowId;
  row: TData;
  rowId: CominsRowId;
  toGroupId: CominsRowId;
};

export type CominsRowGroupRenderParams<TData, TGroup> = {
  aggregateValues: Readonly<Record<string, number | null>>;
  expanded: boolean;
  group: TGroup;
  groupId: CominsRowId;
  groupIndex: number;
  isEmpty: boolean;
  rowCount: number;
};

export type CominsRowGroupProps = {
  className?: string;
  style?: React.CSSProperties;
};

export type CominsRowGroupingConfig<TData, TGroup = unknown> = {
  aggregations?: Readonly<Partial<Record<string, CominsRowGroupAggregation>>>;
  expandedGroupIds?: readonly CominsRowId[];
  getGroupId: (group: TGroup) => CominsRowId;
  getGroupLabel?: (group: TGroup) => React.ReactNode;
  getGroupRowProps?: (
    params: CominsRowGroupRenderParams<TData, TGroup>,
  ) => CominsRowGroupProps | undefined;
  getRowGroupId: (row: TData, dataIndex: number) => CominsRowId;
  groupDraggable?: boolean;
  groups: readonly TGroup[];
  onChangeExpandedGroupIds?: (groupIds: CominsRowId[]) => void;
  onChangeGroups?: (
    groups: TGroup[],
    details: CominsRowGroupMoveDetails,
  ) => void;
  renderGroupContent?: (
    params: CominsRowGroupRenderParams<TData, TGroup>,
  ) => React.ReactNode;
  setRowGroupId?: (params: CominsSetRowGroupIdParams<TData>) => TData;
};

export type CominsRowGroupingSourceRow<TData> = {
  data: TData;
  dataIndex: number;
  id: CominsRowId;
};

export type CominsAggregateState =
  | { count: number; kind: "avg"; sum: number }
  | { count: number; kind: "count" }
  | { hasValue: boolean; kind: "max" | "min"; value: number }
  | { count: number; kind: "sum"; sum: number };

export type CominsNormalizedGroup<TGroup> = {
  group: TGroup;
  groupId: CominsRowId;
  groupIndex: number;
  label: React.ReactNode;
};

export type CominsGroupNode<TGroup> = CominsNormalizedGroup<TGroup> & {
  aggregationState: ReadonlyMap<string, CominsAggregateState>;
  leafSourceIndexes: readonly number[];
};

export type CominsGroupModel<TGroup> = {
  groupIds: readonly CominsRowId[];
  groupsById: ReadonlyMap<CominsRowId, CominsGroupNode<TGroup>>;
};

export type CominsOrderedGroupModel<TGroup> = CominsGroupModel<TGroup> & {
  orderedLeafSourceIndexesById: ReadonlyMap<CominsRowId, readonly number[]>;
};

export type CominsGroupingProjectionEntry =
  | {
      groupId: CominsRowId;
      key: string;
      kind: "group";
    }
  | {
      dataIndex: number;
      key: string;
      kind: "data";
      rowId: CominsRowId;
      visibleLeafIndex: number;
    };

const COMINS_ROW_GROUP_AGGREGATIONS = new Set<CominsRowGroupAggregation>([
  "avg",
  "count",
  "max",
  "min",
  "sum",
]);

function getNestedFieldValue(value: unknown, field: string): unknown {
  return field.split(".").reduce<unknown>((current, key) => {
    if (current === null || current === undefined || typeof current !== "object") {
      return undefined;
    }

    return (current as Record<string, unknown>)[key];
  }, value);
}

function getColumnValue<TData>(row: TData, column: CominsTableRuntimeColumn<TData>) {
  return getNestedFieldValue(row, column.field);
}

function createAggregateState(aggregation: CominsRowGroupAggregation): CominsAggregateState {
  switch (aggregation) {
    case "avg":
      return { count: 0, kind: "avg", sum: 0 };
    case "count":
      return { count: 0, kind: "count" };
    case "max":
    case "min":
      return { hasValue: false, kind: aggregation, value: 0 };
    case "sum":
      return { count: 0, kind: "sum", sum: 0 };
  }
}

function updateAggregateState(state: CominsAggregateState, value: unknown) {
  if (state.kind === "count") {
    state.count += 1;
    return;
  }

  if (typeof value !== "number" || !Number.isFinite(value)) {
    return;
  }

  if (state.kind === "avg" || state.kind === "sum") {
    state.count += 1;
    state.sum += value;
    return;
  }

  if (!state.hasValue) {
    state.hasValue = true;
    state.value = value;
    return;
  }

  state.value = state.kind === "min"
    ? Math.min(state.value, value)
    : Math.max(state.value, value);
}

export function getCominsAggregateValue(state: CominsAggregateState): number | null {
  switch (state.kind) {
    case "avg":
      return state.count === 0 ? null : state.sum / state.count;
    case "count":
      return state.count;
    case "max":
    case "min":
      return state.hasValue ? state.value : null;
    case "sum":
      return state.count === 0 ? null : state.sum;
  }
}

export function getCominsGroupSlotKey(groupId: CominsRowId) {
  return `group:${typeof groupId}:${encodeURIComponent(String(groupId))}`;
}

export function normalizeCominsRowGrouping<TData, TGroup>(input: {
  columns: readonly CominsTableRuntimeColumn<TData>[];
  config: CominsRowGroupingConfig<TData, TGroup>;
}) {
  const columnById = new Map(input.columns.map((column) => [column.id, column] as const));
  const aggregations = new Map<string, CominsRowGroupAggregation>();
  const aggregationColumns = new Map<string, CominsTableRuntimeColumn<TData>>();

  for (const [columnId, aggregation] of Object.entries(input.config.aggregations ?? {})) {
    if (
      columnById.has(columnId) &&
      typeof aggregation === "string" &&
      COMINS_ROW_GROUP_AGGREGATIONS.has(aggregation as CominsRowGroupAggregation)
    ) {
      aggregations.set(columnId, aggregation as CominsRowGroupAggregation);
      aggregationColumns.set(columnId, columnById.get(columnId)!);
    }
  }

  const groupIds: CominsRowId[] = [];
  const groupsById = new Map<CominsRowId, CominsNormalizedGroup<TGroup>>();
  const suppliedGroups = Array.isArray(input.config.groups) ? input.config.groups : [];

  for (const group of suppliedGroups) {
    const groupId = input.config.getGroupId(group);

    if (groupsById.has(groupId)) {
      continue;
    }

    const groupIndex = groupIds.length;
    const normalizedGroup = {
      group,
      groupId,
      groupIndex,
      label: input.config.getGroupLabel?.(group) ?? String(groupId),
    };

    groupIds.push(groupId);
    groupsById.set(groupId, normalizedGroup);
  }

  return { aggregationColumns, aggregations, groupIds, groupsById };
}

export function createCominsGroupModel<TData, TGroup>(input: {
  aggregationColumns?: ReadonlyMap<string, CominsTableRuntimeColumn<TData>>;
  aggregations: ReadonlyMap<string, CominsRowGroupAggregation>;
  getRowGroupId: (row: TData, dataIndex: number) => CominsRowId;
  groupIds: readonly CominsRowId[];
  groupsById: ReadonlyMap<CominsRowId, CominsNormalizedGroup<TGroup>>;
  rows: readonly CominsRowGroupingSourceRow<TData>[];
}): CominsGroupModel<TGroup> {
  const groupsById = new Map<CominsRowId, CominsGroupNode<TGroup>>();

  for (const groupId of input.groupIds) {
    const group = input.groupsById.get(groupId);

    if (!group) {
      continue;
    }

    const aggregationState = new Map<string, CominsAggregateState>();

    for (const [columnId, aggregation] of input.aggregations) {
      aggregationState.set(columnId, createAggregateState(aggregation));
    }

    groupsById.set(groupId, {
      ...group,
      aggregationState,
      leafSourceIndexes: [],
    });
  }

  for (const sourceRow of input.rows) {
    const groupId = input.getRowGroupId(sourceRow.data, sourceRow.dataIndex);
    const group = groupsById.get(groupId);

    if (!group) {
      continue;
    }

    (group.leafSourceIndexes as number[]).push(sourceRow.dataIndex);

    for (const [columnId, aggregateState] of group.aggregationState) {
      const configuredColumn = input.aggregationColumns?.get(columnId);
      const value = configuredColumn
        ? getColumnValue(sourceRow.data, configuredColumn)
        : getNestedFieldValue(sourceRow.data, columnId);

      updateAggregateState(aggregateState, value);
    }
  }

  return { groupIds: [...input.groupIds], groupsById };
}

function defaultCompare(left: unknown, right: unknown) {
  if (typeof left === "number" && typeof right === "number") {
    return left - right;
  }

  return String(left ?? "").localeCompare(String(right ?? ""));
}

export function orderCominsGroupModel<TData, TGroup>(input: {
  columns: readonly CominsTableRuntimeColumn<TData>[];
  model: CominsGroupModel<TGroup>;
  rows: readonly TData[];
  sortModel: CominsSortModel;
}): CominsOrderedGroupModel<TGroup> {
  const columnById = new Map(input.columns.map((column) => [column.id, column] as const));
  const orderedLeafSourceIndexesById = new Map<CominsRowId, readonly number[]>();
  const sortLeafIndexes = (rowIndexes: readonly number[]) => [...rowIndexes].sort((leftIndex, rightIndex) => {
    const leftRow = input.rows[leftIndex];
    const rightRow = input.rows[rightIndex];

    if (leftRow === undefined || rightRow === undefined) {
      return leftIndex - rightIndex;
    }

    for (const rule of input.sortModel) {
      const column = columnById.get(rule.columnId);

      if (!column?.sort) {
        continue;
      }

      const leftValue = getColumnValue(leftRow, column);
      const rightValue = getColumnValue(rightRow, column);
      const result = typeof column.sort === "function"
        ? column.sort(leftValue, rightValue, leftRow, rightRow)
        : defaultCompare(leftValue, rightValue);

      if (result !== 0) {
        return rule.direction === "desc" ? result * -1 : result;
      }
    }

    return leftIndex - rightIndex;
  });

  for (const groupId of input.model.groupIds) {
    const group = input.model.groupsById.get(groupId);

    if (group) {
      orderedLeafSourceIndexesById.set(groupId, sortLeafIndexes(group.leafSourceIndexes));
    }
  }

  return {
    ...input.model,
    groupIds: [...input.model.groupIds],
    orderedLeafSourceIndexesById,
  };
}

export function projectCominsGroups<TGroup>(input: {
  expandedGroupIds: readonly CominsRowId[];
  model: CominsOrderedGroupModel<TGroup>;
  rowIds: readonly CominsRowId[];
}) {
  const entries: CominsGroupingProjectionEntry[] = [];
  const expandedGroupIds = new Set(input.expandedGroupIds);
  const visibleLeafRowIds: CominsRowId[] = [];

  for (const groupId of input.model.groupIds) {
    const group = input.model.groupsById.get(groupId);

    if (!group) {
      continue;
    }

    entries.push({ groupId, key: getCominsGroupSlotKey(groupId), kind: "group" });

    if (!expandedGroupIds.has(groupId)) {
      continue;
    }

    for (const dataIndex of input.model.orderedLeafSourceIndexesById.get(groupId) ?? []) {
      const rowId = input.rowIds[dataIndex];

      if (rowId === undefined) {
        continue;
      }

      const visibleLeafIndex = visibleLeafRowIds.length;
      visibleLeafRowIds.push(rowId);
      entries.push({
        dataIndex,
        key: `data:${typeof rowId}:${encodeURIComponent(String(rowId))}`,
        kind: "data",
        rowId,
        visibleLeafIndex,
      });
    }
  }

  return { entries, visibleLeafRowIds };
}

export function moveCominsRowGroup<TGroup>(input: {
  getGroupId: (group: TGroup) => CominsRowId;
  groups: readonly TGroup[];
  position: CominsRowGroupDropPosition;
  sourceGroupId: CominsRowId;
  targetGroupId: CominsRowId;
}): TGroup[] {
  const nextGroups = [...input.groups];
  const sourceIndex = nextGroups.findIndex(
    (group) => input.getGroupId(group) === input.sourceGroupId,
  );

  if (sourceIndex < 0 || input.sourceGroupId === input.targetGroupId) {
    return nextGroups;
  }

  const [sourceGroup] = nextGroups.splice(sourceIndex, 1);
  const targetIndex = nextGroups.findIndex(
    (group) => input.getGroupId(group) === input.targetGroupId,
  );

  if (sourceGroup === undefined || targetIndex < 0) {
    return [...input.groups];
  }

  const insertIndex = input.position === "after" ? targetIndex + 1 : targetIndex;
  nextGroups.splice(insertIndex, 0, sourceGroup);

  return nextGroups;
}
