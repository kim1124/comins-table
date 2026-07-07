# @kmsf/data-table

`@kmsf/data-table`은 KMSF 애플리케이션을 위한 CSR 중심 React 데이터 테이블 패키지다. 재사용 가능한 `KmsfDataTable` 컴포넌트와 함께 Row, Column, Layout, Selection, Clipboard, Pagination, Sorting, 2 Depth Header, Virtualized Rendering을 다루는 프레임워크 비의존 코어 헬퍼를 제공한다.

애플리케이션이 `data` 배열을 소유하고, 테이블에서 발생한 변경은 controlled callback으로 다시 전달하는 구조를 기준으로 설계되어 있다. 관리자 대시보드, 내부 운영 도구, 대용량 데이터 화면에 맞춘다.

## 패키지 상태

- 현재 `package.json` 기준 저장소 내부 `private: true` 패키지다.
- React와 React DOM은 피어 의존성으로 유지한다.
- React 컴포넌트, 코어 헬퍼, clipboard/selection helper subpath, 선택 CSS를 내보낸다.
- npm 배포 전에는 `private`, license, repository, `files`, dependency, browser verification, package tarball 포함 파일을 별도로 확인해야 한다.

## 설치

```bash
npm install @kmsf/data-table react react-dom
```

피어 의존성:

| 패키지 | 버전 |
| --- | --- |
| `react` | `>=18.0.0 <20.0.0` |
| `react-dom` | `>=18.0.0 <20.0.0` |

기본 테이블 스킨은 선택적으로 import한다.

```tsx
import "@kmsf/data-table/styles.css";
```

## 빠른 시작

```tsx
import { useState } from "react";
import { KmsfDataTable, type KmsfDataTableColumn } from "@kmsf/data-table";
import "@kmsf/data-table/styles.css";

type UserRow = {
  active: boolean;
  age: number;
  id: string;
  name: string;
  role: string;
};

const columns: Array<KmsfDataTableColumn<UserRow>> = [
  { field: "name", label: "이름", sort: true },
  { field: "age", label: "나이", sort: true },
  { field: "role", label: "역할" },
  {
    field: "active",
    label: "활성",
    cell: {
      format: ({ value }) => (value ? "활성" : "비활성"),
    },
  },
];

export function UsersTable() {
  const [data, setData] = useState<UserRow[]>([
    { active: true, age: 31, id: "u-1", name: "Kim", role: "Admin" },
  ]);

  return (
    <KmsfDataTable<UserRow>
      columns={columns}
      data={data}
      getRowId={(row) => row.id}
      onChangeData={setData}
      pagination={{ pageIndex: 0, pageSize: 30 }}
      theme={{ density: "compact" }}
    />
  );
}
```

## 주요 기능

- CSR 애플리케이션을 위한 `data`, `onChangeData` 기반 controlled state 흐름
- `field`, `id`, `label`, `sort`, `width`, `minWidth`, `maxWidth`, `props`, `header`, `cell` 기반 컬럼 정의
- Header 표시/숨김, keyboard sort, `aria-sort`, sort indicator animation, resize, long-press reorder, layout 저장/불러오기
- `columnGroups` 기반 2 Depth Header, 부모 resize, 부모 block move, 부모 hide/show, group 없는 column의 `rowSpan=2` 표시
- Row click, double click, keyboard callback, context menu callback, row selection, row drag reorder, row copy/paste
- Cell format, renderer, event, `cellSelection={false}`, 단일 cell selection, range selection, drag range selection
- Row, cell, multi-cell range copy/paste helper와 `copyable`, `pasteable`, `disabled` guard
- Pagination prop과 core pagination helper
- 10만 행 smoke와 성능 gate를 기준으로 한 virtualized rendering
- `infiniteScroll`, `hasMoreRows`, `loadingMore`, `onLoadMore` 기반 controlled Infinite Scroll
- `lazyLoad`, `lazyLoadBatchSize`, `lazyLoadThreshold`, `onLazyLoad` 기반 append-mode Lazy Load
- Loading skeleton, refetch overlay, empty state props
- `theme.className`, `theme.style`, CSS custom property 기반 Theme 지원
- Header/Cell built-in component: `button`, `input`, `checkbox`, `radio`, `select`, `toggle`, `progress`, Header 전용 `menu`, Cell 전용 `virtual-list`
- State, sorting, pagination, layout, selection, clipboard, export, virtual row 계산을 위한 프레임워크 비의존 코어 헬퍼
- 패키지 export에 포함된 TypeScript 타입

## 2 Depth Header 예제

