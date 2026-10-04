import { useState, type ReactNode } from "react";
import { createRoot } from "react-dom/client";
import {
  CominsTable, createCominsTableState, type CominsTableColumn,
  type CominsTableState,
  createCominsTreeExportOptions, type CominsExportMetadata,
} from "comins-table";
import { pasteCominsText } from "comins-table/clipboard";
import { selectCell } from "comins-table/selection";
import { createCominsTableState as createCoreState, createCominsGroupedExportOptions } from "comins-table/core";
import "comins-table/styles.css";

type Row = { id: string; score: number };
const rows: Row[] = [{ id: "a", score: 10 }];
const exportMetadata: CominsExportMetadata<Row> = { __rowId: row => row.id };
const treeExport = createCominsTreeExportOptions({ nodes: [{ item: rows[0]! }], getRowId: row => row.id,
  columns: [{ id: "score", value: row => row.score }] });
const groupExport = createCominsGroupedExportOptions({ rows, groups: [{ id: "all" }], getGroupId: group => group.id,
  getRowGroupId: () => "all", getRowId: row => row.id, columns: [{ id: "score", value: row => row.score }] });
const exportScore: number = treeExport.rows[0]!.score;
// @ts-expect-error Structured export must retain the application row type.
const invalidExportScore: string = groupExport.rows[0]!.score;
void [exportMetadata, exportScore, invalidExportScore];
const columns: CominsTableColumn<Row>[] = [{
  field: "score", label: <strong>Score</strong>,
  cell: {
    props: ({ row }) => ({ pasteable: row.data.score >= 0 }),
    parseClipboard: ({ text }) => Number(text),
    renderer: ({ row }) => <output>{row.data.score}</output>,
  },
}];
const state = createCominsTableState({ rows, columns, getRowId: row => row.id });
const selected = selectCell(state, { rowId: "a", columnId: "score" });
const edited: CominsTableState<Row> = pasteCominsText(selected, { rowId: "a", columnId: "score" }, "42");
const label: ReactNode = edited.columns[0]?.label;
const color: React.CSSProperties | undefined = edited.theme.style;

// Same names, different state contracts: use the entry point owning the state.
const core = createCoreState({
  rows, getRowId: row => row.id,
  columns: [{ field: "score", label: "Score", cell: { pasteable: true } }],
});
const coreLabel: string = core.columns[0]!.label;
// @ts-expect-error Neutral Core has no React theme.
core.theme;
function rejectReactLabelsInCore() {
  // @ts-expect-error Neutral Core labels cannot contain JSX.
  createCoreState({ rows, columns: [{ field: "score", label: <b>Score</b> }] });
}

const numeric: CominsTableColumn<Row, number> = {
  field: "score", label: <b>Score</b>, cell: { renderer: ({ row, value }) => {
    const score: number = value;
    // @ts-expect-error TValue must not become any in packed declarations.
    const wrongValue: string = value;
    // @ts-expect-error TData must not become any in packed declarations.
    row.data.missing;
    void wrongValue;
    return <span>{score.toFixed(1)}</span>;
  } },
};

export function Example() {
  const [data, setData] = useState(rows);
  return <CominsTable data={data} columns={columns} getRowId={row => row.id} onChangeData={setData} />;
}
const container = document.getElementById("app");
if (container) createRoot(container).render(<Example />);
void [label, color, coreLabel, numeric, rejectReactLabelsInCore];

// Tree rendering extensions retain generic item types in the packed package.
import type { CominsTreeSlotParams, CominsTreeSlots } from "comins-table";
const treeSlots: CominsTreeSlots<Row> = {
  content: (params: CominsTreeSlotParams<Row>) => <strong>{params.defaultContent}</strong>,
};
const treeExample = <CominsTable tree columns={columns} data={[{ item: rows[0]! }]} getRowId={row => row.id}
  treeSlots={{ ...treeSlots, trailing: ({ item, depth }) => {
    const score: number = item.score;
    // @ts-expect-error Tree items must retain TData, not become any.
    item.missing;
    return <button type="button">{score}:{depth}</button>;
  } }} />;
// @ts-expect-error Tree slots are not a flat-table prop.
const invalidFlatSlots = <CominsTable columns={columns} data={rows} treeSlots={treeSlots} />;
void [treeExample, invalidFlatSlots];
