import { useMemo, useRef, useState } from "react";
import { Eye, EyeOff, RotateCcw, Save, Upload } from "lucide-react";

import {
  KmsfDataTable,
  type KmsfColumnLayout,
  type KmsfDataTableColumn,
  type KmsfDataTableRef,
} from "../../../src";
import { ActionButton, FeatureControls } from "../components/FeatureControls";
import { FeatureSampleSection } from "../components/FeatureSampleSection";
import { createBaseColumns, defaultColumnLayout } from "../fixtures/columns";
import { createExampleRows, type PersonRow } from "../fixtures/people";

const headerColumnGroups = [
  { children: ["name", "age"], id: "profile", label: "프로필" },
  { children: ["active", "locked"], id: "status", label: "상태" },
];

function cloneDefaultLayout(): KmsfColumnLayout {
  return {
    columns: { ...defaultColumnLayout.columns },
    groups: {},
    order: [...defaultColumnLayout.order],
  };
}

function cloneGroupLayout(): KmsfColumnLayout {
  return {
    columns: {},
    groups: {},
    order: ["name", "age", "active", "locked", "role"],
  };
}

function createHeaderGroupColumns(): Array<KmsfDataTableColumn<PersonRow>> {
  return [
    { field: "name", label: "이름", minWidth: 80, sort: true, width: 160 },
    {
      cell: {
        format: ({ value }) => `${String(value)} years`,
        props: { style: { textAlign: "right" } },
      },
      field: "age",
      label: "나이",
      minWidth: 60,
      sort: true,
      width: 120,
    },
    {
      cell: {
        format: ({ value }) => (value ? "활성" : "비활성"),
      },
      field: "active",
      label: "활성",
      minWidth: 70,
      width: 130,
    },
    { field: "locked", label: "잠금", minWidth: 80, width: 140 },
    { field: "role", label: "역할", minWidth: 90, width: 140 },
  ];
}

export function HeaderFeature() {
  const basicTableRef = useRef<KmsfDataTableRef<PersonRow>>(null);
  const layoutTableRef = useRef<KmsfDataTableRef<PersonRow>>(null);
  const groupTableRef = useRef<KmsfDataTableRef<PersonRow>>(null);
  const [rows] = useState(() => createExampleRows(100));
  const columns = useMemo(() => createBaseColumns(), []);
  const groupColumns = useMemo(() => createHeaderGroupColumns(), []);
  const [, setBasicLayout] = useState<KmsfColumnLayout>(() => cloneDefaultLayout());
  const [layoutState, setLayoutState] = useState<KmsfColumnLayout>(() => cloneDefaultLayout());
  const [groupLayout, setGroupLayout] = useState<KmsfColumnLayout>(() => cloneGroupLayout());
  const [savedLayout, setSavedLayout] = useState("");
  const [visibilityShowHeader, setVisibilityShowHeader] = useState(true);

  const resetBasicLayout = () => {
    const nextLayout = cloneDefaultLayout();
    setBasicLayout(nextLayout);
    basicTableRef.current?.setColumnLayout(nextLayout);
  };

  const resetSavedLayout = () => {
    const nextLayout = cloneDefaultLayout();
    setSavedLayout("");
    setLayoutState(nextLayout);
    layoutTableRef.current?.setColumnLayout(nextLayout);
  };

  const resetGroupLayout = () => {
    const nextLayout = cloneGroupLayout();
    setGroupLayout(nextLayout);
    groupTableRef.current?.setColumnLayout(nextLayout);
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
            <KmsfDataTable
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
              actions={
                <>
                  <ActionButton icon={<Eye />} onClick={() => setVisibilityShowHeader(true)}>
                    표시
                  </ActionButton>
                  <ActionButton icon={<EyeOff />} onClick={() => setVisibilityShowHeader(false)}>
                    숨김
                  </ActionButton>
                </>
              }
            />
            <KmsfDataTable
              className="example-table header-example-table"
              columns={columns}
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
              actions={
                <>
                  <ActionButton icon={<Save />} onClick={() => setSavedLayout(JSON.stringify(layoutState))}>
                    저장
                  </ActionButton>
                  <ActionButton
                    icon={<Upload />}
                    onClick={() => {
                      if (savedLayout) {
                        const nextLayout = JSON.parse(savedLayout) as KmsfColumnLayout;
                        setLayoutState(nextLayout);
                        layoutTableRef.current?.setColumnLayout(nextLayout);
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
            <KmsfDataTable
              className="example-table header-example-table"
              columns={columns}
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

        <section data-testid="header-example-groups">
          <FeatureSampleSection
            description="2중 Header의 parent 이동, parent 리사이즈, group 숨김/표시를 확인합니다."
            id="header-groups"
            title="2중 헤더 예제"
          >
            <FeatureControls
              actions={
                <>
                  <ActionButton
                    icon={<EyeOff />}
                    onClick={() => {
                      const nextLayout = {
                        ...groupLayout,
                        groups: { ...groupLayout.groups, profile: { hidden: true } },
                      };
                      setGroupLayout(nextLayout);
                      groupTableRef.current?.setColumnLayout(nextLayout);
                    }}
                  >
                    그룹 숨김
                  </ActionButton>
                  <ActionButton
                    icon={<Eye />}
                    onClick={() => {
                      const nextLayout = {
                        ...groupLayout,
                        groups: { ...groupLayout.groups, profile: { hidden: false } },
                      };
                      setGroupLayout(nextLayout);
                      groupTableRef.current?.setColumnLayout(nextLayout);
                    }}
                  >
                    그룹 표시
                  </ActionButton>
                  <ActionButton icon={<RotateCcw />} onClick={resetGroupLayout}>
                    초기화
                  </ActionButton>
                </>
              }
            />
            <KmsfDataTable
              className="example-table header-example-table"
              columnGroups={headerColumnGroups}
              columns={groupColumns}
              data={rows}
              data-testid="header-groups-viewport"
              getRowId={(row) => row.id}
              onChangeColumnLayout={setGroupLayout}
              pagination={{ pageIndex: 0, pageSize: 30 }}
              ref={groupTableRef}
              theme={{ density: "compact" }}
            />
          </FeatureSampleSection>
        </section>
      </div>
    </section>
  );
}
