import { useMemo, useRef, useState } from "react";

import {
  CominsTable,
  type CominsColumnLayout,
  type CominsSelectionState,
  type CominsSortModel,
  type CominsTableColumn,
  type CominsTableRef,
} from "../../../src";
import { FeatureControls } from "../components/FeatureControls";
import { FeatureSampleSection } from "../components/FeatureSampleSection";
import { Button } from "../components/ui/button";
import { createExampleRows, type PersonRow } from "../fixtures/people";

const changedLayout: CominsColumnLayout = {
  columns: {
    age: { width: 110 },
    name: { width: 180 },
    role: { width: 150 },
  },
  order: ["role", "name", "age"],
};

function createEmptySelection(): CominsSelectionState {
  return {
    cell: null,
    range: null,
    rowIds: [],
  };
}

export function RefApiFeature() {
  const tableRef = useRef<CominsTableRef<PersonRow>>(null);
  const [rows, setRows] = useState(() => createExampleRows(30));
  const [selection, setSelection] = useState<CominsSelectionState>(createEmptySelection);
  const [sortModel, setSortModel] = useState<CominsSortModel>([]);
  const [savedLayout, setSavedLayout] = useState<CominsColumnLayout | null>(null);
  const columns = useMemo<Array<CominsTableColumn<PersonRow>>>(
    () => [
      { field: "name", label: "Name", minWidth: 100, sort: true },
      { field: "age", label: "Age", minWidth: 100, sort: true },
      { field: "role", label: "Role", minWidth: 100, sort: true },
    ],
    [],
  );

  return (
    <section className="feature-panel">
      <FeatureSampleSection
        description="현재 visible index 기준 selection, sort, column layout, Row 이동을 CominsTableRef로 제어합니다."
        id="ref-api"
        title="Flat Table Ref API"
      >
        <FeatureControls
          actions={
            <>
              <Button onClick={() => tableRef.current?.setSelectedRow(1)} variant="outline">
                Row 2 선택
              </Button>
              <Button onClick={() => tableRef.current?.setSelectedRows([0, 2])} variant="outline">
                Rows 1·3 선택
              </Button>
              <Button
                onClick={() =>
                  tableRef.current?.setSortModel([
                    { columnId: "role", direction: "asc" },
                    { columnId: "age", direction: "desc" },
                  ])
                }
                variant="outline"
              >
                2개 정렬 적용
              </Button>
              <Button onClick={() => tableRef.current?.clearSort()} variant="outline">
                정렬 해제
              </Button>
              <Button onClick={() => setSavedLayout(tableRef.current?.getColumnLayout() ?? null)} variant="outline">
                레이아웃 저장
              </Button>
              <Button onClick={() => tableRef.current?.setColumnLayout(changedLayout)} variant="outline">
                레이아웃 변경
              </Button>
              <Button
                disabled={!savedLayout}
                onClick={() => {
                  if (savedLayout) {
                    tableRef.current?.setColumnLayout(savedLayout);
                  }
                }}
                variant="outline"
              >
                레이아웃 복원
              </Button>
              <Button onClick={() => tableRef.current?.setMoveTargetRow(2, 0)} variant="primary">
                Row 1 → 3 이동
              </Button>
            </>
          }
        />
        <pre className="state-output" data-testid="ref-selection-state">
          {JSON.stringify(selection, null, 2)}
        </pre>
        <pre className="state-output" data-testid="ref-sort-model">
          {JSON.stringify(sortModel, null, 2)}
        </pre>
        <pre className="state-output" data-testid="ref-saved-layout">
          {savedLayout ? JSON.stringify(savedLayout, null, 2) : "저장된 레이아웃 없음"}
        </pre>
        <CominsTable
          ref={tableRef}
          className="example-table"
          columns={columns}
          data={rows}
          data-testid="ref-api-viewport"
          getRowId={(row) => row.id}
          multiSort
          onChangeData={setRows}
          onChangeSelection={setSelection}
          onChangeSortModel={setSortModel}
          pagination={{ pageIndex: 0, pageSize: rows.length }}
          theme={{ density: "compact" }}
        />
      </FeatureSampleSection>
    </section>
  );
}
