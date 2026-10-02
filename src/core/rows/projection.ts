import type { CominsPaginationState, CominsRowId, CominsSortModel, CominsTableColumn } from "../model";
import type { CominsGroupingProjectionEntry, projectCominsGroups } from "./grouping";
import { sortCominsTreeSiblings, type CominsTreeNode } from "../../tree";

type Source<TData> = { rows: readonly TData[]; rowIds: readonly CominsRowId[] };
export type CoreDataEntry<TData> = {
  kind: "data"; key: string; row: TData; rowId: CominsRowId; dataIndex: number;
  visibleLeafIndex: number; absoluteIndex?: number;
};
export type CoreProjectionEntry<TData> = CoreDataEntry<TData>
  | Extract<CominsGroupingProjectionEntry, { kind: "group" }>
  | { kind: "placeholder"; key: string; absoluteIndex: number };
export type CoreProjectionInput<TData, TGroup = unknown> = Source<TData> & (
  | { mode: "flat"; dataIndexes: number[]; pagination?: CominsPaginationState; virtualized?: boolean }
  | { mode: "tree"; dataIndexes: number[] }
  | { mode: "grouped"; projection: ReturnType<typeof projectCominsGroups<TGroup>> }
  | { mode: "viewport"; dataIndexes: number[]; absoluteIndexById: ReadonlyMap<CominsRowId, number>; rowCount: number; range?: { startIndex: number; endIndex: number } }
);
export type CoreProjection<TData> = {
  entries: CoreProjectionEntry<TData>[];
  dataIndexes: number[];
  visibleRowIds: CominsRowId[];
  pageDataIndexes: number[];
  pageStartIndex: number;
};

export function getCorePageProjection(visibleRowCount: number, pagination: CominsPaginationState) {
  const pageSize = Math.max(1, pagination.pageSize);
  const maxPageIndex = Math.max(0, Math.ceil(visibleRowCount / pageSize) - 1);
  const effectivePageIndex = Math.min(Math.max(0, pagination.pageIndex), maxPageIndex);
  return { pageSize, maxPageIndex, effectivePageIndex, pageStartIndex: effectivePageIndex * pageSize };
}

export function projectCoreViewportWindow<TEntry extends { kind: "data"; absoluteIndex?: number }>(loaded: readonly TEntry[], range: { startIndex: number; endIndex: number }, rowCount: number) {
  const byIndex = new Map(loaded.flatMap(entry => entry.absoluteIndex === undefined ? [] : [[entry.absoluteIndex, entry] as const]));
  const entries: Array<TEntry | { kind: "placeholder"; key: string; absoluteIndex: number }> = [];
  for (let index = range.startIndex; index < Math.min(rowCount, range.endIndex); index++) {
    entries.push(byIndex.get(index) ?? { kind: "placeholder", key: `viewport:${index}`, absoluteIndex: index });
  }
  return entries;
}

/** Inputs are prepared by the separately memoized filter/sort/group phases. */
export function projectCoreRows<TData, TGroup = unknown>(input: CoreProjectionInput<TData, TGroup>): CoreProjection<TData> {
  const dataIndexes = input.mode === "grouped"
    ? input.projection.entries.flatMap(entry => entry.kind === "data" ? [entry.dataIndex] : [])
    : input.dataIndexes;
  const sourceEntries: readonly CominsGroupingProjectionEntry[] = input.mode === "grouped" ? input.projection.entries
    : dataIndexes.flatMap((dataIndex, visibleLeafIndex) => {
        const rowId = input.rowIds[dataIndex];
        return rowId === undefined ? [] : [{ kind: "data" as const, key: `data:${typeof rowId}:${encodeURIComponent(String(rowId))}`, rowId, dataIndex, visibleLeafIndex }];
      });
  const loaded = sourceEntries.flatMap<CoreProjectionEntry<TData>>(entry => {
    if (entry.kind === "group") return [entry];
    const row = input.rows[entry.dataIndex];
    if (row === undefined) return [];
    if (input.mode === "viewport") {
      const absoluteIndex = input.absoluteIndexById.get(entry.rowId);
      return absoluteIndex === undefined ? [] : [{ ...entry, row, absoluteIndex }];
    }
    return [{ ...entry, row }];
  });
  let entries = loaded;
  if (input.mode === "viewport" && input.range) {
    entries = projectCoreViewportWindow(loaded.filter((entry): entry is CoreDataEntry<TData> => entry.kind === "data"), input.range, input.rowCount);
  }
  const page = input.mode === "flat" && input.pagination ? getCorePageProjection(dataIndexes.length, input.pagination) : { pageStartIndex: 0, pageSize: dataIndexes.length };
  return { entries, dataIndexes,
    visibleRowIds: entries.flatMap(entry => entry.kind === "data" ? [entry.rowId] : []),
    pageStartIndex: page.pageStartIndex,
    pageDataIndexes: input.mode === "flat" && !input.virtualized ? dataIndexes.slice(page.pageStartIndex, page.pageStartIndex + page.pageSize) : dataIndexes,
  };
}

function getTreeNestedFieldValue(row: unknown, field: string): unknown {
  return field.split(".").reduce<unknown>((value, key) => value == null || typeof value !== "object" ? undefined : (value as Record<string, unknown>)[key], row);
}
function compareTreeValues(left: unknown, right: unknown) {
  return typeof left === "number" && typeof right === "number" ? left - right : String(left ?? "").localeCompare(String(right ?? ""));
}
export function getSortedCoreTree<TData>(data: readonly CominsTreeNode<TData>[], columns: readonly CominsTableColumn<TData>[], sortModel: CominsSortModel) {
  if (sortModel.length === 0) return data;
  return sortCominsTreeSiblings(data, (leftRow, rightRow) => {
    for (const rule of sortModel) {
      const column = columns.find(candidate => (candidate.id ?? candidate.field) === rule.columnId);
      if (!column?.sort) continue;
      const leftValue = getTreeNestedFieldValue(leftRow, column.field);
      const rightValue = getTreeNestedFieldValue(rightRow, column.field);
      const result = typeof column.sort === "function" ? column.sort(leftValue, rightValue, leftRow, rightRow) : compareTreeValues(leftValue, rightValue);
      if (result !== 0) return rule.direction === "desc" ? result * -1 : result;
    }
    return 0;
  });
}
