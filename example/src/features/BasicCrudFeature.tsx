import { useMemo, useState } from "react";

import { CominsTable, type CominsTableColumn, type CominsSelectionState } from "../../../src";
import { ActionButton, FeatureControls } from "../components/FeatureControls";
import { FeatureSampleSection } from "../components/FeatureSampleSection";
import { createExampleRows } from "../fixtures/people";
import { defineLocalizedText, usePlaygroundLocale } from "../i18n/playground-locale";

type CrudRow = { id: string; column1: string; column2: number; column3: string; column4: string; column5?: boolean; column6?: string };
function createCrudRows(count: number): CrudRow[] {
  return createExampleRows(count).map(row => ({ id: row.id, column1: row.name, column2: row.age, column3: row.role, column4: row.id, column5: row.active, column6: row.locked }));
}

export function BasicCrudFeature() {
  const { text } = usePlaygroundLocale();
  const [rows, setRows] = useState<CrudRow[]>(() => createCrudRows(30));
  const [activeRowId, setActiveRowId] = useState<string | null>(null);
  const [selectedRowIds, setSelectedRowIds] = useState<string[]>([]);
  const [selectedRowJson, setSelectedRowJson] = useState("");
  const [error, setError] = useState("");
  const [nextRowIndex, setNextRowIndex] = useState(1);
  const columns = useMemo<Array<CominsTableColumn<CrudRow>>>(() => [
    { field: "column1", label: "column1", minWidth: 120, sort: true },
    { field: "column2", label: "column2", minWidth: 100, sort: true },
    { field: "column3", label: "column3", minWidth: 100 },
    { field: "column4", label: "column4", minWidth: 120 },
    { field: "column5", label: "column5", minWidth: 100 },
    { field: "column6", label: "column6", minWidth: 100 },
  ], []);
  const syncSelection = (selection: CominsSelectionState) => {
    setSelectedRowIds(selection.rowIds.map(String));
  };
  const addRow = () => {
    setRows((current) => [
      {
        id: `new-${nextRowIndex}`,
        column5: true,
        column2: 30 + nextRowIndex,
        column4: `new-${nextRowIndex}`,
        column6: `Data ${nextRowIndex}`,
        column1: `Data ${nextRowIndex}`,
        column3: nextRowIndex % 2 === 0 ? "Viewer" : "Owner",
      },
      ...current,
    ]);
    setNextRowIndex((current) => current + 1);
    setError("");
  };
  const updateActiveRow = () => {
    if (!activeRowId) {
      setError(text(defineLocalizedText("수정할 행을 먼저 선택해 주세요.", "Select a row to update first.")));
      return;
    }

    try {
      const parsed = JSON.parse(selectedRowJson) as Partial<Omit<CrudRow, "id">>;

      setRows((current) =>
        current.map((row) => (row.id === activeRowId ? { ...row, ...parsed, id: activeRowId } : row)),
      );
      setError("");
    } catch {
      setError(text(defineLocalizedText("선택 행 JSON 형식이 올바르지 않습니다.", "The selected row JSON is invalid.")));
    }
  };
  const deleteSelectedRows = () => {
    if (selectedRowIds.length === 0) {
      setError(text(defineLocalizedText("삭제할 행을 먼저 선택해 주세요.", "Select rows to delete first.")));
      return;
    }

    const deleteIds = new Set(selectedRowIds);
    setRows((current) => current.filter((row) => !deleteIds.has(row.id)));
    setActiveRowId((current) => (current && deleteIds.has(current) ? null : current));
    setSelectedRowIds([]);
    setSelectedRowJson("");
    setError("");
  };
  const selectActiveRow = (row: CrudRow, rowId: string) => {
    const { id: _id, ...values } = row;
    setActiveRowId(rowId);
    setSelectedRowJson(JSON.stringify(values, null, 2));
    setError("");
  };

  return (
    <section className="feature-panel feature-panel--crud">
      <FeatureSampleSection
        description={text(defineLocalizedText(
          "data, onChangeSelection, onClickRow를 사용해 추가, 수정, 삭제, 초기화를 한 화면에서 검증합니다.",
          "Use data, onChangeSelection, and onClickRow to verify add, update, delete, and reset in one example.",
        ))}
        id="basic-crud"
        title={text(defineLocalizedText("CRUD 동작", "CRUD actions"))}
      >
        <FeatureControls
          actions={
            <>
              <ActionButton onClick={addRow}>
                {text(defineLocalizedText("추가", "Add"))}
              </ActionButton>
              <ActionButton onClick={updateActiveRow}>
                {text(defineLocalizedText("수정", "Update"))}
              </ActionButton>
              <ActionButton onClick={deleteSelectedRows} tone="danger">
                {text(defineLocalizedText("삭제", "Delete"))}
              </ActionButton>
              <ActionButton
                onClick={() => {
                  setRows(createCrudRows(30));
                  setActiveRowId(null);
                  setSelectedRowIds([]);
                  setSelectedRowJson("");
                  setError("");
                  setNextRowIndex(1);
                }}
              >
                {text(defineLocalizedText("초기화", "Reset"))}
              </ActionButton>
            </>
          }
        />
        <div className="crud-workspace">
          <div className="crud-detail-pane" data-testid="crud-detail-pane">
            <label className="json-editor">
              <span>{text(defineLocalizedText("선택 행 JSON", "Selected row JSON"))}</span>
              <textarea
                aria-label={text(defineLocalizedText("선택 행 JSON", "Selected row JSON"))}
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
            <CominsTable
              rowProps={{ draggable: true }}
              className="example-table"
              columns={columns}
              data={rows}
              data-testid="data-table-viewport"
              getRowId={(row) => row.id}
              onChangeData={setRows}
              onChangeSelection={syncSelection}
              onClickCell={({ row }) => selectActiveRow(row.data, String(row.id))}
              onClickRow={({ row }) => {
                selectActiveRow(row.data, String(row.id));
              }}
              pagination={{ pageIndex: 0, pageSize: rows.length }}
              theme={{ density: "compact" }}
            />
          </div>
        </div>
      </FeatureSampleSection>
    </section>
  );
}
