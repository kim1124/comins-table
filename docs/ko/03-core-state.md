# Core State

[문서 홈](../README.md) · [한글 가이드](README.md) · [English](../user/03-core-state.md) · [Props](http://127.0.0.1:4002/api/props) · [Ref API](http://127.0.0.1:4002/api/ref)

`createCominsTableState`는 column, data, pagination, selection, layout, sort 계산의 중심 상태를 만든다.
React 컴포넌트는 CSR 기준 controlled data 계약을 사용한다. 외부 `useState`, Zustand, Redux 같은 store의 배열 state를 `data` prop에 직접 연결하고, 테이블 내부 편집 결과는 `onChangeData`에서 외부 state에 반영한다.

<!-- comins-doc-example: fragment -->
```ts
import {
  applyCominsColumnLayout,
  createCominsTableState,
  serializeCominsColumnLayout,
  setCominsPagination,
  setCominsSortModel,
  setCominsSortState,
} from "comins-table/core";

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

Column layout persistence는 Column 순서와 지원되는 Column/Group runtime state인 표시/숨김, Column 너비, `pinned` 위치를 저장한다.

`setCominsSortState`는 전체 정렬 모델을 단일 조건으로 교체한다. `setCominsSortModel`은 우선순위가 있는 `CominsSortModel`을 적용하여 다중 컬럼 정렬을 수행한다. 중복 조건과 존재하지 않거나 정렬할 수 없는 Column 조건은 정규화 과정에서 제거한다.

## React Ref API

`getColumnLayout`, `setColumnLayout`, `getSortState`, `setSortState`, `getSortModel`, `setSortModel`, `clearSort`는 `CominsTableRef`를 통해 현재 Header 화면 상태를 조회하거나 변경합니다. 이 메서드는 React 컴포넌트에 속하며 중립 Core 상태 helper와 구분합니다.

일반 배열 기반 테이블의 `setSelectedRow`, `setSelectedRows`, `setMoveTargetRow`는 현재 정렬과 페이지 처리가 반영된 표시 Row 인덱스를 사용합니다. Viewport의 선택 설정 메서드는 데이터셋 절대 인덱스를 사용하고 미로딩 Row를 건너뜁니다. Viewport에서는 Row 이동을 지원하지 않습니다. `expand(nodeIds?)`와 `fold(nodeIds?)`는 readonly Tree Grid 노드 ID 배열을 받으며 일반 테이블에서는 동작하지 않습니다.

`getSelectedRows()`는 로딩된 선택 데이터를 데이터 순서로 반환합니다. `getSelectedCells()`는 사용 가능한 선택 Cell의 `{ rowId, columnId, value }`를 반환하며 범위는 표시 순서를 따릅니다. `getSelection()`은 선택 ID와 주소를 복사하며 Viewport 캐시에서 제거된 Row의 유지된 ID도 포함합니다. Row 객체와 Cell 값은 애플리케이션 소유 참조를 유지합니다.

선택, 복사, Fill과 펼침 제어는 [Selection](10-selection.md), [Clipboard](09-clipboard.md), [Tree Grid](17-tree-grid.md)를 참고합니다.

## 0.2.0 마이그레이션

진입점 선택, React·중립 예제, 설치 경계와 소비자 검증 체크리스트는 [전체 마이그레이션 가이드](26-migration-0.2.0.md)를 참고합니다.

`comins-table/core`는 프레임워크 중립 런타임과 타입을 제공합니다. Column·Group label은 문자열이며 Core state에는 theme이나 renderer 메타데이터가 없습니다. Core 셀 정책은 `cell.disabled`, `cell.copyable`, `cell.pasteable`에 직접 지정하며, `cell.parseClipboard`와 `cell.validateFill`도 함께 사용할 수 있습니다.

<!-- comins-doc-example: fragment -->
```ts
import { createCominsTableState, pasteCominsText } from "comins-table/core";

const state = createCominsTableState({
  rows: [{ id: "a", age: 31 }],
  getRowId: row => row.id,
  columns: [{ field: "age", label: "Age", cell: {
    pasteable: ({ row }) => row.data.age >= 0,
    parseClipboard: ({ text }) => Number(text),
  } }],
});
const edited = pasteCominsText(state, { rowId: "a", columnId: "age" }, "42");
```

기존 React state를 사용한다면 helper와 타입의 import를 `/core`에서 `comins-table` 루트로 변경합니다. JSX label, `cell.props` guard, renderer callback과 theme은 루트에서 기존 계약을 유지합니다. `CominsTableCellConfig`, `CominsTableTheme`, `formatCominsCellValue`, `getCominsCellClassName`, `getCominsCellStyle`, `setCominsTableTheme` 등 React 전용 export도 루트에서 제공합니다.

`comins-table/clipboard`와 `comins-table/selection`은 기존 React state 계약을 유지합니다. 중립 state에는 `/core`의 대응 helper를 사용하며 두 state 계약을 혼용하지 않습니다. 패키지의 React peer dependency와 React 테이블의 client-only 경계는 유지됩니다. 이번 분리는 SSR 또는 Vue 지원 선언이 아닙니다.
