import type React from "react";
import { useMemo, useRef, useState } from "react";

import { CominsTable, type CominsSelectionState, type CominsTableRef } from "../../../src";
import { ActionButton, FeatureControls } from "../components/FeatureControls";
import { Alert, AlertDescription, AlertTitle } from "../components/ui/alert";
import { FeatureSampleSection } from "../components/FeatureSampleSection";
import { ContextMenu, type ContextMenuItem } from "../components/ui/context-menu";
import { createGuardedColumns } from "../fixtures/columns";
import { createExampleRows, type PersonRow } from "../fixtures/people";
import { defineLocalizedText, usePlaygroundLocale } from "../i18n/playground-locale";
import type { LocalizedText } from "../i18n/types";

type ContextData =
  | {
      kind: "row";
      row: PersonRow;
    }
  | {
      columnId: string;
      kind: "cell";
      row: PersonRow;
      value: unknown;
    };

type ContextMenuState = {
  data: ContextData | null;
  selectionCount: number;
  x: number;
  y: number;
} | null;

type ContextAction = "create" | "delete" | "read" | "update";

const contextActions: Array<{ action: ContextAction; label: LocalizedText }> = [
  { action: "read", label: defineLocalizedText("조회", "View") },
  { action: "create", label: defineLocalizedText("추가", "Create") },
  { action: "update", label: defineLocalizedText("수정", "Update") },
  { action: "delete", label: defineLocalizedText("삭제", "Delete") },
];

function getContextMenuPosition(event: React.MouseEvent) {
  return {
    x: Math.min(event.clientX, window.innerWidth - 220),
    y: Math.min(event.clientY, window.innerHeight - 150),
  };
}

export function ContextMenuFeature() {
  const { locale, text } = usePlaygroundLocale();
  const [contextMenu, setContextMenu] = useState<ContextMenuState>(null);
  const [selectedAction, setSelectedAction] = useState<ContextAction | null>(null);
  const [rows, setRows] = useState(() => createExampleRows(30));
  const selectedRowIdsRef = useRef<CominsSelectionState["rowIds"]>([]);
  const tableRef = useRef<CominsTableRef<PersonRow>>(null);
  const columns = useMemo(() => createGuardedColumns(), []);
  const contextMenuItems = useMemo<ContextMenuItem[]>(() => {
    if (!contextMenu) {
      return [];
    }

    return contextActions.map(({ action, label }) => ({
      disabled:
        action === "update"
          ? contextMenu.selectionCount !== 1
          : action === "delete"
            ? contextMenu.selectionCount === 0
            : false,
      label: text(label),
      onSelect: () => setSelectedAction(action),
    }));
  }, [contextMenu, locale, text]);
  const selectedMenuLabel = selectedAction
    ? text(contextActions.find(({ action }) => action === selectedAction)!.label)
    : "";
  const syncSelection = (selection: CominsSelectionState) => {
    selectedRowIdsRef.current = selection.rowIds;
  };

  return (
    <section className="feature-panel" onClick={() => setContextMenu(null)}>
      <FeatureSampleSection
        description={text(defineLocalizedText(
          "우클릭한 Row가 기존 선택에 포함되면 selection을 유지하고, 선택 개수에 따른 조회·추가·수정·삭제 활성화와 row/cell payload를 확인합니다.",
          "Right-click a selected row to preserve selection and inspect action availability and row/cell payloads.",
        ))}
        id="context-menu"
        title={text(defineLocalizedText("Context Menu 예제", "Context Menu example"))}
      >
        <FeatureControls
          actions={
            <>
              <ActionButton
                onClick={(event) => {
                  event.stopPropagation();
                  const rect = event.currentTarget.getBoundingClientRect();
                  setContextMenu({
                    data: null,
                    selectionCount: selectedRowIdsRef.current.length,
                    x: rect.left,
                    y: rect.bottom + 6,
                  });
                }}
              >
                {text(defineLocalizedText("메뉴 열기", "Open menu"))}
              </ActionButton>
              <ActionButton
                onClick={() => {
                  tableRef.current?.setSelectedRows([]);
                  setContextMenu(null);
                }}
              >
                {text(defineLocalizedText("선택 해제", "Clear selection"))}
              </ActionButton>
            </>
          }
        />
        {selectedMenuLabel ? (
          <Alert data-testid="context-menu-alert">
            <AlertTitle>{text(defineLocalizedText("메뉴 선택", "Menu selection"))}</AlertTitle>
            <AlertDescription>
              {locale === "ko" ? `${selectedMenuLabel} 기능을 선택했습니다.` : `${selectedMenuLabel} selected.`}
            </AlertDescription>
          </Alert>
        ) : null}
        <div className="context-workspace">
          <div className="context-detail-pane" data-testid="context-detail-pane">
            <pre className="state-output" data-testid="context-data-preview">
              {contextMenu?.data
                ? JSON.stringify(contextMenu.data, null, 2)
                : text(defineLocalizedText(
                    "우클릭한 행 또는 셀 데이터가 여기에 표시됩니다.",
                    "Right-clicked row or cell data appears here.",
                  ))}
            </pre>
          </div>
          <div className="context-table-pane">
            <CominsTable
              className="example-table"
              columns={columns}
              data={rows}
              data-testid="data-table-viewport"
              getRowId={(row) => row.id}
              onChangeData={setRows}
              onChangeSelection={syncSelection}
              onContextMenuCell={({ column, event, row, value }) => {
                event.preventDefault();
                event.stopPropagation();
                const cellData: ContextData = { columnId: column.id, kind: "cell", row: row.data, value };
                const position = getContextMenuPosition(event);

                setContextMenu({
                  data: cellData,
                  selectionCount: selectedRowIdsRef.current.length,
                  x: position.x,
                  y: position.y,
                });
              }}
              onContextMenuRow={({ event, row }) => {
                event.preventDefault();
                const rowData: ContextData = { kind: "row", row: row.data };
                const position = getContextMenuPosition(event);

                setContextMenu({
                  data: rowData,
                  selectionCount: selectedRowIdsRef.current.length,
                  x: position.x,
                  y: position.y,
                });
              }}
              pagination={{ pageIndex: 0, pageSize: 30 }}
              ref={tableRef}
              theme={{ density: "compact" }}
            />
          </div>
        </div>
        {contextMenu ? (
          <ContextMenu
            aria-label={text(defineLocalizedText("데이터 테이블 컨텍스트 메뉴", "Data table context menu"))}
            items={contextMenuItems}
            style={{ left: contextMenu.x, top: contextMenu.y }}
          />
        ) : null}
      </FeatureSampleSection>
    </section>
  );
}
