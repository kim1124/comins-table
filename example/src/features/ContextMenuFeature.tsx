import type React from "react";
import { useMemo, useState } from "react";
import { MousePointerClick } from "lucide-react";

import { KmsfDataTable } from "../../../src";
import { Alert, AlertDescription, AlertTitle } from "../components/ui/alert";
import { ActionButton, FeatureControls } from "../components/FeatureControls";
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
  data: ContextData;
  items: Array<{
    data: ContextData;
    label: string;
    section: "Cell 메뉴" | "Row 메뉴";
  }>;
  x: number;
  y: number;
} | null;

function getContextMenuPosition(event: React.MouseEvent) {
  return {
    x: Math.min(event.clientX, window.innerWidth - 220),
    y: Math.min(event.clientY, window.innerHeight - 150),
  };
}

export function ContextMenuFeature() {
  const [contextMenu, setContextMenu] = useState<ContextMenuState>(null);
  const [cellContextEnabled, setCellContextEnabled] = useState(true);
  const [selectedMenuLabel, setSelectedMenuLabel] = useState("");
  const [rows, setRows] = useState(() => createExampleRows(100));
  const columns = useMemo(() => createGuardedColumns(), []);
  const contextMenuItems = useMemo<ContextMenuItem[]>(() => {
    if (!contextMenu) {
      return [];
    }

    const groupedItems: ContextMenuItem[] = [];

    for (const section of ["Row 메뉴", "Cell 메뉴"] as const) {
      const items = contextMenu.items.filter((item) => item.section === section);

      if (items.length === 0) {
        continue;
      }

      groupedItems.push({ label: section, type: "label" });
      groupedItems.push(
        ...items.map((item) => ({
          label: item.label,
          onSelect: () => {
            setContextMenu((current) => (current ? { ...current, data: item.data } : current));
            setSelectedMenuLabel(item.label);
          },
        })),
      );
    }

    return groupedItems;
  }, [contextMenu]);

  return (
    <section className="feature-panel" onClick={() => setContextMenu(null)}>
      <FeatureSampleSection
        description="onContextMenuRow, onContextMenuCell, selection callback payload와 우클릭 기반 row/cell 데이터 객체를 확인합니다."
        id="context-menu"
        title="Context Menu 예제"
      >
        <FeatureControls
          actions={
            <ActionButton icon={<MousePointerClick />} onClick={() => setCellContextEnabled((current) => !current)}>
              Cell 컨텍스트 {cellContextEnabled ? "비활성화" : "활성화"}
            </ActionButton>
          }
        />
        {selectedMenuLabel ? (
          <Alert data-testid="context-menu-alert">
            <AlertTitle>메뉴 선택</AlertTitle>
            <AlertDescription>{selectedMenuLabel} 메뉴를 선택했습니다.</AlertDescription>
          </Alert>
        ) : null}
        <div className="context-workspace">
          <div className="context-detail-pane" data-testid="context-detail-pane">
            <pre className="state-output" data-testid="context-data-preview">
              {contextMenu ? JSON.stringify(contextMenu.data, null, 2) : "우클릭한 행 또는 셀 데이터가 여기에 표시됩니다."}
            </pre>
          </div>
          <div className="context-table-pane">
            <KmsfDataTable
              className="example-table"
              columns={columns}
              data={rows}
              data-testid="data-table-viewport"
              getRowId={(row) => row.id}
              onChangeData={setRows}
              onContextMenuCell={
                cellContextEnabled
                  ? ({ column, event, row, value }) => {
                      event.preventDefault();
                      event.stopPropagation();
                      const rowData: ContextData = { kind: "row", row: row.data };
                      const cellData: ContextData = { columnId: column.id, kind: "cell", row: row.data, value };
                      const position = getContextMenuPosition(event);

                      setContextMenu({
                        data: cellData,
                        items: [
                          { data: rowData, label: "행 데이터 보기", section: "Row 메뉴" },
                          { data: cellData, label: "셀 데이터 보기", section: "Cell 메뉴" },
                        ],
                        x: position.x,
                        y: position.y,
                      });
                    }
                  : undefined
              }
              onContextMenuRow={({ event, row }) => {
                event.preventDefault();
                const rowData: ContextData = { kind: "row", row: row.data };
                const position = getContextMenuPosition(event);

                setContextMenu({
                  data: rowData,
                  items: [{ data: rowData, label: "행 데이터 보기", section: "Row 메뉴" }],
                  x: position.x,
                  y: position.y,
                });
              }}
              pagination={{ pageIndex: 0, pageSize: 30 }}
              rowProps={{ className: (row) => (row.role === "Owner" ? "row-owner" : undefined) }}
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
