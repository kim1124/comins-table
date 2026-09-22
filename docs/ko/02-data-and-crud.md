# Data And CRUD

[문서 홈](../README.md) · [한글 가이드](README.md) · [English](../user/02-data-and-crud.md) · [Playground](http://127.0.0.1:4002/examples/crud)

Core helper는 framework와 분리된 상태 모델을 제공한다. React component에서는 외부 `useState` 또는 store state 배열을 `data` prop에 직접 연결한다.

<!-- comins-doc-example: fragment -->
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

## Playground 데이터

CRUD 예제는 수정 가능한 데이터 키와 Column 이름을 `column1`부터 `column6`까지 동일하게 사용합니다. 별도의 내부 `id`는 선택·삭제를 위해 유지하며 JSON 편집창에서 제외합니다. `column4`를 포함한 표시 필드 6개를 모두 수정해도 Row 식별자는 바뀌지 않습니다. 예제의 필드 규칙이며 라이브러리는 application이 정의한 필드와 label을 허용합니다. 구간 조회와 로딩된 Cell 편집에는 배열 CRUD helper 대신 [Viewport Datasource](25-viewport-datasource.md)를 사용합니다.
