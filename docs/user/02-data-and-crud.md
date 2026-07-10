# Data And CRUD

Core helper는 framework와 분리된 상태 모델을 제공한다. React component에서는 외부 `useState` 또는 store state 배열을 `data` prop에 직접 연결한다.

```ts
import {
  addCominsRows,
  createCominsTableState,
  deleteCominsRows,
  queryCominsRows,
  updateCominsRows,
} from "comins-table";

const state = createCominsTableState({
  columns: [{ field: "name", label: "Name" }],
  getRowId: (row: { id: string }) => row.id,
  rows: [{ id: "a", name: "Alpha" }],
});

const added = addCominsRows(state, [{ id: "b", name: "Beta" }]);
const updated = updateCominsRows(added, [{ id: "b", patch: { name: "Beta updated" } }]);
const deleted = deleteCominsRows(updated, ["a"]);
const result = queryCominsRows(deleted);
```

React component에서 발생한 데이터 변경은 `onChangeData(nextData)`로 외부 상태에 반영한다.
