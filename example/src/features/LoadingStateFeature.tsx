import { useMemo, useState } from "react";

import { CominsTable, type CominsTableColumn, type CominsLazyLoadRequest } from "../../../src";
import { FeatureSampleSection } from "../components/FeatureSampleSection";
import { Button } from "../components/ui/button";
import { createBaseColumns } from "../fixtures/columns";
import { cloneBaseRows, createRows, type PersonRow } from "../fixtures/people";

type LoadingMode = "empty" | "initial" | "ready" | "refetch";
type RemoteMode = "empty" | "idle" | "load";

export function LoadingStateFeature() {
  const [mode, setMode] = useState<LoadingMode>("initial");
  const [remoteMode, setRemoteMode] = useState<RemoteMode>("idle");
  const [remoteKey, setRemoteKey] = useState(0);
  const columns = useMemo<Array<CominsTableColumn<PersonRow>>>(() => createBaseColumns(), []);
  const rows = useMemo(() => cloneBaseRows(), []);
  const remoteRows = useMemo(() => createRows(12), []);
  const tableRows = mode === "empty" || mode === "initial" ? [] : rows;
  const isLoading = mode === "initial" || mode === "refetch";
  const loadRemoteRows = (request: CominsLazyLoadRequest) =>
    new Promise<{ rows: PersonRow[]; total: number }>((resolve) => {
      window.setTimeout(() => {
        if (remoteMode === "empty") {
          resolve({ rows: [], total: 0 });
          return;
        }

        resolve({
          rows: remoteRows.slice(request.offset, request.offset + request.limit),
          total: remoteRows.length,
        });
      }, 180);
    });

  const showRemoteMode = (nextMode: Exclude<RemoteMode, "idle">) => {
    setRemoteMode(nextMode);
    setRemoteKey((current) => current + 1);
  };

  return (
    <section className="feature-panel">
      <FeatureSampleSection
        description="초기 로딩은 skeleton row를 보여주고, 재조회 로딩은 기존 Row를 유지한 상태에서 overlay를 표시합니다. 빈 데이터 상태에서도 Header는 유지됩니다."
        id="loading"
        title="Loading / Empty State"
      >
        <div className="table-toolbar">
          <Button aria-pressed={mode === "initial"} onClick={() => setMode("initial")} variant="outline">
            초기 로딩
          </Button>
          <Button aria-pressed={mode === "refetch"} onClick={() => setMode("refetch")} variant="outline">
            재조회 로딩
          </Button>
          <Button aria-pressed={mode === "empty"} onClick={() => setMode("empty")} variant="outline">
            빈 데이터
          </Button>
          <Button aria-pressed={mode === "ready"} onClick={() => setMode("ready")} variant="primary">
            데이터 표시
          </Button>
          <span className="table-toolbar__state" data-testid="loading-state">
            {mode}
          </span>
        </div>
        <CominsTable
          className="example-table"
          columns={columns}
          data={tableRows}
          data-testid="loading-state-viewport"
          emptyComponent={<span>표시할 데이터가 없습니다.</span>}
          getRowId={(row) => row.id}
          loading={isLoading}
          loadingComponent={<span>데이터를 갱신하는 중입니다.</span>}
          pagination={{ pageIndex: 0, pageSize: 5 }}
          persistHeaderWhenEmpty
          skeletonRowCount={5}
          theme={{ density: "compact" }}
        />
      </FeatureSampleSection>
      <FeatureSampleSection
        description="Lazy Load와 연결하면 초기 요청은 skeleton, 빈 응답은 emptyComponent로 표시됩니다."
        id="loading-lazy"
        title="Lazy Load 연동"
      >
        <div className="table-toolbar">
          <Button onClick={() => showRemoteMode("load")} variant="primary">
            원격 데이터 로드
          </Button>
          <Button onClick={() => showRemoteMode("empty")} variant="outline">
            원격 빈 결과
          </Button>
          <span className="table-toolbar__state" data-testid="loading-lazy-state">
            {remoteMode}
          </span>
        </div>
        {remoteMode === "idle" ? (
          <div className="feature-empty-hint">Lazy Load 상태를 선택하면 원격 데이터 예제가 표시됩니다.</div>
        ) : (
          <CominsTable
            key={remoteKey}
            className="example-table"
            columns={columns}
            data={[]}
            data-testid="loading-lazy-viewport"
            emptyComponent={<span>표시할 데이터가 없습니다.</span>}
            getRowId={(row) => row.id}
            lazyLoad
            lazyLoadBatchSize={5}
            onLazyLoad={loadRemoteRows}
            pagination={{ pageIndex: 0, pageSize: 5 }}
            persistHeaderWhenEmpty
            skeletonRowCount={5}
            theme={{ density: "compact" }}
          />
        )}
      </FeatureSampleSection>
    </section>
  );
}
