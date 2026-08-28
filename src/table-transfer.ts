import type { CominsRowId } from "./core";

export type CominsTableTransferConflictPolicy = "overwrite" | "reject";
export type CominsTableTransferDropPosition = "after" | "append" | "before";

export type CominsTableTransferRowEndpoint<TData> = {
  dataIndex: number;
  row: TData;
  rowId: CominsRowId;
  tableId: string;
};

export type CominsTableTransferGroupEndpoint<TData, TGroup> = {
  group: TGroup;
  groupId: CominsRowId;
  groupIndex: number;
  rows: readonly CominsTableTransferRowEndpoint<TData>[];
  tableId: string;
};

export type CominsTableTransferConflict<TData, TGroup> =
  | {
      kind: "row";
      rowId: CominsRowId;
      source: CominsTableTransferRowEndpoint<TData>;
      target: CominsTableTransferRowEndpoint<TData>;
    }
  | {
      groupId: CominsRowId;
      kind: "group";
      source: CominsTableTransferGroupEndpoint<TData, TGroup>;
      target: CominsTableTransferGroupEndpoint<TData, TGroup>;
    };

export type CominsTableTransferResolvedConflict<TData, TGroup> = {
  conflict: CominsTableTransferConflict<TData, TGroup>;
  policy: CominsTableTransferConflictPolicy;
};

export type CominsTableTransferConflictResolver<TData, TGroup> = (
  conflict: CominsTableTransferConflict<TData, TGroup>,
) => CominsTableTransferConflictPolicy | undefined;

export type CominsTableTransferIntent<TData, TGroup> =
  | {
      kind: "row";
      row: TData;
      sourceRowId: CominsRowId;
      sourceTableId: string;
      targetGroupId?: CominsRowId;
      targetRowId?: CominsRowId;
      targetTableId: string;
    }
  | {
      group: TGroup;
      kind: "group";
      rows: readonly TData[];
      sourceGroupId: CominsRowId;
      sourceTableId: string;
      targetGroupId?: CominsRowId;
      targetTableId: string;
    };

declare const cominsTableTransferCoordinatorBrand: unique symbol;

export type CominsTableTransferCoordinator<TData, TGroup = never> = {
  readonly [cominsTableTransferCoordinatorBrand]: (
    data: TData,
    group: TGroup,
  ) => [TData, TGroup];
};

export type CominsTableTransferCoordinatorOptions<TData, TGroup = never> = {
  onTransfer: (result: CominsTableTransferResult<TData, TGroup>) => void;
};

export type CominsTableTransferConfig<TData, TGroup = never> = {
  canTransfer?: (intent: CominsTableTransferIntent<TData, TGroup>) => boolean;
  coordinator: CominsTableTransferCoordinator<TData, TGroup>;
  resolveConflict?: CominsTableTransferConflictResolver<TData, TGroup>;
  scope: string;
  tableId: string;
};

export type CominsTableTransferEndpoint<TData, TGroup = never> = {
  data: readonly TData[];
  getGroupId?: (group: TGroup) => CominsRowId;
  getRowGroupId?: (row: TData, dataIndex: number) => CominsRowId;
  getRowId: (row: TData, dataIndex: number) => CominsRowId;
  groups?: readonly TGroup[];
  setRowGroupId?: (params: {
    fromGroupId: CominsRowId;
    row: TData;
    rowId: CominsRowId;
    toGroupId: CominsRowId;
  }) => TData;
  tableId: string;
};

type CominsTableTransferNextEndpoint<TData, TGroup> = {
  data: TData[];
  groups?: TGroup[];
  tableId: string;
};

export type CominsTableRowTransferDetails<TData, TGroup> = {
  conflicts: readonly CominsTableTransferResolvedConflict<TData, TGroup>[];
  kind: "row";
  sourceRowId: CominsRowId;
  targetGroupId?: CominsRowId;
  targetRowId?: CominsRowId;
};

export type CominsTableGroupTransferDetails<TData, TGroup> = {
  conflicts: readonly CominsTableTransferResolvedConflict<TData, TGroup>[];
  kind: "group";
  position: CominsTableTransferDropPosition;
  sourceGroupId: CominsRowId;
  targetGroupId?: CominsRowId;
};

export type CominsTableTransferDetails<TData, TGroup> =
  | CominsTableGroupTransferDetails<TData, TGroup>
  | CominsTableRowTransferDetails<TData, TGroup>;