Leaf column은 기존처럼 flat `columns`에 정의하고, 부모 Header는 별도 `columnGroups` prop으로 정의한다.

```tsx
<KmsfDataTable<UserRow>
  columns={[
    { id: "name", field: "name", label: "이름", sort: true, width: 160 },
    { id: "age", field: "age", label: "나이", sort: true, width: 120 },
    { id: "role", field: "role", label: "역할", width: 140 },
  ]}
  columnGroups={[
    {
      id: "profile",
      label: "프로필",
      children: ["name", "age"],
    },
  ]}
  data={data}
  getRowId={(row) => row.id}
/>
```

2 Depth 동작 기준:

- 최대 depth는 2다. 중첩 group은 지원하지 않는다.
- 부모 Header는 sort, Header component slot, Cell component slot을 제공하지 않는다.
- 부모 resize는 현재 자식 column width 비율을 유지하면서 `minWidth` / `maxWidth`를 적용한다.
- 부모 move는 모든 자식 column을 하나의 block으로 이동한다.
- 자식 column은 다른 group으로 이동하거나 group 밖으로 이동할 수 없다.
- 부모 hide/show는 자식 column의 effective visibility를 변경한다. 부모가 다시 표시되어도 자식 column의 개별 hidden 상태는 유지된다.
- Header 전체 표시/숨김인 `showHeader`는 group visibility와 별개이며 Header area 전체를 제거하거나 복원한다.

## 코어 헬퍼

Root export는 `KmsfDataTable`과 public core helper를 함께 제공한다. 더 좁은 import가 필요하면 안정적인 subpath를 사용할 수 있다.

```ts
import {
  createKmsfDataTableState,
  addKmsfRows,
  updateKmsfRows,
  deleteKmsfRows,
  queryKmsfRows,
  setKmsfPagination,
  setKmsfSortState,
  serializeKmsfColumnLayout,
  applyKmsfColumnLayout,
  selectRow,
  selectCell,
  selectCellRange,
  copyKmsfCellRange,
  exportKmsfRowsToCsv,
  exportKmsfRowsToJson,
  pasteKmsfCellRange,
  fillKmsfCellRange,
} from "@kmsf/data-table/core";
```

패키지 export:

| Import | 용도 |
| --- | --- |
| `@kmsf/data-table` | React component, public type, core export |
| `@kmsf/data-table/core` | Table state, row, column, layout, pagination, sorting, selection, clipboard, virtualization helper |
| `@kmsf/data-table/clipboard` | Clipboard helper subset |
| `@kmsf/data-table/selection` | Selection helper subset |
| `@kmsf/data-table/styles.css` | 선택 테이블 shell, theme class, built-in component skin |

Export helper는 UI 상태를 자동으로 읽지 않는다. Export할 row 집합과 value getter column을 호출자가 명시적으로 전달한다.

```ts
const csv = exportKmsfRowsToCsv({ columns: exportColumns, rows });
const json = exportKmsfRowsToJson({ columns: exportColumns, rows });
```

## 주요 Props

