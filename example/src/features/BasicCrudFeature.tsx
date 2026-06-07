import { useMemo, useState } from "react";

import { KmsfDataTable, type KmsfSelectionState } from "../../../src";
import { Button } from "../components/ui/button";
import { createBaseColumns } from "../fixtures/columns";
import { cloneBaseRows, type PersonRow } from "../fixtures/people";

export function BasicCrudFeature() {
  const [rows, setRows] = useState<PersonRow[]>(() => cloneBaseRows());
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
  const columns = useMemo(() => createBaseColumns(), []);
  const activeRow = useMemo(() => rows.find((row) => row.id === activeRowId) ?? null, [activeRowId, rows]);
  const syncSelection = (selection: KmsfSelectionState) => {
    setSelectedRowIds(selection.rowIds.map(String));
  };
  const addRow = () => {
    setRows((current) => [
      ...current,
      {
        active: true,
        age: 30 + nextRowIndex,
        id: `new-${nextRowIndex}`,
        locked: `new-${nextRowIndex}-lock`,
        name: `새 행 ${nextRowIndex}`,
        role: nextRowIndex % 2 === 0 ? "Viewer" : "Owner",
      },
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
    <section className="feature-panel">
      <div className="feature-controls">
        <Button onClick={addRow} variant="secondary">
          행 추가
        </Button>
        <Button onClick={updateActiveRow} variant="secondary">
          선택 행 수정
        </Button>
        <Button onClick={deleteSelectedRows} variant="secondary">
          선택 행 삭제
        </Button>
        <Button
          onClick={() => {
            setRows(cloneBaseRows());
            setOwnersOnly(false);
            setPageIndex(0);
            setActiveRowId(null);
            setSelectedRowIds([]);
            setSelectedRowJson("");
            setError("");
            setNextRowIndex(1);
          }}
          variant="secondary"
        >
          행 초기화
        </Button>
        <Button
          onClick={() => {
            setOwnersOnly((current) => !current);
            setPageIndex(0);
          }}
          variant="secondary"
        >
          소유자만 보기
        </Button>
        <Button onClick={() => setPageIndex((current) => current + 1)} variant="secondary">
          다음 페이지
        </Button>
      </div>
      <div className="state-row">
        <span data-testid="query-result">query:{visibleRows.map((row) => row.role).join(",")}</span>
        <span data-testid="pagination-state">pageIndex:{pageIndex}</span>
        <span data-testid="selected-row-state">선택:{selectedRowIds.join(",") || "없음"}</span>
      </div>
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
        pagination={{ pageIndex, pageSize: 10 }}
        rowProps={{ className: (row) => (row.role === "Owner" ? "row-owner" : undefined) }}
        theme={{ density: "compact" }}
      />
    </section>
  );
}
