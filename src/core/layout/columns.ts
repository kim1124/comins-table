import type {
  CominsColumnPinned,
  CominsColumnRuntimeState,
  CominsColumnGroupRuntimeState,
  CominsColumnLayout,
  CominsTableRuntimeColumn,
  CominsTableRuntimeColumnGroup,
  CominsTableState,
  CominsHeaderCell,
} from "../model";
import {
  setColumnWidth,
  distributeRuntimeColumnWidths,
} from "../../column-layout";
import {
  normalizeCominsColumnPinned,
} from "../../column-pinning";
import {
  findColumn,
} from "../state/access";
const COMINS_MIN_COLUMN_WIDTH = 88;

export type ColumnLayoutDefinition = Pick<CominsTableRuntimeColumn<unknown>, "id" | "hidden" | "pinned" | "width" | "lockPosition">;
export type ColumnGroupLayoutDefinition = Pick<CominsTableRuntimeColumnGroup, "id" | "children" | "hidden" | "pinned" | "lockPosition">;

type GroupLayoutMutationSource = Pick<CominsTableState<unknown>, "columnOrder" | "columnState" | "columnGroupState"> & {
  columns: Array<Pick<CominsTableRuntimeColumn<unknown>, "id" | "width" | "minWidth" | "maxWidth" | "lockPosition">>;
  columnGroups: Array<Pick<CominsTableRuntimeColumnGroup, "id" | "children" | "lockPosition">>;
};

export function normalizeColumns<TColumn extends { id?: string; field: string }>(columns: readonly TColumn[]) {
  return columns.map((column) => ({
    ...column,
    id: column.id ?? column.field,
  }));
}

export function normalizeColumnGroups<TGroup extends { id: string; children: string[] }>(
  columns: readonly { id: string }[],
  columnGroups: readonly TGroup[] = [],
) {
  const knownColumnIds = new Set(columns.map((column) => column.id));
  const usedColumnIds = new Set<string>();
  const usedGroupIds = new Set<string>();
  const groups: TGroup[] = [];

  for (const group of columnGroups) {
    if (usedGroupIds.has(group.id)) {
      continue;
    }

    const children = group.children.filter((columnId) => {
      if (!knownColumnIds.has(columnId) || usedColumnIds.has(columnId)) {
        return false;
      }

      usedColumnIds.add(columnId);
      return true;
    });

    usedGroupIds.add(group.id);

    if (children.length === 0) {
      continue;
    }

    groups.push({
      ...group,
      children,
    });
  }

  return groups;
}

export function normalizeColumnState(
  columns: ReadonlyArray<ColumnLayoutDefinition>,
  layout?: Partial<CominsColumnLayout>,
) {
  const overrides = layout?.columns;
  return Object.fromEntries<CominsColumnRuntimeState>(columns.map(column => {
    const override = overrides && Object.hasOwn(overrides, column.id) ? overrides[column.id] : undefined;
    return [column.id, {
      hidden: override?.hidden ?? column.hidden,
      pinned: normalizeCominsColumnPinned(
        layout === undefined ? column.pinned : override?.pinned,
      ),
      width: override?.width ?? column.width,
    }];
  }));
}

export function normalizeColumnGroupState(
  columnGroups: ReadonlyArray<ColumnGroupLayoutDefinition>,
  layout?: Partial<CominsColumnLayout>,
) {
  const overrides = layout?.groups;
  return Object.fromEntries<CominsColumnGroupRuntimeState>(columnGroups.map(group => {
    const override = overrides && Object.hasOwn(overrides, group.id) ? overrides[group.id] : undefined;
    return [group.id, {
      hidden: override?.hidden ?? group.hidden,
      pinned: normalizeCominsColumnPinned(
        layout === undefined ? group.pinned : override?.pinned,
      ),
    }];
  }));
}

export function getColumnGroupIdMap(columnGroups: ReadonlyArray<{ id: string; children: string[] }>) {
  const map = new Map<string, string>();

  for (const group of columnGroups) {
    for (const columnId of group.children) {
      map.set(columnId, group.id);
    }
  }

  return map;
}

export function findColumnGroupById(
  columnGroups: ReadonlyArray<CominsTableRuntimeColumnGroup>,
  groupId: string,
) {
  return columnGroups.find((group) => group.id === groupId);
}