| Prop | 설명 |
| --- | --- |
| `data` | Controlled row 배열. 외부 source data가 변경되면 새 배열 참조로 교체한다. |
| `columns` | Leaf column 정의. `field`는 nested path를 지원한다. |
| `columnGroups` | 선택 2 Depth 부모 Header 정의. |
| `getRowId` | Selection, row movement, callback에 사용할 stable row id resolver. |
| `onChangeData` | Paste, row movement처럼 테이블에서 발생한 데이터 변경을 전달한다. |
| `onChangeSelection` | Row, cell, range selection 변경을 전달한다. |
| `onChangeColumnLayout` | Column width, order, visibility 변경을 전달한다. |
| `onChangeSort` | Sort 상태 변경을 전달한다. |
| `pagination` | Page index와 page size를 제어한다. |
| `loading` | 초기 빈 로딩에서는 skeleton row를 표시하고, 기존 row가 있으면 refetch overlay를 표시한다. |
| `loadingComponent` | Refetch overlay에 표시할 custom content. |
| `emptyComponent` | Loading이 아니고 표시할 row가 없을 때 보여줄 custom content. |
| `skeletonRowCount` | 초기 loading skeleton row 개수. |
| `virtualized` | 대용량 row window rendering 경로를 활성화한다. |
| `"buffer-size"` | Virtualized viewport 위/아래에 유지할 row buffer 수. 기본값은 `10`이다. |
| `rowHeight` | Virtualized row-window 계산 기준 높이. CSS row-height token을 override할 때 같은 값으로 맞춘다. |
| `infiniteScroll` | Body viewport 하단 threshold 기반 controlled append loading을 활성화한다. |
| `infiniteScrollThreshold` | Body viewport 하단에서 몇 px 이내에 들어왔을 때 `onLoadMore`를 호출할지 지정한다. 기본값은 `160`이다. |
| `hasMoreRows` | 추가 row 존재 여부. `false`이면 추가 load 요청을 막는다. |
| `loadingMore` | 중복 infinite load 요청을 막고 loading-more row를 렌더링한다. |
| `onLoadMore` | Infinite scroll threshold 도달 시 호출된다. 소비자가 `data`에 row를 append한다. |
| `lazyLoad` | `onLazyLoad` 기반 append-mode lazy datasource loading을 활성화한다. |
| `lazyLoadBatchSize` | 한 번에 요청할 row 수. 기본값은 `30`이다. |
| `lazyLoadMode` | Lazy Load mode. 현재 지원 값은 `"append"`다. |
| `lazyLoadThreshold` | Body viewport 하단에서 몇 px 이내에 들어왔을 때 lazy append 요청을 보낼지 지정한다. |
| `onLazyLoad` | `offset`, `limit`, `reason`, `AbortSignal`을 받아 row batch와 optional `total`을 반환하는 async datasource callback. |
| `theme` | 선택 `className`, `style`, `density` skin hook. 기본 제공 class는 `kmsf-data-table-theme--basic`, `--dark`, `--skyblue`, `--mint`, `--gray`, `--orange`다. |
| `showHeader` | Header area 전체를 표시하거나 제거한다. |
| `cellSelection` | Cell/range selection visual을 활성화하거나 비활성화한다. |
| `rowProps` | Row-level class, style, disabled, draggable 동작을 공급한다. |

## Ref API

```tsx
const tableRef = useRef<KmsfDataTableRef<UserRow>>(null);

tableRef.current?.getColumnLayout();
tableRef.current?.setColumnLayout(savedLayout);
tableRef.current?.getSortState();
tableRef.current?.setSortState({ columnId: "age", direction: "desc" });
tableRef.current?.clearSort();
tableRef.current?.setSelectedRow(0);
tableRef.current?.setSelectedRows([0, 1]);
tableRef.current?.setMoveTargetRow(3, 1);
```

`setSelectedRow`, `setSelectedRows`, `setMoveTargetRow`는 현재 sort와 pagination이 반영된 visible index 기준으로 동작한다.

## 플레이그라운드

저장소 루트에서 패키지 playground를 실행한다.

```bash
npm --workspace=@kmsf/data-table run dev
```

Playground는 `/docs/getting-started`에서 시작한다. CRUD, table size, Theme, Loading / Empty State, Header, 2 Depth Header, Pagination, Infinite Scroll, Lazy Load, 대용량 Virtualization, Cell, Row, Component, Selection, Clipboard, Context Menu, Export Helper 예제를 포함한다.

Legacy URL인 `/examples/basic`과 `/examples/body`는 현재 Getting Started와 Virtualization page로 redirect된다. 사용자 문서는 `docs/user/01-quick-start.md`부터 확인한다.

## 검증

Package script는 `package.json`과 일치한다.

```bash
npm --workspace=@kmsf/data-table run lint
npm --workspace=@kmsf/data-table run test:run
npm --workspace=@kmsf/data-table run build
npm --workspace=@kmsf/data-table run verify
npm --workspace=@kmsf/data-table run verify:e2e
npm --workspace=@kmsf/data-table run verify:full
npm --workspace=@kmsf/data-table run test:perf
```

## 현재 범위

현재 구현된 범위:

- CSR table rendering과 controlled data update
- Row, Cell, Selection, Clipboard, Pagination, Sorting, Layout, Header, Component, Virtualization 동작
- `columnGroups` 기반 2 Depth visual column grouping
- 배포 CSS 기반 custom-property Theme
- Loading / Empty State rendering hook
- CSV / JSON export helper
- Controlled Infinite Scroll append loading
- Append-mode Lazy Load datasource loading
- Core, clipboard, selection public helper subpath

아직 구현하지 않은 범위:

- 별도 external store adapter 객체. 현재는 `data`와 `onChangeData`를 `useState`, Zustand, Redux 또는 다른 store state에 직접 연결한다.
- Excel-like Visual Fill Handle UI. `fillKmsfCellRange` core helper는 제공하지만 drag-handle UX는 후속 범위다.
- Server-side row model, viewport datasource model, row grouping, aggregation, pivoting, tree data, master/detail, charts integration, AI assistant 기능.
