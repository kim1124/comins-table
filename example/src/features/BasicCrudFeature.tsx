import { useMemo, useState } from "react";
import { Funnel, Pencil, Plus, RotateCcw, Trash2 } from "lucide-react";

import { KmsfDataTable, type KmsfDataTableColumn, type KmsfSelectionState } from "../../../src";
import { ActionButton, FeatureControls } from "../components/FeatureControls";
import { FeatureSampleSection } from "../components/FeatureSampleSection";
import { Pagination, PaginationButton, PaginationContent, PaginationItem } from "../components/ui/pagination";
import { createBaseColumns } from "../fixtures/columns";
import { createExampleRows, type PersonRow } from "../fixtures/people";

export function BasicCrudFeature() {
  const [rows, setRows] = useState<PersonRow[]>(() => createExampleRows(100));
  const [ownersOnly, setOwnersOnly] = useState(false);
  const [pageIndex, setPageIndex] = useState(0);
  const [activeRowId, setActiveRowId] = useState<string | null>(null);
  const [selectedRowIds, setSelectedRowIds] = useState<string[]>([]);
  const [selectedRowJson, setSelectedRowJson] = useState("");
  const [error, setError] = useState("");
  const [nextRowIndex, setNextRowIndex] = useState(1);
  const visibleRows = useMemo(
    () => (ownersOnly ? rows.filter((row) => row.role === "Owner") : rows),
    [ownersOnly, rows],
  );
  const pageSize = 10;
  const pageCount = Math.max(1, Math.ceil(visibleRows.length / pageSize));
  const safePageIndex = Math.min(pageIndex, pageCount - 1);
  const columns = useMemo<Array<KmsfDataTableColumn<PersonRow>>>(
    () => [
      ...createBaseColumns(),
      { field: "id" as const, label: "ID", width: 140 },
      {
        cell: {
          format: ({ value }) => (value ? "활성" : "비활성"),
        },
        field: "active" as const,
        label: "활성",
        width: 120,
      },
      { field: "locked" as const, label: "잠금", width: 160 },
    ],
    [],
  );
  const activeRow = useMemo(() => rows.find((row) => row.id === activeRowId) ?? null, [activeRowId, rows]);
  const syncSelection = (selection: KmsfSelectionState) => {
    setSelectedRowIds(selection.rowIds.map(String));
  };
  const addRow = () => {
    setRows((current) => [
      {
        active: true,
        age: 30 + nextRowIndex,
        id: `new-${nextRowIndex}`,
        locked: `new-${nextRowIndex}-lock`,
        name: `새 행 ${nextRowIndex}`,
        role: nextRowIndex % 2 === 0 ? "Viewer" : "Owner",
      },
      ...current,
    ]);
    setNextRowIndex((current) => current + 1);
    setError("");
  };
  const updateActiveRow = () => {
    if (!activeRowId) {
      setError("수정할 행을 먼저 선택해 주세요.");
      return;
    }

    try {
      const parsed = JSON.parse(selectedRowJson) as Partial<PersonRow>;

      setRows((current) =>
        current.map((row) => (row.id === activeRowId ? { ...row, ...parsed, id: activeRowId } : row)),
      );
      setError("");
    } catch {
      setError("선택 행 JSON 형식이 올바르지 않습니다.");
    }
  };
  const deleteSelectedRows = () => {
    if (selectedRowIds.length === 0) {
      setError("삭제할 행을 먼저 선택해 주세요.");
      return;
    }

    const deleteIds = new Set(selectedRowIds);
    setRows((current) => current.filter((row) => !deleteIds.has(row.id)));
    setActiveRowId((current) => (current && deleteIds.has(current) ? null : current));
    setSelectedRowIds([]);
    setSelectedRowJson("");
    setError("");
  };
  const selectActiveRow = (row: PersonRow, rowId: string) => {
    setActiveRowId(rowId);
    setSelectedRowJson(JSON.stringify(row, null, 2));
    setError("");
  };

  return (
    <section className="feature-panel feature-panel--crud">
      <FeatureSampleSection
        description="data, onChangeSelection, onClickRow, pagination을 사용해 추가, 수정, 삭제, 초기화, 필터링과 페이지 이동을 한 화면에서 검증합니다."
        id="basic-crud"
        title="CRUD 동작"
      >
        <FeatureControls
          actions={
            <>
              <ActionButton icon={<Plus />} onClick={addRow}>
                추가
              </ActionButton>
              <ActionButton icon={<Pencil />} onClick={updateActiveRow}>
                수정
              </ActionButton>
              <ActionButton icon={<Trash2 />} onClick={deleteSelectedRows} tone="danger">
                삭제
              </ActionButton>
              <ActionButton
                icon={<RotateCcw />}
                onClick={() => {
                  setRows(createExampleRows(100));
                  setOwnersOnly(false);
                  setPageIndex(0);
                  setActiveRowId(null);
                  setSelectedRowIds([]);
                  setSelectedRowJson("");
                  setError("");
                  setNextRowIndex(1);
                }}
              >
                초기화
              </ActionButton>
              <ActionButton
                icon={<Funnel />}
                onClick={() => {
                  setOwnersOnly((current) => !current);
                  setPageIndex(0);
                }}
                tone="filter"
              >
                필터링
              </ActionButton>
            </>
          }
        />
        <div className="crud-workspace">
          <div className="crud-detail-pane" data-testid="crud-detail-pane">
            <label className="json-editor">
              <span>선택 행 JSON</span>
              <textarea
                aria-label="선택 행 JSON"
                onChange={(event) => setSelectedRowJson(event.target.value)}
                value={selectedRowJson}
              />
            </label>
            <pre className="state-output" data-testid="active-row-preview">
              {activeRow ? JSON.stringify(activeRow, null, 2) : "마우스로 수정할 행을 선택하세요."}
            </pre>
            {error ? (
              <p className="error-message" data-testid="crud-error">
                {error}
              </p>
            ) : null}
          </div>
          <div className="crud-table-pane">
            <div className="table-toolbar">
              <Pagination aria-label="CRUD 테이블 페이지 이동" data-testid="crud-pagination">
                <PaginationContent>
                  <PaginationItem>
                    <PaginationButton
                      aria-label="이전"
                      disabled={safePageIndex === 0}
                      onClick={() => setPageIndex((current) => Math.max(0, current - 1))}
                    >
                      이전
                    </PaginationButton>
                  </PaginationItem>
                  <PaginationItem>
                    <span className="ui-pagination__status">
                      {safePageIndex + 1} / {pageCount}
                    </span>
                  </PaginationItem>
                  <PaginationItem>
                    <PaginationButton
                      aria-label="다음"
                      disabled={safePageIndex >= pageCount - 1}
                      onClick={() => setPageIndex((current) => Math.min(pageCount - 1, current + 1))}
                    >
                      다음
                    </PaginationButton>
                  </PaginationItem>
                </PaginationContent>
              </Pagination>
            </div>
            <KmsfDataTable
              className="example-table"
              columns={columns}
              data={visibleRows}
              data-testid="data-table-viewport"
              getRowId={(row) => row.id}
              onChangeSelection={syncSelection}
              onClickCell={({ row }) => selectActiveRow(row.data, String(row.id))}
              onClickRow={({ row }) => {
                selectActiveRow(row.data, String(row.id));
              }}
              pagination={{ pageIndex: safePageIndex, pageSize }}
              rowProps={{ className: (row) => (row.role === "Owner" ? "row-owner" : undefined) }}
              theme={{ density: "compact" }}
            />
          </div>
        </div>
      </FeatureSampleSection>
    </section>
  );
}
