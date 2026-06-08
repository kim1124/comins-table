import { useRef, useState } from "react";

import { KmsfDataTable, type KmsfColumnLayout, type KmsfDataTableRef, type KmsfSortState } from "../../../src";
import { Button } from "../components/ui/button";
import { createBaseColumns, defaultColumnLayout } from "../fixtures/columns";
import { cloneBaseRows, type PersonRow } from "../fixtures/people";

function cloneDefaultLayout(): KmsfColumnLayout {
  return {
    columns: { ...defaultColumnLayout.columns },
    order: [...defaultColumnLayout.order],
  };
}

export function HeaderFeature() {
  const tableRef = useRef<KmsfDataTableRef<PersonRow>>(null);
  const [rows] = useState(() => cloneBaseRows());
  const [columnLayout, setColumnLayout] = useState<KmsfColumnLayout>(() => cloneDefaultLayout());
  const [savedLayout, setSavedLayout] = useState("");
  const [showHeader, setShowHeader] = useState(true);
  const [sortState, setSortState] = useState<KmsfSortState | null>(null);
  const layoutOrder = columnLayout.order.join(",");
  const ageWidth = columnLayout.columns.age?.width ?? "auto";
  const sortLabel = sortState ? `${sortState.columnId}:${sortState.direction}` : "none";

  return (
    <section className="feature-panel">
      <section className="feature-doc" data-testid="feature-doc-header">
        <h2>헤더 예제 설명</h2>
        <p>헤더 표시, 숨김, 컬럼 리사이즈, 1초 long-press 컬럼 이동, 정렬 접근성을 확인합니다.</p>
        <p>getColumnLayout, setColumnLayout, onChangeColumnLayout으로 컬럼 위치와 너비를 저장하고 불러옵니다.</p>
      </section>
      <div className="feature-controls">
        <span data-testid="layout-order">{layoutOrder}</span>
        <span data-testid="layout-width-age">age:{ageWidth}</span>
        <Button onClick={() => setShowHeader(false)} variant="secondary">
          헤더 숨기기
        </Button>
        <Button onClick={() => setShowHeader(true)} variant="secondary">
          헤더 표시
        </Button>
        <Button onClick={() => setSavedLayout(JSON.stringify(columnLayout))} variant="secondary">
          레이아웃 저장
        </Button>
        <Button
          onClick={() => {
            if (savedLayout) {
              const nextLayout = JSON.parse(savedLayout) as KmsfColumnLayout;
              setColumnLayout(nextLayout);
              tableRef.current?.setColumnLayout(nextLayout);
            }
          }}
          variant="secondary"
        >
          레이아웃 불러오기
        </Button>
        <Button
          onClick={() => {
            const nextLayout = cloneDefaultLayout();
            setColumnLayout(nextLayout);
            tableRef.current?.setColumnLayout(nextLayout);
          }}
          variant="secondary"
        >
          레이아웃 복원
        </Button>
      </div>
      <pre className="state-output" data-testid="saved-layout-json">
        {savedLayout || "저장된 레이아웃 없음"}
      </pre>
      <div className="evidence-grid">
        <span data-testid="header-proof-layout">
          getColumnLayout/setColumnLayout / order:{layoutOrder} / age width:{ageWidth}
        </span>
        <span data-testid="header-proof-sort">sort:{sortLabel}</span>
        <span>저장 상태:{savedLayout ? "저장됨" : "저장 전"}</span>
      </div>
      <KmsfDataTable
        className="example-table"
        columns={createBaseColumns()}
        data={rows}
        data-testid="data-table-viewport"
        getRowId={(row) => row.id}
        onChangeColumnLayout={setColumnLayout}
        onChangeSort={setSortState}
        ref={tableRef}
        showHeader={showHeader}
        theme={{ density: "compact" }}
      />
    </section>
  );
}
