import type { CominsTableColumn, CominsTableState } from "../../src/core/model";
import { createCominsTableState, setCominsSortModel } from "../../src/core/state/table";
import { copyCominsCell, pasteCominsCell, isCominsCellDisabled } from "../../src/core/editing/cells";
import { copyCominsRow, pasteCominsRow, copyCominsCellRange, pasteCominsCellRange, pasteCominsText, fillCominsCellRange } from "../../src/core/editing/clipboard";
import { exportCominsRowsToCsv, exportCominsRowsToJson } from "../../src/core/editing/export";
type Row = { id: string; score: number };
const numeric: CominsTableColumn<Row, number> = { field: "score", label: "Score", cell: {
  parseClipboard: payload => Number(payload.text) + payload.value,
  disabled: payload => payload.row.data.score < 0,
} };
const state: CominsTableState<Row> = createCominsTableState({ rows: [{ id: "a", score: 2 }], columns: [{ field: "score", label: "Score", sort: true }] });
const next: CominsTableState<Row> = setCominsSortModel(state, [{ columnId: "score", direction: "asc" }]);
// @ts-expect-error Core labels are text, not renderer objects.
const badLabel: CominsTableColumn<Row> = { field: "score", label: { type: "span" } };
// @ts-expect-error DOM event props belong to the React cell contract.
const badProps: CominsTableColumn<Row> = { field: "score", label: "Score", cell: { props: { onClick() {} } } };
void [numeric, next, badLabel, badProps];
const address = { rowId: "a", columnId: "score" };
const copied = copyCominsCell(state, address);
const pasted: CominsTableState<Row> = pasteCominsCell(state, address, copied);
const textResult: CominsTableState<Row> = pasteCominsText(pasted, address, "3");
const filled: CominsTableState<Row> = fillCominsCellRange(textResult, { source: address, target: { anchor: address, focus: address } });
const rowCopy = copyCominsRow(filled, "a");
const rowResult: CominsTableState<Row> = pasteCominsRow(filled, rowCopy, { mode: "append", getNewRowId: () => "b" });
const rangeResult: CominsTableState<Row> = pasteCominsCellRange(rowResult, address, copyCominsCellRange(rowResult));
const options = { rows: rangeResult.rows, columns: [{ id: "score", value: (row: Row) => row.score }] };
void [isCominsCellDisabled(state, state.rows[0]!, "a", state.columns[0]!), exportCominsRowsToCsv(options), exportCominsRowsToJson(options)];
