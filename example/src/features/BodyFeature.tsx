import { useMemo, useState } from "react";

import { KmsfDataTable, type KmsfDataTableColumn } from "../../../src";
import { FeatureSampleSection } from "../components/FeatureSampleSection";
import { createVirtualRows, type PersonRow } from "../fixtures/people";

export function BodyFeature() {
  const [rows] = useState<PersonRow[]>(() => createVirtualRows(100_000));
  const columns = useMemo<Array<KmsfDataTableColumn<PersonRow>>>(
    () => [
      {
        cell: {
          format: ({ row }) => `Data ${row.index + 1}`,
        },
        field: "name",
        label: "Column1",
        minWidth: 100,
        sort: true,
        width: 100,
      },
      {
        cell: {
          format: ({ row }) => `Data ${row.index + 1}`,
        },
        field: "age",
        label: "Column2",
        minWidth: 100,
        sort: true,
        width: 100,
      },
      {
        cell: {
          format: ({ row }) => `Data ${row.index + 1}`,
        },
        field: "role",
        label: "Column3",
        minWidth: 100,
        width: 100,
      },
      {
        cell: {
          format: ({ row }) => `Data ${row.index + 1}`,
        },
        field: "id",
        label: "Column4",
        minWidth: 100,
        width: 140,
      },
      {
        cell: {
          format: ({ row }) => `Data ${row.index + 1}`,
        },
        field: "active",
        label: "Column5",
        minWidth: 100,
        width: 120,
      },
      {
        cell: {
          format: ({ row }) => `Data ${row.index + 1}`,
        },
        field: "locked",
        label: "Column6",
        minWidth: 100,
        width: 160,
      },
      {
        cell: {
          format: ({ row }) => `Data ${row.index + 1}`,
        },
        field: "role",
        id: "group",
        label: "Column7",
        minWidth: 100,
        width: 140,
      },
      {
        cell: {
          format: ({ row }) => `Data ${row.index + 1}`,
        },
        field: "age",
        id: "score",
        label: "Column8",
        minWidth: 100,
        width: 120,
      },
      {
        cell: {
          format: ({ row }) => `Data ${row.index + 1}`,
        },
        field: "active",
        id: "status",
        label: "Column9",
        minWidth: 100,
        width: 120,
      },
      {
        cell: {
          format: ({ row }) => `Data ${row.index + 1}`,
        },
        field: "name",
        id: "memo",
        label: "Column10",
        minWidth: 100,
        width: 160,
      },
    ],
    [],
  );

  return (
    <section className="feature-panel">
      <FeatureSampleSection
        description="대용량 데이터 10만 Row를 처음부터 로드하고 virtualized, 안정적인 getRowId, 전체 pageSize 계약으로 렌더링 Row 수가 제한되는지 확인합니다."
        id="body"
        title="대용량 데이터 표시"
      >
        <KmsfDataTable
          className="example-table body-virtualization-table"
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
