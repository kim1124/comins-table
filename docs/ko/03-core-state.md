# Core State

`createCominsTableState`는 column, data, pagination, selection, layout, sort 계산의 중심 상태를 만든다.
React 컴포넌트는 CSR 기준 controlled data 계약을 사용한다. 외부 `useState`, Zustand, Redux 같은 store의 배열 state를 `data` prop에 직접 연결하고, 테이블 내부 편집 결과는 `onChangeData`에서 외부 state에 반영한다.

```ts
import {
  applyCominsColumnLayout,
  createCominsTableState,
  serializeCominsColumnLayout,
  setCominsPagination,
  setCominsSortModel,
  setCominsSortState,
} from "comins-table";

const state = createCominsTableState({
  columns: [
    { field: "name", label: "Name", sort: true },
    { field: "age", label: "Age", sort: true },
  ],
  getRowId: (row: { id: string }) => row.id,
  rows: [{ age: 31, id: "a", name: "Alpha" }],
});

const paged = setCominsPagination(state, { pageIndex: 0, pageSize: 25 });
const sorted = setCominsSortState(paged, { columnId: "age", direction: "asc" });
const multiSorted = setCominsSortModel(sorted, [
  { columnId: "role", direction: "asc" },
  { columnId: "age", direction: "desc" },
]);
const layout = serializeCominsColumnLayout(sorted);
const restored = applyCominsColumnLayout(sorted, layout);
```

Column layout persistence는 표시/숨김, 너비, 위치만 저장한다.

`setCominsSortState`는 전체 정렬 모델을 단일 조건으로 교체한다. `setCominsSortModel`은 우선순위가 있는 `CominsSortModel`을 적용하여 다중 컬럼 정렬을 수행한다. 중복 조건과 존재하지 않거나 정렬할 수 없는 Column 조건은 정규화 과정에서 제거한다.
