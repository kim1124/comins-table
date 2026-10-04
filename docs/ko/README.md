# 한글 기능 가이드

이 가이드는 0.2.1 기준이며, CSV Import, 구조 Export, Tree 슬롯, 선택적으로 활성화하는 TSV 붙여넣기와 Fill Handle을 포함합니다. [Export](14-export.md) · [Tree Grid](17-tree-grid.md) · [Clipboard와 Fill](09-clipboard.md).

[0.2.0 Core 마이그레이션](26-migration-0.2.0.md)은 0.2.1에서도 유지되는 중립 Core 계약으로의 전환을 설명합니다. 기존 React UI 계약은 호환성을 유지합니다.

[문서 홈](../README.md) · [English guides](../user/README.md) · [Playground](http://127.0.0.1:4002/docs/getting-started)

0.1.11부터 Row Drag는 기본 비활성화이며 `rowProps={{ draggable: true }}`로 활성화합니다. 일반 Row의 내부 이동에는 `onChangeData`가 선택 사항입니다. 외부 상태를 동기화할 때 연결하고, 새 `data` 배열을 전달하면 해당 데이터로 교체합니다. [Row 가이드](07-row.md)를 참고합니다.

## 시작하기

| 기능 | 가이드 | Playground |
| --- | --- | --- |
| 설치와 첫 Table | [Quick Start](01-quick-start.md) | [`/docs/getting-started`](http://127.0.0.1:4002/docs/getting-started) |
| Playground 탐색 | [Playground](12-playground.md) | [`/docs/getting-started`](http://127.0.0.1:4002/docs/getting-started) |

## 기본

| 기능 | 가이드 | Playground |
| --- | --- | --- |
| Controlled data와 CRUD | [Data And CRUD](02-data-and-crud.md) | [`/examples/crud`](http://127.0.0.1:4002/examples/crud) |
| State와 helper | [Core State](03-core-state.md) | [`/api/props`](http://127.0.0.1:4002/api/props), [`/api/ref`](http://127.0.0.1:4002/api/ref) |
| Loading과 Empty 상태 | [Loading And Empty State](13-loading-empty.md) | [`/examples/loading`](http://127.0.0.1:4002/examples/loading) |

## 스타일과 Layout

| 기능 | 가이드 | Playground |
| --- | --- | --- |
| 크기, Theme과 CSS | [Styling](04-styling.md) | [`/examples/size`](http://127.0.0.1:4002/examples/size), [`/examples/theme`](http://127.0.0.1:4002/examples/theme) |

## Header

| 기능 | 가이드 | Playground |
| --- | --- | --- |
| 정렬, 이동, resize와 Header Group | [Header](06-header.md) | [`/examples/header`](http://127.0.0.1:4002/examples/header), [`/examples/column-groups`](http://127.0.0.1:4002/examples/column-groups) |
| Controlled Filter | [Column Filtering](21-column-filtering.md) | [`/examples/column-filtering`](http://127.0.0.1:4002/examples/column-filtering) |
| 좌우 고정 Column | [Column Pinning](22-column-pinning.md) | [`/examples/column-pinning`](http://127.0.0.1:4002/examples/column-pinning) |

## Row, Cell과 Selection

| 기능 | 가이드 | Playground |
| --- | --- | --- |
| Row callback, Drag와 Context Menu | [Row](07-row.md) | [`/examples/row`](http://127.0.0.1:4002/examples/row), [`/examples/context-menu`](http://127.0.0.1:4002/examples/context-menu) |
| Format, Renderer와 Component | [Cell](08-cell.md) | [`/examples/cell`](http://127.0.0.1:4002/examples/cell), [`/examples/component`](http://127.0.0.1:4002/examples/component) |
| OS 복사, TSV 붙여넣기와 Fill Handle | [Clipboard](09-clipboard.md) | [`/examples/selection-clipboard`](http://127.0.0.1:4002/examples/selection-clipboard), [`/examples/fill-handle`](http://127.0.0.1:4002/examples/fill-handle) |
| Row·Cell 독립 선택과 조회 | [Selection](10-selection.md) | [`/examples/selection-clipboard`](http://127.0.0.1:4002/examples/selection-clipboard) |
| Controlled Detail Row | [Row Expand](19-row-expand.md) | [`/examples/row-expand`](http://127.0.0.1:4002/examples/row-expand) |

## 구조화된 Row

| 기능 | 가이드 | Playground |
| --- | --- | --- |
| 계층 데이터와 하위 트리 이동 | [Tree Grid](17-tree-grid.md) | [`/examples/tree-grid`](http://127.0.0.1:4002/examples/tree-grid) |
| 집계 Footer | [Summary Row](18-summary-row.md) | [`/examples/summary-row`](http://127.0.0.1:4002/examples/summary-row) |
| Application-owned Group | [Row Grouping](20-row-grouping.md) | [`/examples/row-grouping`](http://127.0.0.1:4002/examples/row-grouping) |
| Row와 Group 이동 | [Cross-Table Drag](23-cross-table-drag.md) | [`/examples/cross-table-drag`](http://127.0.0.1:4002/examples/cross-table-drag) |

## Data Loading과 성능

| 기능 | 가이드 | Playground |
| --- | --- | --- |
| 외부 Page state | [Pagination](05-pagination.md) | [`/performance/pagination`](http://127.0.0.1:4002/performance/pagination) |
| 고정·가변 높이 Windowing | [Virtualization](11-virtualization.md) | [`/performance/virtualization`](http://127.0.0.1:4002/performance/virtualization) |
| 업무 Row 자동 높이 | [Row 자동 높이](24-auto-row-height.md) | [`/performance/auto-row-height`](http://127.0.0.1:4002/performance/auto-row-height) |
| 구간 조회와 캐시 관리 | [Viewport Datasource](25-viewport-datasource.md) | [`/performance/viewport-datasource`](http://127.0.0.1:4002/performance/viewport-datasource) |
| Application-owned Append Loading | [Infinite Scroll](15-infinite-scroll.md) | [`/performance/infinite-scroll`](http://127.0.0.1:4002/performance/infinite-scroll) |
| Table 요청 Batch | [Lazy Load](16-lazy-load.md) | [`/performance/lazy-load`](http://127.0.0.1:4002/performance/lazy-load) |

## API와 Utility

| 기능 | 가이드 | Playground |
| --- | --- | --- |
| Ref와 framework-independent helper | [Core State](03-core-state.md) | [`/api/ref`](http://127.0.0.1:4002/api/ref) |
| CSV와 JSON helper | [Export](14-export.md) | [`/examples/export`](http://127.0.0.1:4002/examples/export) |
