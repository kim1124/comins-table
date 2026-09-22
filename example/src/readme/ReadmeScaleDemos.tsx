import { useMemo, useRef, useState } from "react";
import { Button } from "../components/ui/button";
import { CominsTable, useCominsViewport, type CominsTableColumn, type CominsTableRef, type CominsViewportRequest } from "../../../src";

type ScaleRow = { id: number; text: string };
const getRowId = (row: ScaleRow) => row.id;
const automaticHeight = () => "auto" as const;

function ExpandablePreview({ value }: { value: unknown }) {
  const [expanded, setExpanded] = useState(false);
  return <div>
    <Button aria-pressed={expanded} data-testid="readme-content-toggle" onClick={() => setExpanded(!expanded)} variant="outline">
      Expanded content
    </Button>
    <div>{String(value)}{expanded && " Extra renderer content grows this row without a manual height.".repeat(4)}</div>
  </div>;
}

const columns: CominsTableColumn<ScaleRow>[] = [
  { field: "id", label: "id", width: 110, pinned: "left" },
  {
    field: "text", label: "text", width: 740,
    cell: { renderer: ({ row, value }) => <div className="readme-demo__wrapped-content">
      {row.id === 0 ? <ExpandablePreview value={value} /> : String(value)}
    </div> },
  },
];

export function AutoHeightDemo() {
  const tableRef = useRef<CominsTableRef<ScaleRow>>(null);
  const [narrow, setNarrow] = useState(false);
  const toggleWidth = () => {
    const layout = tableRef.current?.getColumnLayout();
    if (layout) tableRef.current?.setColumnLayout({ ...layout, columns: {
      ...layout.columns, text: { ...layout.columns.text, width: narrow ? 740 : 440 },
    } });
    setNarrow(!narrow);
  };
  const rows = useMemo(() => Array.from({ length: 100_000 }, (_, id) => ({
    id, text: `Row ${id}. ` + "Content wraps naturally while the table measures each visible row. ".repeat(id % 4 + 1),
  })), []);
  return <div className="readme-demo__scale-grid">
    <div className="readme-demo__tree-controls">
      <Button aria-pressed={narrow} data-testid="readme-width-toggle" onClick={toggleWidth} variant="outline">Narrow width</Button>
      <span>100,000 rows · automatic heights</span>
    </div>
    <div className="readme-demo__scale-table" style={{ width: narrow ? 570 : "100%" }}>
      <CominsTable ref={tableRef} className="readme-demo__table" columns={columns} data={rows} getRowId={getRowId}
        getRowHeight={automaticHeight} estimatedRowHeight={72} virtualized rowProps={{ draggable: false }}
        data-testid="readme-demo-auto-row-height-table" />
    </div>
  </div>;
}

export function ViewportDemo() {
  const [query, setQuery] = useState(0);
  const [range, setRange] = useState<[number, number] | null>(null);
  const getRows = async ({ startIndex, endIndex, signal }: CominsViewportRequest): Promise<ScaleRow[]> => {
    setRange([startIndex, endIndex]);
    await new Promise<void>((resolve, reject) => {
      if (signal.aborted) { reject(new Error("Cancelled")); return; }
      const cancel = () => { clearTimeout(timer); reject(new Error("Cancelled")); };
      const timer = window.setTimeout(() => { signal.removeEventListener("abort", cancel); resolve(); }, 250);
      signal.addEventListener("abort", cancel, { once: true });
    });
    return Array.from({ length: endIndex - startIndex }, (_, offset) => {
      const id = startIndex + offset;
      return { id, text: `Query ${query + 1}, row ${id}. ` + "Only the requested region is loaded. ".repeat(id % 3 + 1) };
    });
  };
  const viewport = useCominsViewport({ rowCount: 1_000_000, queryKey: query, getRows, cacheSize: 4 });
  const cached = viewport.data.blocks.reduce((count, block) => count + block.rows.length, 0);
  return <div className="readme-demo__scale-grid">
    <div className="readme-demo__tree-controls">
      <button data-testid="readme-viewport-query" onClick={() => setQuery(query + 1)} type="button">Change query</button>
      <span data-testid="readme-viewport-cache">Cached {cached.toLocaleString("en-US")} / 1,000,000 rows</span>
    </div>
    <div className="readme-demo__scale-table">
      <CominsTable {...viewport.tableProps} className="readme-demo__table" columns={columns} getRowId={getRowId}
        getRowHeight={automaticHeight} estimatedRowHeight={72} data-testid="readme-demo-viewport-datasource-table" />
    </div>
    <output className="readme-demo__caption" data-testid="readme-viewport-range">
      {range ? `Requested indices ${range[0].toLocaleString("en-US")}–${(range[1] - 1).toLocaleString("en-US")} · simulated 250 ms response` : "Waiting for the visible range"}
    </output>
  </div>;
}
