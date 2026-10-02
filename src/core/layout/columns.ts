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
} from "../../column-layout";
import {
  normalizeCominsColumnPinned,
} from "../../column-pinning";
import {
  findColumn,
} from "../state/access";
const COMINS_MIN_COLUMN_WIDTH = 88;

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

export function normalizeColumnState<TData>(
  columns: ReadonlyArray<CominsTableRuntimeColumn<TData>>,
  layout?: Partial<CominsColumnLayout>,
) {
  const state: Record<string, CominsColumnRuntimeState> = {};

  for (const column of columns) {
    state[column.id] = {
      hidden: layout?.columns?.[column.id]?.hidden ?? column.hidden,
      pinned: normalizeCominsColumnPinned(
        layout === undefined ? column.pinned : layout.columns?.[column.id]?.pinned,
      ),
      width: layout?.columns?.[column.id]?.width ?? column.width,
    };
  }

  return state;
}

export function normalizeColumnGroupState(
  columnGroups: ReadonlyArray<CominsTableRuntimeColumnGroup>,
  layout?: Partial<CominsColumnLayout>,
) {
  const state: Record<string, CominsColumnGroupRuntimeState> = {};

  for (const group of columnGroups) {
    state[group.id] = {
      hidden: layout?.groups?.[group.id]?.hidden ?? group.hidden,
      pinned: normalizeCominsColumnPinned(
        layout === undefined ? group.pinned : layout.groups?.[group.id]?.pinned,
      ),
    };
  }

  return state;
}

export function getColumnGroupIdMap(columnGroups: ReadonlyArray<CominsTableRuntimeColumnGroup>) {
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

export function normalizeColumnOrder<TData>(
  columns: ReadonlyArray<CominsTableRuntimeColumn<TData>>,
  layout?: Partial<CominsColumnLayout>,
  columnGroups: ReadonlyArray<CominsTableRuntimeColumnGroup> = [],
) {
  const knownIds = new Set(columns.map((column) => column.id));
  const ordered = (layout?.order ?? []).filter((id) => knownIds.has(id));
  const missing = columns.map((column) => column.id).filter((id) => !ordered.includes(id));
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
  const declaredEntities = createEntities(columns.map((column) => column.id));
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
  if (!findColumnGroupById(state.columnGroups, groupId)) {
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
  const group = findColumnGroupById(state.columnGroups, groupId);

  if (!group || state.columnGroupState[group.id]?.hidden === true) {
    return state;
  }

  const childColumns = group.children
    .map((columnId) => findColumn(state, columnId))
    .filter((column): column is CominsTableRuntimeColumn<TData> => Boolean(column))
    .filter((column) => state.columnState[column.id]?.hidden !== true);

  if (childColumns.length === 0) {
    return state;
  }

  const widths = distributeColumnGroupWidths(state, childColumns, width);
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
  const group = findColumnGroupById(state.columnGroups, groupId);

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
  const nextIndex = Math.max(0, Math.min(targetIndex, current.length));
  const nextOrder = [...current.slice(0, nextIndex), ...groupChildren, ...current.slice(nextIndex)];

  if (doesColumnMoveChangeLockedPositions(state, nextOrder)) {
    return state;
  }

  if (nextOrder.every((id, index) => id === state.columnOrder[index])) {
    return state;
  }

  return { ...state, columnOrder: nextOrder };
}

export function serializeCominsColumnLayout<TData>(state: CominsTableState<TData>): CominsColumnLayout {
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
  return {
    ...state,
    columnOrder: normalizeColumnOrder(state.columns, layout, state.columnGroups),
    columnGroupState: normalizeColumnGroupState(state.columnGroups, layout),
    columnState: normalizeColumnState(state.columns, layout),
  };
}

export function getCominsVisibleColumns<TData>(state: CominsTableState<TData>) {
  const groupIdByColumnId = getColumnGroupIdMap(state.columnGroups);
  const groupById = new Map(state.columnGroups.map((group) => [group.id, group]));
  const emittedGroups = new Set<string>();
  const blocks: Array<{
    columns: Array<CominsTableRuntimeColumn<TData>>;
    pinned?: CominsColumnPinned;
  }> = [];

  for (const columnId of state.columnOrder) {
    const column = findColumn(state, columnId);

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
      .map((currentId) => findColumn(state, currentId))
      .filter((current): current is CominsTableRuntimeColumn<TData> =>
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
  const visibleColumns = getCominsVisibleColumns(state);

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

  const visibleColumnIds = new Set(visibleColumns.map((column) => column.id));
  const groupIdByColumnId = getColumnGroupIdMap(state.columnGroups);
  const groupById = new Map(state.columnGroups.map((group) => [group.id, group]));
  const emittedGroups = new Set<string>();
  const parentRow: Array<CominsHeaderCell<TData>> = [];
  const childRow: Array<CominsHeaderCell<TData>> = [];

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
