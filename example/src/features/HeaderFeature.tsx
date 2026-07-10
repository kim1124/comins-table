import { useEffect, useMemo, useRef, useState } from "react";
import { Eye, EyeOff, RotateCcw, Save, Upload } from "lucide-react";

import {
  CominsTable,
  type CominsColumnLayout,
  type CominsTableRef,
} from "../../../src";
import { ActionButton, FeatureControls } from "../components/FeatureControls";
import { FeatureSampleSection } from "../components/FeatureSampleSection";
import { MultiSelect } from "../components/ui/multi-select";
import { createBaseColumns } from "../fixtures/columns";
import { cloneDefaultLayout, cloneGroupLayout, createHeaderGroupColumns, dynamicColumnOptions } from "../fixtures/headerColumns";
import { createExampleRows, type PersonRow } from "../fixtures/people";

const allHeaderColumnIds = dynamicColumnOptions.map((option) => option.value);

type HeaderLayoutSnapshot = {
  columnIds: string[];
  layout: CominsColumnLayout;
};

function normalizeHeaderColumnIds(columnIds: unknown, fallbackColumnIds: string[]) {
  if (!Array.isArray(columnIds)) {
    return fallbackColumnIds;
  }

  const allowedIds = new Set(allHeaderColumnIds);

  return columnIds.filter((columnId): columnId is string => typeof columnId === "string" && allowedIds.has(columnId));
}

function parseHeaderLayoutSnapshot(value: string): HeaderLayoutSnapshot {
  const parsed = JSON.parse(value) as HeaderLayoutSnapshot | CominsColumnLayout;

  if (parsed && typeof parsed === "object" && "layout" in parsed) {
    return {
      columnIds: normalizeHeaderColumnIds(parsed.columnIds, allHeaderColumnIds),
      layout: parsed.layout,
    };
  }

  return {
    columnIds: allHeaderColumnIds,
    layout: parsed,
  };
}