export function normalizeColumnOrder(
  columns: ReadonlyArray<ColumnLayoutDefinition>,
  layout?: Partial<CominsColumnLayout>,
  columnGroups: ReadonlyArray<ColumnGroupLayoutDefinition> = [],
  prepared?: LayoutGroupLookup<ColumnGroupLayoutDefinition>,
) {
  if (layout?.order?.length) {
    return normalizeRequestedColumnOrder(columns, layout, columnGroups);
  }

  const declaredOrder = columns.map((column) => column.id);

  if (columnGroups.length === 0) {
    return declaredOrder;
  }

  const groupIdByColumnId = prepared?.groupIdByColumnId ?? getColumnGroupIdMap(columnGroups);
  const groupById = prepared?.groupById ?? new Map(columnGroups.map((group) => [group.id, group]));
  const emittedGroups = new Set<string>();
  let memberCount = 0;
  for (const group of columnGroups) memberCount += group.children.length;
  // Overlapping memberships and duplicate group IDs use the existing regrouping rules.
  if (groupById.size === columnGroups.length && groupIdByColumnId.size === memberCount) {
    let previousGroupId: string | undefined;
    let contiguous = true;
    for (const columnId of declaredOrder) {
      const groupId = groupIdByColumnId.get(columnId);
      if (groupId === previousGroupId) continue;
      if (groupId && emittedGroups.has(groupId)) {
        contiguous = false;
        break;
      }
      if (groupId) emittedGroups.add(groupId);
      previousGroupId = groupId;
    }
    if (contiguous) return declaredOrder;
    emittedGroups.clear();
  }

  const groupedOrder: string[] = [];

  for (const columnId of declaredOrder) {
    const groupId = groupIdByColumnId.get(columnId);
    const group = groupId ? groupById.get(groupId) : undefined;

    if (!groupId || !group) {
      groupedOrder.push(columnId);
      continue;
    }

    if (emittedGroups.has(groupId)) {
      continue;
    }

    for (const childId of declaredOrder) {
      if (group.children.includes(childId)) {
        groupedOrder.push(childId);
      }
    }

    emittedGroups.add(groupId);
  }

  return groupedOrder;
}

