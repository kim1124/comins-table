import { useRef, useState } from "react";

import {
  CominsTable,
  type CominsTableColumn,
  type CominsTableRef,
  updateCominsTreeItem,
} from "../../../src";
import { FeatureSampleSection } from "../components/FeatureSampleSection";
import { Button } from "../components/ui/button";
import { createBaseColumns } from "../fixtures/columns";
import type { PersonRow } from "../fixtures/people";
import { createTenThousandNodeTree, createThirtyNodeTree } from "../fixtures/treeGrid";
import { defineLocalizedText, usePlaygroundLocale } from "../i18n/playground-locale";

const treeColumns = createBaseColumns();
const virtualTreeData = createTenThousandNodeTree();

export function TreeGridFeature() {
  const { locale, text } = usePlaygroundLocale();
  const [basicData, setBasicData] = useState(createThirtyNodeTree);
  const [controlData, setControlData] = useState(createThirtyNodeTree);
  const [styleData, setStyleData] = useState(createThirtyNodeTree);
  const [componentData, setComponentData] = useState(createThirtyNodeTree);
  const [rendererData, setRendererData] = useState(createThirtyNodeTree);
  const controlRef = useRef<CominsTableRef<PersonRow>>(null);
  const componentColumns: Array<CominsTableColumn<PersonRow>> = [
    { field: "name", label: "Node", minWidth: 180 },
    {
      cell: {
        components: [
          {
            onCheckedChange: ({ checked, row }) => {
              setComponentData((current) =>
                updateCominsTreeItem(current, row.id, (item) => item.id, (item) => ({ ...item, active: checked })),
              );
            },
            props: ({ row, value }) => ({
              "aria-label": locale === "ko" ? `${row.data.name} 활성 상태` : `Active ${row.data.name}`,
              checked: Boolean(value),
            }),
            type: "checkbox",
          },
        ],
      },
      field: "active",
      label: text(defineLocalizedText("활성", "Active")),
      minWidth: 120,
    },
    {
      cell: {
        components: [
          {
            onValueChange: ({ row, value }) => {
              setComponentData((current) =>
                updateCominsTreeItem(current, row.id, (item) => item.id, (item) => ({ ...item, role: value })),
              );
            },
            options: [
              { label: text(defineLocalizedText("소유자", "Owner")), value: "Owner" },
              { label: text(defineLocalizedText("편집자", "Editor")), value: "Editor" },
              { label: text(defineLocalizedText("조회자", "Viewer")), value: "Viewer" },
            ],
            props: ({ row, value }) => ({
              "aria-label": locale === "ko" ? `${row.data.name} 역할` : `Role ${row.data.name}`,
              value: String(value),
            }),
            type: "select",
          },
        ],
      },
      field: "role",
      label: text(defineLocalizedText("역할", "Role")),
      minWidth: 140,
    },
  ];
  const rendererColumns: Array<CominsTableColumn<PersonRow>> = [
    {
      cell: {
        renderer: ({ row, value }) => (
          <span data-testid={`tree-custom-renderer-${String(row.id)}`}>
            <strong>{String(value)}</strong> <small>{row.data.role}</small>
          </span>
        ),
      },
      field: "name",
      label: text(defineLocalizedText("사용자 정의 Node", "Custom Node")),
      minWidth: 220,
    },
    { field: "age", label: text(defineLocalizedText("나이", "Age")), minWidth: 100 },
  ];

  return (
    <section className="feature-panel feature-panel--tree-grid">
      <FeatureSampleSection
        description={text(defineLocalizedText(
          "defaultExpandAll의 기본값 true로 3개 Department, 9개 Team, 18개 Member를 모두 출력합니다.",
          "With defaultExpandAll set to true, all 3 departments, 9 teams, and 18 members are displayed.",
        ))}
        id="tree-grid-basic"
        title={text(defineLocalizedText("기본 Tree Grid", "Basic Tree Grid"))}
      >
        <p className="tree-example-count" data-testid="tree-basic-node-count">
          {text(defineLocalizedText("30개 node", "30 nodes"))}
        </p>
        <CominsTable
          className="example-table"
          columns={treeColumns}
          data={basicData}
          data-testid="tree-grid-basic-viewport"
          getRowId={(row) => row.id}
          onChangeData={setBasicData}
          summary={{ columns: { age: "sum" } }}
          theme={{ density: "compact" }}
          tree
        />
      </FeatureSampleSection>

      <FeatureSampleSection
        description={text(defineLocalizedText(
          "ref의 expand/fold는 node id 배열 또는 인수 생략으로 특정 node와 전체 branch를 제어합니다.",
          "The ref expand/fold methods control selected nodes with an ID array or all branches when called without arguments.",
        ))}
        id="tree-grid-controls"
        title={text(defineLocalizedText("펼치기 / 접기", "Expand / Fold"))}
      >
        <div data-testid="tree-grid-controls">
          <div className="feature-controls">
            <Button onClick={() => controlRef.current?.expand(["department-1"])} variant="outline">
              {text(defineLocalizedText("department 1 펼치기", "Expand department 1"))}
            </Button>
            <Button onClick={() => controlRef.current?.expand(["team-1-1"])} variant="outline">
              {text(defineLocalizedText("team 1-1 펼치기", "Expand team 1-1"))}
            </Button>
            <Button onClick={() => controlRef.current?.expand()} variant="primary">
              {text(defineLocalizedText("모두 펼치기", "Expand all"))}
            </Button>
            <Button onClick={() => controlRef.current?.fold()} variant="secondary">
              {text(defineLocalizedText("모두 접기", "Fold all"))}
            </Button>
          </div>
          <CominsTable
            ref={controlRef}
            className="example-table"
            columns={treeColumns}
            data={controlData}
            data-testid="tree-grid-controls-viewport"
            defaultExpandAll={false}
            getRowId={(row) => row.id}
            onChangeData={setControlData}
            tree
          />
        </div>
      </FeatureSampleSection>

      <FeatureSampleSection
        description={text(defineLocalizedText(
          "Tree node의 item을 기준으로 rowProps className과 style을 적용합니다.",
          "Apply rowProps className and style from each Tree node item.",
        ))}
        id="tree-grid-style"
        title={text(defineLocalizedText("Tree Grid 스타일 / 클래스", "Tree Grid Style / Class"))}
      >
        <CominsTable
          className="example-table tree-style-table"
          columns={treeColumns}
          data={styleData}
          data-testid="tree-style-viewport"
          getRowId={(row) => row.id}
          onChangeData={setStyleData}
          rowProps={{
            className: (row) => (row.role === "Owner" ? "tree-row-root" : undefined),
            style: (row) => (row.active ? { fontWeight: 800 } : undefined),
          }}
          tree
        />
      </FeatureSampleSection>

      <FeatureSampleSection
        description={text(defineLocalizedText(
          "기존 checkbox와 select Component Cell이 Tree node.item을 동일한 payload와 immutable update로 처리합니다.",
          "Existing checkbox and select Component Cells handle Tree node.item with the same payload and immutable update flow.",
        ))}
        id="tree-grid-components"
        title={text(defineLocalizedText("Tree Grid 컴포넌트 Cell", "Tree Grid Component Cell"))}
      >
        <CominsTable
          className="example-table"
          columns={componentColumns}
          data={componentData}
          data-testid="tree-components-viewport"
          getRowId={(row) => row.id}
          onChangeData={setComponentData}
          tree
        />
      </FeatureSampleSection>

      <FeatureSampleSection
        description={text(defineLocalizedText(
          "첫 번째 Tree Cell의 expander와 사용자 정의 React renderer를 함께 출력합니다.",
          "Render the first Tree Cell expander together with a custom React renderer.",
        ))}
        id="tree-grid-renderer"
        title={text(defineLocalizedText("Tree Grid 사용자 정의 Renderer", "Tree Grid Custom Renderer"))}
      >
        <CominsTable
          className="example-table"
          columns={rendererColumns}
          data={rendererData}
          data-testid="tree-renderer-viewport"
          getRowId={(row) => row.id}
          onChangeData={setRendererData}
          tree
        />
      </FeatureSampleSection>

      <FeatureSampleSection
        description={text(defineLocalizedText(
          "100 Department, 900 Team, 9,000 Member로 구성된 10,000 node를 fixed-height virtual row로 출력합니다.",
          "Render 10,000 nodes made up of 100 departments, 900 teams, and 9,000 members as fixed-height virtual rows.",
        ))}
        id="tree-grid-virtual"
        title={text(defineLocalizedText("Tree Grid 가상 Row", "Tree Grid Virtual Row"))}
      >
        <p className="tree-example-count" data-testid="tree-virtual-node-count">
          {text(defineLocalizedText("10000개 node", "10000 nodes"))}
        </p>
        <CominsTable
          buffer-size={2}
          className="example-table tree-virtual-table"
          columns={treeColumns}
          data={virtualTreeData}
          data-testid="tree-virtual-viewport"
          getRowId={(row) => row.id}
          rowHeight={32}
          tree
          virtualized
        />
      </FeatureSampleSection>
    </section>
  );
}
