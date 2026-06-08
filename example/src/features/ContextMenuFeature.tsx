import type React from "react";
import { useMemo, useState } from "react";
import { MousePointerClick } from "lucide-react";

import { KmsfDataTable, type KmsfSelectionState } from "../../../src";
import { Alert, AlertDescription, AlertTitle } from "../components/ui/alert";
import { ActionButton, FeatureControls } from "../components/FeatureControls";
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

const contextMenuExampleCode = `const [cellContextEnabled, setCellContextEnabled] = useState(true);

<KmsfDataTable
  onContextMenuRow={({ event, row }) => {
    event.preventDefault();
    openRowMenu(row.data);
  }}
  onContextMenuCell={
    cellContextEnabled
      ? ({ column, event, row, value }) => {
          event.preventDefault();
          event.stopPropagation();
          openCellMenu({ columnId: column.id, row: row.data, value });
        }
      : undefined
  }
/>`;

export function ContextMenuFeature() {
  const [contextMenu, setContextMenu] = useState<ContextMenuState>(null);
  const [cellContextEnabled, setCellContextEnabled] = useState(true);
  const [selectedMenuLabel, setSelectedMenuLabel] = useState("");
  const [selectedRowIds, setSelectedRowIds] = useState<string[]>([]);
  const [rows, setRows] = useState(() => createExampleRows(100));
  const columns = useMemo(() => createGuardedColumns(), []);
  const syncSelection = (selection: KmsfSelectionState) => {
    setSelectedRowIds(selection.rowIds.map(String));
  };
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
      <FeatureControls
        actions={
          <ActionButton icon={<MousePointerClick />} onClick={() => setCellContextEnabled((current) => !current)}>
            Cell 컨텍스트 {cellContextEnabled ? "비활성화" : "활성화"}
          </ActionButton>
        }
        options={
          <>
            <span className="state-pill" data-testid="context-menu-cell-state">
              Cell 활성화:{cellContextEnabled ? "활성" : "비활성"}
            </span>
            <span className="state-pill">우클릭:단일 행 선택</span>
            <span className="state-pill">행 데이터 객체</span>
            <span className="state-pill">셀 데이터 객체</span>
          </>
        }
      />
      {selectedMenuLabel ? (
        <Alert data-testid="context-menu-alert">
          <AlertTitle>메뉴 선택</AlertTitle>
          <AlertDescription>{selectedMenuLabel} 메뉴를 선택했습니다.</AlertDescription>
        </Alert>
      ) : null}
      <div className="context-workspace">
        <div className="context-table-pane">
          <KmsfDataTable
            className="example-table"
            columns={columns}
            data={rows}
            data-testid="data-table-viewport"
            getRowId={(row) => row.id}
            onChangeData={setRows}
            onChangeSelection={syncSelection}
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
            pagination={{ pageIndex: 0, pageSize: 10 }}
            rowProps={{ className: (row) => (row.role === "Owner" ? "row-owner" : undefined) }}
            theme={{ density: "compact" }}
          />
        </div>
        <div className="context-detail-pane">
          <pre className="state-output" data-testid="context-data-preview">
            {contextMenu ? JSON.stringify(contextMenu.data, null, 2) : "우클릭한 행 또는 셀 데이터가 여기에 표시됩니다."}
          </pre>
          <div className="evidence-grid">
            <span data-testid="context-proof-selection">선택 Row:{selectedRowIds.join(",") || "없음"}</span>
            <span data-testid="context-proof-menu">
              표시 메뉴:{contextMenu?.items.map((item) => item.section).join(",") || "없음"} / 선택 메뉴:
              {selectedMenuLabel || "없음"}
            </span>
          </div>
          <pre className="state-output code-sample" data-testid="context-example-code">
            {contextMenuExampleCode}
          </pre>
        </div>
      </div>
      {contextMenu ? (
        <ContextMenu
          aria-label="데이터 테이블 컨텍스트 메뉴"
          items={contextMenuItems}
          style={{ left: contextMenu.x, top: contextMenu.y }}
        />
      ) : null}
    </section>
  );
}