function normalizeRequestedColumnOrder(
  columns: ReadonlyArray<ColumnLayoutDefinition>,
  layout?: Partial<CominsColumnLayout>,
  columnGroups: ReadonlyArray<ColumnGroupLayoutDefinition> = [],
) {
  const declaredOrder = columns.map((column) => column.id);
  const knownIds = new Set(declaredOrder);
  const ordered = (layout?.order ?? []).filter((id) => knownIds.delete(id));
  const missing = declaredOrder.filter((id) => knownIds.has(id));
  const flatOrder = [...ordered, ...missing];
  const columnById = new Map(columns.map((column) => [column.id, column]));
  const groupIdByColumnId = getColumnGroupIdMap(columnGroups);
  const groupById = new Map(columnGroups.map((group) => [group.id, group]));
  const isColumnPinned = (columnId: string) =>
    !groupIdByColumnId.has(columnId) &&
    normalizeCominsColumnPinned(
      layout === undefined
        ? columnById.get(columnId)?.pinned
        : layout.columns?.[columnId]?.pinned,
    ) !== undefined;
  const isGroupPinned = (groupId: string) =>
    normalizeCominsColumnPinned(
      layout === undefined
        ? groupById.get(groupId)?.pinned
        : layout.groups?.[groupId]?.pinned,
    ) !== undefined;
  type ColumnOrderEntity = {
    columnIds: string[];
    key: string;
    locked: boolean;
  };
  const createEntities = (order: readonly string[]) => {
    const emittedGroups = new Set<string>();
    const entities: ColumnOrderEntity[] = [];

    for (const columnId of order) {
      const groupId = groupIdByColumnId.get(columnId);

      if (!groupId) {
        entities.push({
          columnIds: [columnId],
          key: `column:${columnId}`,
          locked:
            columnById.get(columnId)?.lockPosition === true ||
            isColumnPinned(columnId),
        });
        continue;
      }

      if (emittedGroups.has(groupId)) {
        continue;
      }

      const group = groupById.get(groupId);

      if (!group) {
        entities.push({
          columnIds: [columnId],
          key: `column:${columnId}`,
          locked:
            columnById.get(columnId)?.lockPosition === true ||
            isColumnPinned(columnId),
        });
        continue;
      }

      const groupChildrenInOrder = order.filter((currentId) => group.children.includes(currentId));
      entities.push({
        columnIds: groupChildrenInOrder,
        key: `group:${groupId}`,
        locked:
          group.lockPosition ||
          isGroupPinned(groupId) ||
          groupChildrenInOrder.some((currentId) => columnById.get(currentId)?.lockPosition === true),
      });
      emittedGroups.add(groupId);
    }

    return entities;
  };
  const declaredEntities = createEntities(declaredOrder);
  const proposedEntities = createEntities(flatOrder);
  const declaredEntityByKey = new Map(declaredEntities.map((entity) => [entity.key, entity]));
  const declaredSegmentByKey = new Map<string, number>();
  let segmentCount = 0;

  for (const entity of declaredEntities) {
    declaredSegmentByKey.set(entity.key, segmentCount);

    if (entity.locked) {
      segmentCount += 1;
    }
  }

  const movableEntitiesBySegment = Array.from(
    { length: segmentCount + 1 },
    () => [] as ColumnOrderEntity[],
  );
  const proposedEntityByKey = new Map(proposedEntities.map((entity) => [entity.key, entity]));

  for (const entity of proposedEntities) {
    const declaredEntity = declaredEntityByKey.get(entity.key);

    if (!declaredEntity || declaredEntity.locked) {
      continue;
    }

    const segment = declaredSegmentByKey.get(entity.key) ?? 0;
    movableEntitiesBySegment[segment]?.push(entity);
  }

  const normalizedEntities: ColumnOrderEntity[] = [];
  let currentSegment = 0;

  for (const entity of declaredEntities) {
    if (!entity.locked) {
      continue;
    }

    normalizedEntities.push(...(movableEntitiesBySegment[currentSegment] ?? []));
    normalizedEntities.push(proposedEntityByKey.get(entity.key) ?? entity);
    currentSegment += 1;
  }

  normalizedEntities.push(...(movableEntitiesBySegment[currentSegment] ?? []));

  return normalizedEntities.flatMap((entity) => {
    const declaredEntity = declaredEntityByKey.get(entity.key);

    if (!declaredEntity || entity.columnIds.length === 1) {
      return entity.columnIds;
    }

    const lockedChildIds = new Set(
      declaredEntity.columnIds.filter((columnId) => columnById.get(columnId)?.lockPosition),
    );

    if (lockedChildIds.size === 0) {
      return entity.columnIds;
    }

    const declaredChildSegmentById = new Map<string, number>();
    let childSegmentCount = 0;

    for (const columnId of declaredEntity.columnIds) {
      declaredChildSegmentById.set(columnId, childSegmentCount);

      if (lockedChildIds.has(columnId)) {
        childSegmentCount += 1;
      }
    }

    const movableChildrenBySegment = Array.from(
      { length: childSegmentCount + 1 },
      () => [] as string[],
    );

    for (const columnId of entity.columnIds) {
      if (lockedChildIds.has(columnId)) {
        continue;
      }

      const segment = declaredChildSegmentById.get(columnId) ?? 0;
      movableChildrenBySegment[segment]?.push(columnId);
    }

    const normalizedChildren: string[] = [];
    let currentChildSegment = 0;

    for (const columnId of declaredEntity.columnIds) {
      if (!lockedChildIds.has(columnId)) {
        continue;
      }

      normalizedChildren.push(...(movableChildrenBySegment[currentChildSegment] ?? []));
      normalizedChildren.push(columnId);
      currentChildSegment += 1;
    }

    normalizedChildren.push(...(movableChildrenBySegment[currentChildSegment] ?? []));
    return normalizedChildren;
  });
}

export function setCominsColumnWidth<TData>(
  state: CominsTableState<TData>,
  columnId: string,
  width: number,
) {
  return setColumnWidth(state, columnId, width);
}

export function setCominsColumnHidden<TData>(
  state: CominsTableState<TData>,
  columnId: string,
  hidden: boolean,
) {
  return {
    ...state,
    columnState: {
      ...state.columnState,
      [columnId]: {
        ...state.columnState[columnId],
        hidden,
      },
    },
  };
}

export function setCominsColumnGroupHidden<TData>(
  state: CominsTableState<TData>,
  groupId: string,
  hidden: boolean,
) {
  return setColumnGroupLayoutHidden(state, groupId, hidden);
}

