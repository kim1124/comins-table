import { useState } from "react";
import { MousePointerClick } from "lucide-react";

import { KmsfDataTable } from "../../../src";
import { ActionButton, FeatureControls } from "../components/FeatureControls";
import { createGuardedColumns } from "../fixtures/columns";
import { createExampleRows } from "../fixtures/people";

export function CellFeature() {
  const [eventLog, setEventLog] = useState("셀 이벤트 대기");
  const [cellSelectionEnabled, setCellSelectionEnabled] = useState(false);
  const [rows, setRows] = useState(() => createExampleRows(100));

  return (
    <section className="feature-panel">
      <FeatureControls
        actions={
          <ActionButton icon={<MousePointerClick />} onClick={() => setCellSelectionEnabled((current) => !current)}>
            Cell Selection {cellSelectionEnabled ? "비활성화" : "활성화"}
          </ActionButton>
        }
        options={
          <>
            <span className="state-pill">포맷:나이</span>
            <span className="state-pill">포맷:역할</span>
            <span className="state-pill">범위 드래그 + Ctrl+C/V</span>
            <span data-testid="clipboard-guard-state">잠금 컬럼은 props.copyable:false props.pasteable:false</span>
          </>
        }
      />
      <div className="state-row">
        <span data-testid="cell-selection-state">cellSelection:{cellSelectionEnabled ? "활성" : "비활성"}</span>
      </div>
      <pre className="state-output" data-testid="cell-event-log">
        {eventLog}
      </pre>
      <KmsfDataTable
        cellSelection={cellSelectionEnabled}
        className="example-table"
        columns={createGuardedColumns()}
        data={rows}
        data-testid="data-table-viewport"
        getRowId={(row) => row.id}
        onChangeData={setRows}
        onClickCell={({ column, row }) => {
          setEventLog(column.id === "locked" && row.id === "b" ? `차단된 셀:${String(row.id)}:${column.id}` : `셀 클릭:${String(row.id)}:${column.id}`);
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
