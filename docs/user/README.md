# English Feature Guides

These guides target 0.1.11, including opt-in TSV paste and Fill Handle. [Clipboard and Fill](09-clipboard.md) · [Row Drag migration](07-row.md).

This branch additionally documents the [0.2.0 Core migration (unreleased)](26-migration-0.2.0.md). Its neutral Core contract is not a claim about the published 0.1.x package; React UI contracts remain compatible.

[Documentation home](../README.md) · [한글 가이드](../ko/README.md) · [Playground](http://127.0.0.1:4002/docs/getting-started)

Row Drag is disabled by default in 0.1.11. Set `rowProps={{ draggable: true }}` to enable it. `onChangeData` is optional for local Row reordering; connect it to synchronize application state. A new `data` array replaces internal Rows. See the [Row guide](07-row.md).

## Getting Started

| Feature | Guide | Playground |
| --- | --- | --- |
| Install and first Table | [Quick Start](01-quick-start.md) | [`/docs/getting-started`](http://127.0.0.1:4002/docs/getting-started) |
| Playground navigation | [Playground](12-playground.md) | [`/docs/getting-started`](http://127.0.0.1:4002/docs/getting-started) |

## Basics

| Feature | Guide | Playground |
| --- | --- | --- |
| Controlled data and CRUD | [Data And CRUD](02-data-and-crud.md) | [`/examples/crud`](http://127.0.0.1:4002/examples/crud) |
| State and helpers | [Core State](03-core-state.md) | [`/api/props`](http://127.0.0.1:4002/api/props), [`/api/ref`](http://127.0.0.1:4002/api/ref) |
| Loading and empty states | [Loading And Empty State](13-loading-empty.md) | [`/examples/loading`](http://127.0.0.1:4002/examples/loading) |

## Styling And Layout

| Feature | Guide | Playground |
| --- | --- | --- |
| Sizing, themes, and CSS | [Styling](04-styling.md) | [`/examples/size`](http://127.0.0.1:4002/examples/size), [`/examples/theme`](http://127.0.0.1:4002/examples/theme) |

## Header

| Feature | Guide | Playground |
| --- | --- | --- |
| Sort, move, resize, and Header Groups | [Header](06-header.md) | [`/examples/header`](http://127.0.0.1:4002/examples/header), [`/examples/column-groups`](http://127.0.0.1:4002/examples/column-groups) |
| Controlled filters | [Column Filtering](21-column-filtering.md) | [`/examples/column-filtering`](http://127.0.0.1:4002/examples/column-filtering) |
| Left and right sticky Columns | [Column Pinning](22-column-pinning.md) | [`/examples/column-pinning`](http://127.0.0.1:4002/examples/column-pinning) |

## Row, Cell And Selection

| Feature | Guide | Playground |
| --- | --- | --- |
| Row callbacks, drag, and Context Menu | [Row](07-row.md) | [`/examples/row`](http://127.0.0.1:4002/examples/row), [`/examples/context-menu`](http://127.0.0.1:4002/examples/context-menu) |
| Formatting, renderers, and components | [Cell](08-cell.md) | [`/examples/cell`](http://127.0.0.1:4002/examples/cell), [`/examples/component`](http://127.0.0.1:4002/examples/component) |
| OS copy, TSV paste and Fill Handle | [Clipboard](09-clipboard.md) | [`/examples/selection-clipboard`](http://127.0.0.1:4002/examples/selection-clipboard), [`/examples/fill-handle`](http://127.0.0.1:4002/examples/fill-handle) |
| Independent Row/Cell selection and getters | [Selection](10-selection.md) | [`/examples/selection-clipboard`](http://127.0.0.1:4002/examples/selection-clipboard) |
| Controlled Detail Rows | [Row Expand](19-row-expand.md) | [`/examples/row-expand`](http://127.0.0.1:4002/examples/row-expand) |

## Structured Rows

| Feature | Guide | Playground |
| --- | --- | --- |
| Hierarchical data and subtree drag | [Tree Grid](17-tree-grid.md) | [`/examples/tree-grid`](http://127.0.0.1:4002/examples/tree-grid) |
| Aggregated footer | [Summary Row](18-summary-row.md) | [`/examples/summary-row`](http://127.0.0.1:4002/examples/summary-row) |
| Application-owned Groups | [Row Grouping](20-row-grouping.md) | [`/examples/row-grouping`](http://127.0.0.1:4002/examples/row-grouping) |
| Row and Group transfer | [Cross-Table Drag](23-cross-table-drag.md) | [`/examples/cross-table-drag`](http://127.0.0.1:4002/examples/cross-table-drag) |

## Data Loading And Performance

| Feature | Guide | Playground |
| --- | --- | --- |
| External page state | [Pagination](05-pagination.md) | [`/performance/pagination`](http://127.0.0.1:4002/performance/pagination) |
| Fixed and variable-height windowing | [Virtualization](11-virtualization.md) | [`/performance/virtualization`](http://127.0.0.1:4002/performance/virtualization) |
| Automatic business Row height | [Automatic Row Height](24-auto-row-height.md) | [`/performance/auto-row-height`](http://127.0.0.1:4002/performance/auto-row-height) |
| Bounded range loading | [Viewport Datasource](25-viewport-datasource.md) | [`/performance/viewport-datasource`](http://127.0.0.1:4002/performance/viewport-datasource) |
| Application-owned append loading | [Infinite Scroll](15-infinite-scroll.md) | [`/performance/infinite-scroll`](http://127.0.0.1:4002/performance/infinite-scroll) |
| Table-requested batches | [Lazy Load](16-lazy-load.md) | [`/performance/lazy-load`](http://127.0.0.1:4002/performance/lazy-load) |

## API And Utilities

| Feature | Guide | Playground |
| --- | --- | --- |
| Ref and framework-independent helpers | [Core State](03-core-state.md) | [`/api/ref`](http://127.0.0.1:4002/api/ref) |
| CSV and JSON helpers | [Export](14-export.md) | [`/examples/export`](http://127.0.0.1:4002/examples/export) |
