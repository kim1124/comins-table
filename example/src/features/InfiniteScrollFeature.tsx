import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { CominsTable, type CominsTableColumn } from "../../../src";
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
const BATCH_SIZE = 40;

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

function buildInfiniteScrollUrl(offset: number, limit: number) {
  const params = new URLSearchParams({
    delay: "500",
    limit: String(limit),
    select: "id,firstName,lastName,age,email,role",
    skip: String(offset),
  });

  return `${DUMMY_USERS_URL}?${params.toString()}`;
}

export function InfiniteScrollFeature() {
  const { locale, text } = usePlaygroundLocale();
  const [rows, setRows] = useState<PersonRow[]>([]);
  const [total, setTotal] = useState(0);
  const [initialLoading, setInitialLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [refreshVersion, setRefreshVersion] = useState(0);
  const activeRequestRef = useRef<AbortController | null>(null);
  const pendingRequestRef = useRef(false);
  const requestVersionRef = useRef(0);
  const columns = useMemo<Array<CominsTableColumn<PersonRow>>>(
    () => [
      {
        field: "name",
        label: "Column1",
        minWidth: 100,
        width: 180,
      },
      {
        cell: { format: ({ value }) => `Data ${value}` },
        field: "age",
        label: "Column2",
        minWidth: 100,
        width: 120,
      },
      {
        cell: { format: ({ value }) => String(value) },
        field: "role",
        label: "Column3",
        minWidth: 100,
        width: 140,
      },
      {
        field: "locked",
        label: "Column4",
        minWidth: 160,
        width: 240,
      },
    ],
    [],
  );
  const loadInitialRows = useCallback(async () => {
    const requestVersion = requestVersionRef.current + 1;
    requestVersionRef.current = requestVersion;
    activeRequestRef.current?.abort();

    const controller = new AbortController();
    activeRequestRef.current = controller;
    pendingRequestRef.current = true;
    setInitialLoading(true);
    setLoadingMore(false);
    setRows([]);
    setTotal(0);

    try {
      const response = await fetch(buildInfiniteScrollUrl(0, BATCH_SIZE), {
        signal: controller.signal,
      });
      const result = (await response.json()) as DummyUsersResponse;

      if (controller.signal.aborted || requestVersion !== requestVersionRef.current) {
        return;
      }

      setRows(result.users.map(toPersonRow));
      setTotal(result.total);
    } catch {
      // Request failure and retry UI remain application-owned in this focused example.
    } finally {
      if (requestVersion === requestVersionRef.current) {
        activeRequestRef.current = null;
        pendingRequestRef.current = false;
        setInitialLoading(false);
      }
    }
  }, []);
  const appendRows = useCallback(async () => {
    const offset = rows.length;

    if (pendingRequestRef.current || offset === 0 || (total > 0 && offset >= total)) {
      return;
    }

    const requestVersion = requestVersionRef.current + 1;
    requestVersionRef.current = requestVersion;
    const controller = new AbortController();
    activeRequestRef.current = controller;
    pendingRequestRef.current = true;
    setLoadingMore(true);

    try {
      const response = await fetch(buildInfiniteScrollUrl(offset, BATCH_SIZE), {
        signal: controller.signal,
      });
      const result = (await response.json()) as DummyUsersResponse;

      if (controller.signal.aborted || requestVersion !== requestVersionRef.current) {
        return;
      }

      const nextRows = result.users.map(toPersonRow);
      setRows((currentRows) => {
        if (currentRows.length !== offset) {
          return currentRows;
        }

        const currentIds = new Set(currentRows.map((row) => row.id));
        return [...currentRows, ...nextRows.filter((row) => !currentIds.has(row.id))];
      });
      setTotal(result.total);
    } catch {
      // Preserve the current rows so the consumer can choose its own retry policy.
    } finally {
      if (requestVersion === requestVersionRef.current) {
        activeRequestRef.current = null;
        pendingRequestRef.current = false;
        setLoadingMore(false);
      }
    }
  }, [rows.length, total]);

  useEffect(() => {
    void loadInitialRows();

    return () => {
      requestVersionRef.current += 1;
      activeRequestRef.current?.abort();
      activeRequestRef.current = null;
      pendingRequestRef.current = false;
    };
  }, [loadInitialRows, refreshVersion]);

  return (
    <section className="feature-panel">
      <FeatureSampleSection
        description={text(defineLocalizedText(
          "소비자가 rows와 요청 상태를 소유하고, viewport 하단 근접 시 onLoadMore를 받아 원격 batch를 append합니다.",
          "The consumer owns rows and request state and appends a remote batch through onLoadMore near the bottom of the viewport.",
        ))}
        id="infinite-scroll"
        title={text(defineLocalizedText("무한 스크롤", "Infinite Scroll"))}
      >
        <div className="table-toolbar">
          <Button
            aria-label={text(defineLocalizedText("새로고침", "Refresh"))}
            onClick={() => setRefreshVersion((current) => current + 1)}
            variant="outline"
          >
            {text(defineLocalizedText("새로고침", "Refresh"))}
          </Button>
          <span className="table-toolbar__state" data-testid="infinite-load-count">
            {locale === "ko" ? `불러옴 ${rows.length} / ${total}` : `Loaded ${rows.length} / ${total}`}
          </span>
        </div>
        <CominsTable
          key={refreshVersion}
          className="example-table"
          columns={columns}
          data={rows}
          data-testid="infinite-scroll-viewport"
          getRowId={(row) => row.id}
          hasMoreRows={rows.length < total}
          infiniteScroll
          infiniteScrollThreshold={140}
          loading={initialLoading}
          loadingMore={loadingMore}
          onLoadMore={() => void appendRows()}
          pagination={{ pageIndex: 0, pageSize: Math.max(rows.length, BATCH_SIZE) }}
          skeletonRowCount={5}
          theme={{ density: "compact" }}
          virtualized
        />
      </FeatureSampleSection>
    </section>
  );
}
