import { useRef, useState } from "react";
import { Eye, EyeOff, RotateCcw, Save, Upload } from "lucide-react";

import { KmsfDataTable, type KmsfColumnLayout, type KmsfDataTableRef, type KmsfSortState } from "../../../src";
import { ActionButton, FeatureControls } from "../components/FeatureControls";
import { createBaseColumns, defaultColumnLayout } from "../fixtures/columns";
import { createExampleRows, type PersonRow } from "../fixtures/people";

function cloneDefaultLayout(): KmsfColumnLayout {
  return {
    columns: { ...defaultColumnLayout.columns },
    order: [...defaultColumnLayout.order],
  };
}

export function HeaderFeature() {
  const tableRef = useRef<KmsfDataTableRef<PersonRow>>(null);
  const [rows] = useState(() => createExampleRows(100));
  const [columnLayout, setColumnLayout] = useState<KmsfColumnLayout>(() => cloneDefaultLayout());
  const [savedLayout, setSavedLayout] = useState("");
  const [showHeader, setShowHeader] = useState(true);
  const [sortState, setSortState] = useState<KmsfSortState | null>(null);
  const layoutOrder = columnLayout.order.join(",");
  const ageWidth = columnLayout.columns.age?.width ?? "auto";
  const sortLabel = sortState ? `${sortState.columnId}:${sortState.direction}` : "none";

  return (
    <section className="feature-panel">
      <FeatureControls
        actions={
          <>
            <ActionButton icon={<EyeOff />} onClick={() => setShowHeader(false)}>
              헤더 숨기기
            </ActionButton>
            <ActionButton icon={<Eye />} onClick={() => setShowHeader(true)}>
              헤더 표시
            </ActionButton>
            <ActionButton icon={<Save />} onClick={() => setSavedLayout(JSON.stringify(columnLayout))}>
              레이아웃 저장
            </ActionButton>
            <ActionButton
              icon={<Upload />}
              onClick={() => {
                if (savedLayout) {
                  const nextLayout = JSON.parse(savedLayout) as KmsfColumnLayout;
                  setColumnLayout(nextLayout);
                  tableRef.current?.setColumnLayout(nextLayout);
                }
              }}
            >
              레이아웃 불러오기
            </ActionButton>
            <ActionButton
              icon={<RotateCcw />}
              onClick={() => {
                const nextLayout = cloneDefaultLayout();
                setColumnLayout(nextLayout);
                tableRef.current?.setColumnLayout(nextLayout);
              }}
            >
              레이아웃 복원
            </ActionButton>
          </>
        }
        options={
          <>
            <span data-testid="layout-order">{layoutOrder}</span>
            <span data-testid="layout-width-age">age:{ageWidth}</span>
          </>
        }
      />
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
