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

## 데이터 소유권과 화면 상태

테이블 내부 편집에서 `onChangeData`는 다음 일반 Row 배열 또는 Tree Grid 노드 배열을 전달합니다. 변경을 유지하려면 해당 배열을 `data`에 다시 전달합니다. Viewport 모드는 전체 배열 대신 제어되는 블록 스냅샷을 사용하며, `useCominsViewport`가 스냅샷과 콜백을 연결합니다. 다른 제어 모델은 `onChangeData`가 아닌 각 모델의 값 prop과 대응 콜백을 사용합니다.

선택, 열 배치, 정렬은 테이블 내부 화면 상태입니다. `onChangeSelection`, `onChangeColumnLayout`, `onChangeSort`, `onChangeSortModel`은 변경을 관찰해 외부 동기화나 저장에 사용할 수 있습니다. 콜백을 생략해도 해당 내부 상태는 갱신됩니다.

복원이 지원되는 항목은 Ref API를 사용합니다. `setSelectedRow`와 `setSelectedRows`는 표시 인덱스로 Row 선택을 복원하고, `setColumnLayout`은 열 배치를 복원합니다. `setSortState`와 `clearSort`는 정렬을 설정하거나 해제하며, `setSortModel`은 순서가 있는 전체 정렬 모델을 복원합니다. `getColumnLayout`, `getSortState`, `getSortModel`은 현재 배치와 정렬 상태를 조회합니다. 관련 계약은 [Core State와 Ref API](03-core-state.md), [제어되는 Row Expand](19-row-expand.md)를 참고합니다.

## Playground 데이터

CRUD 예제는 수정 가능한 데이터 키와 Column 이름을 `column1`부터 `column6`까지 동일하게 사용합니다. 별도의 내부 `id`는 선택·삭제를 위해 유지하며 JSON 편집창에서 제외합니다. `column4`를 포함한 표시 필드 6개를 모두 수정해도 Row 식별자는 바뀌지 않습니다. 예제의 필드 규칙이며 라이브러리는 application이 정의한 필드와 label을 허용합니다. 구간 조회와 로딩된 Cell 편집에는 배열 CRUD helper 대신 [Viewport Datasource](25-viewport-datasource.md)를 사용합니다.
