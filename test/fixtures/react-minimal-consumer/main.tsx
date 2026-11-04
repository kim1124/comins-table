import { useState } from "react";
import { createRoot } from "react-dom/client";
import { CominsTable, type CominsTableColumn } from "comins-minimal-source";
import "comins-minimal-styles";

type Row = { id: string; name: string; age: number };
const query = new URLSearchParams(location.search);
const automatic = query.has("automatic");
const virtualized = query.has("virtualized");
const columns: CominsTableColumn<Row>[] = [
  { field: "name", label: "Name", cell: automatic ? { renderer: () => <div style={{ height: 72 }}>Expanded content</div> } : undefined },
  { field: "age", label: "Age", sort: true },
];
function Consumer() {
  const [rows, setRows] = useState(() => Array.from({ length: query.has("short") ? 3 : 30 }, (_, i) => ({ id: `row-${i}`, name: `Row ${i}`, age: i + 20 })));
  return <CominsTable columns={columns} data={rows} getRowId={row => row.id} onChangeData={setRows}
    rowHeight={36} virtualized={virtualized} style={virtualized || query.has("fixed") ? { height: 300 } : undefined}
    getRowHeight={automatic ? () => "auto" : undefined} />;
}
const root = createRoot(document.getElementById("root")!);
Object.assign(window, { minimalTable: { mount: () => root.render(<Consumer />), unmount: () => root.render(null) } });
root.render(<Consumer />);
