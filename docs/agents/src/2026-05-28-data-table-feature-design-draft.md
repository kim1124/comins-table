# @kmsf/data-table Feature Design Draft

## Status

- Date: 2026-05-28
- Scope: AG Grid와 MUI X Data Grid의 공식 기능을 기준으로 `@kmsf/data-table`이 가져야 할 기능 범위와 단계별 설계 방향을 정리한다.
- Document type: 설계 초안. 이 문서는 production code 변경을 승인하지 않는다.

## Source Basis

공식 문서 기준으로 확인한 근거는 아래와 같다.

- AG Grid React Key Features: https://www.ag-grid.com/react-data-grid/key-features/
- AG Grid Server-Side Row Model: https://www.ag-grid.com/react-data-grid/server-side-model/
- AG Grid CSV Export: https://www.ag-grid.com/react-data-grid/csv-export/
- AG Grid Accessibility: https://www.ag-grid.com/react-data-grid/accessibility/
- AG Grid Licence and Pricing: https://www.ag-grid.com/license-pricing/
- MUI X Data Grid Quickstart: https://mui.com/x/react-data-grid/quickstart/
- MUI X Data Grid Feature Showcase: https://mui.com/x/react-data-grid/features/
- MUI X Data Grid Server-side Data: https://mui.com/x/react-data-grid/server-side-data/
- MUI X Data Grid Accessibility: https://mui.com/x/react-data-grid/accessibility/
- MUI X Data Grid Row Grouping: https://mui.com/x/react-data-grid/row-grouping/
- MUI X Data Grid Aggregation: https://mui.com/x/react-data-grid/aggregation/
- MUI X Data Grid Pivoting: https://mui.com/x/react-data-grid/pivoting/
- MUI X Data Grid Export: https://mui.com/x/react-data-grid/export/
- MUI Pricing: https://mui.com/pricing/

## Design Goal

`@kmsf/data-table`은 AG Grid를 복제하는 엔터프라이즈 그리드가 아니라, KMSF 제품군에서 반복 사용 가능한 React-first data table package여야 한다. 기본 방향은 다음과 같다.

- Next.js 전용 API 없이 React generic 환경에서 동작한다.
- React와 React DOM은 peer dependency로 유지한다.
- KMSF 앱에서는 즉시 사용할 수 있는 기본 UI를 제공하되, 장기적으로는 headless core와 styled component를 분리할 수 있는 구조를 둔다.
- 대용량, 키보드 접근성, server-side data contract를 초기 설계 기준에 포함한다.
- grouping, pivot, chart, Excel급 기능은 초기 MVP가 아니라 enterprise backlog로 분리한다.

## Competitor Analysis

| Area | AG Grid | MUI X Data Grid | KMSF Design Implication |
| --- | --- | --- | --- |
| Product stance | 독립형 고기능 grid. Community와 Enterprise 분리. | MUI 생태계 기반 open-core grid. Community, Pro, Premium 분리. | 특정 UI framework에 묶지 않는 package로 설계한다. |
| Basic data mapping | `field`, `valueGetter`, `valueFormatter`, cell renderer 중심. | `rows`, `columns`, `field`, `headerName`, `GridColDef` 중심. row `id` 권장. | `rowId`, `accessor`, `render`, `format`을 명확히 나눈 column contract가 필요하다. |
| Column features | sizing, moving, pinning, spanning, grouped headers, column state가 넓다. | resizing, autosizing, ordering, pinning, grouping 등 plan별 제공. | MVP는 width/min/max/visibility부터 시작하고, reorder/pin/group은 Phase 2로 둔다. |
| Sorting/filtering/pagination | client/server 모두 지원. filter 종류가 많고 Enterprise에는 set/multi/advanced filter가 있다. | 기본 sorting/filtering/pagination과 server mode, Data Source layer 제공. multi-sorting 등 일부는 상위 plan. | controlled model 기반으로 client/manual server mode를 모두 지원해야 한다. |
| Selection | row selection, multi-row, cell/range selection, fill handle 등 고급 선택 제공. | row selection, multi-row, cell/range selection 등 plan별 제공. | MVP는 row selection만 제공하고 cell/range selection은 후순위로 둔다. |
| Editing | cell/row editing, custom editor, validation, batch, undo/redo 등 제공. | cell/row editing, clipboard paste, undo/redo 등 제공. | 초기에는 read-mostly table로 두고, editing은 별도 승인된 Phase 2 기능으로 분리한다. |
| Export | CSV 기본, Excel은 Enterprise. CSV formula injection 방어가 중요하다. | print, CSV, clipboard, Excel export 제공. | MVP export는 dependency 없는 CSV부터 시작하고 formula injection escaping을 기본값으로 둔다. |
| Server-side data | SSRM으로 lazy loading, infinite scroll, server-side grouping/pivot/aggregation까지 다룬다. | Data Source layer가 sorting/filtering/pagination을 server mode로 자동 연결한다. | `manualSorting`, `manualFiltering`, `manualPagination`, `dataSource` 계약을 먼저 정의한다. |
| Performance | DOM virtualization, massive row count, value cache, SSRM 등 성숙함. | row/column virtualization과 performance guide 제공. | row virtualization은 MVP 이후 빠르게 도입하되 API는 처음부터 virtualization을 막지 않게 설계한다. |
| Advanced analytics | grouping, aggregation, pivoting, tree data, master/detail, integrated charts. | Premium 중심으로 row grouping, aggregation, pivoting, tree data, charts integration 제공. | 분석형 기능은 Phase 3로 두고, Phase 1 API가 이를 막지 않아야 한다. |
| Accessibility | ARIA grid roles와 WCAG target을 명시한다. | keyboard navigation, selection shortcuts, WCAG target을 명시한다. | keyboard navigation과 aria state는 기능별 acceptance criteria에 포함한다. |
| Theming | theme parameter와 theme builder 제공. | MUI theme override와 slots/custom subcomponents 제공. | CSS variables, className, slots를 기본 확장 지점으로 둔다. MUI dependency는 추가하지 않는다. |

