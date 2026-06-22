import { useState } from "react";
import { MousePointerClick } from "lucide-react";

import { KmsfDataTable, type KmsfDataTableColumn } from "../../../src";
import { ActionButton, FeatureControls } from "../components/FeatureControls";
import { FeatureSampleSection } from "../components/FeatureSampleSection";
import { createGuardedColumns } from "../fixtures/columns";
import { createExampleRows, type PersonRow } from "../fixtures/people";

export function CellFeature() {
  const [eventLog, setEventLog] = useState("셀 이벤트 대기");
  const [cellSelectionEnabled, setCellSelectionEnabled] = useState(false);
  const [rows, setRows] = useState(() => createExampleRows(100));
  const updateRow = (rowId: string | number, patch: Partial<PersonRow>) => {
    setRows((current) => current.map((row) => (row.id === rowId ? { ...row, ...patch } : row)));
  };
  const columns: Array<KmsfDataTableColumn<PersonRow>> = [
    ...createGuardedColumns(),
    {
      cell: {
        components: [
          {
            onClick: ({ row, value }) => setEventLog(`버튼 클릭:${String(row.id)}:${String(value)}`),
            props: ({ value }) => ({ children: `버튼 ${String(value)}` }),
            type: "button",
          },
        ],
      },
      field: "name",
      id: "component-button",
      label: "Button",
    },
    {
      cell: {
        components: [
          {
            onValueChange: ({ row, value }) => updateRow(row.id, { name: value }),
            props: ({ value }) => ({ "aria-label": "이름 입력", value: String(value) }),
            type: "input",
          },
        ],
      },
      field: "name",
      id: "component-input",
      label: "Input",
    },
    {
      cell: {
        components: [
          {
            onCheckedChange: ({ row, checked }) => updateRow(row.id, { active: checked }),
            props: ({ value }) => ({ "aria-label": "활성 체크", checked: Boolean(value) }),
            type: "checkbox",
          },
        ],
      },
      field: "active",
      id: "component-checkbox",
      label: "Checkbox",
    },
    {
      cell: {
        components: [
          {
            onValueChange: ({ row, value }) => updateRow(row.id, { role: value }),
            options: [
              { label: "Owner", value: "Owner" },
              { label: "Editor", value: "Editor" },
              { label: "Viewer", value: "Viewer" },
            ],
            props: ({ value }) => ({ value: String(value) }),
            type: "radio",
          },
        ],
      },
      field: "role",
      id: "component-radio",
      label: "Radio",
    },
    {
      cell: {
        components: [
          {
            onValueChange: ({ row, value }) => updateRow(row.id, { role: value }),
            options: [
              { label: "Owner", value: "Owner" },
              { label: "Editor", value: "Editor" },
              { label: "Viewer", value: "Viewer" },
            ],
            props: ({ value }) => ({ value: String(value) }),
            type: "select",
          },
        ],
      },
      field: "role",
      id: "component-select",
      label: "Select",
    },
    {
      cell: {
        components: [
          {
            onCheckedChange: ({ row, checked }) => updateRow(row.id, { active: checked }),
            props: ({ value }) => ({ checked: Boolean(value), children: Boolean(value) ? "ON" : "OFF" }),
            type: "toggle",
          },
        ],
      },
      field: "active",
      id: "component-toggle",
      label: "Toggle",
    },
    {
      cell: {
        components: [
          {
            props: ({ value }) => ({ value: Number(value), max: 100 }),
            type: "progress",
          },
        ],
      },
      field: "age",
      id: "component-progress",
      label: "Progress",
    },
    {
      cell: {
        renderer: ({ row, value }) => (
          <span data-testid={`cell-renderer-${String(row.id)}`}>renderer:{String(value)}</span>
        ),
      },
      field: "name",
      id: "component-renderer",
      label: "Renderer",
    },
  ];

  return (
    <section className="feature-panel">
      <FeatureSampleSection
        description="Td Cell 포맷, cell.components, cell.renderer, onClickCell, onContextMenuCell, clipboard guard와 cellSelection 옵션을 확인합니다."
        id="cell"
        title="Td Cell 예제"
      >
        <FeatureControls
          actions={
            <ActionButton icon={<MousePointerClick />} onClick={() => setCellSelectionEnabled((current) => !current)}>
              Cell Selection {cellSelectionEnabled ? "비활성화" : "활성화"}
            </ActionButton>
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
          pagination={{ pageIndex: 0, pageSize: 10 }}
          rowProps={{ className: (row) => (row.role === "Owner" ? "row-owner" : undefined) }}
          theme={{ density: "compact" }}
        />
      </FeatureSampleSection>
    </section>
  );
}
