import { useMemo, useState } from "react";
import { Database } from "lucide-react";

import { KmsfDataTable, type KmsfDataTableColumn } from "../../../src";
import { ActionButton, FeatureControls } from "../components/FeatureControls";
import { FeatureSampleSection } from "../components/FeatureSampleSection";
import { createExampleRows, createVirtualRows, type PersonRow } from "../fixtures/people";

function formatBodyRole(index: number) {
  return index % 2 === 0 ? "Owner" : "Viewer";
}

export function BodyFeature() {
  const [rows, setRows] = useState<PersonRow[]>(() => createExampleRows(100));
  const columns = useMemo<Array<KmsfDataTableColumn<PersonRow>>>(
    () => [
      {
        cell: {
          format: ({ row }) => `Row ${row.index}`,
        },
        field: "name",
        label: "이름",
        sort: true,
      },
      {
        cell: {
          format: ({ row }) => `${row.index} years`,
          props: { style: { textAlign: "right" } },
        },
        field: "age",
        label: "나이",
        sort: true,
      },
      {
        cell: {
          format: ({ row }) => <strong>{formatBodyRole(row.index)}</strong>,
          props: { className: ({ row }) => (formatBodyRole(row.index) === "Owner" ? "cell-owner" : undefined) },
        },
        field: "role",
        label: "역할",
      },
      {
        cell: {
          format: ({ row }) => `row-${row.index}`,
        },
        field: "id",
        label: "ID",
        width: 140,
      },
      {
        cell: {
          format: ({ row }) => (row.index % 2 === 0 ? "활성" : "비활성"),
        },
        field: "active",
        label: "활성",
        width: 120,
      },
      {
        cell: {
          format: ({ row }) => `lock-${row.index}`,
        },
        field: "locked",
        label: "잠금",
        width: 160,
      },
      {
        cell: {
          format: ({ row }) => `${formatBodyRole(row.index)}-${row.index + 1}`,
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
          format: ({ row }) => (row.index % 2 === 0 ? "운영" : "대기"),
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
              <ActionButton icon={<Database />} onClick={() => setRows(createVirtualRows(100_000))}>
                10만 행 로드
              </ActionButton>
            </>
          }
        />
        <KmsfDataTable
          className="example-table"
          columns={columns}
          data={rows}
          data-testid="data-table-viewport"
          getRowId={(_row, index) => index}
          pagination={{ pageIndex: 0, pageSize: rows.length }}
          theme={{ density: "compact" }}
          virtualized
        />
      </FeatureSampleSection>
    </section>
  );
}
