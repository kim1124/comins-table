import { useCallback, useMemo, useState } from "react";
import { RotateCcw } from "lucide-react";

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

function buildInfiniteScrollUrl(request: KmsfLazyLoadRequest) {
  const params = new URLSearchParams({
    delay: "500",
    limit: String(request.limit),
    select: "id,firstName,lastName,age,email,role",
    skip: String(request.offset),
  });

  return `${DUMMY_USERS_URL}?${params.toString()}`;
}

export function InfiniteScrollFeature() {
  const [status, setStatus] = useState({ loaded: 0, total: 0 });
  const [refreshVersion, setRefreshVersion] = useState(0);
  const columns = useMemo<Array<KmsfDataTableColumn<PersonRow>>>(
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
  const loadRows = useCallback(
    async (request: KmsfLazyLoadRequest) => {
      const response = await fetch(buildInfiniteScrollUrl(request), { signal: request.signal });
      const result = (await response.json()) as DummyUsersResponse;
      const rows = result.users.map(toPersonRow);

      setStatus({ loaded: request.offset + rows.length, total: result.total });

      return { rows, total: result.total };
    },
    [refreshVersion],
  );
  const refreshRows = () => {
    setStatus({ loaded: 0, total: 0 });
    setRefreshVersion((current) => current + 1);
  };

  return (
    <section className="feature-panel">
      <FeatureSampleSection
        description="Infinite Scroll 예제는 원격 API에서 offset/limit batch를 받아 viewport 하단 근접 시 Row를 계속 append합니다."
        id="infinite-scroll"
        title="Infinite Scroll"
      >
        <div className="table-toolbar">
          <Button aria-label="새로고침" onClick={refreshRows} variant="outline">
            <RotateCcw aria-hidden="true" size={16} />
            새로고침
          </Button>
          <span className="table-toolbar__state" data-testid="infinite-load-count">
            Loaded {status.loaded} / {status.total}
          </span>
        </div>
        <KmsfDataTable
          className="example-table"
          columns={columns}
          data={[]}
          data-testid="infinite-scroll-viewport"
          getRowId={(row) => row.id}
          lazyLoad
          lazyLoadBatchSize={BATCH_SIZE}
          lazyLoadThreshold={140}
          onLazyLoad={loadRows}
          pagination={{ pageIndex: 0, pageSize: 240 }}
          skeletonRowCount={5}
          theme={{ density: "compact" }}
          virtualized
        />
      </FeatureSampleSection>
    </section>
  );
}
