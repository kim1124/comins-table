import { useState } from "react";

import { KmsfDataTable } from "../../../src";
import { Button } from "../components/ui/button";
import { createBaseColumns } from "../fixtures/columns";
import { cloneBaseRows, createRows, type PersonRow } from "../fixtures/people";

export function BodyFeature() {
  const [rows, setRows] = useState<PersonRow[]>(() => cloneBaseRows());

  return (
    <section className="feature-panel">
      <section className="feature-doc" data-testid="feature-doc-body">
        <h2>본문 예제 설명</h2>
        <p>100만 행까지 현재 virtualized 렌더링 경로를 확인합니다.</p>
        <p>Header와 Body는 분리된 table로 렌더링하고, 스크롤 중 Header 위치와 컬럼 정렬을 유지합니다.</p>
      </section>
      <div className="feature-controls">
        <Button onClick={() => setRows(createRows(100_000))} variant="secondary">
          10만 행 로드
        </Button>
        <Button onClick={() => setRows(createRows(1_000_000))} variant="secondary">
          100만 행 로드
        </Button>
        <span data-testid="virtual-row-count">{rows.length}</span>
      </div>
      <div className="evidence-grid">
        <span data-testid="body-proof-virtualization">
          virtualized:true / rows:{rows.length} / Lazy-load:후속
        </span>
        <span>Header/Body table split 유지</span>
      </div>
      <KmsfDataTable
        className="example-table"
        columns={createBaseColumns()}
        data={rows}
        data-testid="data-table-viewport"
        getRowId={(row) => row.id}
        pagination={{ pageIndex: 0, pageSize: rows.length }}
        theme={{ density: "compact" }}
        virtualized
      />
    </section>
  );
}
