import { useCallback, useMemo, useState } from "react";

import { KmsfDataTable, type KmsfDataTableColumn, type KmsfLazyLoadRequest } from "../../../src";
import { FeatureSampleSection } from "../components/FeatureSampleSection";
import { Button } from "../components/ui/button";
import type { PersonRow } from "../fixtures/people";

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

function buildLazyLoadUrl(request: KmsfLazyLoadRequest, emptyMode: boolean) {
  const params = new URLSearchParams({
    delay: "700",
    limit: String(request.limit),
    select: "id,firstName,lastName,age,email,role",
    skip: String(request.offset),
  });

  if (emptyMode) {
    params.set("empty", "true");
  }

  return `${DUMMY_USERS_URL}?${params.toString()}`;
}

export function LazyLoadFeature() {
  const [emptyMode, setEmptyMode] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);
  const [status, setStatus] = useState({ loaded: 0, total: 0 });
  const columns = useMemo<Array<KmsfDataTableColumn<PersonRow>>>(
    () => [
      { field: "name", label: "Column1", minWidth: 100, width: 180 },
      { field: "age", label: "Column2", minWidth: 100, width: 120 },
      { field: "role", label: "Column3", minWidth: 100, width: 140 },
      { field: "locked", label: "Column4", minWidth: 160, width: 240 },
    ],
    [],
  );
  const loadRows = useCallback(
    async (request: KmsfLazyLoadRequest) => {
      const response = await fetch(buildLazyLoadUrl(request, emptyMode), { signal: request.signal });
      const result = (await response.json()) as DummyUsersResponse;

      if (emptyMode) {
        setStatus({ loaded: 0, total: 0 });
        return { rows: [], total: 0 };
      }

      const rows = result.users.map(toPersonRow);
      const loaded = request.reason === "scroll" ? request.offset + rows.length : rows.length;

      setStatus({ loaded, total: result.total });

      return { rows, total: result.total };
    },
    [emptyMode],
  );

  const reload = (nextEmptyMode: boolean) => {
    setEmptyMode(nextEmptyMode);
    setStatus({ loaded: 0, total: 0 });
    setReloadKey((current) => current + 1);
  };

  const refresh = async () => {
    setRefreshing(true);

    try {
      const controller = new AbortController();
      const response = await fetch(
        buildLazyLoadUrl({ limit: BATCH_SIZE, offset: 0, reason: "refresh", signal: controller.signal }, false),
      );
      const result = (await response.json()) as DummyUsersResponse;

      setStatus({ loaded: result.users.length, total: result.total });
    } finally {
      window.setTimeout(() => setRefreshing(false), 160);
    }
  };

  return (
    <section className="feature-panel">
      <FeatureSampleSection
        description="Lazy Load는 onLazyLoad가 offset, limit, AbortSignal을 받아 외부 datasource에서 Row를 가져오는 append-mode public API입니다."
        id="lazy-load"
        title="Lazy Load"
      >
        <div className="table-toolbar">
          <Button onClick={() => reload(false)} variant="primary">
            데이터 로드
          </Button>
          <Button onClick={refresh} variant="outline">
            새로고침
          </Button>
          <Button onClick={() => reload(true)} variant="outline">
            빈 결과
          </Button>
          <span className="table-toolbar__state" data-testid="lazy-load-state">
            Loaded {status.loaded} / {status.total}
          </span>
        </div>
        <KmsfDataTable
          key={reloadKey}
          className="example-table"
          columns={columns}
          data={[]}
          data-testid="lazy-load-viewport"
          emptyComponent={<span>표시할 데이터가 없습니다.</span>}
          getRowId={(row) => row.id}
          lazyLoad
          lazyLoadBatchSize={BATCH_SIZE}
          lazyLoadThreshold={140}
          loading={refreshing}
          loadingComponent={<span>원격 데이터를 다시 불러오는 중입니다.</span>}
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