export function setColumnGroupLayoutHidden<TState extends GroupLayoutMutationSource>(
  state: TState,
  groupId: string,
  hidden: boolean,
): TState {
  if (!state.columnGroups.find((group) => group.id === groupId)) {
    return state;
  }

  return {
    ...state,
    columnGroupState: {
      ...state.columnGroupState,
      [groupId]: {
        ...state.columnGroupState[groupId],
        hidden,
      },
    },
  };
}

export function getColumnWidth<TData>(
  state: CominsTableState<TData>,
  column: CominsTableRuntimeColumn<TData>,
) {
  return state.columnState[column.id]?.width ?? column.width ?? 100;
}

export function getColumnMinWidth<TData>(column: CominsTableRuntimeColumn<TData>) {
  return Math.max(COMINS_MIN_COLUMN_WIDTH, column.minWidth ?? COMINS_MIN_COLUMN_WIDTH);
}

export function getColumnMaxWidth<TData>(column: CominsTableRuntimeColumn<TData>) {
  return column.maxWidth ?? Number.POSITIVE_INFINITY;
}

export function clampWidth(width: number, minWidth: number, maxWidth: number) {
  return Math.min(maxWidth, Math.max(minWidth, width));
}

export function distributeColumnGroupWidths<TData>(
  state: CominsTableState<TData>,
  columns: Array<CominsTableRuntimeColumn<TData>>,
  targetWidth: number,
) {
  const widths = columns.map((column) =>
    clampWidth(getColumnWidth(state, column), getColumnMinWidth(column), getColumnMaxWidth(column)),
  );
  const active = new Set(columns.map((_column, index) => index));
  const minWidths = columns.map(getColumnMinWidth);
  const maxWidths = columns.map(getColumnMaxWidth);
  const boundedTargetWidth = clampWidth(
    targetWidth,
    minWidths.reduce((sum, width) => sum + width, 0),
    maxWidths.reduce((sum, width) => sum + width, 0),
  );

  while (active.size > 0) {
    const currentTotal = widths.reduce((sum, width) => sum + width, 0);
    const delta = boundedTargetWidth - currentTotal;

    if (Math.abs(delta) < 0.001) {
      break;
    }

    const activeIndexes = [...active];
    const activeWeight = activeIndexes.reduce((sum, index) => sum + Math.max(widths[index] ?? 0, 0), 0);
    let clamped = false;

    for (const index of activeIndexes) {
      const width = widths[index] ?? 0;
      const weight = activeWeight > 0 ? width / activeWeight : 1 / activeIndexes.length;
      const nextWidth = width + delta * weight;
      const clampedWidth = clampWidth(nextWidth, minWidths[index] ?? 0, maxWidths[index] ?? Number.POSITIVE_INFINITY);

      widths[index] = clampedWidth;

      if (Math.abs(clampedWidth - nextWidth) > 0.001) {
        active.delete(index);
        clamped = true;
      }
    }

    if (!clamped) {
      break;
    }
  }

  return widths;
}

export function setCominsColumnGroupWidth<TData>(
  state: CominsTableState<TData>,
  groupId: string,
  width: number,
) {
  return setColumnGroupLayoutWidth(state, groupId, width);
}

export function setColumnGroupLayoutWidth<TState extends GroupLayoutMutationSource>(
  state: TState,
  groupId: string,
  width: number,
): TState {
  const group = state.columnGroups.find((candidate) => candidate.id === groupId);

  if (!group || state.columnGroupState[group.id]?.hidden === true) {
    return state;
  }

  const childColumns = group.children
    .map((columnId) => state.columns.find((column) => column.id === columnId))
    .filter((column): column is GroupLayoutMutationSource["columns"][number] => Boolean(column))
    .filter((column) => state.columnState[column.id]?.hidden !== true);

  if (childColumns.length === 0) {
    return state;
  }

  const widths = distributeRuntimeColumnWidths(state, childColumns, width);
  const columnState = { ...state.columnState };

  childColumns.forEach((column, index) => {
    columnState[column.id] = {
      ...columnState[column.id],
      width: widths[index],
    };
  });

  return {
    ...state,
    columnState,
  };
}

export function doesColumnMoveChangeLockedPositions<TData>(
  state: CominsTableState<TData>,
  nextOrder: readonly string[],
) {
  return doesLayoutMoveChangeLockedPositions(state, nextOrder);
}

