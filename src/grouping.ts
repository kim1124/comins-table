import type React from "react";

import type {
  CominsRowId,
  CominsSortModel,
  CominsTableRuntimeColumn,
} from "./react/core-compat";

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

import * as core from "./core/rows/grouping";
import { projectReactColumn } from "./react/model";
export { getCominsAggregateValue, getCominsGroupSlotKey, projectCominsGroups, moveCominsRowGroup } from "./core/rows/grouping";

export function normalizeCominsRowGrouping<TData, TGroup>(input: { columns: readonly CominsTableRuntimeColumn<TData>[]; config: CominsRowGroupingConfig<TData, TGroup> }) {
  const labels = new Map<CominsRowId, React.ReactNode>();
  const normalized = core.normalizeCominsRowGrouping({ columns: input.columns.map(projectReactColumn), config: {
    aggregations: input.config.aggregations, groups: input.config.groups,
    getGroupId(group: TGroup) {
      const id = input.config.getGroupId(group);
      if (!labels.has(id)) labels.set(id, input.config.getGroupLabel?.(group) ?? String(id));
      return id;
    },
  } });
  const originals = new Map(input.columns.map(column => [column.id, column]));
  return { ...normalized,
    aggregationColumns: new Map([...normalized.aggregationColumns.keys()].map(id => [id, originals.get(id)!])),
    groupsById: new Map([...normalized.groupsById].map(([id, group]) => [id, { ...group, label: labels.get(id) }])),
  };
}
export function createCominsGroupModel<TData, TGroup>(input: {
  aggregationColumns?: ReadonlyMap<string, CominsTableRuntimeColumn<TData>>;
  aggregations: ReadonlyMap<string, CominsRowGroupAggregation>;
  getRowGroupId: (row: TData, dataIndex: number) => CominsRowId;
  groupIds: readonly CominsRowId[];
  groupsById: ReadonlyMap<CominsRowId, CominsNormalizedGroup<TGroup>>;
  rows: readonly CominsRowGroupingSourceRow<TData>[];
}): CominsGroupModel<TGroup> {
  const result = core.createCominsGroupModel({ ...input,
    aggregationColumns: input.aggregationColumns && new Map([...input.aggregationColumns].map(([id, column]) => [id, projectReactColumn(column)])),
  });
  return { ...result, groupsById: new Map([...result.groupsById].map(([id, group]) => [id, { ...group, label: input.groupsById.get(id)!.label }])) };
}
export function orderCominsGroupModel<TData, TGroup>(input: { columns: readonly CominsTableRuntimeColumn<TData>[]; model: CominsGroupModel<TGroup>; rows: readonly TData[]; sortModel: CominsSortModel }): CominsOrderedGroupModel<TGroup> {
  const model = { ...input.model, groupsById: new Map([...input.model.groupsById].map(([id, node]) => [id, {
    group: node.group, groupId: node.groupId, groupIndex: node.groupIndex, aggregationState: node.aggregationState, leafSourceIndexes: node.leafSourceIndexes,
  }])) };
  const result = core.orderCominsGroupModel({ ...input, model, columns: input.columns.map(projectReactColumn) });
  return { ...result, groupsById: input.model.groupsById };
}
