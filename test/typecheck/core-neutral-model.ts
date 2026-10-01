import type { CominsTableColumn, CominsTableState } from "../../src/core/model";
import { CominsHeightIndex, getCominsScrollScale } from "../../src/core/layout/virtual";
import { CominsViewportHeightIndex } from "../../src/core/layout/viewport";
import { resolveCominsRowHeight } from "../../src/core/layout/row-height";
void [CominsHeightIndex, CominsViewportHeightIndex, getCominsScrollScale, resolveCominsRowHeight];
import { resolveCoreFillTarget, resolveCoreTreeDropContext, planCoreSelectionCopy } from "../../src/core/selection/navigation";
void [resolveCoreFillTarget, resolveCoreTreeDropContext, planCoreSelectionCopy];
import { transferCominsRowBetweenTables } from "../../src/core/transfer/policy";
void transferCominsRowBetweenTables({ source: { tableId: "a", data: [{ id: 1 }], getRowId: row => row.id }, target: { tableId: "b", data: [], getRowId: row => row.id }, sourceRowId: 1 });
import type { CoreViewportRequest } from "../../src/core/viewport/data";
import { createCominsViewportData, reduceCominsViewportData } from "../../src/core/viewport/data";
import { planViewportRequests } from "../../src/core/viewport/requests";
const verifyViewportRequest = (request: CoreViewportRequest) => request.requestId;
void verifyViewportRequest;
const viewportData = createCominsViewportData({ revision: 1, rowCount: 100 });
void [reduceCominsViewportData(viewportData, { type: "retain", range: { startIndex: 0, endIndex: 20 } }), planViewportRequests({ data: viewportData, range: { startIndex: 0, endIndex: 20 }, active: [], retryStarts: [] })];
import { createCominsTableState, setCominsSortModel } from "../../src/core/state/table";
import { copyCominsCell, pasteCominsCell, isCominsCellDisabled } from "../../src/core/editing/cells";
import { copyCominsRow, pasteCominsRow, copyCominsCellRange, pasteCominsCellRange, pasteCominsText, fillCominsCellRange } from "../../src/core/editing/clipboard";
import { exportCominsRowsToCsv, exportCominsRowsToJson } from "../../src/core/editing/export";
import { reconcileCoreState } from "../../src/core/state/reconcile";
import { getCoreStateChanges } from "../../src/core/state/changes";
import { projectCoreRows, getSortedCoreTree } from "../../src/core/rows/projection";
import { getCominsFilteredRowIndexes } from "../../src/core/rows/filtering";
import { normalizeCominsRowGrouping, createCominsGroupModel, orderCominsGroupModel } from "../../src/core/rows/grouping";
import { getBuiltinSummaryValue } from "../../src/core/rows/summary";
type Row = { id: string; score: number };
const numeric: CominsTableColumn<Row, number> = { field: "score", label: "Score", cell: {
  parseClipboard: payload => Number(payload.text) + payload.value,
  disabled: payload => payload.row.data.score < 0,
} };
const state: CominsTableState<Row> = createCominsTableState({ rows: [{ id: "a", score: 2 }], columns: [{ field: "score", label: "Score", sort: true }] });
const next: CominsTableState<Row> = setCominsSortModel(state, [{ columnId: "score", direction: "asc" }]);
const reconciled = reconcileCoreState({ current: next, nextInput: { columns: next.columns, rows: next.rows }, columnOrderHistory: next.columnOrder, dataChanged: false, getRowIdChanged: false, viewportIndices: [0] });
const changed: boolean = getCoreStateChanges(next, reconciled.state).selection;
void [reconciled.invalidatedDetailRowIds, changed];
const projected = projectCoreRows({ mode: "flat", rows: next.rows, rowIds: next.rowIds, dataIndexes: [0], virtualized: true });
void [projected, getSortedCoreTree, getCominsFilteredRowIndexes, normalizeCominsRowGrouping, createCominsGroupModel, orderCominsGroupModel, getBuiltinSummaryValue];
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
