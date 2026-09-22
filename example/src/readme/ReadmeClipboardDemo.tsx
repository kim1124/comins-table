import { useState } from "react";
import { CominsTable, type CominsTableColumn } from "../../../src";

type Row = { id: number; column1: string; column2: number; column3: string };
const columns: CominsTableColumn<Row>[] = [
  { field: "column1", label: "column1", width: 300 },
  { field: "column2", label: "column2", width: 220, cell: {
    props: { style: { textAlign: "right" } },
    parseClipboard: ({ text }) => {
      const value = Number(text);
      if (!Number.isFinite(value)) throw new Error("Enter a finite number");
      return value;
    },
  } },
  { field: "column3", label: "column3", width: 340 },
];
const getRowId = (row: Row) => row.id;

export function ReadmeClipboardDemo() {
  const [rows, setRows] = useState<Row[]>(() => Array.from({ length: 6 }, (_, id) => ({
    id, column1: `Data ${id + 1}`, column2: (id + 1) * 100, column3: `Keep ${id + 1}`,
  })));
  const [commits, setCommits] = useState(0);
  const [error, setError] = useState("");
  return <div className="readme-demo__scale-grid">
    <div className="readme-demo__tree-controls">
      <label className="feature-control-group">TSV source <textarea className="ui-input" style={{ width: 180, resize: "none" }} aria-label="Copy two TSV fields" rows={1} readOnly defaultValue={"Pasted value\t900"} /></label>
      <span data-testid="readme-clipboard-commits">Data updates: {commits}</span>
      <span role="status">{error || "Paste two fields, then fill down."}</span>
    </div>
    <div className="readme-demo__scale-table">
      <CominsTable className="readme-demo__table" columns={columns} data={rows} getRowId={getRowId}
        cellSelection rowSelectionOnClick={false} clipboardPaste fillHandle
        onChangeData={next => { setRows(next); setCommits(value => value + 1); setError(""); }}
        onClipboardError={event => setError(event.error.message)}
        data-testid="readme-demo-clipboard-fill-table" />
    </div>
  </div>;
}