export type CominsTableTransferResult<TData, TGroup = never> = {
  details: CominsTableTransferDetails<TData, TGroup>;
  kind: "group" | "row";
  source: CominsTableTransferNextEndpoint<TData, TGroup>;
  target: CominsTableTransferNextEndpoint<TData, TGroup>;
};

export type CominsRowBetweenTablesInput<TData, TGroup = never> = {
  resolveConflict?: CominsTableTransferConflictResolver<TData, TGroup>;
  source: CominsTableTransferEndpoint<TData, TGroup>;
  sourceRowId: CominsRowId;
  target: CominsTableTransferEndpoint<TData, TGroup>;
  targetGroupId?: CominsRowId;
  targetRowId?: CominsRowId;
};

export type CominsGroupBetweenTablesInput<TData, TGroup> = {
  position?: CominsTableTransferDropPosition;
  resolveConflict?: CominsTableTransferConflictResolver<TData, TGroup>;
  source: CominsTableTransferEndpoint<TData, TGroup>;
  sourceGroupId: CominsRowId;
  target: CominsTableTransferEndpoint<TData, TGroup>;
  targetGroupId?: CominsRowId;
};

export type CominsTableTransferRegistrationSnapshot<TData, TGroup> = {
  config: CominsTableTransferConfig<TData, TGroup>;
  endpoint: CominsTableTransferEndpoint<TData, TGroup>;
  instanceId: string;
  root: HTMLElement | null;
  viewport: HTMLElement | null;
};

export type CominsTableTransferRegistration<TData, TGroup> = {
  getSnapshot: () => CominsTableTransferRegistrationSnapshot<TData, TGroup> | null;
};

type CominsTableTransferCoordinatorState<TData, TGroup> = {
  options: CominsTableTransferCoordinatorOptions<TData, TGroup>;
  registrations: Map<
    string,
    Map<string, Set<CominsTableTransferRegistration<TData, TGroup>>>
  >;
};

const coordinatorStates = new WeakMap<
  object,
  CominsTableTransferCoordinatorState<unknown, unknown>
>();

function getCoordinatorState<TData, TGroup>(
  coordinator: CominsTableTransferCoordinator<TData, TGroup>,
) {
  return coordinatorStates.get(coordinator) as
    | CominsTableTransferCoordinatorState<TData, TGroup>
    | undefined;
}

export function createCominsTableTransferCoordinator<TData, TGroup = never>(
  options: CominsTableTransferCoordinatorOptions<TData, TGroup>,
): CominsTableTransferCoordinator<TData, TGroup> {
  const coordinator = Object.freeze({}) as CominsTableTransferCoordinator<TData, TGroup>;

  coordinatorStates.set(
    coordinator,
    {
      options,
      registrations: new Map(),
    } as CominsTableTransferCoordinatorState<unknown, unknown>,
  );

  return coordinator;
}

export function isCominsTableTransferCoordinator<TData, TGroup>(
  coordinator: unknown,
): coordinator is CominsTableTransferCoordinator<TData, TGroup> {
  return typeof coordinator === "object" && coordinator !== null && coordinatorStates.has(coordinator);
}

export function registerCominsTableTransfer<TData, TGroup>(
  coordinator: CominsTableTransferCoordinator<TData, TGroup>,
  scope: string,
  tableId: string,
  registration: CominsTableTransferRegistration<TData, TGroup>,
) {
  const state = getCoordinatorState(coordinator);

  if (!state) {
    return () => undefined;
  }

  let scopeRegistrations = state.registrations.get(scope);

  if (!scopeRegistrations) {
    scopeRegistrations = new Map();
    state.registrations.set(scope, scopeRegistrations);
  }

  let tableRegistrations = scopeRegistrations.get(tableId);

  if (!tableRegistrations) {
    tableRegistrations = new Set();
    scopeRegistrations.set(tableId, tableRegistrations);
  }

  tableRegistrations.add(registration);

  return () => {
    tableRegistrations.delete(registration);

    if (tableRegistrations.size === 0) {
      scopeRegistrations.delete(tableId);
    }

    if (scopeRegistrations.size === 0) {
      state.registrations.delete(scope);
    }
  };
}

export function getCominsTableTransferRegistration<TData, TGroup>(
  coordinator: CominsTableTransferCoordinator<TData, TGroup>,
  scope: string,
  tableId: string,
) {
  const registrations = getCoordinatorState(coordinator)
    ?.registrations.get(scope)
    ?.get(tableId);

  if (!registrations || registrations.size !== 1) {
    return null;
  }

  return [...registrations][0] ?? null;
}

