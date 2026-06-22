import { useMemo } from "react";

import { KmsfDataTable } from "../../../src";
import { FeatureSampleSection } from "../components/FeatureSampleSection";
import { createBaseColumns } from "../fixtures/columns";
import { createExampleRows } from "../fixtures/people";

export function SizeFeature() {
  const columns = useMemo(() => createBaseColumns(), []);
  const rows = useMemo(() => createExampleRows(100), []);

  return (
    <section className="feature-panel feature-panel--size">
      <FeatureSampleSection
        className="feature-option-container--size"
        description="300px, 500px, 브라우저 100% 기준으로 데이터 테이블 높이 반응을 확인합니다."
        id="size"
        title="테이블 사이즈"
      >
        <div className="size-example-grid">
          <section className="size-example">
            <h2>300px 고정</h2>
            <p>사용자가 지정한 높이 300px을 테이블이 그대로 채우는지 확인합니다.</p>
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
            <h2>상위 컨테이너 500px</h2>
            <p>상위 컨테이너 높이 500px을 테이블이 100%로 사용하는지 확인합니다.</p>
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
            <h2>브라우저 100%</h2>
            <p>브라우저 높이를 기준으로 컨테이너와 테이블이 같이 조정됩니다.</p>
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
      </FeatureSampleSection>
    </section>
  );
}
