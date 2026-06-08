import { useState } from "react";

import {
  KmsfDataTable,
  clearKmsfSelection,
  createKmsfDataTableState,
  fillKmsfCellRange,
  selectCell,
  selectCellRange,
  selectRow,
  serializeKmsfColumnLayout,
  type KmsfDataTableState,
} from "../../../src";
import { Button } from "../components/ui/button";
import { createBaseColumns } from "../fixtures/columns";
import { cloneBaseRows, type PersonRow } from "../fixtures/people";

function createCoreState(): KmsfDataTableState<PersonRow> {
  return createKmsfDataTableState({
    columns: createBaseColumns(),
    getRowId: (row) => row.id,
    rows: cloneBaseRows(),
  });
}

function formatSelection(state: KmsfDataTableState<PersonRow>) {
  return `rowIds:${JSON.stringify(state.selection.rowIds)} cell:${JSON.stringify(
    state.selection.cell,
  )} range:${JSON.stringify(state.selection.range)}`;
}

export function CoreFeature() {
  const [coreState, setCoreState] = useState(() => createCoreState());
  const [layoutJson, setLayoutJson] = useState("");

  return (
    <section className="feature-panel">
      <section className="feature-doc" data-testid="feature-doc-core">
        <h2>핵심 기능 예제 설명</h2>
        <p>core helper 함수로 selection, cell range, fill, layout serialization을 React 밖에서도 사용할 수 있습니다.</p>
        <p>KmsfDataTable 컴포넌트와 동일한 상태 모델을 사용해 테스트 가능한 순수 로직을 구성합니다.</p>
      </section>
      <div className="feature-controls">
        <Button onClick={() => setCoreState((state) => selectRow(state, "a"))} variant="secondary">
          Alpha 선택
        </Button>
        <Button
          onClick={() => setCoreState((state) => selectCell(state, { columnId: "name", rowId: "a" }))}
          variant="secondary"
        >
          Alpha 이름 셀 선택
        </Button>
        <Button
          onClick={() =>
            setCoreState((state) =>
              selectCellRange(state, {
                anchor: { columnId: "name", rowId: "a" },
                focus: { columnId: "age", rowId: "b" },
              }),
            )
          }
          variant="secondary"
        >
          범위 선택
        </Button>
        <Button
          onClick={() =>
            setCoreState((state) =>
              fillKmsfCellRange(state, {
                source: { columnId: "role", rowId: "a" },
                target: {
                  anchor: { columnId: "role", rowId: "b" },
                  focus: { columnId: "role", rowId: "c" },
                },
              }),
            )
          }
          variant="secondary"
        >
          역할 아래로 채우기
        </Button>
        <Button onClick={() => setCoreState((state) => clearKmsfSelection(state))} variant="secondary">
          선택 초기화
        </Button>
        <Button onClick={() => setLayoutJson(JSON.stringify(serializeKmsfColumnLayout(coreState)))} variant="secondary">
          레이아웃 직렬화
        </Button>
      </div>
      <div className="state-row">
        <span data-testid="selection-state">{formatSelection(coreState)}</span>
      </div>
      <pre className="state-output" data-testid="core-state-json">
        {layoutJson || "직렬화된 레이아웃 없음"}
      </pre>
      <KmsfDataTable
        className="example-table"
        columns={coreState.columns}
        data={coreState.rows}
        data-testid="data-table-viewport"
        getRowId={(row) => row.id}
        theme={{ density: "compact" }}
      />
    </section>
  );
}