export function emitCominsTableTransfer<TData, TGroup>(
  coordinator: CominsTableTransferCoordinator<TData, TGroup>,
  result: CominsTableTransferResult<TData, TGroup>,
) {
  const state = getCoordinatorState(coordinator);

  if (!state) {
    return false;
  }

  state.options.onTransfer(result);
  return true;
}

function findRowIndex<TData, TGroup>(
  endpoint: Pick<CominsTableTransferEndpoint<TData, TGroup>, "data" | "getRowId">,
  rowId: CominsRowId,
) {
  return endpoint.data.findIndex((row, index) => endpoint.getRowId(row, index) === rowId);
}

function isGroupedEndpoint<TData, TGroup>(
  endpoint: CominsTableTransferEndpoint<TData, TGroup>,
): endpoint is CominsTableTransferEndpoint<TData, TGroup> & {
  getGroupId: (group: TGroup) => CominsRowId;
  getRowGroupId: (row: TData, dataIndex: number) => CominsRowId;
  groups: readonly TGroup[];
} {
  return (
    Array.isArray(endpoint.groups) &&
    typeof endpoint.getGroupId === "function" &&
    typeof endpoint.getRowGroupId === "function"
  );
}

function getRowEndpoint<TData, TGroup>(
  endpoint: CominsTableTransferEndpoint<TData, TGroup>,
  dataIndex: number,
): CominsTableTransferRowEndpoint<TData> | null {
  const row = endpoint.data[dataIndex];

  if (row === undefined) {
    return null;
  }

  return {
    dataIndex,
    row,
    rowId: endpoint.getRowId(row, dataIndex),
    tableId: endpoint.tableId,
  };
}

function getGroupEndpoint<TData, TGroup>(
  endpoint: CominsTableTransferEndpoint<TData, TGroup> & {
    getGroupId: (group: TGroup) => CominsRowId;
    getRowGroupId: (row: TData, dataIndex: number) => CominsRowId;
    groups: readonly TGroup[];
  },
  groupIndex: number,
): CominsTableTransferGroupEndpoint<TData, TGroup> | null {
  const group = endpoint.groups[groupIndex];

  if (group === undefined) {
    return null;
  }

  const groupId = endpoint.getGroupId(group);
  const rows = endpoint.data.flatMap((row, dataIndex) =>
    endpoint.getRowGroupId(row, dataIndex) === groupId
      ? [{ dataIndex, row, rowId: endpoint.getRowId(row, dataIndex), tableId: endpoint.tableId }]
      : [],
  );

  return { group, groupId, groupIndex, rows, tableId: endpoint.tableId };
}

function resolveConflict<TData, TGroup>(
  conflict: CominsTableTransferConflict<TData, TGroup>,
  resolver: CominsTableTransferConflictResolver<TData, TGroup> | undefined,
) {
  return resolver?.(conflict) === "overwrite" ? "overwrite" : "reject";
}

function copyGroups<TGroup>(groups: readonly TGroup[] | undefined) {
  return groups === undefined ? undefined : [...groups];
}