## Proposed Product Shape

초기 공개 surface는 아래 세 계층으로 나눈다.

1. Core types
   - rows, columns, row id, sort model, filter model, pagination model, selection model을 정의한다.
   - React에 직접 묶이지 않는 순수 타입과 state transition helper를 우선한다.

2. React hook
   - `useKmsfDataTable()`이 controlled/uncontrolled state를 연결한다.
   - client mode에서는 sorting, filtering, pagination을 내부 처리한다.
   - manual server mode에서는 상태 변경 이벤트만 발생시키고 데이터 fetch는 소비자가 담당한다.

3. Default component
   - `KmsfDataTable`은 바로 사용할 수 있는 table UI를 제공한다.
   - `className`, CSS variables, slots로 visual override를 허용한다.
   - App Router, Vite, plain React에서 동일하게 동작해야 한다.

## Phase 1 MVP

Phase 1은 KMSF 내부 관리 화면에서 반복적으로 필요한 read-mostly data table을 목표로 한다.

### Data and Column Contract

- `rowId`는 필수에 가깝게 취급한다. 기본값은 `row.id`를 사용하되, 없으면 `getRowId`를 요구한다.
- column은 `id`, `header`, `accessorKey` 또는 `accessorFn`, `render`, `format`, `meta`를 가진다.
- `render`는 display-only cell을 담당한다.
- `accessor`는 sorting/filtering/export에서 사용할 원시값을 담당한다.
- column width는 `width`, `minWidth`, `maxWidth`를 지원한다.

### State Models

- `sortModel`: `{ columnId, direction }[]`
- `filterModel`: `{ columnId, operator, value }[]`
- `globalFilter`: string
- `paginationModel`: `{ pageIndex, pageSize }`
- `rowSelectionModel`: `Set<RowId>` 또는 serializable array
- 모든 model은 controlled prop과 `on*Change` callback을 가진다.

### Core Features

- single-column sorting을 기본 제공한다.
- multi-column sorting은 API shape만 열어두고 Phase 2에서 활성화한다.
- quick filter와 column filter를 제공한다.
- client pagination과 manual server pagination을 제공한다.
- single/multi row selection을 제공한다.
- loading, empty, error state를 제공한다.
- CSV export를 제공하되 formula injection escaping을 기본 활성화한다.

### Accessibility

- table/grid role 전략을 명확히 결정한다.
- sortable header는 `aria-sort`를 반영한다.
- row selection은 checkbox와 keyboard activation을 지원한다.
- interactive cell이 있는 경우 tab order가 예측 가능해야 한다.
- keyboard-only smoke test를 Phase 1 acceptance gate에 포함한다.

### Verification Gate

- type-level API test.
- sorting/filtering/pagination/selection pure helper unit test.
- component render test.
- keyboard navigation browser-capable test.
- CSV export escaping test.
- package baseline: `npm --workspace=@kmsf/data-table run verify`.

## Phase 2 Operational Table

Phase 2는 실제 운영 화면에서 필요한 조작성을 확장한다.

- multi-column sorting.
- column visibility panel.
- column resizing.
- density: compact, standard, comfortable.
- sticky header.
- row virtualization.
- column pinning.
- row action column convention.
- persisted table state import/export.
- controlled toolbar slot.
- row/cell editing with validation and dirty state.
- clipboard copy.
- server-side data source adapter with cache invalidation hooks.

