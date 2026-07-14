import { useState } from "react";

import { CominsTable, type CominsTreeNode } from "../../../src";
import { FeatureSampleSection } from "../components/FeatureSampleSection";
import { createBaseColumns } from "../fixtures/columns";
import type { PersonRow } from "../fixtures/people";

const treeColumns = createBaseColumns();

const initialTreeData: Array<CominsTreeNode<PersonRow>> = [
  {
    children: [
      {
        children: [
          {
            item: { active: true, age: 12, id: "platform-api", name: "API Guild", role: "Viewer" },
          },
        ],
        item: { active: true, age: 32, id: "team-platform", name: "Platform Team", role: "Editor" },
      },
      {
        item: { active: false, age: 28, id: "team-client", name: "Client Team", role: "Editor" },
      },
    ],
    item: { active: true, age: 60, id: "department-engineering", name: "Engineering", role: "Owner" },
  },
  {
    children: [
      {
        item: { active: true, age: 26, id: "team-product", name: "Product Team", role: "Viewer" },
      },
    ],
    item: { active: false, age: 44, id: "department-design", name: "Design", role: "Owner" },
  },
];

export function TreeGridFeature() {
  const [data, setData] = useState(initialTreeData);

  return (
    <section className="feature-panel">
      <FeatureSampleSection
        description="기존 PersonRow 컬럼은 node.item을 그대로 읽습니다. 부서의 펼침 버튼은 제어형 tree data의 expand 값만 변경합니다."
        id="tree-grid-basic"
        title="제어형 계층 데이터"
      >
        <CominsTable
          className="example-table"
          columns={treeColumns}
          data={data}
          data-testid="tree-grid-viewport"
          getRowId={(row) => row.id}
          onChangeData={setData}
          summary={{ columns: { age: "sum" } }}
          theme={{ density: "compact" }}
          tree
          virtualized
        />
      </FeatureSampleSection>
    </section>
  );
}
