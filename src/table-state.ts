import type { CominsRowId, CominsSelectionState, CominsSortModel, CominsSortState } from "./model";

type CominsSelectionSnapshot = {
  rowIds: readonly CominsRowId[];
  columns: readonly { id: string }[];
  selection: CominsSelectionState;
};

export function getNextSort(current: CominsSortState | null, columnId: string): CominsSortState | null {
  if (current?.columnId !== columnId) {
    return { columnId, direction: "asc" };
  }

  if (current.direction === "asc") {
    return { columnId, direction: "desc" };
  }

  return null;
}
export function getNextSortModel(current: CominsSortModel, columnId: string, additive: boolean): CominsSortState[] {
  const currentIndex = current.findIndex((rule) => rule.columnId === columnId);
  const currentRule = currentIndex < 0 ? null : current[currentIndex] ?? null;
  const nextRule = getNextSort(currentRule, columnId);

  if (!additive) {
    return nextRule ? [nextRule] : [];
  }

  if (!nextRule) {
    return current.filter((rule) => rule.columnId !== columnId);
  }

  if (currentIndex < 0) {
    return [...current, nextRule];
  }

  return current.map((rule, index) => (index === currentIndex ? nextRule : rule));
}

export function getSortRule(current: CominsSortModel, columnId: string) {
  const index = current.findIndex((rule) => rule.columnId === columnId);

  return index < 0 ? null : { priority: index + 1, rule: current[index]! };
}

export function getSortIndicatorState(current: CominsSortModel, columnId: string) {
  const currentRule = getSortRule(current, columnId)?.rule;

  if (!currentRule) {
    return "none";
  }

  return currentRule.direction;
}

export function getAriaSortState(current: CominsSortModel, columnId: string) {
  const currentRule = getSortRule(current, columnId);

  if (!currentRule) {
    return current.length > 1 ? undefined : "none";
  }

  if (currentRule.priority > 1) {
    return undefined;
  }

  return currentRule.rule.direction === "asc" ? "ascending" : "descending";
}

export function areSortStatesEqual(left: CominsSortState | null, right: CominsSortState | null) {
  if (!left || !right) {
    return left === right;
  }

  return left.columnId === right.columnId && left.direction === right.direction;
}

export function areSortModelsEqual(left: CominsSortModel, right: CominsSortModel) {
  if (left.length !== right.length) {
    return false;
  }

  return left.every(
    (rule, index) => rule.columnId === right[index]?.columnId && rule.direction === right[index]?.direction,
  );
}

export function areRowIdSequencesEqual(left: readonly CominsRowId[], right: readonly CominsRowId[]) {
  return left.length === right.length && left.every((id, index) => id === right[index]);
}

export function insertDeclaredColumnsIntoOrder(
  order: readonly string[],
  declaredOrder: readonly string[],
) {
  const next = [...order];

  for (let declaredIndex = 0; declaredIndex < declaredOrder.length; declaredIndex += 1) {
    const columnId = declaredOrder[declaredIndex];

    if (columnId === undefined || next.includes(columnId)) {
      continue;
    }

    const followingColumnId = declaredOrder
      .slice(declaredIndex + 1)
      .find((candidate) => next.includes(candidate));

    if (followingColumnId !== undefined) {
      next.splice(next.indexOf(followingColumnId), 0, columnId);
      continue;
    }

    const precedingColumnId = [...declaredOrder.slice(0, declaredIndex)]
      .reverse()
      .find((candidate) => next.includes(candidate));

    if (precedingColumnId === undefined) {
      next.push(columnId);
    } else {
      next.splice(next.lastIndexOf(precedingColumnId) + 1, 0, columnId);
    }
  }

  return next;
}

export function reconcileColumnOrderHistory(
  history: readonly string[],
  currentOrder: readonly string[],
  declaredOrder: readonly string[],
) {
  const merged = insertDeclaredColumnsIntoOrder(history, declaredOrder);
  const currentIds = new Set(currentOrder);
  let currentIndex = 0;

  return merged.map((columnId) => {
    if (!currentIds.has(columnId)) {
      return columnId;
    }

    const currentColumnId = currentOrder[currentIndex];
    currentIndex += 1;
    return currentColumnId ?? columnId;
  });
}

export function canPreserveSelection(
  current: CominsSelectionSnapshot,
  next: Pick<CominsSelectionSnapshot, "rowIds" | "columns">,
) {
  if (!areRowIdSequencesEqual(current.rowIds, next.rowIds)) {
    return false;
  }

  const nextColumnIds = new Set(next.columns.map((column) => column.id));
  const selectedCell = current.selection.cell;
  const selectedCells = current.selection.cells ?? [];
  const selectedRange = current.selection.range;

  if (selectedCell && !nextColumnIds.has(selectedCell.columnId)) {
    return false;
  }

  if (selectedCells.some((cell) => !nextColumnIds.has(cell.columnId))) {
    return false;
  }

  if (
    selectedRange &&
    (!nextColumnIds.has(selectedRange.anchor.columnId) || !nextColumnIds.has(selectedRange.focus.columnId))
  ) {
    return false;
  }

  return true;
}
