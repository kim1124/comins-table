import { useMemo } from "react";

import { KmsfDataTable } from "../../../src";
import { createBaseColumns } from "../fixtures/columns";
import { createExampleRows } from "../fixtures/people";

export function SizeFeature() {
  const columns = useMemo(() => createBaseColumns(), []);
  const rows = useMemo(() => createExampleRows(100), []);

  return (
    <section className="feature-panel feature-panel--size">
      <div className="size-example-grid">
        <section className="size-example">
          <h2>높이 수동 지정</h2>
          <p>부모 영역을 320px로 고정하고 테이블은 해당 영역을 100% 사용합니다.</p>
          <div className="size-case size-case--manual" data-testid="size-case-manual">
            <KmsfDataTable
              className="size-table"
              columns={columns}
              data={rows}
              data-testid="data-table-size-manual"
              getRowId={(row) => row.id}
              pagination={{ pageIndex: 0, pageSize: 100 }}
              theme={{ density: "compact" }}
            />
          </div>
        </section>
        <section className="size-example">
          <h2>상위 컨테이너 크기 따라가기</h2>
          <p>상위 컨테이너를 360px로 지정하고 테이블은 상위 요소 크기를 그대로 따릅니다.</p>
          <div className="size-case size-case--parent" data-testid="size-case-parent">
            <KmsfDataTable
              className="size-table"
              columns={columns}
              data={rows}
              data-testid="data-table-size-parent"
              getRowId={(row) => row.id}
              pagination={{ pageIndex: 0, pageSize: 100 }}
              theme={{ density: "compact" }}
            />
          </div>
        </section>
        <section className="size-example">
          <h2>브라우저 리사이즈 반응</h2>
          <p>브라우저 높이를 기준으로 컨테이너 높이가 변하고 테이블도 같이 조정됩니다.</p>
          <div className="size-case size-case--responsive" data-testid="size-case-responsive">
            <KmsfDataTable
              className="size-table"
              columns={columns}
              data={rows}
              data-testid="data-table-size-responsive"
              getRowId={(row) => row.id}
              pagination={{ pageIndex: 0, pageSize: 100 }}
              theme={{ density: "compact" }}
            />
          </div>
        </section>
      </div>
    </section>
  );
}
