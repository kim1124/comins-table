import { useState } from "react";

import { KmsfDataTable, type KmsfDataTableColumn } from "../../../src";
import { FeatureControls } from "../components/FeatureControls";
import { createBaseColumns, defaultColumnLayout } from "../fixtures/columns";
import { createExampleRows, type PersonRow } from "../fixtures/people";

const rowColumns: Array<KmsfDataTableColumn<PersonRow>> = createBaseColumns().map((column) =>
  column.id === "name" || column.field === "name"
    ? {
        ...column,
        format: ({ row, value }) => (
          <span>
            {String(value)}
            {row.active ? (
              <em className="row-custom-badge" data-testid={`row-custom-badge-${String(row.id)}`}>
                커스텀
              </em>
            ) : null}
          </span>
        ),
      }
    : column,
);

export function RowFeature() {
  const [events, setEvents] = useState<string[]>([]);
  const [rows, setRows] = useState(() => createExampleRows(100));
  const pushEvent = (event: string) => setEvents((current) => [event, ...current].slice(0, 5));

  return (
    <section className="feature-panel">
      <FeatureControls
        options={
          <>
            <span data-testid="layout-order">{defaultColumnLayout.order.join(",")}</span>
            <span className="state-pill">행 스타일:Owner</span>
            <span className="state-pill">row b:drag 비활성화</span>
            <span className="state-pill">row-3:비활성화</span>
            <span className="state-pill">Row drag handle로 행 c를 행 a로 이동</span>
          </>
        }
      />
      <pre className="state-output" data-testid="event-log">
        {events.join("\n") || "행 이벤트 없음"}
      </pre>
      <KmsfDataTable
        className="example-table"
        columns={rowColumns}
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
        rowProps={{
          className: (row) => (row.role === "Owner" ? "row-owner" : undefined),
          disabled: (row) => row.id === "row-3",
          draggable: (row) => row.id !== "b",
          style: (row) => (row.active ? { background: "#f1fcf8" } : undefined),
        }}
        theme={{ density: "compact" }}
      />
    </section>
  );
}
