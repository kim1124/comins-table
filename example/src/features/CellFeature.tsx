import { useState } from "react";

import { KmsfDataTable, type KmsfDataTableColumn } from "../../../src";
import { FeatureSampleSection } from "../components/FeatureSampleSection";
import { Alert, AlertDescription, AlertTitle } from "../components/ui/alert";
import { Button } from "../components/ui/button";
import { createExampleRows, type PersonRow } from "../fixtures/people";

type CellEventState = {
  detail: string;
  title: string;
};

export function CellFeature() {
  const [eventLog, setEventLog] = useState<CellEventState>({
    detail: "셀을 클릭, 더블클릭, 우클릭하거나 키보드로 조작하면 마지막 이벤트가 표시됩니다.",
    title: "셀 이벤트 대기",
  });
  const [rows, setRows] = useState(() => createExampleRows(100));
  const columns: Array<KmsfDataTableColumn<PersonRow>> = [
    {
      cell: {
        tooltip: ({ value }) => `name:${String(value)}`,
      },
      field: "name",
      id: "name",
      label: "Column1",
      minWidth: 100,
      width: 100,
    },
    {
      cell: {
        format: ({ row }) => `Data ${row.index + 1}`,
      },
      field: "age",
      id: "age",
      label: "Column2",
      minWidth: 100,
      width: 100,
    },
    {
      cell: {
        format: ({ row }) => <strong>{`Data ${row.index + 1}`}</strong>,
        props: {
          className: ({ value }) => (value === "Owner" ? "cell-role-owner" : "cell-role-muted"),
          style: ({ value }) => ({
            textAlign: value === "Owner" ? "center" : "left",
          }),
        },
      },
      field: "role",
      id: "style",
      label: "Column3",
      minWidth: 100,
      width: 100,
    },
    {
      cell: {
        renderer: ({ row }) => (
          <span data-testid={`cell-renderer-${String(row.id)}`}>
            <Button size="default" variant="secondary">renderer:{`Data ${row.index + 1}`}</Button>
          </span>
        ),
      },
      field: "name",
      id: "renderer",
      label: "Column4",
      minWidth: 100,
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
      label: "Column5",
      minWidth: 100,
      width: 160,
    },
    {
      cell: {
        format: ({ row }) => `Data ${row.index + 1}`,
      },
      field: "active",
      id: "event",
      label: "Column6",
      minWidth: 100,
      width: 100,
    },
  ];

  return (
    <section className="feature-panel">
      <FeatureSampleSection
        description="Td Cell 포맷, 스타일, cell.renderer, onClickCell, onContextMenuCell, 복사/붙여넣기 차단 guard를 확인합니다."
        id="cell"
        title="Td Cell 예제"
      >
        <Alert data-testid="cell-event-alert">
          <AlertTitle>{eventLog.title}</AlertTitle>
          <AlertDescription>{eventLog.detail}</AlertDescription>
        </Alert>
        <KmsfDataTable
          className="example-table cell-style-example-table"
          columns={columns}
          data={rows}
          data-testid="data-table-viewport"
          getRowId={(row) => row.id}
          onChangeData={setRows}
          onClickCell={({ column, row }) => {
            setEventLog(
              column.id === "locked" && row.id === "b"
                ? { detail: `${String(row.id)} / ${column.id}`, title: "차단된 셀" }
                : { detail: `${String(row.id)} / ${column.id}`, title: "셀 클릭" },
            );
          }}
          onContextMenuCell={({ column, event, row }) => {
            event.preventDefault();
            setEventLog({ detail: `${String(row.id)} / ${column.id}`, title: "셀 우클릭" });
          }}
          onDoubleClickCell={({ column, row }) => {
            setEventLog({ detail: `${String(row.id)} / ${column.id}`, title: "셀 더블클릭" });
          }}
          onKeyDownCell={({ column, event, row }) => {
            setEventLog({ detail: `${String(row.id)} / ${column.id} / ${event.key}`, title: "셀 키다운" });
          }}
          pagination={{ pageIndex: 0, pageSize: 30 }}
          theme={{ density: "compact" }}
        />
      </FeatureSampleSection>
    </section>
  );
}
