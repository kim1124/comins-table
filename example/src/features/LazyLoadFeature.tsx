import { useCallback, useMemo, useState } from "react";

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
  const [refreshVersion, setRefreshVersion] = useState(0);
  const [status, setStatus] = useState({ loaded: 0, total: 0 });
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
      const response = await fetch(buildLazyLoadUrl(request), { signal: request.signal });
      const result = (await response.json()) as DummyUsersResponse;
      const rows = result.users.map(toPersonRow);
      const loaded = request.reason === "scroll" ? request.offset + rows.length : rows.length;

      setStatus({ loaded, total: result.total });

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
        description={text(defineLocalizedText(
          "Lazy Load는 onLazyLoad가 offset, limit, AbortSignal을 받아 외부 datasource에서 Row를 가져오는 append-mode public API입니다.",
          "Lazy Load is an append-mode public API whose onLazyLoad callback receives offset, limit, and AbortSignal to fetch Rows from an external datasource.",
        ))}
        id="lazy-load"
        title={text(defineLocalizedText("지연 로딩", "Lazy Load"))}
      >
        <div className="table-toolbar">
          <Button aria-label={text(defineLocalizedText("새로고침", "Refresh"))} onClick={refreshRows} variant="outline">
            {text(defineLocalizedText("새로고침", "Refresh"))}
          </Button>
          <span className="table-toolbar__state" data-testid="lazy-load-state">
            {locale === "ko" ? `불러옴 ${status.loaded} / ${status.total}` : `Loaded ${status.loaded} / ${status.total}`}
          </span>
        </div>
        <CominsTable
          className="example-table"
          columns={columns}
          data={[]}
          data-testid="lazy-load-viewport"
          emptyComponent={<span>{text(defineLocalizedText("표시할 데이터가 없습니다.", "No data to display."))}</span>}
          getRowId={(row) => row.id}
          lazyLoad
          lazyLoadBatchSize={BATCH_SIZE}
          lazyLoadThreshold={140}
          loadingComponent={<span>{text(defineLocalizedText(
            "원격 데이터를 다시 불러오는 중입니다.",
            "Reloading remote data.",
          ))}</span>}
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
