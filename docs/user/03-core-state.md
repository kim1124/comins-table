# Core State

`createKmsfDataTableState`는 column, data, pagination, selection, layout, sort 계산의 중심 상태를 만든다.

```ts
import {
  applyKmsfColumnLayout,
  createKmsfDataTableState,
  serializeKmsfColumnLayout,
  setKmsfPagination,
  setKmsfSortState,
} from "@kmsf/data-table";

const state = createKmsfDataTableState({
  columns: [
    { field: "name", label: "Name", sort: true },
    { field: "age", label: "Age", sort: true },
  ],
  getRowId: (row: { id: string }) => row.id,
  rows: [{ age: 31, id: "a", name: "Alpha" }],
});

const paged = setKmsfPagination(state, { pageIndex: 0, pageSize: 25 });
const sorted = setKmsfSortState(paged, { columnId: "age", direction: "asc" });
const layout = serializeKmsfColumnLayout(sorted);
const restored = applyKmsfColumnLayout(sorted, layout);
```

Column layout persistence는 표시/숨김, 너비, 위치만 저장한다.
