import { useState } from "react";

import { CominsTable, type CominsTableColumn } from "../../../src";
import { FeatureSampleSection } from "../components/FeatureSampleSection";
import { Alert, AlertDescription, AlertTitle } from "../components/ui/alert";
import { createBaseColumns } from "../fixtures/columns";
import { createExampleRows, type PersonRow } from "../fixtures/people";
import { defineLocalizedText, usePlaygroundLocale } from "../i18n/playground-locale";

type RowEventState = {
  detail: string;
  kind: "afterDrag" | "beforeDrag" | "click" | "context" | "double" | "drag" | "idle" | "keydown";
};

const rowColumns: Array<CominsTableColumn<PersonRow>> = createBaseColumns();

export function RowFeature() {
  const { text } = usePlaygroundLocale();
  const [eventLog, setEventLog] = useState<RowEventState>({
    detail: "",
    kind: "idle",
  });
  const [basicRows, setBasicRows] = useState(() => createExampleRows(30));
  const [disabledRows, setDisabledRows] = useState(() => createExampleRows(30));
  const [stylingRows, setStylingRows] = useState(() => createExampleRows(30));
  const [eventRows, setEventRows] = useState(() => createExampleRows(30));
  const styledRowColumns: Array<CominsTableColumn<PersonRow>> = rowColumns.map((column) =>
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
                    {text(defineLocalizedText("커스텀", "Custom"))}
                  </em>
                ) : null}
              </span>
            ),
          },
        }
      : column,
  );
  const reportEvent = (kind: RowEventState["kind"], detail: string) => setEventLog({ detail, kind });

  return (
    <section className="feature-panel">
      <section data-testid="row-example-basic">
        <FeatureSampleSection
          description={text(defineLocalizedText(
            "Row 선택과 드래그 이동을 확인합니다. Data 2는 draggable:false로 이동만 금지하며 선택과 이벤트는 사용할 수 있습니다.",
            "Select and drag Rows. Data 2 has draggable:false: movement is blocked, while selection and events remain available.",
          ))}
          id="row-basic"
          title={text(defineLocalizedText("기본", "Basics"))}
        >
          <CominsTable
            className="example-table"
            columns={rowColumns}
            data={basicRows}
            data-testid="data-table-viewport"
            getRowId={(row) => row.id}
            onChangeData={setBasicRows}
            pagination={{ pageIndex: 0, pageSize: 30 }}
            rowProps={{
              draggable: (row) => row.id !== "b",
            }}
            theme={{ density: "compact" }}
          />
        </FeatureSampleSection>
      </section>

      <section data-testid="row-example-disabled">
        <FeatureSampleSection
          description={text(defineLocalizedText(
            "Data 4는 disabled:true로 선택, 드래그, 이벤트, 키보드 focus가 모두 제한됩니다. 기본 예제의 이동만 금지된 Data 2와 다르며, 단순한 스타일 변경이 아닙니다.",
            "Data 4 has disabled:true: selection, dragging, events, and keyboard focus are blocked. Unlike Data 2 in Basics, this disables interactions, not just movement or styling.",
          ))}
          id="row-disabled"
          title={text(defineLocalizedText("Row 잠금", "Locked Row"))}
        >
          <CominsTable
            className="example-table"
            columns={rowColumns}
            data={disabledRows}
            onChangeData={setDisabledRows}
            data-testid="row-disabled-viewport"
            getRowId={(row) => row.id}
            pagination={{ pageIndex: 0, pageSize: 30 }}
            rowProps={{
              draggable: true,
              disabled: (row) => row.id === "row-3",
            }}
            theme={{ density: "compact" }}
          />
        </FeatureSampleSection>
      </section>

      <section data-testid="row-example-styling">
        <FeatureSampleSection
          description={text(defineLocalizedText(
            "rowProps className과 style로 Row 배경, 강조 배지, 소유자 Row 스타일을 적용합니다.",
            "Use rowProps className and style for Row backgrounds, emphasis badges, and Owner Row styling.",
          ))}
          id="row-styling"
          title={text(defineLocalizedText("Row 스타일링", "Row styling"))}
        >
          <CominsTable
            className="example-table row-style-example-table"
            columns={styledRowColumns}
            data={stylingRows}
            onChangeData={setStylingRows}
            data-testid="row-styling-viewport"
            getRowId={(row) => row.id}
            pagination={{ pageIndex: 0, pageSize: 30 }}
            rowProps={{
              draggable: true,
              className: (row) => (row.role === "Owner" ? "row-owner" : undefined),
              style: (row) => (row.active ? { background: "#2f0f5f" } : undefined),
            }}
            theme={{ density: "compact" }}
          />
        </FeatureSampleSection>
      </section>

      <section data-testid="row-example-events">
        <FeatureSampleSection
          description={text(defineLocalizedText(
            "Row click, double click, context menu, keydown과 Row Drag 생명주기 callback payload를 inline Alert로 확인합니다.",
            "Inspect Row click, double-click, context-menu, keydown, and Row Drag lifecycle callback payloads in an inline Alert.",
          ))}
          id="row-events"
          title={text(defineLocalizedText("이벤트 처리", "Event handling"))}
        >
          <Alert data-testid="row-event-alert">
            <AlertTitle>{text({
              afterDrag: defineLocalizedText("Row 드래그 완료", "Row drag completed"),
              beforeDrag: defineLocalizedText("Row 드래그 시작 전", "Before Row drag"),
              click: defineLocalizedText("행 클릭", "Row click"),
              context: defineLocalizedText("행 우클릭", "Row context menu"),
              double: defineLocalizedText("행 더블클릭", "Row double click"),
              drag: defineLocalizedText("Row 드래그 이동", "Row drag target changed"),
              idle: defineLocalizedText("행 이벤트 대기", "Waiting for a Row event"),
              keydown: defineLocalizedText("행 키다운", "Row keydown"),
            }[eventLog.kind])}</AlertTitle>
            <AlertDescription>
              {eventLog.detail || text(defineLocalizedText(
                "행을 클릭, 드래그, 더블클릭, 우클릭하거나 키보드로 조작하면 마지막 이벤트가 표시됩니다.",
                "Click, drag, double-click, right-click, or use the keyboard on a Row to show the latest event.",
              ))}
            </AlertDescription>
          </Alert>
          <CominsTable
            className="example-table"
            columns={rowColumns}
            data={eventRows}
            data-testid="row-events-viewport"
            getRowId={(row) => row.id}
            onAfterDragRow={({ reason, result, row }) =>
              reportEvent("afterDrag", `${String(row.id)} / ${result} / ${reason}`)}
            onBeforeRowDrag={({ row }) => {
              reportEvent("beforeDrag", String(row.id));
            }}
            onChangeData={setEventRows}
            onClickRow={({ row }) => reportEvent("click", String(row.id))}
            onContextMenuRow={({ event, row }) => {
              event.preventDefault();
              reportEvent("context", String(row.id));
            }}
            onDoubleClickRow={({ row }) => reportEvent("double", String(row.id))}
            onKeyDownRow={({ event, row }) => reportEvent("keydown", `${String(row.id)} / ${event.key}`)}
            onRowDrag={({ row, target }) => reportEvent(
              "drag",
              `${String(row.id)} / ${String(target.rowId ?? target.groupId ?? target.tableId ?? "none")} / ${target.valid}`,
            )}
            pagination={{ pageIndex: 0, pageSize: 30 }}
            rowProps={{ draggable: true }}
            theme={{ density: "compact" }}
          />
        </FeatureSampleSection>
      </section>
    </section>
  );
}
