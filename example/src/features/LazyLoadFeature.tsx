import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { CominsTable, type CominsTableColumn, type CominsLazyLoadRequest } from "../../../src";
import { FeatureSampleSection } from "../components/FeatureSampleSection";
import { Button } from "../components/ui/button";
import { createExampleRows, type PersonRow } from "../fixtures/people";
import { defineLocalizedText, usePlaygroundLocale } from "../i18n/playground-locale";

const BATCH_SIZE = 100;
const SAMPLE_ROWS = createExampleRows(1000);

function loadSampleRows(request: CominsLazyLoadRequest, signal: AbortSignal): Promise<PersonRow[]> {
  return new Promise((resolve, reject) => {
    const abort = () => { clearTimeout(timer); reject(new DOMException("Aborted", "AbortError")); };
    const timer = setTimeout(() => {
      signal.removeEventListener("abort", abort);
      resolve(SAMPLE_ROWS.slice(request.offset, request.offset + request.limit).map(row => ({ ...row })));
    }, 250);
    if (signal.aborted) abort();
    else signal.addEventListener("abort", abort, { once: true });
  });
}

export function LazyLoadFeature() {
  const { locale, text } = usePlaygroundLocale();
  const activeRequestRef = useRef<AbortController | null>(null);
  const requestVersionRef = useRef(0);
  const [rows, setRows] = useState<PersonRow[]>([]);
  const total = SAMPLE_ROWS.length;
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const columns = useMemo<Array<CominsTableColumn<PersonRow>>>(
    () => [
      { field: "name", label: "name", minWidth: 100, width: 180 },
      { field: "age", label: "age", minWidth: 100, width: 120 },
      { field: "role", label: "role", minWidth: 100, width: 140 },
      { field: "locked", label: "locked", minWidth: 160, width: 240 },
    ],
    [],
  );
  const loadRows = useCallback(
    async (request: CominsLazyLoadRequest) => {
      activeRequestRef.current?.abort();
      const controller = new AbortController();
      const requestVersion = requestVersionRef.current + 1;
      const abortFromTable = () => controller.abort();

      requestVersionRef.current = requestVersion;
      activeRequestRef.current = controller;
      if (request.signal.aborted) {
        controller.abort();
      } else {
        request.signal.addEventListener("abort", abortFromTable, { once: true });
      }
      if (request.reason === "scroll") {
        setLoadingMore(true);
      } else {
        setLoading(true);
      }

      try {
        const nextRows = await loadSampleRows(request, controller.signal);

        if (controller.signal.aborted || requestVersionRef.current !== requestVersion) {
          return;
        }

        setRows((current) => request.reason === "scroll" ? [...current, ...nextRows] : nextRows);
      } catch (error) {
        if (!(error instanceof DOMException && error.name === "AbortError")) {
          // The consumer owns retry/error presentation; the Playground keeps the last successful rows.
        }
      } finally {
        request.signal.removeEventListener("abort", abortFromTable);

        if (requestVersionRef.current === requestVersion) {
          activeRequestRef.current = null;
          if (request.reason === "scroll") {
            setLoadingMore(false);
          } else {
            setLoading(false);
          }
        }
      }
    },
    [],
  );

  useEffect(
    () => () => {
      requestVersionRef.current += 1;
      activeRequestRef.current?.abort();
      activeRequestRef.current = null;
    },
    [],
  );

  const refreshRows = () => {
    const controller = new AbortController();

    setRows([]);
    void loadRows({
      limit: BATCH_SIZE,
      offset: 0,
      reason: "refresh",
      signal: controller.signal,
    });
  };

  return (
    <section className="feature-panel">
      <FeatureSampleSection
        description={text(defineLocalizedText(
          "1,000건의 예제 데이터를 100건씩 불러옵니다. 요청 지연과 취소를 포함한 비동기 로딩을 시뮬레이션하며, application이 data와 loading 상태를 관리합니다.",
          "Load 1,000 sample rows in batches of 100. This example simulates asynchronous loading with delay and cancellation; the application owns data and loading state.",
        ))}
        id="lazy-load"
        title={text(defineLocalizedText("지연 로딩", "Lazy Load"))}
      >
        <div className="table-toolbar">
          <Button aria-label={text(defineLocalizedText("새로고침", "Refresh"))} onClick={refreshRows} variant="outline">
            {text(defineLocalizedText("새로고침", "Refresh"))}
          </Button>
          <span className="table-toolbar__state" data-testid="lazy-load-state">
            {locale === "ko" ? `불러옴 ${rows.length} / ${total}` : `Loaded ${rows.length} / ${total}`}
          </span>
        </div>
        <CominsTable
          className="example-table"
          columns={columns}
          data={rows}
          data-testid="lazy-load-viewport"
          emptyComponent={<span>{text(defineLocalizedText("표시할 데이터가 없습니다.", "No data to display."))}</span>}
          getRowId={(row) => row.id}
          hasMoreRows={rows.length < total}
          lazyLoad
          lazyLoadBatchSize={BATCH_SIZE}
          lazyLoadThreshold={140}
          loadingComponent={<span>{text(defineLocalizedText(
            "예제 데이터를 다시 불러오는 중입니다.",
            "Reloading sample data.",
          ))}</span>}
          loading={loading}
          loadingMore={loadingMore}
          onLazyLoad={loadRows}
          pagination={{ pageIndex: 0, pageSize: BATCH_SIZE * 3 }}
          persistHeaderWhenEmpty
          skeletonRowCount={5}
          theme={{ density: "compact" }}
          virtualized
        />
      </FeatureSampleSection>
    </section>
  );
}
