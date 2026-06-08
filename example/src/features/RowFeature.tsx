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
      <section className="feature-doc" data-testid="feature-doc-row">
        <h2>행 예제 설명</h2>
        <p>Row 이벤트: 클릭, 더블클릭, 우클릭, 키보드 이벤트, 드래그 이동을 확인합니다.</p>
        <p>rowProps로 행 스타일과 상태를 적용하며, Row 이동은 행 전용 drag gesture로만 검증합니다.</p>
      </section>
      <div className="feature-controls">
        <span data-testid="layout-order">{defaultColumnLayout.order.join(",")}</span>
        <span className="state-pill">행 스타일:Owner</span>
        <span className="state-pill">Row drag handle로 행 c를 행 a로 이동</span>
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
