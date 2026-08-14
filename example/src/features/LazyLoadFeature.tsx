import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { CominsTable, type CominsTableColumn, type CominsLazyLoadRequest } from "../../../src";
import { FeatureSampleSection } from "../components/FeatureSampleSection";
import { Button } from "../components/ui/button";
import type { PersonRow } from "../fixtures/people";
import { defineLocalizedText, usePlaygroundLocale } from "../i18n/playground-locale";

type DummyUser = {
  age: number;
  email: string;
  firstName: string;
  id: number;
  lastName: string;
  role?: string;
};

type DummyUsersResponse = {
  limit: number;
  skip: number;
  total: number;
  users: DummyUser[];
};

const DUMMY_USERS_URL = "https://dummyjson.com/users";
const BATCH_SIZE = 30;

function toPersonRow(user: DummyUser): PersonRow {
  return {
    active: user.id % 2 === 0,
    age: user.age,
    id: `dummy-${user.id}`,
    locked: user.email,
    name: `${user.firstName} ${user.lastName}`,
    role: user.role ?? (user.id % 2 === 0 ? "Owner" : "Viewer"),
  };
}

function buildLazyLoadUrl(request: CominsLazyLoadRequest) {
  const params = new URLSearchParams({
    delay: "700",
    limit: String(request.limit),
    select: "id,firstName,lastName,age,email,role",
    skip: String(request.offset),
  });

  return `${DUMMY_USERS_URL}?${params.toString()}`;
}

export function LazyLoadFeature() {
  const { locale, text } = usePlaygroundLocale();
  const activeRequestRef = useRef<AbortController | null>(null);
  const requestVersionRef = useRef(0);
  const [rows, setRows] = useState<PersonRow[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const columns = useMemo<Array<CominsTableColumn<PersonRow>>>(
    () => [
      { field: "name", label: "Column1", minWidth: 100, width: 180 },
      { field: "age", label: "Column2", minWidth: 100, width: 120 },
      { field: "role", label: "Column3", minWidth: 100, width: 140 },
      { field: "locked", label: "Column4", minWidth: 160, width: 240 },
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
        const response = await fetch(buildLazyLoadUrl(request), { signal: controller.signal });
        const result = (await response.json()) as DummyUsersResponse;

        if (controller.signal.aborted || requestVersionRef.current !== requestVersion) {
          return;
        }

        const nextRows = result.users.map(toPersonRow);
        setRows((current) => request.reason === "scroll" ? [...current, ...nextRows] : nextRows);
        setTotal(result.total);
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
    setTotal(0);
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
          "Lazy Load는 request 시점을 전달하고 application이 controlled Row 배열과 loading 상태를 갱신하는 append-mode public API입니다.",
          "Lazy Load is an append-mode public API that emits request timing while the application updates controlled rows and loading state.",
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
            "원격 데이터를 다시 불러오는 중입니다.",
            "Reloading remote data.",
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