function doesLayoutMoveChangeLockedPositions(
  state: GroupLayoutMutationSource,
  nextOrder: readonly string[],
) {
  const currentIndexByColumnId = new Map(
    state.columnOrder.map((columnId, index) => [columnId, index] as const),
  );
  const nextIndexByColumnId = new Map(
    nextOrder.map((columnId, index) => [columnId, index] as const),
  );

  const groupIdByColumnId = getColumnGroupIdMap(state.columnGroups);

  for (const column of state.columns) {
    if (
      (
        column.lockPosition ||
        (!groupIdByColumnId.has(column.id) && state.columnState[column.id]?.pinned !== undefined)
      ) &&
      currentIndexByColumnId.get(column.id) !== nextIndexByColumnId.get(column.id)
    ) {
      return true;
    }
  }

  for (const group of state.columnGroups) {
    if (!group.lockPosition && state.columnGroupState[group.id]?.pinned === undefined) {
      continue;
    }

    const currentPositions = group.children
      .map((columnId) => currentIndexByColumnId.get(columnId))
      .filter((index): index is number => index !== undefined)
      .sort((left, right) => left - right);
    const nextPositions = group.children
      .map((columnId) => nextIndexByColumnId.get(columnId))
      .filter((index): index is number => index !== undefined)
      .sort((left, right) => left - right);

    if (
      currentPositions.length !== nextPositions.length ||
      currentPositions.some((index, position) => index !== nextPositions[position])
    ) {
      return true;
    }
  }

  return false;
}

export function moveCominsColumn<TData>(
  state: CominsTableState<TData>,
  columnId: string,
  targetIndex: number,
) {
  const sourceColumn = findColumn(state, columnId);
  const sourceGroupId = getColumnGroupIdMap(state.columnGroups).get(columnId);

  if (
    !sourceColumn ||
    sourceColumn.lockPosition ||
    (!sourceGroupId && state.columnState[columnId]?.pinned !== undefined)
  ) {
    return state;
  }

  const groupIdByColumnId = getColumnGroupIdMap(state.columnGroups);

  const current = state.columnOrder.filter((id) => id !== columnId);

  if (current.length === state.columnOrder.length) {
    return state;
  }

  const nextIndex = Math.max(0, Math.min(targetIndex, current.length));

  if (sourceGroupId) {
    const sourceGroup = findColumnGroupById(state.columnGroups, sourceGroupId);

    if (!sourceGroup) {
      return state;
    }

    const groupChildrenInCurrent = current.filter((id) => sourceGroup.children.includes(id));
    const groupStart = current.findIndex((id) => sourceGroup.children.includes(id));
    const groupEnd = groupStart + groupChildrenInCurrent.length;

    if (nextIndex < groupStart || nextIndex > groupEnd) {
      return state;
    }
  } else if (state.columnGroups.length > 0) {
    for (const group of state.columnGroups) {
      const groupChildrenInCurrent = current.filter((id) => group.children.includes(id));

      if (groupChildrenInCurrent.length === 0) {
        continue;
      }

      const groupStart = current.findIndex((id) => group.children.includes(id));
      const groupEnd = groupStart + groupChildrenInCurrent.length;

      if (nextIndex > groupStart && nextIndex < groupEnd) {
        return state;
      }
    }
  }

  current.splice(nextIndex, 0, columnId);

  if (doesColumnMoveChangeLockedPositions(state, current)) {
    return state;
  }

  if (current.every((id, index) => id === state.columnOrder[index])) {
    return state;
  }

  return { ...state, columnOrder: current };
}

export function moveCominsColumnGroup<TData>(
  state: CominsTableState<TData>,
  groupId: string,
  targetIndex: number,
) {
  return moveColumnGroupLayout(state, groupId, targetIndex);
}

