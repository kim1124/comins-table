import { useState } from "react";

import { KmsfDataTable, type KmsfDataTableColumn } from "../../../src";
import { FeatureSampleSection } from "../components/FeatureSampleSection";
import { createExampleRows, type PersonRow } from "../fixtures/people";

export function CellFeature() {
  const [eventLog, setEventLog] = useState("셀 이벤트 대기");
  const [rows, setRows] = useState(() => createExampleRows(100));
  const columns: Array<KmsfDataTableColumn<PersonRow>> = [
    {
      cell: {
        tooltip: ({ value }) => `name:${String(value)}`,
      },
      field: "name",
      id: "name",
      label: "텍스트",
      width: 100,
    },
    {
      cell: {
        format: ({ value }) => `${String(value)} years`,
        props: { style: { textAlign: "right" } },
      },
      field: "age",
      id: "age",
      label: "포맷",
      width: 100,
    },
    {
      cell: {
        format: ({ value }) => <strong>{String(value)}</strong>,
        props: { className: ({ value }) => (value === "Owner" ? "cell-owner" : undefined) },
      },
      field: "role",
      id: "style",
      label: "스타일",
      width: 100,
    },
    {
      cell: {
        renderer: ({ row, value }) => (
          <span data-testid={`cell-renderer-${String(row.id)}`}>renderer:{String(value)}</span>
        ),
      },
      field: "name",
      id: "renderer",
      label: "렌더러",
      width: 100,
    },
    {
      cell: {
        props: {
          copyable: false,
          pasteable: false,
        },
      },
      field: "locked",
      id: "locked",
      label: "가드",
      width: 100,
    },
    {
      cell: {
        format: ({ value }) => (value ? "활성" : "비활성"),
      },
      field: "active",
      id: "event",
      label: "이벤트",
      width: 100,
    },
  ];

  return (
    <section className="feature-panel">
      <FeatureSampleSection
        description="Td Cell 포맷, 스타일, cell.renderer, onClickCell, onContextMenuCell, clipboard guard를 확인합니다."
        id="cell"
        title="Td Cell 예제"
      >
        <pre className="state-output" data-testid="cell-event-log">
          {eventLog}
        </pre>
        <KmsfDataTable
          className="example-table"
          columns={columns}
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
          pagination={{ pageIndex: 0, pageSize: 30 }}
          rowProps={{ className: (row) => (row.role === "Owner" ? "row-owner" : undefined) }}
          theme={{ density: "compact" }}
        />
      </FeatureSampleSection>
    </section>
  );
}
