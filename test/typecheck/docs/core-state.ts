import {
  applyCominsColumnLayout,
  createCominsTableState,
  queryCominsRows,
  serializeCominsColumnLayout,
  setCominsPagination,
  setCominsSortModel,
  setCominsSortState,
} from "../../../src/core";

type Row = { age: number; id: string; role: string };

const state = createCominsTableState<Row>({
  columns: [
    { field: "role", label: "Role", sort: true },
    { field: "age", label: "Age", sort: true },
  ],
  getRowId: (row) => row.id,
  rows: [{ age: 31, id: "a", role: "Admin" }],
});

const sorted = setCominsSortModel(state, [
  { columnId: "role", direction: "asc" },
  { columnId: "age", direction: "desc" },
]);

setCominsSortState(sorted, null);
setCominsPagination(sorted, { pageIndex: 0, pageSize: 30 });
queryCominsRows(sorted);
applyCominsColumnLayout(sorted, serializeCominsColumnLayout(sorted));