export function moveColumnGroupLayout<TState extends GroupLayoutMutationSource>(
  state: TState,
  groupId: string,
  targetIndex: number,
): TState {
  const group = state.columnGroups.find((candidate) => candidate.id === groupId);

  if (
    !group ||
    group.lockPosition ||
    state.columnGroupState[groupId]?.pinned !== undefined
  ) {
    return state;
  }

  const groupChildren = state.columnOrder.filter((id) => group.children.includes(id));

  if (groupChildren.length === 0) {
    return state;
  }

  const current = state.columnOrder.filter((id) => !group.children.includes(id));
  let nextIndex = Math.max(0, Math.min(targetIndex, current.length));
  const targetGroup = state.columnGroups.find(candidate =>
    candidate !== group && candidate.children.includes(current[nextIndex - 1]!) &&
    candidate.children.includes(current[nextIndex]!));
  if (targetGroup) {
    if (state.columnOrder.indexOf(groupChildren[0]!) < state.columnOrder.indexOf(current[nextIndex]!)) {
      while (nextIndex < current.length && targetGroup.children.includes(current[nextIndex]!)) nextIndex += 1;
    } else {
      while (nextIndex > 0 && targetGroup.children.includes(current[nextIndex - 1]!)) nextIndex -= 1;
    }
  }
  const nextOrder = [...current.slice(0, nextIndex), ...groupChildren, ...current.slice(nextIndex)];

  if (doesLayoutMoveChangeLockedPositions(state, nextOrder)) {
    return state;
  }

  if (nextOrder.every((id, index) => id === state.columnOrder[index])) {
    return state;
  }

  return { ...state, columnOrder: nextOrder };
}

export function serializeCominsColumnLayout<TData>(state: CominsTableState<TData>): CominsColumnLayout {
  return serializeColumnLayoutState(state);
}

type LayoutSerializationSource = Pick<CominsTableState<unknown>, "columnState" | "columnGroupState" | "columnOrder"> & {
  columnGroups: readonly { id: string }[];
};

export function serializeColumnLayoutState(state: LayoutSerializationSource): CominsColumnLayout {
  const groups =
    state.columnGroups.length === 0
      ? undefined
      : Object.fromEntries(state.columnGroups.map((group) => [group.id, { ...state.columnGroupState[group.id] }]));

  return {
    columns: { ...state.columnState },
    ...(groups ? { groups } : {}),
    order: [...state.columnOrder],
  };
}

export function applyCominsColumnLayout<TData>(state: CominsTableState<TData>, layout: CominsColumnLayout) {
  return applyColumnLayoutState(state, layout);
}

export function applyColumnLayoutState<TState extends LayoutSource<ColumnLayoutDefinition, ColumnGroupLayoutDefinition>>(
  state: TState,
  layout: CominsColumnLayout,
): TState {
  return {
    ...state,
    columnOrder: normalizeColumnOrder(state.columns, layout, state.columnGroups),
    columnGroupState: normalizeColumnGroupState(state.columnGroups, layout),
    columnState: normalizeColumnState(state.columns, layout),
  };
}

type LayoutSource<TColumn, TGroup> = Pick<CominsTableState<unknown>, "columnOrder" | "columnState" | "columnGroupState"> & {
  columns: readonly TColumn[];
  columnGroups: readonly TGroup[];
};

type LayoutHeaderCell<TColumn, TGroup> =
  | { kind: "column"; colSpan: 1; rowSpan: 1 | 2; column: TColumn; columnId: string; groupId?: string }
  | { kind: "group"; colSpan: number; rowSpan: 1; group: TGroup; groupId: string };

export type LayoutGroupLookup<TGroup> = {
  groupIdByColumnId: Map<string, string>;
  groupById: Map<string, TGroup>;
};

export function createLayoutGroupLookup<TGroup extends { id: string; children: string[] }>(
  groups: readonly TGroup[],
): LayoutGroupLookup<TGroup> {
  return {
    groupIdByColumnId: getColumnGroupIdMap(groups),
    groupById: new Map(groups.map(group => [group.id, group] as const)),
  };
}

export function getCominsVisibleColumns<TData>(state: CominsTableState<TData>) {
  return getVisibleLayoutColumns(state);
}

// Layout only reads IDs and runtime layout; render/edit metadata stays with its owner.
export function getVisibleLayoutColumns<TColumn extends { id: string }, TGroup extends { id: string; children: string[] }>(
  state: LayoutSource<TColumn, TGroup>,
) {
  return buildVisibleLayoutColumns(state, createLayoutGroupLookup(state.columnGroups));
}

