import { useState } from "react";

import { KmsfDataTable, type KmsfDataTableColumn } from "../../../src";
import { FeatureSampleSection } from "../components/FeatureSampleSection";
import { createBaseColumns } from "../fixtures/columns";
import { createExampleRows, type PersonRow } from "../fixtures/people";

const rowColumns: Array<KmsfDataTableColumn<PersonRow>> = createBaseColumns().map((column) =>
  column.id === "name" || column.field === "name"
    ? {
        ...column,
        cell: {
          ...column.cell,
          format: ({ row, value }) => (
            <span>
              {String(value)}
              {row.data.active ? (
                <em className="row-custom-badge" data-testid={`row-custom-badge-${String(row.id)}`}>
                  커스텀
                </em>
              ) : null}
            </span>
          ),
        },
      }
    : column,
);

export function RowFeature() {
  const [events, setEvents] = useState<string[]>([]);
  const [rows, setRows] = useState(() => createExampleRows(100));
  const pushEvent = (event: string) => setEvents((current) => [event, ...current].slice(0, 5));

  return (
    <section className="feature-panel">
      <FeatureSampleSection
        description="Tr Row 스타일, 드래그 이동, rowProps, click/double click/context/key events, disabled row, draggable row와 setMoveTargetRow 흐름을 확인합니다."
        id="row"
        title="Tr Row 예제"
      >
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
      </FeatureSampleSection>
    </section>
  );
}
