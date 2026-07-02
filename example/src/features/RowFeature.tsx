import { useState } from "react";

import { KmsfDataTable, type KmsfDataTableColumn } from "../../../src";
import { FeatureSampleSection } from "../components/FeatureSampleSection";
import { Alert, AlertDescription, AlertTitle } from "../components/ui/alert";
import { createBaseColumns } from "../fixtures/columns";
import { createExampleRows, type PersonRow } from "../fixtures/people";

type RowEventState = {
  detail: string;
  title: string;
};

const rowColumns: Array<KmsfDataTableColumn<PersonRow>> = createBaseColumns();
const styledRowColumns: Array<KmsfDataTableColumn<PersonRow>> = rowColumns.map((column) =>
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
  const [eventLog, setEventLog] = useState<RowEventState>({
    detail: "행을 클릭, 더블클릭, 우클릭하거나 키보드로 조작하면 마지막 이벤트가 표시됩니다.",
    title: "행 이벤트 대기",
  });
  const [basicRows, setBasicRows] = useState(() => createExampleRows(100));
  const [disabledRows] = useState(() => createExampleRows(100));
  const [stylingRows] = useState(() => createExampleRows(100));
  const [eventRows] = useState(() => createExampleRows(100));
  const reportEvent = (title: string, detail: string) => setEventLog({ detail, title });

  return (
    <section className="feature-panel">
      <section data-testid="row-example-basic">
        <FeatureSampleSection
          description="Tr Row 스타일의 기본 rowProps 기반 Row 선택과 드래그 이동, draggable false가 적용된 Row를 확인합니다."
          id="row-basic"
          title="기본"
        >
          <KmsfDataTable
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
          description="disabled Row는 선택, 이벤트, 키보드 focus에서 제외되고 theme 변수 기반 비활성 색상으로 표시됩니다."
          id="row-disabled"
          title="Row 잠금"
        >
          <KmsfDataTable
            className="example-table"
            columns={rowColumns}
            data={disabledRows}
            data-testid="row-disabled-viewport"
            getRowId={(row) => row.id}
            pagination={{ pageIndex: 0, pageSize: 30 }}
            rowProps={{
              disabled: (row) => row.id === "row-3",
            }}
            theme={{ density: "compact" }}
          />
        </FeatureSampleSection>
      </section>

      <section data-testid="row-example-styling">
        <FeatureSampleSection
          description="rowProps className과 style로 Row 배경, 강조 배지, 소유자 Row 스타일을 적용합니다."
          id="row-styling"
          title="Row 스타일링"
        >
          <KmsfDataTable
            className="example-table row-style-example-table"
            columns={styledRowColumns}
            data={stylingRows}
            data-testid="row-styling-viewport"
            getRowId={(row) => row.id}
            pagination={{ pageIndex: 0, pageSize: 30 }}
            rowProps={{
              className: (row) => (row.role === "Owner" ? "row-owner" : undefined),
              style: (row) => (row.active ? { background: "#2f0f5f" } : undefined),
            }}
            theme={{ density: "compact" }}
          />
        </FeatureSampleSection>
      </section>

      <section data-testid="row-example-events">
        <FeatureSampleSection
          description="Row click, double click, context menu, keydown callback payload를 inline Alert로 확인합니다."
          id="row-events"
          title="이벤트 처리"
        >
          <Alert data-testid="row-event-alert">
            <AlertTitle>{eventLog.title}</AlertTitle>
            <AlertDescription>{eventLog.detail}</AlertDescription>
          </Alert>
          <KmsfDataTable
            className="example-table"
            columns={rowColumns}
            data={eventRows}
            data-testid="row-events-viewport"
            getRowId={(row) => row.id}
            onClickRow={({ row }) => reportEvent("행 클릭", String(row.id))}
            onContextMenuRow={({ event, row }) => {
              event.preventDefault();
              reportEvent("행 우클릭", String(row.id));
            }}
            onDoubleClickRow={({ row }) => reportEvent("행 더블클릭", String(row.id))}
            onKeyDownRow={({ event, row }) => reportEvent("행 키다운", `${String(row.id)} / ${event.key}`)}
            pagination={{ pageIndex: 0, pageSize: 30 }}
            theme={{ density: "compact" }}
          />
        </FeatureSampleSection>
      </section>
    </section>
  );
}
