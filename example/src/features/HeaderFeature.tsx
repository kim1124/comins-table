import { useRef, useState } from "react";
import { Eye, EyeOff, RotateCcw, Save, Upload } from "lucide-react";

import {
  KmsfDataTable,
  type KmsfColumnLayout,
  type KmsfDataTableRef,
} from "../../../src";
import { ActionButton, FeatureControls } from "../components/FeatureControls";
import { FeatureSampleSection } from "../components/FeatureSampleSection";
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

  return (
    <section className="feature-panel">
      <FeatureSampleSection
        description="Header 표시/숨김, 정렬, 컬럼 위치와 너비 저장/불러오기/초기화를 확인합니다."
        id="header"
        title="Header 예제"
      >
        <FeatureControls
          actions={
            <>
              <ActionButton icon={<Eye />} onClick={() => setShowHeader(true)}>
                표시
              </ActionButton>
              <ActionButton icon={<EyeOff />} onClick={() => setShowHeader(false)}>
                숨김
              </ActionButton>
              <ActionButton icon={<Save />} onClick={() => setSavedLayout(JSON.stringify(columnLayout))}>
                저장
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
                불러오기
              </ActionButton>
              <ActionButton
                icon={<RotateCcw />}
                onClick={() => {
                  const nextLayout = cloneDefaultLayout();
                  setSavedLayout("");
                  setColumnLayout(nextLayout);
                  tableRef.current?.setColumnLayout(nextLayout);
                }}
              >
                초기화
              </ActionButton>
            </>
          }
        />
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
          pagination={{ pageIndex: 0, pageSize: 30 }}
          theme={{ density: "compact" }}
        />
      </FeatureSampleSection>
    </section>
  );
}
