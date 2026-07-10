# Loading And Empty State

`CominsTable`은 `loading`, `loadingComponent`, `emptyComponent`, `persistHeaderWhenEmpty`, `skeletonRowCount`로 로딩과 빈 데이터 표시를 제어한다.

```tsx
<CominsTable
  columns={columns}
  data={initialLoading ? [] : rows}
  emptyComponent={<span>표시할 데이터가 없습니다.</span>}
  getRowId={(row) => row.id}
  loading={initialLoading || refetching}
  loadingComponent={<span>데이터를 갱신하는 중입니다.</span>}
  persistHeaderWhenEmpty
  skeletonRowCount={5}
/>
```

초기 로딩처럼 `data`가 비어 있고 `loading`이 `true`이면 skeleton row를 출력한다. 이미 표시 중인 row가 있고 `loading`이 `true`이면 기존 row를 유지하고 overlay 상태만 표시한다.

`emptyComponent`는 `loading`이 `false`이고 표시할 row가 없을 때 출력한다. `persistHeaderWhenEmpty`의 기본값은 `true`이며, 빈 데이터와 초기 로딩 상태에서도 Header 구조를 유지한다.

`skeletonRowCount`는 skeleton row 개수만 제어한다. Virtualized table에서 실제 row 높이는 계속 `rowHeight`, `--comins-table-row-height`, `--comins-table-cell-height` 계약을 따른다.
