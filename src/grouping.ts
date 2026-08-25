import type React from "react";

import type {
  CominsRowId,
  CominsSortModel,
  CominsTableRuntimeColumn,
} from "./core";

export type CominsRowGroupKey = string | number | boolean | null | Date;

export type CominsRowGroupingSourceRow<TData> = {
  data: TData;
  dataIndex: number;
  id: CominsRowId;
};

export type CominsRowGroupingValueParams<TData> = {
  column: CominsTableRuntimeColumn<TData>;
  row: CominsRowGroupingSourceRow<TData>;
  value: unknown;
};

export type CominsRowGroupingLabelParams<TData> = {
  column: CominsTableRuntimeColumn<TData>;
  depth: number;
  firstRow: CominsRowGroupingSourceRow<TData>;
  key: CominsRowGroupKey;
};

export type CominsRowGroupingCriterion<TData> = {
  columnId: string;
  getKey?: (
    params: CominsRowGroupingValueParams<TData>,
  ) => CominsRowGroupKey | undefined;
  getLabel?: (
    params: CominsRowGroupingLabelParams<TData>,
  ) => React.ReactNode;
};

export type CominsRowGroupingCriterionInput<TData> =
  | string
  | CominsRowGroupingCriterion<TData>;

export type CominsRowGroupAggregation = "avg" | "count" | "max" | "min" | "sum";

export type CominsRowGroupingConfig<TData> = {
  aggregations?: Readonly<Partial<Record<string, CominsRowGroupAggregation>>>;
  criteria: readonly CominsRowGroupingCriterionInput<TData>[];
  expandedGroupIds?: readonly string[];
  onChangeExpandedGroupIds?: (groupIds: string[]) => void;
};

export type CominsNormalizedGroupKey =
  | { kind: "boolean"; payload: boolean }
  | { kind: "date"; payload: number }
  | { kind: "empty" }
  | { kind: "number"; payload: number }
  | { kind: "string"; payload: string }
  | { kind: "unsupported" };

export type CominsNormalizedGroupingCriterion<TData> = {
  column: CominsTableRuntimeColumn<TData>;
  getKey?: CominsRowGroupingCriterion<TData>["getKey"];
  getLabel?: CominsRowGroupingCriterion<TData>["getLabel"];
};

export type CominsAggregateState =
  | { count: number; kind: "avg"; sum: number }
  | { count: number; kind: "count" }
  | { hasValue: boolean; kind: "max" | "min"; value: number }
  | { count: number; kind: "sum"; sum: number };

export type CominsGroupNode = {
  aggregationState: ReadonlyMap<string, CominsAggregateState>;
  childGroupIds: readonly string[];
  columnId: string;
  depth: number;
  firstSourceIndex: number;
  groupId: string;
  key: CominsNormalizedGroupKey;
  label: React.ReactNode;
  leafSourceIndexes?: readonly number[];
  parentGroupId: string | null;
};

export type CominsGroupTree<TData> = {
  criteria: readonly CominsNormalizedGroupingCriterion<TData>[];
  nodesById: ReadonlyMap<string, CominsGroupNode>;
  rootGroupIds: readonly string[];
};

export type CominsOrderedGroupTree<TData> = CominsGroupTree<TData> & {
  orderedChildGroupIdsById: ReadonlyMap<string, readonly string[]>;
  orderedLeafSourceIndexesById: ReadonlyMap<string, readonly number[]>;
  orderedRootGroupIds: readonly string[];
};

