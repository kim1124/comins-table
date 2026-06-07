import { useState } from "react";

import { KmsfDataTable } from "../../../src";
import { createBaseColumns, defaultColumnLayout } from "../fixtures/columns";
import { cloneBaseRows } from "../fixtures/people";

export function RowFeature() {
  const [events, setEvents] = useState<string[]>([]);
  const [rows, setRows] = useState(() => cloneBaseRows());
  const pushEvent = (event: string) => setEvents((current) => [event, ...current].slice(0, 5));

  return (
    <section className="feature-panel">
      <div className="feature-controls">
        <span data-testid="layout-order">{defaultColumnLayout.order.join(",")}</span>
        <span className="state-pill">행 스타일:Owner</span>
        <span className="state-pill">행 c를 행 a로 드래그</span>
      </div>
      <pre className="state-output" data-testid="event-log">
        {events.join("\n") || "행 이벤트 없음"}
      </pre>
      <KmsfDataTable
        className="example-table"
        columns={createBaseColumns()}
        data={rows}
        data-testid="data-table-viewport"
        getRowId={(row) => row.id}
        onChangeData={setRows}
        onClickRow={({ row }) => pushEvent(`행 클릭:${String(row.id)}`)}
        onContextMenuRow={({ event, row }) => {
          event.preventDefault();
          pushEvent(`행 컨텍스트:${String(row.id)}`);
        }}
        onDoubleClickRow={({ row }) => pushEvent(`행 더블클릭:${String(row.id)}`)}
        onKeyDownRow={({ event, row }) => pushEvent(`행 키다운:${String(row.id)}:${event.key}`)}
        pagination={{ pageIndex: 0, pageSize: 10 }}
        rowProps={{ className: (row) => (row.role === "Owner" ? "row-owner" : undefined) }}
        theme={{ density: "compact" }}
      />
    </section>
  );
}
