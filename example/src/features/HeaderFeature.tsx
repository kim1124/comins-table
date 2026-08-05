import { useEffect, useMemo, useRef, useState } from "react";

import {
  CominsTable,
  type CominsColumnLayout,
  type CominsSortModel,
  type CominsTableRef,
} from "../../../src";
import { ActionButton, FeatureControls } from "../components/FeatureControls";
import { FeatureSampleSection } from "../components/FeatureSampleSection";
import { MultiSelect } from "../components/ui/multi-select";
import { createBaseColumns } from "../fixtures/columns";
import { cloneDefaultLayout, cloneGroupLayout, createHeaderGroupColumns, dynamicColumnOptions } from "../fixtures/headerColumns";
import { createExampleRows, type PersonRow } from "../fixtures/people";
import { defineLocalizedText, usePlaygroundLocale } from "../i18n/playground-locale";

const allHeaderColumnIds = dynamicColumnOptions.map((option) => option.value);

type HeaderLayoutSnapshot = {
  columnIds: string[];
  layout: CominsColumnLayout;
};

const multiSortRows: PersonRow[] = [
  { age: 31, id: "multi-1", name: "Beta", role: "Owner" },
  { age: 31, id: "multi-2", name: "Alpha", role: "Owner" },
  { age: 27, id: "multi-3", name: "Gamma", role: "Owner" },
  { age: 42, id: "multi-4", name: "Delta", role: "Editor" },
  { age: 42, id: "multi-5", name: "Charlie", role: "Editor" },
  { age: 20, id: "multi-6", name: "Echo", role: "Viewer" },
];

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
  const { text } = usePlaygroundLocale();
  const basicTableRef = useRef<CominsTableRef<PersonRow>>(null);
  const layoutTableRef = useRef<CominsTableRef<PersonRow>>(null);
  const multiSortTableRef = useRef<CominsTableRef<PersonRow>>(null);
  const pendingLayoutRef = useRef<CominsColumnLayout | null>(null);
  const [rows] = useState(() => createExampleRows(30));
  const columns = useMemo(() => createBaseColumns(), []);
  const multiSortColumns = useMemo(
    () => [
      { field: "role", label: text(defineLocalizedText("역할", "Role")), minWidth: 120, sort: true },
      { field: "age", label: text(defineLocalizedText("나이", "Age")), minWidth: 100, sort: true },
      { field: "name", label: text(defineLocalizedText("이름", "Name")), minWidth: 140, sort: true },
    ],
    [text],
  );
  const multiSortColumnGroups = useMemo(
    () => [{
      children: ["role", "age"],
      id: "work",
      label: text(defineLocalizedText("업무 프로필", "Work profile")),
    }],
    [text],
  );
  const visibilityBaseColumns = useMemo(() => createHeaderGroupColumns(), []);
  const layoutBaseColumns = useMemo(() => createHeaderGroupColumns(), []);
  const [, setBasicLayout] = useState<CominsColumnLayout>(() => cloneDefaultLayout());
  const [layoutState, setLayoutState] = useState<CominsColumnLayout>(() => cloneGroupLayout());
  const [savedLayout, setSavedLayout] = useState("");
  const [sortModel, setSortModel] = useState<CominsSortModel>([]);
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
            description={text(defineLocalizedText(
              "헤더를 수평으로 6px 이상 드래그하면 placeholder, ghost, drop marker가 즉시 표시됩니다.",
              "Drag a header horizontally by at least 6px to show the placeholder, ghost, and drop marker immediately.",
            ))}
            id="header-basic"
            title={text(defineLocalizedText("Header 기본 기능", "Header basics"))}
          >
            <FeatureControls
              actions={
                <ActionButton onClick={resetBasicLayout}>
                  {text(defineLocalizedText("초기화", "Reset"))}
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
            description={text(defineLocalizedText(
              "Header 전체를 표시하거나 숨기는 showHeader 동작을 확인합니다.",
              "Use showHeader to show or hide the entire header.",
            ))}
            id="header-visibility"
            title={text(defineLocalizedText("Header 숨김 / 표시", "Show / hide Header"))}
          >
            <FeatureControls
              options={
                <MultiSelect
                  data-testid="header-visibility-column-select"
                  label={text(defineLocalizedText("컬럼 선택", "Select columns"))}
                  onChange={setVisibilityColumnIds}
                  options={dynamicColumnOptions}
                  values={visibilityColumnIds}
                />
              }
              actions={
                <ActionButton
                  aria-pressed={visibilityShowHeader}
                  onClick={() => setVisibilityShowHeader((current) => !current)}
                >
                  {text(defineLocalizedText("Header 표시", "Show Header"))}
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
            description={text(defineLocalizedText(
              "컬럼 이동과 리사이즈 결과를 저장하고 다시 불러오는 layout persistence를 확인합니다.",
              "Save and restore the results of moving and resizing columns.",
            ))}
            id="header-layout"
            title={text(defineLocalizedText("컬럼 설정 저장 / 불러오기", "Save / restore column settings"))}
          >
            <FeatureControls
              options={
                <MultiSelect
                  data-testid="header-layout-column-select"
                  label={text(defineLocalizedText("컬럼 선택", "Select columns"))}
                  onChange={setLayoutColumnIds}
                  options={dynamicColumnOptions}
                  values={layoutColumnIds}
                />
              }
              actions={
                <>
                  <ActionButton
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
                    {text(defineLocalizedText("저장", "Save"))}
                  </ActionButton>
                  <ActionButton
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
                    {text(defineLocalizedText("불러오기", "Restore"))}
                  </ActionButton>
                  <ActionButton onClick={resetSavedLayout}>
                    {text(defineLocalizedText("초기화", "Reset"))}
                  </ActionButton>
                </>
              }
            />
            <pre className="state-output" data-testid="saved-layout-json">
              {savedLayout || text(defineLocalizedText("저장된 레이아웃 없음", "No saved layout"))}
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

        <section data-testid="header-example-multi-sort">
          <FeatureSampleSection
            description={text(defineLocalizedText(
              "일반 클릭은 단일 정렬을 유지하고 Shift+클릭 또는 Shift+Enter/Space는 하위 Column 정렬 조건을 우선순위 순서로 추가합니다.",
              "A regular click keeps a single sort. Shift+click or Shift+Enter/Space adds subordinate column sorts in priority order.",
            ))}
            id="header-multi-sort"
            title={text(defineLocalizedText("다중 컬럼 정렬", "Multi-column Sort"))}
          >
            <FeatureControls
              actions={
                <ActionButton onClick={() => multiSortTableRef.current?.clearSort()}>
                  {text(defineLocalizedText("Sort 초기화", "Reset sort"))}
                </ActionButton>
              }
            />
            <pre className="state-output" data-testid="multi-sort-model-json">
              {sortModel.length > 0
                ? JSON.stringify(sortModel, null, 2)
                : text(defineLocalizedText("활성화된 정렬 조건 없음", "No active sort"))}
            </pre>
            <CominsTable
              className="example-table header-example-table"
              columnGroups={multiSortColumnGroups}
              columns={multiSortColumns}
              data={multiSortRows}
              data-testid="header-multi-sort-viewport"
              getRowId={(row) => row.id}
              multiSort
              onChangeSortModel={setSortModel}
              pagination={{ pageIndex: 0, pageSize: 30 }}
              ref={multiSortTableRef}
              theme={{ density: "compact" }}
            />
          </FeatureSampleSection>
        </section>

      </div>
    </section>
  );
}