export type CominsGroupingProjectionEntry =
  | {
      groupId: string;
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

const COMINS_GROUP_KEY_RANK: Record<CominsNormalizedGroupKey["kind"], number> = {
  empty: 0,
  unsupported: 1,
  boolean: 2,
  number: 3,
  date: 4,
  string: 5,
};

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

export function normalizeCominsGroupKey(value: unknown): CominsNormalizedGroupKey {
  if (value === null || value === undefined) {
    return { kind: "empty" };
  }

  if (typeof value === "string") {
    return { kind: "string", payload: value };
  }

  if (typeof value === "number") {
    return Number.isFinite(value)
      ? { kind: "number", payload: Object.is(value, -0) ? 0 : value }
      : { kind: "unsupported" };
  }

  if (typeof value === "boolean") {
    return { kind: "boolean", payload: value };
  }

  if (value instanceof Date) {
    const timestamp = value.getTime();

    return Number.isFinite(timestamp)
      ? { kind: "date", payload: timestamp }
      : { kind: "unsupported" };
  }

  return { kind: "unsupported" };
}

function getCominsGroupKeyPayload(key: CominsNormalizedGroupKey) {
  switch (key.kind) {
    case "boolean":
      return key.payload ? "true" : "false";
    case "date":
    case "number":
      return String(key.payload);
    case "string":
      return key.payload;
    case "empty":
    case "unsupported":
      return "";
  }
}

function encodeLengthPrefixed(value: string) {
  return `${value.length}:${value}`;
}

export function encodeCominsGroupPath(
  path: readonly { columnId: string; key: CominsNormalizedGroupKey }[],
) {
  return `comins-group:${path
    .map(({ columnId, key }) =>
      [columnId, key.kind, getCominsGroupKeyPayload(key)]
        .map(encodeLengthPrefixed)
        .join(""),
    )
    .join("")}`;
}

export function getCominsGroupSlotKey(groupId: string) {
  return `group:${encodeURIComponent(groupId)}`;
}

export function normalizeCominsRowGrouping<TData>(input: {
  columns: readonly CominsTableRuntimeColumn<TData>[];
  config: CominsRowGroupingConfig<TData>;
}) {
  const columnById = new Map(input.columns.map((column) => [column.id, column] as const));
  const usedColumnIds = new Set<string>();
  const criteria: CominsNormalizedGroupingCriterion<TData>[] = [];

  for (const criterionInput of Array.isArray(input.config.criteria)
    ? input.config.criteria
    : []) {
    const criterion = typeof criterionInput === "string"
      ? { columnId: criterionInput }
      : criterionInput;
    const columnId = criterion?.columnId;
    const column = typeof columnId === "string" ? columnById.get(columnId) : undefined;

    if (!column || usedColumnIds.has(column.id)) {
      continue;
    }

    usedColumnIds.add(column.id);
    criteria.push({
      column,
      ...(typeof criterion.getKey === "function" ? { getKey: criterion.getKey } : {}),
      ...(typeof criterion.getLabel === "function" ? { getLabel: criterion.getLabel } : {}),
    });
  }

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

  return { aggregationColumns, aggregations, criteria };
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

function getPublicGroupKey(key: CominsNormalizedGroupKey): CominsRowGroupKey | null {
  switch (key.kind) {
    case "boolean":
    case "number":
    case "string":
      return key.payload;
    case "date":
      return new Date(key.payload);
    case "empty":
      return null;
    case "unsupported":
      return null;
  }
}

function getDefaultGroupLabel(key: CominsNormalizedGroupKey): React.ReactNode {
  switch (key.kind) {
    case "empty":
      return "(empty)";
    case "unsupported":
      return "(unsupported)";
    case "date":
      return new Date(key.payload).toISOString();
    case "boolean":
    case "number":
    case "string":
      return String(key.payload);
  }
}

export function createCominsGroupTree<TData>(input: {
  aggregationColumns?: ReadonlyMap<string, CominsTableRuntimeColumn<TData>>;
  aggregations: ReadonlyMap<string, CominsRowGroupAggregation>;
  criteria: readonly CominsNormalizedGroupingCriterion<TData>[];
  rows: readonly CominsRowGroupingSourceRow<TData>[];
}): CominsGroupTree<TData> {
  const nodesById = new Map<string, CominsGroupNode>();
  const rootGroupIds: string[] = [];

  if (input.criteria.length === 0) {
    return { criteria: input.criteria, nodesById, rootGroupIds };
  }

  for (const sourceRow of input.rows) {
    const path: Array<{ columnId: string; key: CominsNormalizedGroupKey }> = [];
    let parentGroupId: string | null = null;

    input.criteria.forEach((criterion, depth) => {
      const value = getColumnValue(sourceRow.data, criterion.column);
      const rawKey = criterion.getKey
        ? criterion.getKey({
            column: criterion.column,
            row: sourceRow,
            value,
          })
        : value;
      const key = normalizeCominsGroupKey(rawKey);

      path.push({ columnId: criterion.column.id, key });
      const groupId = encodeCominsGroupPath(path);
      let node = nodesById.get(groupId);

      if (!node) {
        const aggregationState = new Map<string, CominsAggregateState>();

        for (const [columnId, aggregation] of input.aggregations) {
          aggregationState.set(columnId, createAggregateState(aggregation));
        }

        const label = key.kind === "unsupported"
          ? "(unsupported)"
          : criterion.getLabel?.({
              column: criterion.column,
              depth,
              firstRow: sourceRow,
              key: getPublicGroupKey(key),
            }) ?? getDefaultGroupLabel(key);

        node = {
          aggregationState,
          childGroupIds: [],
          columnId: criterion.column.id,
          depth,
          firstSourceIndex: sourceRow.dataIndex,
          groupId,
          key,
          label,
          ...(depth === input.criteria.length - 1 ? { leafSourceIndexes: [] } : {}),
          parentGroupId,
        };
        nodesById.set(groupId, node);

        if (parentGroupId === null) {
          rootGroupIds.push(groupId);
        } else {
          const parent = nodesById.get(parentGroupId);

          if (parent) {
            (parent.childGroupIds as string[]).push(groupId);
          }
        }
      }

      for (const [columnId, aggregateState] of node.aggregationState) {
        const configuredColumn = input.aggregationColumns?.get(columnId);
        const value = configuredColumn
          ? getColumnValue(sourceRow.data, configuredColumn)
          : getNestedFieldValue(sourceRow.data, columnId);

        updateAggregateState(aggregateState, value);
      }

      if (depth === input.criteria.length - 1) {
        (node.leafSourceIndexes as number[]).push(sourceRow.dataIndex);
      }

      parentGroupId = groupId;
    });
  }

  return { criteria: input.criteria, nodesById, rootGroupIds };
}

function compareCominsNormalizedGroupKeys(
  left: CominsNormalizedGroupKey,
  right: CominsNormalizedGroupKey,
) {
  const rank = COMINS_GROUP_KEY_RANK[left.kind] - COMINS_GROUP_KEY_RANK[right.kind];

  if (rank !== 0 || left.kind !== right.kind) {
    return rank;
  }

  switch (left.kind) {
    case "boolean":
      return Number(left.payload) - Number((right as typeof left).payload);
    case "date":
    case "number":
      return left.payload - (right as typeof left).payload;
    case "string": {
      const rightPayload = (right as typeof left).payload;

      return left.payload < rightPayload ? -1 : left.payload > rightPayload ? 1 : 0;
    }
    case "empty":
    case "unsupported":
      return 0;
  }
}

function defaultCompare(left: unknown, right: unknown) {
  if (typeof left === "number" && typeof right === "number") {
    return left - right;
  }

  return String(left ?? "").localeCompare(String(right ?? ""));
}

export function orderCominsGroupTree<TData>(input: {
  columns: readonly CominsTableRuntimeColumn<TData>[];
  rows: readonly TData[];
  sortModel: CominsSortModel;
  tree: CominsGroupTree<TData>;
}): CominsOrderedGroupTree<TData> {
  const columnById = new Map(input.columns.map((column) => [column.id, column] as const));
  const groupingColumnIds = new Set(input.tree.criteria.map(({ column }) => column.id));
  const leafSortModel = input.sortModel.filter((rule) => !groupingColumnIds.has(rule.columnId));
  const orderedChildGroupIdsById = new Map<string, readonly string[]>();
  const orderedLeafSourceIndexesById = new Map<string, readonly number[]>();

  const orderGroupIds = (groupIds: readonly string[], depth: number) => {
    const criterionColumnId = input.tree.criteria[depth]?.column.id;
    const groupRule = input.sortModel.find((rule) => rule.columnId === criterionColumnId);

    if (!groupRule) {
      return [...groupIds];
    }

    return [...groupIds].sort((leftId, rightId) => {
      const left = input.tree.nodesById.get(leftId);
      const right = input.tree.nodesById.get(rightId);

      if (!left || !right) {
        return 0;
      }

      const result = compareCominsNormalizedGroupKeys(left.key, right.key);
      const stableResult = result === 0 ? left.firstSourceIndex - right.firstSourceIndex : result;

      return groupRule.direction === "desc" ? stableResult * -1 : stableResult;
    });
  };

  const sortLeafIndexes = (rowIndexes: readonly number[]) => [...rowIndexes].sort((leftIndex, rightIndex) => {
    const leftRow = input.rows[leftIndex];
    const rightRow = input.rows[rightIndex];

    if (leftRow === undefined || rightRow === undefined) {
      return leftIndex - rightIndex;
    }

    for (const rule of leafSortModel) {
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

  for (const node of input.tree.nodesById.values()) {
    if (node.childGroupIds.length > 0) {
      orderedChildGroupIdsById.set(
        node.groupId,
        orderGroupIds(node.childGroupIds, node.depth + 1),
      );
    }

    if (node.leafSourceIndexes) {
      orderedLeafSourceIndexesById.set(
        node.groupId,
        sortLeafIndexes(node.leafSourceIndexes),
      );
    }
  }

  return {
    ...input.tree,
    orderedChildGroupIdsById,
    orderedLeafSourceIndexesById,
    orderedRootGroupIds: orderGroupIds(input.tree.rootGroupIds, 0),
  };
}

export function projectCominsGroupTree<TData>(input: {
  expandedGroupIds: readonly string[];
  rowIds: readonly CominsRowId[];
  tree: CominsOrderedGroupTree<TData>;
}) {
  const entries: CominsGroupingProjectionEntry[] = [];
  const expandedGroupIds = new Set(input.expandedGroupIds);
  const visibleLeafRowIds: CominsRowId[] = [];

  const visit = (groupId: string) => {
    const node = input.tree.nodesById.get(groupId);

    if (!node) {
      return;
    }

    entries.push({ groupId, key: getCominsGroupSlotKey(groupId), kind: "group" });

    if (!expandedGroupIds.has(groupId)) {
      return;
    }

    const childGroupIds = input.tree.orderedChildGroupIdsById.get(groupId);

    if (childGroupIds) {
      childGroupIds.forEach(visit);
      return;
    }

    for (const dataIndex of input.tree.orderedLeafSourceIndexesById.get(groupId) ?? []) {
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
  };

  input.tree.orderedRootGroupIds.forEach(visit);

  return { entries, visibleLeafRowIds };
}
