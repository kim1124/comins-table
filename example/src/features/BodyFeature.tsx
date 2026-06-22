import { useMemo, useState } from "react";
import { Database } from "lucide-react";

import { KmsfDataTable, type KmsfDataTableColumn } from "../../../src";
import { ActionButton, FeatureControls } from "../components/FeatureControls";
import { FeatureSampleSection } from "../components/FeatureSampleSection";
import { createBaseColumns } from "../fixtures/columns";
import { createExampleRows, createRows, type PersonRow } from "../fixtures/people";

export function BodyFeature() {
  const [rows, setRows] = useState<PersonRow[]>(() => createExampleRows(100));
  const columns = useMemo<Array<KmsfDataTableColumn<PersonRow>>>(
    () => [
      ...createBaseColumns(),
      { field: "id", label: "ID", width: 140 },
      {
        cell: {
          format: ({ value }) => (value ? "활성" : "비활성"),
        },
        field: "active",
        label: "활성",
        width: 120,
      },
      { field: "locked", label: "잠금", width: 160 },
      {
        cell: {
          format: ({ row }) => `${row.data.role}-${row.index + 1}`,
        },
        field: "role",
        id: "group",
        label: "그룹",
        width: 140,
      },
      {
        cell: {
          format: ({ row }) => String((row.index + 1) * 10),
        },
        field: "age",
        id: "score",
        label: "점수",
        width: 120,
      },
      {
        cell: {
          format: ({ row }) => (row.data.active ? "운영" : "대기"),
        },
        field: "active",
        id: "status",
        label: "상태",
        width: 120,
      },
      {
        cell: {
          format: ({ row }) => `memo-${row.index + 1}`,
        },
        field: "name",
        id: "memo",
        label: "메모",
        width: 160,
      },
    ],
    [],
  );

  return (
    <section className="feature-panel">
      <FeatureSampleSection
        description="virtualized, 대용량 data, pagination pageSize를 사용해 Header/Body split과 대용량 데이터 표시를 확인합니다."
        id="body"
        title="대용량 데이터 표시"
      >
        <FeatureControls
          actions={
            <>
              <ActionButton icon={<Database />} onClick={() => setRows(createRows(100_000))}>
                10만 행 로드
              </ActionButton>
              <ActionButton icon={<Database />} onClick={() => setRows(createRows(1_000_000))}>
                100만 행 로드
              </ActionButton>
            </>
          }
        />
        <KmsfDataTable
          className="example-table"
          columns={columns}
          data={rows}
          data-testid="data-table-viewport"
          getRowId={(row) => row.id}
          pagination={{ pageIndex: 0, pageSize: rows.length }}
          theme={{ density: "compact" }}
          virtualized
        />
      </FeatureSampleSection>
    </section>
  );
}