export function transferCominsRowBetweenTables<TData, TGroup = never>(
  input: CominsRowBetweenTablesInput<TData, TGroup>,
): CominsTableTransferResult<TData, TGroup> | null {
  if (input.source.tableId === input.target.tableId) {
    return null;
  }

  const sourceGrouped = isGroupedEndpoint(input.source) ? input.source : null;
  const targetGrouped = isGroupedEndpoint(input.target) ? input.target : null;

  if ((sourceGrouped === null) !== (targetGrouped === null)) {
    return null;
  }

  const sourceIndex = findRowIndex(input.source, input.sourceRowId);
  const sourceRowEndpoint = getRowEndpoint(input.source, sourceIndex);

  if (!sourceRowEndpoint) {
    return null;
  }

  const targetRowIndex = input.targetRowId === undefined
    ? -1
    : findRowIndex(input.target, input.targetRowId);

  if (input.targetRowId !== undefined && targetRowIndex < 0) {
    return null;
  }

  let movedRow = sourceRowEndpoint.row;

  if (sourceGrouped && targetGrouped) {
    const targetGroupId = input.targetGroupId;
    const targetGroupExists = targetGroupId !== undefined && targetGrouped.groups.some(
      (group) => targetGrouped.getGroupId(group) === targetGroupId,
    );

    if (!targetGroupExists) {
      return null;
    }

    if (
      targetRowIndex >= 0 &&
      targetGrouped.getRowGroupId(targetGrouped.data[targetRowIndex]!, targetRowIndex) !== targetGroupId
    ) {
      return null;
    }

    const sourceGroupId = sourceGrouped.getRowGroupId(sourceRowEndpoint.row, sourceIndex);

    if (sourceGroupId !== targetGroupId) {
      if (typeof input.target.setRowGroupId !== "function") {
        return null;
      }

      movedRow = input.target.setRowGroupId({
        fromGroupId: sourceGroupId,
        row: sourceRowEndpoint.row,
        rowId: sourceRowEndpoint.rowId,
        toGroupId: targetGroupId!,
      });
    }
  } else if (input.targetGroupId !== undefined) {
    return null;
  }

  const targetData = [...input.target.data];
  const conflicts: CominsTableTransferResolvedConflict<TData, TGroup>[] = [];
  const duplicateIndex = findRowIndex(input.target, sourceRowEndpoint.rowId);
  let normalizedTargetRowIndex = targetRowIndex;

  if (duplicateIndex >= 0) {
    const targetRowEndpoint = getRowEndpoint(input.target, duplicateIndex);

    if (!targetRowEndpoint) {
      return null;
    }

    const conflict: CominsTableTransferConflict<TData, TGroup> = {
      kind: "row",
      rowId: sourceRowEndpoint.rowId,
      source: sourceRowEndpoint,
      target: targetRowEndpoint,
    };
    const policy = resolveConflict(conflict, input.resolveConflict);

    if (policy === "reject") {
      return null;
    }

    conflicts.push({ conflict, policy });
    targetData.splice(duplicateIndex, 1);

    if (normalizedTargetRowIndex > duplicateIndex) {
      normalizedTargetRowIndex -= 1;
    } else if (input.targetRowId === sourceRowEndpoint.rowId) {
      normalizedTargetRowIndex = duplicateIndex;
    }
  }

  let insertIndex: number;

  if (normalizedTargetRowIndex >= 0) {
    insertIndex = normalizedTargetRowIndex;
  } else if (targetGrouped && input.targetGroupId !== undefined) {
    let lastGroupIndex = -1;

    for (let index = 0; index < targetData.length; index += 1) {
      if (targetGrouped.getRowGroupId(targetData[index]!, index) === input.targetGroupId) {
        lastGroupIndex = index;
      }
    }

    insertIndex = lastGroupIndex < 0 ? targetData.length : lastGroupIndex + 1;
  } else {
    insertIndex = targetData.length;
  }

  if (input.target.getRowId(movedRow, insertIndex) !== sourceRowEndpoint.rowId) {
    return null;
  }

  targetData.splice(Math.max(0, Math.min(insertIndex, targetData.length)), 0, movedRow);

  return {
    details: {
      conflicts,
      kind: "row",
      sourceRowId: sourceRowEndpoint.rowId,
      targetGroupId: input.targetGroupId,
      targetRowId: input.targetRowId,
    },
    kind: "row",
    source: {
      data: input.source.data.filter((_row, index) => index !== sourceIndex),
      groups: copyGroups(input.source.groups),
      tableId: input.source.tableId,
    },
    target: {
      data: targetData,
      groups: copyGroups(input.target.groups),
      tableId: input.target.tableId,
    },
  };
}

