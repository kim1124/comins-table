import { useMemo, useState } from "react";

import { CominsTable, type CominsTableColumn, type CominsLazyLoadRequest } from "../../../src";
import { FeatureSampleSection } from "../components/FeatureSampleSection";
import { Button } from "../components/ui/button";
import { createBaseColumns } from "../fixtures/columns";
import { createExampleRows, createRows, type PersonRow } from "../fixtures/people";
import { defineLocalizedText, usePlaygroundLocale } from "../i18n/playground-locale";

type LoadingMode = "empty" | "initial" | "ready" | "refetch";
type RemoteMode = "empty" | "idle" | "load";

export function LoadingStateFeature() {
  const { locale, text } = usePlaygroundLocale();
  const [mode, setMode] = useState<LoadingMode>("initial");
  const [remoteMode, setRemoteMode] = useState<RemoteMode>("idle");
  const [remoteKey, setRemoteKey] = useState(0);
  const columns = useMemo<Array<CominsTableColumn<PersonRow>>>(() => createBaseColumns(), []);
  const rows = useMemo(() => createExampleRows(30), []);
  const remoteRows = useMemo(() => createRows(30), []);
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
        description={text(defineLocalizedText(
          "초기 로딩은 skeleton row를 보여주고, 재조회 로딩은 기존 Row를 유지한 상태에서 overlay를 표시합니다. 빈 데이터 상태에서도 Header는 유지됩니다.",
          "Initial loading shows skeleton rows, refetch loading overlays existing rows, and the Header remains visible for empty data.",
        ))}
        id="loading"
        title={text(defineLocalizedText("Loading / Empty 상태", "Loading / Empty State"))}
      >
        <div className="table-toolbar">
          <Button aria-pressed={mode === "initial"} onClick={() => setMode("initial")} variant="outline">
            {text(defineLocalizedText("초기 로딩", "Initial loading"))}
          </Button>
          <Button aria-pressed={mode === "refetch"} onClick={() => setMode("refetch")} variant="outline">
            {text(defineLocalizedText("재조회 로딩", "Refetch loading"))}
          </Button>
          <Button aria-pressed={mode === "empty"} onClick={() => setMode("empty")} variant="outline">
            {text(defineLocalizedText("빈 데이터", "Empty data"))}
          </Button>
          <Button aria-pressed={mode === "ready"} onClick={() => setMode("ready")} variant="primary">
            {text(defineLocalizedText("데이터 표시", "Show data"))}
          </Button>
          <span className="table-toolbar__state" data-testid="loading-state">
            {locale === "ko"
              ? { empty: "빈 데이터", initial: "초기 로딩", ready: "준비", refetch: "재조회" }[mode]
              : mode}
          </span>
        </div>
        <CominsTable
          className="example-table"
          columns={columns}
          data={tableRows}
          data-testid="loading-state-viewport"
          emptyComponent={<span>{text(defineLocalizedText("표시할 데이터가 없습니다.", "No rows to display."))}</span>}
          getRowId={(row) => row.id}
          loading={isLoading}
          loadingComponent={<span>{text(defineLocalizedText("데이터를 갱신하는 중입니다.", "Refreshing rows."))}</span>}
          pagination={{ pageIndex: 0, pageSize: 30 }}
          persistHeaderWhenEmpty
          skeletonRowCount={5}
          theme={{ density: "compact" }}
        />
      </FeatureSampleSection>
      <FeatureSampleSection
        description={text(defineLocalizedText(
          "Lazy Load와 연결하면 초기 요청은 skeleton, 빈 응답은 emptyComponent로 표시됩니다.",
          "With Lazy Load, initial requests use skeleton rows and empty responses use emptyComponent.",
        ))}
        id="loading-lazy"
        title={text(defineLocalizedText("Lazy Load 연동", "Lazy Load integration"))}
      >
        <div className="table-toolbar">
          <Button onClick={() => showRemoteMode("load")} variant="primary">
            {text(defineLocalizedText("원격 데이터 로드", "Load remote data"))}
          </Button>
          <Button onClick={() => showRemoteMode("empty")} variant="outline">
            {text(defineLocalizedText("원격 빈 결과", "Load empty result"))}
          </Button>
          <span className="table-toolbar__state" data-testid="loading-lazy-state">
            {locale === "ko"
              ? { empty: "빈 결과", idle: "대기", load: "데이터" }[remoteMode]
              : remoteMode}
          </span>
        </div>
        {remoteMode === "idle" ? (
          <div className="feature-empty-hint">
            {text(defineLocalizedText(
              "Lazy Load 상태를 선택하면 원격 데이터 예제가 표시됩니다.",
              "Select a Lazy Load state to display the remote data example.",
            ))}
          </div>
        ) : (
          <CominsTable
            key={remoteKey}
            className="example-table"
            columns={columns}
            data={[]}
            data-testid="loading-lazy-viewport"
            emptyComponent={<span>{text(defineLocalizedText("표시할 데이터가 없습니다.", "No rows to display."))}</span>}
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
