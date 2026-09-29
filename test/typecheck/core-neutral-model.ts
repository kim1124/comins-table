import type { CominsTableColumn, CominsTableState } from "../../src/core/model";
import { createCominsTableState, setCominsSortModel } from "../../src/core/state/table";
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
