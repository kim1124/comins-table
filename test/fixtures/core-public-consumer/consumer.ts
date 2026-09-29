import {
  createCominsTableState, queryCominsRows, setCominsSortModel,
  type CominsTableState,
} from "comins-table/core";

type Row = { id: string; score: number };
const rows: Row[] = [{ id: "a", score: 20 }, { id: "b", score: 10 }];
const state: CominsTableState<Row> = createCominsTableState<Row>({
  rows, columns: [{ field: "score", label: "Score", sort: true }], getRowId: (row) => row.id,
});
const sorted: CominsTableState<Row> = setCominsSortModel(state, [{ columnId: "score", direction: "asc" }]);
const result: Row[] = queryCominsRows(sorted);
void result;
