import {
  createCominsTableState, queryCominsRows, setCominsSortModel,
  type CominsTableState,
  pasteCominsText, fillCominsCellRange, isCominsCellDisabled,
  type CominsHeaderComponentPayload,
} from "comins-table/core";

type Row = { id: string; score: number };
const rows: Row[] = [{ id: "a", score: 20 }, { id: "b", score: 10 }];
const state: CominsTableState<Row> = createCominsTableState<Row>({
  rows, columns: [{ field: "score", label: "Score", sort: true, cell: {
    disabled: ({ row }) => row.data.score < 0,
    copyable: true, pasteable: ({ value }) => typeof value === "number",
    parseClipboard: ({ text, row }) => Number(text) + row.data.score * 0,
    validateFill: ({ value }) => typeof value === "number",
  } }], getRowId: (row) => row.id,
});
const sorted: CominsTableState<Row> = setCominsSortModel(state, [{ columnId: "score", direction: "asc" }]);
const result: Row[] = queryCominsRows(sorted);
void result;
const address = { rowId: "a", columnId: "score" };
const pasted: CominsTableState<Row> = pasteCominsText(state, address, "30");
const filled: CominsTableState<Row> = fillCominsCellRange(pasted, { source: address, target: { anchor: address, focus: { ...address, rowId: "b" } } });
const header: CominsHeaderComponentPayload<Row> = { column: { definition: state.columns[0]!, field: "score", id: "score", index: 0, label: "Score" }, layout: { hidden: false }, sort: { count: 0, direction: null, enabled: true, priority: null } };
const label: string = header.column.label;
void [filled, label, isCominsCellDisabled(state, rows[0]!, "a", state.columns[0]!)];
