import type { CominsTableColumn } from "../react-types";
import type { CominsSortModel } from "../model";
import type { CominsTreeNode } from "../tree";
import { getSortedCoreTree } from "../core/rows/projection";
import { projectReactColumn } from "./model";

export { projectCoreRows as projectReactRows, projectCoreViewportWindow, getCorePageProjection } from "../core/rows/projection";

export function getSortedReactTree<TData>(data: readonly CominsTreeNode<TData>[], columns: readonly CominsTableColumn<TData>[], sortModel: CominsSortModel) {
  if (sortModel.length === 0) return data;
  // Bind comparator receivers to the original definitions, including columns without an explicit id.
  return getSortedCoreTree(data, columns.map(column => ({
    ...projectReactColumn({ ...column, id: column.id ?? column.field }),
    sort: typeof column.sort === "function" ? (left, right, leftRow, rightRow) => {
      const compare = column.sort;
      return typeof compare === "function" ? compare.call(column, left, right, leftRow, rightRow) : 0;
    } : column.sort,
  })), sortModel);
}
