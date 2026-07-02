import { useMemo, useState } from "react";
import { Funnel, Pencil, Plus, RotateCcw, Trash2 } from "lucide-react";

import { KmsfDataTable, type KmsfDataTableColumn, type KmsfSelectionState } from "../../../src";
import { ActionButton, FeatureControls } from "../components/FeatureControls";
import { FeatureSampleSection } from "../components/FeatureSampleSection";
import { createBaseColumns } from "../fixtures/columns";
import { createExampleRows, type PersonRow } from "../fixtures/people";

export function BasicCrudFeature() {
  const [rows, setRows] = useState<PersonRow[]>(() => createExampleRows(100));
  const [ownersOnly, setOwnersOnly] = useState(false);
  const [activeRowId, setActiveRowId] = useState<string | null>(null);
  const [selectedRowIds, setSelectedRowIds] = useState<string[]>([]);
  const [selectedRowJson, setSelectedRowJson] = useState("");
  const [error, setError] = useState("");
  const [nextRowIndex, setNextRowIndex] = useState(1);
  const visibleRows = useMemo(
    () => (ownersOnly ? rows.filter((row) => row.role === "Owner") : rows),
    [ownersOnly, rows],
  );
  const columns = useMemo<Array<KmsfDataTableColumn<PersonRow>>>(
    () => [
      ...createBaseColumns(),
      {
        cell: {
          format: ({ row }) => `Data ${row.index + 1}`,
        },
        field: "id" as const,
        label: "Column4",
        minWidth: 100,
        width: 140,
      },
      {
        cell: {
          format: ({ row }) => `Data ${row.index + 1}`,
        },
        field: "active" as const,
        label: "Column5",
        minWidth: 100,
        width: 120,
      },
      { field: "locked" as const, label: "Column6", minWidth: 100, width: 160 },
    ],
    [],
  );
  const syncSelection = (selection: KmsfSelectionState) => {
    setSelectedRowIds(selection.rowIds.map(String));
  };
  const addRow = () => {
    setRows((current) => [
      {
        active: true,
        age: 30 + nextRowIndex,
        id: `new-${nextRowIndex}`,
        locked: `Data ${nextRowIndex}`,
        name: `Data ${nextRowIndex}`,
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
        description="data, onChangeSelection, onClickRow를 사용해 추가, 수정, 삭제, 초기화, 필터링을 한 화면에서 검증합니다."
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
            {error ? (
              <p className="error-message" data-testid="crud-error">
                {error}
              </p>
            ) : null}
          </div>
          <div className="crud-table-pane">
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
              pagination={{ pageIndex: 0, pageSize: visibleRows.length }}
              theme={{ density: "compact" }}
            />
          </div>
        </div>
      </FeatureSampleSection>
    </section>
  );
}
