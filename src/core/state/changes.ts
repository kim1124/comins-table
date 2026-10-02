import type { CominsTableState } from "../model";
import { areSortModelsEqual, areSortStatesEqual } from "../../table-state";

type ChangeSnapshot<TData> = Pick<CominsTableState<TData>, "rows" | "selection" | "sort" | "sortModel">;

/** Read only the shared data fields, preserving adapter reference identities. */
export function getCoreStateChanges<TData>(current: ChangeSnapshot<TData>, next: ChangeSnapshot<TData>, options: { columnLayoutChanged?: boolean } = {}) {
  return {
    data: next.rows !== current.rows,
    selection: next.selection !== current.selection,
    columnLayout: options.columnLayoutChanged === true,
    sort: !areSortStatesEqual(next.sort, current.sort),
    sortModel: !areSortModelsEqual(next.sortModel, current.sortModel),
  };
}
