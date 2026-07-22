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

const treeColumns = createBaseColumns();
const virtualTreeData = createTenThousandNodeTree();

export function TreeGridFeature() {
  const [basicData, setBasicData] = useState(createThirtyNodeTree);
  const [controlData, setControlData] = useState(createThirtyNodeTree);
  const [componentData, setComponentData] = useState(createThirtyNodeTree);
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
              "aria-label": `Active ${row.data.name}`,
              checked: Boolean(value),
            }),
            type: "checkbox",
          },
        ],
      },
      field: "active",
      label: "Active",
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
              { label: "Owner", value: "Owner" },
              { label: "Editor", value: "Editor" },
              { label: "Viewer", value: "Viewer" },
            ],
            props: ({ row, value }) => ({ "aria-label": `Role ${row.data.name}`, value: String(value) }),
            type: "select",
          },
        ],
      },
      field: "role",
      label: "Role",
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
      label: "Custom Node",
      minWidth: 220,
    },
    { field: "age", label: "Age", minWidth: 100 },
  ];

  return (
    <section className="feature-panel feature-panel--tree-grid">
      <FeatureSampleSection
        description="defaultExpandAll의 기본값 true로 3개 Department, 9개 Team, 18개 Member를 모두 출력합니다."
        id="tree-grid-basic"
        title="기본 Tree Grid"
      >
        <p className="tree-example-count" data-testid="tree-basic-node-count">30 nodes</p>
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
        description="ref의 expand/fold는 node id 배열 또는 인수 생략으로 특정 node와 전체 branch를 제어합니다."
        id="tree-grid-controls"
        title="Expand / Fold"
      >
        <div data-testid="tree-grid-controls">
          <div className="feature-controls">
            <Button onClick={() => controlRef.current?.expand(["department-1"])} variant="outline">Expand department 1</Button>
            <Button onClick={() => controlRef.current?.expand(["team-1-1"])} variant="outline">Expand team 1-1</Button>
            <Button onClick={() => controlRef.current?.expand()} variant="primary">Expand all</Button>
            <Button onClick={() => controlRef.current?.fold()} variant="secondary">Fold all</Button>
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
        description="Tree node의 item을 기준으로 rowProps className과 style을 적용합니다."
        id="tree-grid-style"
        title="Tree Grid Style / Class"
      >
        <CominsTable
          className="example-table tree-style-table"
          columns={treeColumns}
          data={createThirtyNodeTree()}
          data-testid="tree-style-viewport"
          defaultExpandAll={false}
          getRowId={(row) => row.id}
          rowProps={{
            className: (row) => (row.role === "Owner" ? "tree-row-root" : undefined),
            style: (row) => (row.active ? { fontWeight: 800 } : undefined),
          }}
          tree
        />
      </FeatureSampleSection>

      <FeatureSampleSection
        description="기존 checkbox와 select Component Cell이 Tree node.item을 동일한 payload와 immutable update로 처리합니다."
        id="tree-grid-components"
        title="Tree Grid Component Cell"
      >
        <CominsTable
          className="example-table"
          columns={componentColumns}
          data={componentData}
          data-testid="tree-components-viewport"
          defaultExpandAll={false}
          getRowId={(row) => row.id}
          onChangeData={setComponentData}
          tree
        />
      </FeatureSampleSection>

      <FeatureSampleSection
        description="첫 번째 Tree Cell의 expander와 사용자 정의 React renderer를 함께 출력합니다."
        id="tree-grid-renderer"
        title="Tree Grid Custom Renderer"
      >
        <CominsTable
          className="example-table"
          columns={rendererColumns}
          data={createThirtyNodeTree()}
          data-testid="tree-renderer-viewport"
          defaultExpandAll={false}
          getRowId={(row) => row.id}
          tree
        />
      </FeatureSampleSection>

      <FeatureSampleSection
        description="100 Department, 900 Team, 9,000 Member로 구성된 10,000 node를 fixed-height virtual row로 출력합니다."
        id="tree-grid-virtual"
        title="Tree Grid Virtual Row"
      >
        <p className="tree-example-count" data-testid="tree-virtual-node-count">10000 nodes</p>
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
