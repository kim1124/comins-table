import { useState, type ReactNode } from "react";
import { createRoot } from "react-dom/client";
import {
  CominsTable, createCominsTableState, type CominsTableColumn,
  type CominsTableState,
} from "comins-table";
import { pasteCominsText } from "comins-table/clipboard";
import { selectCell } from "comins-table/selection";
import { createCominsTableState as createCoreState } from "comins-table/core";
import "comins-table/styles.css";

type Row = { id: string; score: number };
const rows: Row[] = [{ id: "a", score: 10 }];
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
