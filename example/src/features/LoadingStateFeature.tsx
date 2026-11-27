import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { CominsTable, type CominsTableColumn, type CominsLazyLoadRequest } from "../../../src";
import { FeatureSampleSection } from "../components/FeatureSampleSection";
import { Button } from "../components/ui/button";
import {
  buildDummyUsersUrl,
  toPersonRows,
  type DummyUsersResponse,
} from "../data/dummyUsers";
import { createBaseColumns } from "../fixtures/columns";
import type { PersonRow } from "../fixtures/people";
import { defineLocalizedText, usePlaygroundLocale } from "../i18n/playground-locale";

type LoadingMode = "empty" | "error" | "initial" | "ready" | "refetch";
type RemoteMode = "empty" | "idle" | "load";

const REMOTE_EMPTY_OFFSET = 10_000;

export function LoadingStateFeature() {
  const { locale, text } = usePlaygroundLocale();
  const [mode, setMode] = useState<LoadingMode>("initial");
  const [rows, setRows] = useState<PersonRow[]>([]);
  const [remoteMode, setRemoteMode] = useState<RemoteMode>("idle");
  const [remoteKey, setRemoteKey] = useState(0);
  const [remoteLoading, setRemoteLoading] = useState(false);
  const [remoteError, setRemoteError] = useState(false);
  const [remoteTableRows, setRemoteTableRows] = useState<PersonRow[]>([]);
  const activePrimaryRequestRef = useRef<AbortController | null>(null);
  const primaryRequestVersionRef = useRef(0);
  const remoteIntentRef = useRef<{ mode: Exclude<RemoteMode, "idle">; version: number }>({
    mode: "load",
    version: 0,
  });
  const columns = useMemo<Array<CominsTableColumn<PersonRow>>>(() => createBaseColumns(), []);
  const isLoading = mode === "initial" || mode === "refetch";
  const loadPrimaryRows = useCallback(async (nextMode: Exclude<LoadingMode, "error">) => {
    const requestVersion = primaryRequestVersionRef.current + 1;
    const controller = new AbortController();
    const offset = nextMode === "empty" ? REMOTE_EMPTY_OFFSET : 0;

    primaryRequestVersionRef.current = requestVersion;
    activePrimaryRequestRef.current?.abort();
    activePrimaryRequestRef.current = controller;
    setMode(nextMode);
    if (nextMode === "initial") {
      setRows([]);
    }

    try {
      const response = await fetch(buildDummyUsersUrl(offset, 0), {
        signal: controller.signal,
      });
      if (!response.ok) throw new Error("Could not load rows");
      const result = (await response.json()) as DummyUsersResponse;

      if (controller.signal.aborted || requestVersion !== primaryRequestVersionRef.current) {
        return;
      }

      setRows(toPersonRows(result));
      setMode(nextMode === "empty" ? "empty" : "ready");
    } catch (error) {
      if (
        requestVersion === primaryRequestVersionRef.current
        && !(error instanceof DOMException && error.name === "AbortError")
      ) {
        setMode("error");
      }
    } finally {
      if (requestVersion === primaryRequestVersionRef.current) {
        activePrimaryRequestRef.current = null;
      }
    }
  }, []);

  useEffect(() => {
    void loadPrimaryRows("initial");

    return () => {
      primaryRequestVersionRef.current += 1;
      activePrimaryRequestRef.current?.abort();
      activePrimaryRequestRef.current = null;
      remoteIntentRef.current = {
        ...remoteIntentRef.current,
        version: remoteIntentRef.current.version + 1,
      };
    };
  }, [loadPrimaryRows]);
  const loadRemoteRows = useCallback(async (request: CominsLazyLoadRequest) => {
    const intent = remoteIntentRef.current;
    const offset = intent.mode === "empty" ? REMOTE_EMPTY_OFFSET : request.offset;

    setRemoteLoading(true);
    setRemoteError(false);

    try {
      const response = await fetch(buildDummyUsersUrl(offset, 0), {
        signal: request.signal,
      });
      if (!response.ok) throw new Error("Could not load rows");
      const result = (await response.json()) as DummyUsersResponse;

      if (request.signal.aborted || intent.version !== remoteIntentRef.current.version) {
        return;
      }

      setRemoteTableRows(toPersonRows(result));
    } catch {
      if (!request.signal.aborted && intent.version === remoteIntentRef.current.version) setRemoteError(true);
    } finally {
      if (intent.version === remoteIntentRef.current.version) {
        setRemoteLoading(false);
      }
    }
  }, []);

  const showRemoteMode = (nextMode: Exclude<RemoteMode, "idle">) => {
    remoteIntentRef.current = {
      mode: nextMode,
      version: remoteIntentRef.current.version + 1,
    };
    setRemoteLoading(false);
    setRemoteTableRows([]);
    setRemoteMode(nextMode);
    setRemoteKey((current) => current + 1);
  };

  return (
    <section className="feature-panel">
      <FeatureSampleSection
        description={text(defineLocalizedText(
          "원격 API의 전체 Row를 제한 없이 가져옵니다. 초기 로딩은 skeleton, 재조회는 기존 Row 위 overlay, 빈 응답은 emptyComponent로 표시합니다.",
          "Fetch and display every row from the remote API. Initial loading uses skeletons, refetch keeps rows under an overlay, and an empty response uses emptyComponent.",
        ))}
        id="loading"
        title={text(defineLocalizedText("Loading / Empty 상태", "Loading / Empty State"))}
      >
        <div className="table-toolbar">
          <Button aria-pressed={mode === "initial"} onClick={() => void loadPrimaryRows("initial")} variant="outline">
            {text(defineLocalizedText("초기 로딩", "Initial loading"))}
          </Button>
          <Button aria-pressed={mode === "refetch"} onClick={() => void loadPrimaryRows("refetch")} variant="outline">
            {text(defineLocalizedText("재조회 로딩", "Refetch loading"))}
          </Button>
          <Button aria-pressed={mode === "empty"} onClick={() => void loadPrimaryRows("empty")} variant="outline">
            {text(defineLocalizedText("빈 데이터", "Empty data"))}
          </Button>
          <Button aria-pressed={mode === "ready"} onClick={() => void loadPrimaryRows("ready")} variant="primary">
            {text(defineLocalizedText("데이터 표시", "Show data"))}
          </Button>
          <span className="table-toolbar__state" data-testid="loading-state">
            {locale === "ko"
              ? { empty: "빈 데이터", error: "오류", initial: "초기 로딩", ready: "준비", refetch: "재조회" }[mode]
              : mode}{" · "}{rows.length}{locale === "ko" ? "개 행" : " rows"}
          </span>
        </div>
        {mode === "error" ? <p role="alert" data-testid="loading-request-error">
          {text(defineLocalizedText("행을 불러오지 못했습니다. 다시 시도해 주세요.", "Could not load rows. Please try again."))}
        </p> : null}
        <CominsTable
          className="example-table"
          columns={columns}
          data={rows}
          data-testid="loading-state-viewport"
          emptyContent={{ render: () => (<span>{text(defineLocalizedText("표시할 데이터가 없습니다.", "No rows to display."))}</span>) }}
          getRowId={(row) => row.id}
          loading={isLoading}
          loadingContent={{ render: () => (<span>{text(defineLocalizedText("데이터를 갱신하는 중입니다.", "Refreshing rows."))}</span>) }}
          pagination={{ pageIndex: 0, pageSize: Math.max(1, rows.length) }}
          persistHeaderWhenEmpty
          skeletonRowCount={5}
          theme={{ density: "compact" }}
        />
      </FeatureSampleSection>
      <FeatureSampleSection
        description={text(defineLocalizedText(
          "같은 원격 API의 전체 응답을 Lazy Load 초기 요청으로 가져옵니다. 초기 요청은 skeleton, 범위를 벗어난 실제 빈 응답은 emptyComponent로 표시됩니다.",
          "Lazy Load initially fetches the complete response from the same remote API. Initial requests use skeleton rows and a real out-of-range empty response uses emptyComponent.",
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
              : remoteMode}{" · "}{remoteTableRows.length}{locale === "ko" ? "개 행" : " rows"}
          </span>
        </div>
        {remoteError ? <p role="alert" data-testid="loading-lazy-request-error">
          {text(defineLocalizedText("원격 요청에 실패했습니다.", "The remote request failed."))}
        </p> : null}
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
            data={remoteTableRows}
            data-testid="loading-lazy-viewport"
            emptyContent={{ render: () => (<span>{text(defineLocalizedText("표시할 데이터가 없습니다.", "No rows to display."))}</span>) }}
            getRowId={(row) => row.id}
            lazyLoad
            lazyLoadBatchSize={5}
            loading={remoteLoading}
            onLazyLoad={loadRemoteRows}
            pagination={{ pageIndex: 0, pageSize: Math.max(1, remoteTableRows.length) }}
            hasMoreRows={false}
            persistHeaderWhenEmpty
            skeletonRowCount={5}
            theme={{ density: "compact" }}
          />
        )}
      </FeatureSampleSection>
    </section>
  );
}
