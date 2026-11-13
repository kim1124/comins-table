import { useEffect, useState } from "react";
import type { Root } from "react-dom/client";
import { BrowserRouter, Link, Route, Routes } from "react-router";
import { CominsTable, type CominsTableColumn } from "comins-retention-source";
// Loaded only by the dedicated dynamic profile; normal fixture profiles keep their CSS.
import "../../../example/src/styles.css";

type Generation = "A" | "B" | "C";
class RowDataRetirementRow {
  id: string;
  text: string;
  generation: Generation;
  targetMarker: string;
  payload: string;
  constructor(index: number, generation: Generation) {
    this.id = `r${index}`;
    this.text = `${generation}:${index}`;
    this.generation = generation;
    this.targetMarker = index === 0 && generation === "A" ? "row-data-retirement-A-target" : "";
    this.payload = index === 0 ? `payload-${generation}${"x".repeat(100000)}` : "";
  }
}
function makeRows(generation: Generation) {
  return Array.from({ length: 1000 }, (_, index) => new RowDataRetirementRow(index, generation));
}
const columns: CominsTableColumn<RowDataRetirementRow>[] = [
  { field: "id", label: undefined, width: 100 },
  { field: "text", label: undefined, width: 300, cell: { render: ({ value }) => <div style={{ height: 72 }}>{String(value)}</div> } },
];
const getRowId = (row: RowDataRetirementRow) => row.id;
const getRowHeight = () => "auto" as const;
const rowProps = { draggable: false };

function createActions(setRows: (rows: RowDataRetirementRow[]) => void) {
  return { replace(generation: Generation) { setRows(makeRows(generation)); } };
}
export type RowDataRetirementController = ReturnType<typeof createActions>;
function TablePage() {
  const [rows, setRows] = useState(() => makeRows("A"));
  useEffect(() => {
    window.rowDataRetirement = createActions(setRows);
    return () => { delete window.rowDataRetirement; };
  }, []);
  return <>
    <p data-testid="row-retirement-generation">{rows[0]!.generation}</p>
    <div style={{ height: 260, width: 640 }}>
      <CominsTable data={rows} columns={columns} getRowId={getRowId} getRowHeight={getRowHeight}
        estimatedRowHeight={56} rowProps={rowProps} virtualized data-testid="row-retirement-viewport" />
    </div>
  </>;
}
function App() {
  return <BrowserRouter><nav><Link to="/free">Free</Link><Link to="/table">Table</Link></nav>
    <Routes><Route path="/free" element={<p data-testid="row-retirement-free">Table free</p>} />
      <Route path="/table" element={<TablePage />} /></Routes>
  </BrowserRouter>;
}
export function startRowDataRetirementConsumer(root: Root) { root.render(<App />); }
declare global { interface Window { rowDataRetirement?: RowDataRetirementController } }
