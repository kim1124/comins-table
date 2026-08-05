import { useMemo, useState } from "react";

import { CominsTable } from "../../../src";
import { FeatureSampleSection } from "../components/FeatureSampleSection";
import { Pagination, PaginationButton, PaginationContent, PaginationItem } from "../components/ui/pagination";
import { createBaseColumns } from "../fixtures/columns";
import { createExampleRows } from "../fixtures/people";
import { defineLocalizedText, usePlaygroundLocale } from "../i18n/playground-locale";

export function PaginationFeature() {
  const { locale, text } = usePlaygroundLocale();
  const rows = useMemo(() => createExampleRows(100), []);
  const columns = useMemo(() => createBaseColumns(), []);
  const [pageIndex, setPageIndex] = useState(0);
  const pageSize = 30;
  const pageCount = Math.max(1, Math.ceil(rows.length / pageSize));
  const safePageIndex = Math.min(pageIndex, pageCount - 1);

  return (
    <section className="feature-panel">
      <FeatureSampleSection
        description={text(defineLocalizedText(
          "pagination prop으로 현재 pageIndex와 pageSize를 전달하고, 외부 버튼에서 페이지 이동 상태를 제어합니다.",
          "Pass pageIndex and pageSize through pagination and control page movement with external buttons.",
        ))}
        id="pagination"
        title={text(defineLocalizedText("페이지네이션", "Pagination"))}
      >
        <div className="table-toolbar">
          <Pagination aria-label={text(defineLocalizedText("Table 페이지 이동", "Table pagination"))} data-testid="pagination-control">
            <PaginationContent>
              <PaginationItem>
                <PaginationButton
                  aria-label={text(defineLocalizedText("첫 페이지", "First page"))}
                  disabled={safePageIndex === 0}
                  onClick={() => setPageIndex(0)}
                  size="icon"
                  title={text(defineLocalizedText("첫 페이지", "First page"))}
                >
                  <span aria-hidden="true" className="ui-pagination__glyph">«</span>
                </PaginationButton>
              </PaginationItem>
              <PaginationItem>
                <PaginationButton
                  aria-label={text(defineLocalizedText("이전 페이지", "Previous page"))}
                  disabled={safePageIndex === 0}
                  onClick={() => setPageIndex((current) => Math.max(0, current - 1))}
                  size="icon"
                  title={text(defineLocalizedText("이전 페이지", "Previous page"))}
                >
                  <span aria-hidden="true" className="ui-pagination__glyph">‹</span>
                </PaginationButton>
              </PaginationItem>
              <PaginationItem>
                <span className="ui-pagination__status">
                  {safePageIndex + 1} / {pageCount}
                </span>
              </PaginationItem>
              <PaginationItem>
                <PaginationButton
                  aria-label={text(defineLocalizedText("다음 페이지", "Next page"))}
                  disabled={safePageIndex >= pageCount - 1}
                  onClick={() => setPageIndex((current) => Math.min(pageCount - 1, current + 1))}
                  size="icon"
                  title={text(defineLocalizedText("다음 페이지", "Next page"))}
                >
                  <span aria-hidden="true" className="ui-pagination__glyph">›</span>
                </PaginationButton>
              </PaginationItem>
              <PaginationItem>
                <PaginationButton
                  aria-label={text(defineLocalizedText("마지막 페이지", "Last page"))}
                  disabled={safePageIndex >= pageCount - 1}
                  onClick={() => setPageIndex(pageCount - 1)}
                  size="icon"
                  title={text(defineLocalizedText("마지막 페이지", "Last page"))}
                >
                  <span aria-hidden="true" className="ui-pagination__glyph">»</span>
                </PaginationButton>
              </PaginationItem>
            </PaginationContent>
          </Pagination>
          <span className="table-toolbar__state" data-testid="pagination-state">
            {locale === "ko" ? "페이지" : "Page"} {safePageIndex + 1} / {locale === "ko" ? "크기" : "Size"} {pageSize}
          </span>
        </div>
        <CominsTable
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
