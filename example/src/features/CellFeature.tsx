import { useState } from "react";

import { KmsfDataTable } from "../../../src";
import { createGuardedColumns } from "../fixtures/columns";
import { cloneBaseRows } from "../fixtures/people";

export function CellFeature() {
  const [eventLog, setEventLog] = useState("셀 이벤트 대기");
  const [rows, setRows] = useState(() => cloneBaseRows());

  return (
    <section className="feature-panel">
      <div className="feature-controls">
        <span className="state-pill">포맷:나이</span>
        <span className="state-pill">포맷:역할</span>
        <span className="state-pill">범위 드래그 + Ctrl+C/V</span>
        <span data-testid="clipboard-guard-state">잠금 컬럼은 props.copyable:false props.pasteable:false</span>
      </div>
      <pre className="state-output" data-testid="cell-event-log">
        {eventLog}
      </pre>
      <KmsfDataTable
        cellSelection={false}
        className="example-table"
        columns={createGuardedColumns()}
        data={rows}
        data-testid="data-table-viewport"
        getRowId={(row) => row.id}
        onChangeData={setRows}
        onClickCell={({ column, row }) => {
          setEventLog(`셀 클릭:${String(row.id)}:${column.id}`);
        }}
        onContextMenuCell={({ column, event, row }) => {
          event.preventDefault();
          setEventLog(`셀 컨텍스트:${String(row.id)}:${column.id}`);
        }}
        onDoubleClickCell={({ column, row }) => {
          setEventLog(`셀 더블클릭:${String(row.id)}:${column.id}`);
        }}
        onKeyDownCell={({ column, event, row }) => {
          setEventLog(`셀 키다운:${String(row.id)}:${column.id}:${event.key}`);
        }}
        pagination={{ pageIndex: 0, pageSize: 10 }}
        rowProps={{ className: (row) => (row.role === "Owner" ? "row-owner" : undefined) }}
        theme={{ density: "compact" }}
      />
    </section>
  );
}
