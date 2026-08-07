import { useMemo, useRef, useState } from "react";

import { CominsTable, type CominsColumnLayout, type CominsTableRef } from "../../../src";
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
import { defineLocalizedText, usePlaygroundLocale } from "../i18n/playground-locale";

const columnGroupIdByColumnId = new Map(
  headerColumnGroups.flatMap((group) => group.children.map((columnId) => [columnId, group.id] as const)),
);

export function ColumnGroupFeature() {
  const { locale, text } = usePlaygroundLocale();
  const groupTableRef = useRef<CominsTableRef<PersonRow>>(null);
  const [rows] = useState(() => createExampleRows(30));
  const richHeaderFixture = useMemo(
    () =>
      typeof window !== "undefined" &&
      new URLSearchParams(window.location.search).get("fixture") === "rich-header-label",
    [],
  );
  const [richLabelActions, setRichLabelActions] = useState({ column: 0, group: 0 });
  const groupColumns = useMemo(() => createHeaderGroupColumns(), []);
  const renderedGroupColumns = useMemo(
    () =>
      richHeaderFixture
        ? groupColumns.map((column) =>
            column.field === "name"
              ? {
                  ...column,
                  label: (
                    <span>
                      <span>{text(defineLocalizedText("Column1", "Column1"))}</span>{" "}
                      <button
                        aria-label={text(defineLocalizedText("Rich column label action", "Rich column label action"))}
                        onClick={() =>
                          setRichLabelActions((current) => ({ ...current, column: current.column + 1 }))
                        }
                        type="button"
                      >
                        {text(defineLocalizedText("action", "action"))}
                      </button>
                    </span>
                  ),
                }
              : column,
          )
        : groupColumns,
    [groupColumns, richHeaderFixture, text],
  );
  const localizedHeaderColumnGroups = useMemo(
    () => headerColumnGroups.map((group, index) => ({
      ...group,
      label: text(defineLocalizedText(`Header 그룹 ${index + 1}`, `Header Group ${index + 1}`)),
    })),
    [text],
  );
  const renderedHeaderColumnGroups = useMemo(
    () =>
      richHeaderFixture
        ? localizedHeaderColumnGroups.map((group) =>
            group.id === "profile"
              ? {
                  ...group,
                  label: (
                    <span>
                      <span>{group.label}</span>{" "}
                      <button
                        aria-label={text(defineLocalizedText("Rich group label action", "Rich group label action"))}
                        onClick={() =>
                          setRichLabelActions((current) => ({ ...current, group: current.group + 1 }))
                        }
                        type="button"
                      >
                        {text(defineLocalizedText("action", "action"))}
                      </button>
                    </span>
                  ),
                }
              : group,
          )
        : localizedHeaderColumnGroups,
    [localizedHeaderColumnGroups, richHeaderFixture],
  );
  const [groupLayout, setGroupLayout] = useState<CominsColumnLayout>(() => cloneGroupLayout());
  const [dynamicColumnIds, setDynamicColumnIds] = useState(() => dynamicColumnOptions.map((option) => option.value));
  const [dynamicVisibleGroupIds, setDynamicVisibleGroupIds] = useState(() =>
    headerColumnGroups.map((group) => group.id),
  );
  const dynamicColumns = useMemo(
    () =>
      groupColumns.filter((column) => {
        const columnId = String(column.id ?? column.field);
        const groupId = columnGroupIdByColumnId.get(columnId);

        return dynamicColumnIds.includes(columnId) && (!groupId || dynamicVisibleGroupIds.includes(groupId));
      }),
    [dynamicColumnIds, dynamicVisibleGroupIds, groupColumns],
  );
  const profileGroupVisible = groupLayout.groups?.profile?.hidden !== true;
  const statusGroupVisible = groupLayout.groups?.status?.hidden !== true;

  const setGroupVisible = (groupId: string, visible: boolean) => {
    const nextLayout = {
      ...groupLayout,
      groups: {
        ...groupLayout.groups,
        [groupId]: { ...groupLayout.groups?.[groupId], hidden: !visible },
      },
    };
    setGroupLayout(nextLayout);
    groupTableRef.current?.setColumnLayout(nextLayout);
  };

  const setDynamicGroupVisible = (groupId: string, visible: boolean) => {
    setDynamicVisibleGroupIds((current) =>
      visible ? [...new Set([...current, groupId])] : current.filter((currentId) => currentId !== groupId),
    );
  };

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
            description={text(defineLocalizedText(
              "2Depth Header의 parent 이동, parent 리사이즈, Header 그룹 표시/숨김을 확인합니다.",
              "Move and resize parent headers and show or hide Header groups in a two-level Header.",
            ))}
            id="header-groups"
            title={text(defineLocalizedText("Header 그룹 기본", "Header group basics"))}
          >
            <FeatureControls
              options={
                <>
                  <label className="feature-checkbox-control">
                    <input
                      checked={profileGroupVisible}
                      onChange={(event) => setGroupVisible("profile", event.target.checked)}
                      type="checkbox"
                    />
                    <span>{text(defineLocalizedText("Header 그룹 1 표시", "Show Header group 1"))}</span>
                  </label>
                  <label className="feature-checkbox-control">
                    <input
                      checked={statusGroupVisible}
                      onChange={(event) => setGroupVisible("status", event.target.checked)}
                      type="checkbox"
                    />
                    <span>{text(defineLocalizedText("Header 그룹 2 표시", "Show Header group 2"))}</span>
                  </label>
                </>
              }
              actions={
                <ActionButton onClick={resetGroupLayout}>
                  {text(defineLocalizedText("초기화", "Reset"))}
                </ActionButton>
              }
            />
            {richHeaderFixture ? (
              <output aria-label={text(defineLocalizedText("Rich header label actions", "Rich header label actions"))}>
                {`group:${richLabelActions.group},column:${richLabelActions.column}`}
              </output>
            ) : null}
            <CominsTable
              className="example-table header-example-table"
              columnGroups={renderedHeaderColumnGroups}
              columns={renderedGroupColumns}
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
            description={text(defineLocalizedText(
              "SelectBox에서 선택한 자식 column id만 columns prop에 전달해 columnGroups normalize 결과를 확인합니다.",
              "Pass only child column IDs selected in the SelectBox to columns and inspect the normalized columnGroups result.",
            ))}
            id="column-group-dynamic-columns"
            title={text(defineLocalizedText("Header 그룹 동적 표시", "Dynamic Header groups"))}
          >
            <FeatureControls
              options={
                <>
                  <MultiSelect
                    data-testid="column-group-column-select"
                    label={text(defineLocalizedText("컬럼 선택", "Select columns"))}
                    onChange={setDynamicColumnIds}
                    options={dynamicColumnOptions}
                    values={dynamicColumnIds}
                  />
                  {localizedHeaderColumnGroups.map((group) => (
                    <label className="feature-checkbox-control" key={group.id}>
                      <input
                        checked={dynamicVisibleGroupIds.includes(group.id)}
                        onChange={(event) => setDynamicGroupVisible(group.id, event.target.checked)}
                        type="checkbox"
                      />
                      <span>{locale === "ko" ? `${group.label} 표시` : `Show ${group.label}`}</span>
                    </label>
                  ))}
                </>
              }
            />
            <section className="header-dynamic-grid" data-testid="dynamic-group-table">
              <CominsTable
                className="example-table header-example-table"
                columnGroups={localizedHeaderColumnGroups}
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
