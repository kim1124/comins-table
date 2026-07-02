import { useMemo, useRef, useState } from "react";
import { Eye, EyeOff, RotateCcw } from "lucide-react";

import { KmsfDataTable, type KmsfColumnLayout, type KmsfDataTableRef } from "../../../src";
import { ActionButton, FeatureControls } from "../components/FeatureControls";
import { FeatureSampleSection } from "../components/FeatureSampleSection";
import { MultiSelect } from "../components/ui/multi-select";
import {
  cloneGroupLayout,
  createHeaderGroupColumns,
  dynamicColumnOptions,
  headerColumnGroups,
} from "../fixtures/headerColumns";
import { createExampleRows, type PersonRow } from "../fixtures/people";

export function ColumnGroupFeature() {
  const groupTableRef = useRef<KmsfDataTableRef<PersonRow>>(null);
  const [rows] = useState(() => createExampleRows(100));
  const groupColumns = useMemo(() => createHeaderGroupColumns(), []);
  const [groupLayout, setGroupLayout] = useState<KmsfColumnLayout>(() => cloneGroupLayout());
  const [dynamicColumnIds, setDynamicColumnIds] = useState(() => dynamicColumnOptions.map((option) => option.value));
  const dynamicColumns = useMemo(
    () => groupColumns.filter((column) => dynamicColumnIds.includes(String(column.id ?? column.field))),
    [dynamicColumnIds, groupColumns],
  );
  const profileGroupVisible = groupLayout.groups?.profile?.hidden !== true;

  const resetGroupLayout = () => {
    const nextLayout = cloneGroupLayout();
    setGroupLayout(nextLayout);
    groupTableRef.current?.setColumnLayout(nextLayout);
  };

  return (
    <section className="feature-panel feature-panel--header">
      <div className="header-example-showcase">
        <section data-testid="header-example-groups">
          <FeatureSampleSection
            description="2Depth Header의 parent 이동, parent 리사이즈, Header 그룹 표시/숨김을 확인합니다."
            id="header-groups"
            title="Header 그룹 기본"
          >
            <FeatureControls
              actions={
                <>
                  <ActionButton
                    aria-pressed={profileGroupVisible}
                    icon={profileGroupVisible ? <Eye /> : <EyeOff />}
                    onClick={() => {
                      const nextLayout = {
                        ...groupLayout,
                        groups: { ...groupLayout.groups, profile: { hidden: profileGroupVisible } },
                      };
                      setGroupLayout(nextLayout);
                      groupTableRef.current?.setColumnLayout(nextLayout);
                    }}
                  >
                    Header 그룹 1 표시
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

        <section data-testid="column-group-dynamic-columns">
          <FeatureSampleSection
            description="SelectBox에서 선택한 자식 column id만 columns prop에 전달해 columnGroups normalize 결과를 확인합니다."
            id="column-group-dynamic-columns"
            title="Header 그룹 동적 표시"
          >
            <FeatureControls
              options={
                <MultiSelect
                  data-testid="column-group-column-select"
                  label="컬럼 선택"
                  onChange={setDynamicColumnIds}
                  options={dynamicColumnOptions}
                  values={dynamicColumnIds}
                />
              }
            />
            <section className="header-dynamic-grid" data-testid="dynamic-group-table">
              <KmsfDataTable
                className="example-table header-example-table"
                columnGroups={headerColumnGroups}
                columns={dynamicColumns}
                data={rows}
                data-testid="dynamic-group-viewport"
                getRowId={(row) => row.id}
                pagination={{ pageIndex: 0, pageSize: 30 }}
                theme={{ density: "compact" }}
              />
            </section>
          </FeatureSampleSection>
        </section>
      </div>
    </section>
  );
}
