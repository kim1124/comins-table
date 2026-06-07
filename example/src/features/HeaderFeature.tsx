import { useRef, useState } from "react";

import { KmsfDataTable, type KmsfColumnLayout, type KmsfDataTableRef } from "../../../src";
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
  const layoutOrder = columnLayout.order.join(",");
  const ageWidth = columnLayout.columns.age?.width ?? "auto";

  return (
    <section className="feature-panel">
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
      <KmsfDataTable
        className="example-table"
        columns={createBaseColumns()}
        data={rows}
        data-testid="data-table-viewport"
        getRowId={(row) => row.id}
        onChangeColumnLayout={setColumnLayout}
        ref={tableRef}
        showHeader={showHeader}
        theme={{ density: "compact" }}
      />
    </section>
  );
}
