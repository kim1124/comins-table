import type { CominsColumnRuntimeState, CominsColumnGroupRuntimeState } from "./model";

// Minimal inputs keep layout calculations independent of renderers and table state.
export type CominsWidthColumn = {
  id: string;
  width?: number;
  minWidth?: number;
  maxWidth?: number;
};
export type CominsColumnWidthState = {
  columns: CominsWidthColumn[];
  columnGroups: Array<{ id: string; children: string[] }>;
  columnState: Record<string, CominsColumnRuntimeState>;
  columnGroupState: Record<string, CominsColumnGroupRuntimeState>;
};
const COMINS_MIN_COLUMN_WIDTH = 88;

export function setColumnWidth<TState extends Pick<CominsColumnWidthState, "columnState">>(
  state: TState,
  columnId: string,
  width: number,
): TState {
  return {
    ...state,
    columnState: {
      ...state.columnState,
      [columnId]: { ...state.columnState[columnId], width },
    },
  };
}

export function getEffectiveColumnMinWidth(column: CominsWidthColumn) {
  return Math.max(COMINS_MIN_COLUMN_WIDTH, column.minWidth ?? COMINS_MIN_COLUMN_WIDTH);
}

export function getEffectiveColumnMaxWidth(column: CominsWidthColumn) {
  return column.maxWidth ?? Number.POSITIVE_INFINITY;
}

export function getRuntimeColumnWidth(
  state: CominsColumnWidthState,
  column: CominsWidthColumn,
) {
  return state.columnState[column.id]?.width ?? column.width ?? 100;
}

export function clampColumnWidth(width: number, minWidth: number, maxWidth: number) {
  return Math.min(maxWidth, Math.max(minWidth, width));
}

export function distributeRuntimeColumnWidths(
  state: CominsColumnWidthState,
  columns: Array<CominsWidthColumn>,
  targetWidth: number,
) {
  const widths = columns.map((column) =>
    clampColumnWidth(getRuntimeColumnWidth(state, column), getEffectiveColumnMinWidth(column), getEffectiveColumnMaxWidth(column)),
  );
  const active = new Set(columns.map((_column, index) => index));
  const minWidths = columns.map(getEffectiveColumnMinWidth);
  const maxWidths = columns.map(getEffectiveColumnMaxWidth);
  const boundedTargetWidth = clampColumnWidth(
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
      const clampedWidth = clampColumnWidth(nextWidth, minWidths[index] ?? 0, maxWidths[index] ?? Number.POSITIVE_INFINITY);

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

export function setColumnWidthInsideParentGroup<TState extends CominsColumnWidthState>(
  state: TState,
  columnId: string,
  width: number,
) {
  const group = state.columnGroups.find((candidate) => candidate.children.includes(columnId));

  if (!group || state.columnGroupState[group.id]?.hidden === true) {
    return setColumnWidth(state, columnId, width);
  }

  const childColumns = group.children
    .map((childId) => state.columns.find((column) => column.id === childId))
    .filter((column): column is CominsWidthColumn => Boolean(column))
    .filter((column) => state.columnState[column.id]?.hidden !== true);
  const targetColumn = childColumns.find((column) => column.id === columnId);

  if (!targetColumn) {
    return setColumnWidth(state, columnId, width);
  }

  const siblingColumns = childColumns.filter((column) => column.id !== columnId);

  if (siblingColumns.length === 0) {
    const currentGroupWidth = getRuntimeColumnWidth(state, targetColumn);

    return setColumnWidth(
      state,
      columnId,
      clampColumnWidth(width, getEffectiveColumnMinWidth(targetColumn), Math.min(getEffectiveColumnMaxWidth(targetColumn), currentGroupWidth)),
    );
  }

  const currentGroupWidth = childColumns.reduce((sum, column) => sum + getRuntimeColumnWidth(state, column), 0);
  const siblingMinWidth = siblingColumns.reduce((sum, column) => sum + getEffectiveColumnMinWidth(column), 0);
  const siblingMaxWidth = siblingColumns.reduce((sum, column) => sum + getEffectiveColumnMaxWidth(column), 0);
  const minWidth = Math.max(getEffectiveColumnMinWidth(targetColumn), currentGroupWidth - siblingMaxWidth);
  const maxWidth = Math.max(minWidth, Math.min(getEffectiveColumnMaxWidth(targetColumn), currentGroupWidth - siblingMinWidth));
  const nextTargetWidth = clampColumnWidth(width, minWidth, maxWidth);
  const nextSiblingWidths = distributeRuntimeColumnWidths(state, siblingColumns, currentGroupWidth - nextTargetWidth);
  let next = setColumnWidth(state, columnId, nextTargetWidth);

  siblingColumns.forEach((column, index) => {
    next = setColumnWidth(next, column.id, nextSiblingWidths[index] ?? getRuntimeColumnWidth(next, column));
  });

  return next;
}