export function transferCominsGroupBetweenTables<TData, TGroup>(
  input: CominsGroupBetweenTablesInput<TData, TGroup>,
): CominsTableTransferResult<TData, TGroup> | null {
  const source = isGroupedEndpoint(input.source) ? input.source : null;
  const target = isGroupedEndpoint(input.target) ? input.target : null;

  if (input.source.tableId === input.target.tableId || !source || !target) {
    return null;
  }

  const sourceGroupIndex = source.groups.findIndex(
    (group) => source.getGroupId(group) === input.sourceGroupId,
  );
  const sourceGroupEndpoint = getGroupEndpoint(source, sourceGroupIndex);

  if (
    !sourceGroupEndpoint ||
    target.getGroupId(sourceGroupEndpoint.group) !== sourceGroupEndpoint.groupId
  ) {
    return null;
  }

  const targetGroups = [...target.groups];
  let targetData = [...target.data];
  const conflicts: CominsTableTransferResolvedConflict<TData, TGroup>[] = [];
  const duplicateGroupIndex = targetGroups.findIndex(
    (group) => target.getGroupId(group) === sourceGroupEndpoint.groupId,
  );
  let overwriteDataInsertIndex: number | null = null;
  let overwriteGroupInsertIndex: number | null = null;

  if (duplicateGroupIndex >= 0) {
    const targetGroupEndpoint = getGroupEndpoint(target, duplicateGroupIndex);

    if (!targetGroupEndpoint) {
      return null;
    }

    const conflict: CominsTableTransferConflict<TData, TGroup> = {
      groupId: sourceGroupEndpoint.groupId,
      kind: "group",
      source: sourceGroupEndpoint,
      target: targetGroupEndpoint,
    };
    const policy = resolveConflict(conflict, input.resolveConflict);

    if (policy === "reject") {
      return null;
    }

    conflicts.push({ conflict, policy });
    const targetMemberIndexes = new Set(targetGroupEndpoint.rows.map((row) => row.dataIndex));
    const firstMemberIndex = targetGroupEndpoint.rows[0]?.dataIndex;

    if (firstMemberIndex !== undefined) {
      overwriteDataInsertIndex = target.data
        .slice(0, firstMemberIndex)
        .filter((_row, index) => !targetMemberIndexes.has(index)).length;
    }

    targetData = targetData.filter((_row, index) => !targetMemberIndexes.has(index));
    targetGroups.splice(duplicateGroupIndex, 1);
    overwriteGroupInsertIndex = duplicateGroupIndex;
  }

  const sourceRowIds = new Set(sourceGroupEndpoint.rows.map((row) => row.rowId));
  const duplicateRows = targetData.flatMap((row, dataIndex) => {
    const rowId = target.getRowId(row, dataIndex);
    return sourceRowIds.has(rowId) ? [{ dataIndex, row, rowId }] : [];
  });

  for (const duplicate of duplicateRows) {
    const sourceRowEndpoint = sourceGroupEndpoint.rows.find((row) => row.rowId === duplicate.rowId)!;
    const targetRowEndpoint: CominsTableTransferRowEndpoint<TData> = {
      ...duplicate,
      tableId: input.target.tableId,
    };
    const conflict: CominsTableTransferConflict<TData, TGroup> = {
      kind: "row",
      rowId: duplicate.rowId,
      source: sourceRowEndpoint,
      target: targetRowEndpoint,
    };
    const policy = resolveConflict(conflict, input.resolveConflict);

    if (policy === "reject") {
      return null;
    }

    conflicts.push({ conflict, policy });
  }

  if (duplicateRows.length > 0) {
    const duplicateRowIds = new Set(duplicateRows.map((row) => row.rowId));

    if (overwriteDataInsertIndex !== null) {
      overwriteDataInsertIndex -= duplicateRows.filter(
        (row) => row.dataIndex < overwriteDataInsertIndex!,
      ).length;
    }

    targetData = targetData.filter(
      (row, dataIndex) => !duplicateRowIds.has(target.getRowId(row, dataIndex)),
    );
  }

  const position = input.position ?? (input.targetGroupId === undefined ? "append" : "before");
  let groupInsertIndex: number;

  if (input.targetGroupId === sourceGroupEndpoint.groupId && overwriteGroupInsertIndex !== null) {
    groupInsertIndex = Math.min(overwriteGroupInsertIndex, targetGroups.length);
  } else if (input.targetGroupId === undefined || position === "append") {
    groupInsertIndex = targetGroups.length;
  } else {
    const targetGroupIndex = targetGroups.findIndex(
      (group) => target.getGroupId(group) === input.targetGroupId,
    );

    if (targetGroupIndex < 0) {
      return null;
    }

    groupInsertIndex = position === "after" ? targetGroupIndex + 1 : targetGroupIndex;
  }

  targetGroups.splice(groupInsertIndex, 0, sourceGroupEndpoint.group);
  const memberRows = sourceGroupEndpoint.rows.map((row) => row.row);
  const dataInsertIndex = overwriteDataInsertIndex === null
    ? targetData.length
    : Math.min(overwriteDataInsertIndex, targetData.length);
  targetData.splice(dataInsertIndex, 0, ...memberRows);
  const sourceMemberIndexes = new Set(sourceGroupEndpoint.rows.map((row) => row.dataIndex));

  return {
    details: {
      conflicts,
      kind: "group",
      position,
      sourceGroupId: sourceGroupEndpoint.groupId,
      targetGroupId: input.targetGroupId,
    },
    kind: "group",
    source: {
      data: source.data.filter((_row, index) => !sourceMemberIndexes.has(index)),
      groups: source.groups.filter((_group, index) => index !== sourceGroupIndex),
      tableId: input.source.tableId,
    },
    target: {
      data: targetData,
      groups: targetGroups,
      tableId: input.target.tableId,
    },
  };
}
