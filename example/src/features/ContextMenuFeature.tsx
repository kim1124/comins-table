import type React from "react";
import { useMemo, useRef, useState } from "react";

import { CominsTable, type CominsSelectionState, type CominsTableRef } from "../../../src";
import { ActionButton, FeatureControls } from "../components/FeatureControls";
import { Alert, AlertDescription, AlertTitle } from "../components/ui/alert";
import { FeatureSampleSection } from "../components/FeatureSampleSection";
import { ContextMenu, type ContextMenuItem } from "../components/ui/context-menu";
import { createGuardedColumns } from "../fixtures/columns";
import { createExampleRows, type PersonRow } from "../fixtures/people";

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

const contextActions: Array<{ action: ContextAction; label: string }> = [
  { action: "read", label: "조회" },
  { action: "create", label: "추가" },
  { action: "update", label: "수정" },
  { action: "delete", label: "삭제" },
];

function getContextMenuPosition(event: React.MouseEvent) {
  return {
    x: Math.min(event.clientX, window.innerWidth - 220),
    y: Math.min(event.clientY, window.innerHeight - 150),
  };
}

export function ContextMenuFeature() {
  const [contextMenu, setContextMenu] = useState<ContextMenuState>(null);
  const [selectedMenuLabel, setSelectedMenuLabel] = useState("");
  const [rows, setRows] = useState(() => createExampleRows(100));
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
      label,
      onSelect: () => setSelectedMenuLabel(label),
    }));
  }, [contextMenu]);
  const syncSelection = (selection: CominsSelectionState) => {
    selectedRowIdsRef.current = selection.rowIds;
  };

  return (
    <section className="feature-panel" onClick={() => setContextMenu(null)}>
      <FeatureSampleSection
        description="우클릭한 Row가 기존 선택에 포함되면 selection을 유지하고, 선택 개수에 따른 조회·추가·수정·삭제 활성화와 row/cell payload를 확인합니다."
        id="context-menu"
        title="Context Menu 예제"
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
                메뉴 열기
              </ActionButton>
              <ActionButton
                onClick={() => {
                  tableRef.current?.setSelectedRows([]);
                  setContextMenu(null);
                }}
              >
                선택 해제
              </ActionButton>
            </>
          }
        />
        {selectedMenuLabel ? (
          <Alert data-testid="context-menu-alert">
            <AlertTitle>메뉴 선택</AlertTitle>
            <AlertDescription>{selectedMenuLabel} 기능을 선택했습니다.</AlertDescription>
          </Alert>
        ) : null}
        <div className="context-workspace">
          <div className="context-detail-pane" data-testid="context-detail-pane">
            <pre className="state-output" data-testid="context-data-preview">
              {contextMenu?.data
                ? JSON.stringify(contextMenu.data, null, 2)
                : "우클릭한 행 또는 셀 데이터가 여기에 표시됩니다."}
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
            aria-label="데이터 테이블 컨텍스트 메뉴"
            items={contextMenuItems}
            style={{ left: contextMenu.x, top: contextMenu.y }}
          />
        ) : null}
      </FeatureSampleSection>
    </section>
  );
}