Phase 2부터는 browser verification이 필수다. 특히 virtualization, resizing, sticky header, keyboard navigation은 jsdom 단위 테스트만으로 완료 처리하지 않는다.

## Phase 3 Enterprise Backlog

아래 기능은 AG Grid와 MUI X가 상용 plan에서 제공하는 영역과 겹친다. KMSF에서 실제 제품 요구가 생기기 전에는 구현하지 않는다.

- row grouping.
- aggregation footer and group aggregation.
- tree data.
- master/detail row.
- pivot table.
- cell/range selection.
- fill handle.
- Excel export.
- integrated chart generation.
- AI prompt/assistant panel.

이 기능들은 개별 feature spec으로 분리해야 하며, Phase 1/2 API가 확장을 막지 않는지 확인하는 수준만 이번 초안에 포함한다.

## Initial API Sketch

```ts
export type KmsfDataTableRowId = string | number;

export type KmsfDataTableColumn<TData, TValue = unknown> = {
  id: string;
  header: React.ReactNode;
  accessorKey?: keyof TData;
  accessorFn?: (row: TData) => TValue;
  render?: (context: {
    row: TData;
    value: TValue;
    rowId: KmsfDataTableRowId;
    columnId: string;
  }) => React.ReactNode;
  format?: (value: TValue, row: TData) => string;
  width?: number;
  minWidth?: number;
  maxWidth?: number;
  sortable?: boolean;
  filterable?: boolean;
  meta?: Record<string, unknown>;
};

export type KmsfDataTableSort = {
  columnId: string;
  direction: "asc" | "desc";
};

export type KmsfDataTablePagination = {
  pageIndex: number;
  pageSize: number;
};

export type KmsfDataTableProps<TData> = {
  rows: TData[];
  columns: Array<KmsfDataTableColumn<TData>>;
  getRowId?: (row: TData, index: number) => KmsfDataTableRowId;
  sortModel?: KmsfDataTableSort[];
  onSortModelChange?: (model: KmsfDataTableSort[]) => void;
  paginationModel?: KmsfDataTablePagination;
  onPaginationModelChange?: (model: KmsfDataTablePagination) => void;
  rowSelectionModel?: KmsfDataTableRowId[];
  onRowSelectionModelChange?: (model: KmsfDataTableRowId[]) => void;
  manualSorting?: boolean;
  manualFiltering?: boolean;
  manualPagination?: boolean;
  loading?: boolean;
  error?: React.ReactNode;
  empty?: React.ReactNode;
  className?: string;
};
```

이 sketch는 구현 계약이 아니라 방향성이다. 실제 구현 전에는 TDD plan에서 타입 이름, 파일 분리, migration path를 확정해야 한다.

## File Structure Proposal

구현 단계에서는 아래처럼 분리한다.

```text
src/
├── index.tsx
├── core/
│   ├── types.ts
│   ├── row-id.ts
│   ├── sorting.ts
│   ├── filtering.ts
│   ├── pagination.ts
│   └── csv-export.ts
└── react/
    ├── KmsfDataTable.tsx
    ├── useKmsfDataTable.ts
    └── accessibility.ts
```

현재 package는 단일 `src/index.tsx`만 가지고 있으므로, 위 구조는 Phase 1 구현 승인 이후에 적용한다. 문서 단계에서는 production file을 분리하지 않는다.

## Design Decisions

- MUI X와 호환되는 UX 용어는 참고하되 MUI dependency를 추가하지 않는다.
- AG Grid Enterprise 기능은 MVP에 넣지 않는다.
- `rowId`는 장기 확장성을 위해 초기부터 설계한다.
- export는 CSV부터 시작한다.
- server-side mode는 데이터 fetch를 package 내부에 숨기지 않는다. 상태 모델과 callback을 통해 앱 layer가 fetch를 소유한다.
- accessibility는 후속 polish가 아니라 feature acceptance 조건으로 둔다.

## Open Questions

- Phase 1에서 multi-sorting을 실제 제공할지, model만 열어둘지 결정이 필요하다.
- row virtualization을 자체 구현할지, 별도 dependency를 검토할지 결정이 필요하다.
- KMSF 앱에서 table state를 URL query와 동기화해야 하는지 확인이 필요하다.
- 디자인 시스템 token을 이 패키지가 직접 제공할지, class/CSS variable contract만 제공할지 결정이 필요하다.
- TanStack Table을 내부 engine으로 쓸지 여부는 별도 검토가 필요하다. 현재 초안은 신규 dependency 추가를 전제하지 않는다.

## Next Step

사용자 검토 후 Phase 1만 별도 implementation plan으로 분리한다. 구현 승인 전에는 production code를 변경하지 않는다.