export function HeaderFeature() {
  const basicTableRef = useRef<CominsTableRef<PersonRow>>(null);
  const layoutTableRef = useRef<CominsTableRef<PersonRow>>(null);
  const pendingLayoutRef = useRef<CominsColumnLayout | null>(null);
  const [rows] = useState(() => createExampleRows(100));
  const columns = useMemo(() => createBaseColumns(), []);
  const visibilityBaseColumns = useMemo(() => createHeaderGroupColumns(), []);
  const layoutBaseColumns = useMemo(() => createHeaderGroupColumns(), []);
  const [, setBasicLayout] = useState<CominsColumnLayout>(() => cloneDefaultLayout());
  const [layoutState, setLayoutState] = useState<CominsColumnLayout>(() => cloneGroupLayout());
  const [savedLayout, setSavedLayout] = useState("");
  const [visibilityShowHeader, setVisibilityShowHeader] = useState(true);
  const [visibilityColumnIds, setVisibilityColumnIds] = useState(() => dynamicColumnOptions.map((option) => option.value));
  const [layoutColumnIds, setLayoutColumnIds] = useState(() => [...allHeaderColumnIds]);
  const visibilityColumns = useMemo(
    () => visibilityBaseColumns.filter((column) => visibilityColumnIds.includes(String(column.id ?? column.field))),
    [visibilityBaseColumns, visibilityColumnIds],
  );
  const layoutColumns = useMemo(
    () => layoutBaseColumns.filter((column) => layoutColumnIds.includes(String(column.id ?? column.field))),
    [layoutBaseColumns, layoutColumnIds],
  );

  useEffect(() => {
    if (!pendingLayoutRef.current) {
      return;
    }

    layoutTableRef.current?.setColumnLayout(pendingLayoutRef.current);
    pendingLayoutRef.current = null;
  }, [layoutColumns]);

  const resetBasicLayout = () => {
    const nextLayout = cloneDefaultLayout();
    setBasicLayout(nextLayout);
    basicTableRef.current?.setColumnLayout(nextLayout);
  };

  const resetSavedLayout = () => {
    const nextLayout = cloneGroupLayout();
    setSavedLayout("");
    setLayoutState(nextLayout);
    setLayoutColumnIds([...allHeaderColumnIds]);
    pendingLayoutRef.current = nextLayout;
    layoutTableRef.current?.setColumnLayout(nextLayout);
  };

  return (
    <section className="feature-panel feature-panel--header">
      <div className="header-example-showcase">
        <section data-testid="header-example-basic">
          <FeatureSampleSection
            description="1Depth 컬럼의 위치 이동과 너비 리사이즈를 확인합니다."
            id="header-basic"
            title="Header 기본 기능"
          >
            <FeatureControls
              actions={
                <ActionButton icon={<RotateCcw />} onClick={resetBasicLayout}>
                  초기화
                </ActionButton>
              }
            />
            <CominsTable
              className="example-table header-example-table"
              columns={columns}
              data={rows}
              data-testid="data-table-viewport"
              getRowId={(row) => row.id}
              onChangeColumnLayout={setBasicLayout}
              pagination={{ pageIndex: 0, pageSize: 30 }}
              ref={basicTableRef}
              theme={{ density: "compact" }}
            />
          </FeatureSampleSection>
        </section>

        <section data-testid="header-example-visibility">
          <FeatureSampleSection
            description="Header 전체를 표시하거나 숨기는 showHeader 동작을 확인합니다."
            id="header-visibility"
            title="Header 숨김 / 표시"
          >
            <FeatureControls
              options={
                <MultiSelect
                  data-testid="header-visibility-column-select"
                  label="컬럼 선택"
                  onChange={setVisibilityColumnIds}
                  options={dynamicColumnOptions}
                  values={visibilityColumnIds}
                />
              }
              actions={
                <ActionButton
                  aria-pressed={visibilityShowHeader}
                  icon={visibilityShowHeader ? <Eye /> : <EyeOff />}
                  onClick={() => setVisibilityShowHeader((current) => !current)}
                >
                  Header 표시
                </ActionButton>
              }
            />
            <CominsTable
              className="example-table header-example-table"
              columns={visibilityColumns}
              data={rows}
              data-testid="header-visibility-viewport"
              getRowId={(row) => row.id}
              pagination={{ pageIndex: 0, pageSize: 30 }}
              showHeader={visibilityShowHeader}
              theme={{ density: "compact" }}
            />
          </FeatureSampleSection>
        </section>

        <section data-testid="header-example-layout">
          <FeatureSampleSection
            description="컬럼 이동과 리사이즈 결과를 저장하고 다시 불러오는 layout persistence를 확인합니다."
            id="header-layout"
            title="컬럼 설정 저장 / 불러오기"
          >
            <FeatureControls
              options={
                <MultiSelect
                  data-testid="header-layout-column-select"
                  label="컬럼 선택"
                  onChange={setLayoutColumnIds}
                  options={dynamicColumnOptions}
                  values={layoutColumnIds}
                />
              }
              actions={
                <>
                  <ActionButton
                    icon={<Save />}
                    onClick={() =>
                      setSavedLayout(
                        JSON.stringify(
                          {
                            columnIds: layoutColumnIds,
                            layout: layoutState,
                          } satisfies HeaderLayoutSnapshot,
                          null,
                          2,
                        ),
                      )
                    }
                  >
                    저장
                  </ActionButton>
                  <ActionButton
                    icon={<Upload />}
                    onClick={() => {
                      if (savedLayout) {
                        const nextSnapshot = parseHeaderLayoutSnapshot(savedLayout);
                        setLayoutColumnIds(nextSnapshot.columnIds);
                        setLayoutState(nextSnapshot.layout);
                        pendingLayoutRef.current = nextSnapshot.layout;
                        layoutTableRef.current?.setColumnLayout(nextSnapshot.layout);
                      }
                    }}
                  >
                    불러오기
                  </ActionButton>
                  <ActionButton icon={<RotateCcw />} onClick={resetSavedLayout}>
                    초기화
                  </ActionButton>
                </>
              }
            />
            <pre className="state-output" data-testid="saved-layout-json">
              {savedLayout || "저장된 레이아웃 없음"}
            </pre>
            <CominsTable
              className="example-table header-example-table"
              columns={layoutColumns}
              data={rows}
              data-testid="header-layout-viewport"
              getRowId={(row) => row.id}
              onChangeColumnLayout={setLayoutState}
              pagination={{ pageIndex: 0, pageSize: 30 }}
              ref={layoutTableRef}
              theme={{ density: "compact" }}
            />
          </FeatureSampleSection>
        </section>

      </div>
    </section>
  );
}