function buildVisibleLayoutColumns<TColumn extends { id: string }, TGroup extends { id: string; children: string[] }>(
  state: LayoutSource<TColumn, TGroup>,
  lookup: LayoutGroupLookup<TGroup>,
) {
  const { groupIdByColumnId, groupById } = lookup;
  const emittedGroups = new Set<string>();
  const blocks: Array<{
    columns: Array<TColumn>;
    pinned?: CominsColumnPinned;
  }> = [];

  for (const columnId of state.columnOrder) {
    const column = state.columns.find(column => column.id === columnId);

    if (!column || state.columnState[column.id]?.hidden === true) {
      continue;
    }

    const groupId = groupIdByColumnId.get(column.id);

    if (!groupId) {
      blocks.push({ columns: [column], pinned: state.columnState[column.id]?.pinned });
      continue;
    }

    if (emittedGroups.has(groupId) || state.columnGroupState[groupId]?.hidden === true) {
      continue;
    }

    const group = groupById.get(groupId);

    if (!group) {
      continue;
    }

    const columns = state.columnOrder
      .filter((currentId) => group.children.includes(currentId))
      .map((currentId) => state.columns.find(column => column.id === currentId))
      .filter((current): current is TColumn =>
        Boolean(current) && state.columnState[current!.id]?.hidden !== true,
      );

    if (columns.length > 0) {
      blocks.push({ columns, pinned: state.columnGroupState[groupId]?.pinned });
    }

    emittedGroups.add(groupId);
  }

  return ["left", undefined, "right"].flatMap((pinned) =>
    blocks
      .filter((block) => block.pinned === pinned)
      .flatMap((block) => block.columns),
  );
}

export function getCominsHeaderRows<TData>(state: CominsTableState<TData>): Array<Array<CominsHeaderCell<TData>>> {
  return getLayoutHeaderRows(state);
}

export function getLayoutHeaderRows<TColumn extends { id: string }, TGroup extends { id: string; children: string[] }>(
  state: LayoutSource<TColumn, TGroup>,
): Array<Array<LayoutHeaderCell<TColumn, TGroup>>> {
  const lookup = createLayoutGroupLookup(state.columnGroups);
  const visibleColumns = buildVisibleLayoutColumns(state, lookup);
  return buildLayoutHeaderRows(state, visibleColumns, lookup);
}

export function getLayoutProjection<TColumn extends { id: string }, TGroup extends { id: string; children: string[] }>(
  state: LayoutSource<TColumn, TGroup>,
  lookup = createLayoutGroupLookup(state.columnGroups),
) {
  const visibleColumns = buildVisibleLayoutColumns(state, lookup);
  return { visibleColumns, headerRows: buildLayoutHeaderRows(state, visibleColumns, lookup) };
}

function buildLayoutHeaderRows<TColumn extends { id: string }, TGroup extends { id: string; children: string[] }>(
  state: LayoutSource<TColumn, TGroup>,
  visibleColumns: TColumn[],
  lookup: LayoutGroupLookup<TGroup>,
): Array<Array<LayoutHeaderCell<TColumn, TGroup>>> {

  if (state.columnGroups.length === 0) {
    return [
      visibleColumns.map((column) => ({
        colSpan: 1,
        column,
        columnId: column.id,
        kind: "column",
        rowSpan: 1,
      })),
    ];
  }

  const { groupIdByColumnId, groupById } = lookup;
  const emittedGroups = new Set<string>();
  const parentRow: Array<LayoutHeaderCell<TColumn, TGroup>> = [];
  const childRow: Array<LayoutHeaderCell<TColumn, TGroup>> = [];

  for (const column of visibleColumns) {
    const columnId = column.id;

    const groupId = groupIdByColumnId.get(columnId);

    if (!groupId) {
      parentRow.push({
        colSpan: 1,
        column,
        columnId: column.id,
        kind: "column",
        rowSpan: 2,
      });
      continue;
    }

    if (emittedGroups.has(groupId)) {
      continue;
    }

    const group = groupById.get(groupId);

    if (!group) {
      continue;
    }

    const visibleGroupColumns = visibleColumns.filter((currentColumn) =>
      group.children.includes(currentColumn.id),
    );

    if (visibleGroupColumns.length === 0) {
      emittedGroups.add(groupId);
      continue;
    }

    parentRow.push({
      colSpan: visibleGroupColumns.length,
      group,
      groupId,
      kind: "group",
      rowSpan: 1,
    });
    childRow.push(
      ...visibleGroupColumns.map((currentColumn) => ({
        colSpan: 1 as const,
        column: currentColumn,
        columnId: currentColumn.id,
        groupId,
        kind: "column" as const,
        rowSpan: 1 as const,
      })),
    );
    emittedGroups.add(groupId);
  }

  return [parentRow, childRow];
}
