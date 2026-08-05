import { useState } from "react";

import { CominsTable, type CominsTableColumn } from "../../../src";
import { FeatureSampleSection } from "../components/FeatureSampleSection";
import { Alert, AlertDescription, AlertTitle } from "../components/ui/alert";
import { Button } from "../components/ui/button";
import { createExampleRows, type PersonRow } from "../fixtures/people";
import { defineLocalizedText, usePlaygroundLocale } from "../i18n/playground-locale";

type CellEventState = {
  detail: string;
  kind: "blocked" | "click" | "context" | "double" | "idle" | "keydown";
};

export function CellFeature() {
  const { text } = usePlaygroundLocale();
  const [eventLog, setEventLog] = useState<CellEventState>({
    detail: "",
    kind: "idle",
  });
  const [rows, setRows] = useState(() => createExampleRows(30));
  const columns: Array<CominsTableColumn<PersonRow>> = [
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
            <Button size="default" variant="secondary">{`renderer:Data ${row.index + 1}`}</Button>
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
        description={text(defineLocalizedText(
          "Td Cell 포맷, 스타일, cell.renderer, onClickCell, onContextMenuCell, 복사/붙여넣기 차단 guard를 확인합니다.",
          "Inspect Td Cell formatting, styling, cell.renderer, click/context-menu events, and copy/paste guards.",
        ))}
        id="cell"
        title={text(defineLocalizedText("Td Cell 예제", "Td Cell example"))}
      >
        <Alert data-testid="cell-event-alert">
          <AlertTitle>{text({
            blocked: defineLocalizedText("차단된 셀", "Blocked cell"),
            click: defineLocalizedText("셀 클릭", "Cell click"),
            context: defineLocalizedText("셀 우클릭", "Cell context menu"),
            double: defineLocalizedText("셀 더블클릭", "Cell double click"),
            idle: defineLocalizedText("셀 이벤트 대기", "Waiting for a cell event"),
            keydown: defineLocalizedText("셀 키다운", "Cell keydown"),
          }[eventLog.kind])}</AlertTitle>
          <AlertDescription>
            {eventLog.detail || text(defineLocalizedText(
              "셀을 클릭, 더블클릭, 우클릭하거나 키보드로 조작하면 마지막 이벤트가 표시됩니다.",
              "Click, double-click, right-click, or use the keyboard on a cell to show the latest event.",
            ))}
          </AlertDescription>
        </Alert>
        <CominsTable
          className="example-table cell-style-example-table"
          columns={columns}
          data={rows}
          data-testid="data-table-viewport"
          getRowId={(row) => row.id}
          onChangeData={setRows}
          onClickCell={({ column, row }) => {
            setEventLog(
              column.id === "locked" && row.id === "b"
                ? { detail: `${String(row.id)} / ${column.id}`, kind: "blocked" }
                : { detail: `${String(row.id)} / ${column.id}`, kind: "click" },
            );
          }}
          onContextMenuCell={({ column, event, row }) => {
            event.preventDefault();
            setEventLog({ detail: `${String(row.id)} / ${column.id}`, kind: "context" });
          }}
          onDoubleClickCell={({ column, row }) => {
            setEventLog({ detail: `${String(row.id)} / ${column.id}`, kind: "double" });
          }}
          onKeyDownCell={({ column, event, row }) => {
            setEventLog({ detail: `${String(row.id)} / ${column.id} / ${event.key}`, kind: "keydown" });
          }}
          pagination={{ pageIndex: 0, pageSize: 30 }}
          theme={{ density: "compact" }}
        />
      </FeatureSampleSection>
    </section>
  );
}
