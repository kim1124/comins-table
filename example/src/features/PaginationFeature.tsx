import { useMemo, useState } from "react";

import { KmsfDataTable } from "../../../src";
import { FeatureSampleSection } from "../components/FeatureSampleSection";
import { Pagination, PaginationButton, PaginationContent, PaginationItem } from "../components/ui/pagination";
import { createBaseColumns } from "../fixtures/columns";
import { createExampleRows } from "../fixtures/people";

export function PaginationFeature() {
  const rows = useMemo(() => createExampleRows(100), []);
  const columns = useMemo(() => createBaseColumns(), []);
  const [pageIndex, setPageIndex] = useState(0);
  const pageSize = 30;
  const pageCount = Math.max(1, Math.ceil(rows.length / pageSize));
  const safePageIndex = Math.min(pageIndex, pageCount - 1);

  return (
    <section className="feature-panel">
      <FeatureSampleSection
        description="pagination prop으로 현재 pageIndex와 pageSize를 전달하고, 외부 버튼에서 페이지 이동 상태를 제어합니다."
        id="pagination"
        title="Pagination"
      >
        <div className="table-toolbar">
          <Pagination aria-label="Pagination 테이블 페이지 이동" data-testid="pagination-control">
            <PaginationContent>
              <PaginationItem>
                <PaginationButton
                  aria-label="이전"
                  disabled={safePageIndex === 0}
                  onClick={() => setPageIndex((current) => Math.max(0, current - 1))}
                >
                  이전
                </PaginationButton>
              </PaginationItem>
              <PaginationItem>
                <span className="ui-pagination__status">
                  {safePageIndex + 1} / {pageCount}
                </span>
              </PaginationItem>
              <PaginationItem>
                <PaginationButton
                  aria-label="다음"
                  disabled={safePageIndex >= pageCount - 1}
                  onClick={() => setPageIndex((current) => Math.min(pageCount - 1, current + 1))}
                >
                  다음
                </PaginationButton>
              </PaginationItem>
            </PaginationContent>
          </Pagination>
          <span className="table-toolbar__state" data-testid="pagination-state">
            Page {safePageIndex + 1} / Size {pageSize}
          </span>
        </div>
        <KmsfDataTable
          className="example-table"
          columns={columns}
          data={rows}
          data-testid="pagination-viewport"
          getRowId={(row) => row.id}
          pagination={{ pageIndex: safePageIndex, pageSize }}
          theme={{ density: "compact" }}
        />
      </FeatureSampleSection>
    </section>
  );
}
