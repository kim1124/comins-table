# @kmsf/data-table

CSR-first React data table package for KMSF applications. `@kmsf/data-table` ships a reusable `KmsfDataTable` component plus framework-independent core helpers for rows, columns, layout, selection, clipboard, pagination, sorting, 2-depth headers, and virtualized rendering.

It is designed for admin dashboards, internal tools, and data-heavy product screens where the application owns the data array and the table reports mutations through controlled callbacks.

## Package Status

- Current `package.json` marks this as a repository-local `private: true` package.
- React and React DOM are peer dependencies.
- The package exports the React component, framework-independent core helpers, clipboard/selection helper subpaths, and optional CSS.
- Before npm publishing, review `private`, license, repository, files, dependency, browser verification, and package tarball contents.

## Installation

```bash
npm install @kmsf/data-table react react-dom
```

Peer dependencies:

| Package | Version |
| --- | --- |
| `react` | `>=18.0.0 <20.0.0` |
| `react-dom` | `>=18.0.0 <20.0.0` |

Optional component skin:

```tsx
import "@kmsf/data-table/styles.css";
```

## Quick Start

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
  { field: "name", label: "Name", sort: true },
  { field: "age", label: "Age", sort: true },
  { field: "role", label: "Role" },
  {
    field: "active",
    label: "Active",
    cell: {
      format: ({ value }) => (value ? "Enabled" : "Disabled"),
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

## Key Features

- Controlled external state flow with `data` and `onChangeData` for CSR applications.
- Column definitions with `field`, `id`, `label`, `sort`, `width`, `minWidth`, `maxWidth`, `props`, `header`, and `cell`.
- Header show/hide, keyboard sort, `aria-sort`, animated sort indicator, resize, long-press reorder, and layout save/load.
- 2-depth header grouping with `columnGroups`, parent resize, parent block move, parent hide/show, and ungrouped `rowSpan=2` columns.
- Row click, double click, keyboard callback, context menu callback, row selection, row drag reorder, row copy, and row paste.
- Cell formatting, cell renderer, cell events, optional `cellSelection={false}`, single cell selection, range selection, and drag range selection.
- Clipboard helpers for row, cell, and multi-cell range copy/paste with `copyable`, `pasteable`, and `disabled` guards.
- Pagination props and core pagination helpers.
- Virtualized rendering for large row sets, including the current 100000-row smoke and performance gate.
- Controlled Infinite Scroll loading with `infiniteScroll`, `hasMoreRows`, `loadingMore`, and `onLoadMore`.
- Append-mode Lazy Load datasource requests with `lazyLoad`, `lazyLoadBatchSize`, `lazyLoadThreshold`, and `onLazyLoad`.
- Loading, skeleton, refetch overlay, and empty state props for data lifecycle feedback.
- CSS custom-property Theme support through `theme.className`, `theme.style`, and the shipped sample theme classes.
- Header and Cell built-in components: `button`, `input`, `checkbox`, `radio`, `select`, `toggle`, `progress`, Header-only `menu`, and Cell-only `virtual-list`.
- Framework-independent core helpers for state, sorting, pagination, layout, selection, clipboard, export, and virtual row calculation.
- TypeScript types bundled through the package exports.

## 2-Depth Header Example

Use flat `columns` for leaf columns and a separate `columnGroups` prop for parent headers.

```tsx
<KmsfDataTable<UserRow>
  columns={[
    { id: "name", field: "name", label: "Name", sort: true, width: 160 },
    { id: "age", field: "age", label: "Age", sort: true, width: 120 },
    { id: "role", field: "role", label: "Role", width: 140 },
  ]}
  columnGroups={[
    {
      id: "profile",
      label: "Profile",
      children: ["name", "age"],
    },
  ]}
  data={data}
  getRowId={(row) => row.id}
/>
```

2-depth behavior:

- Maximum depth is 2. Nested groups are not supported.
- Parent headers do not provide sort or Header/Cell component slots.
- Parent resize updates child widths while preserving their current ratio and respecting `minWidth` / `maxWidth`.
- Parent move moves all child columns as one block.
- Child columns cannot be moved to another group or outside their group.
- Parent hide/show changes effective child column visibility. Child hidden state remains independent when the parent is visible again.
- Header-wide `showHeader` is separate from group visibility and removes or restores the whole header area.

## Core Helpers

The root export includes `KmsfDataTable` and all public core helpers. Stable subpaths are also available for narrower imports.

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

Available package exports:

| Import | Purpose |
| --- | --- |
| `@kmsf/data-table` | React component, public types, and core exports |
| `@kmsf/data-table/core` | Table state, row, column, layout, pagination, sorting, selection, clipboard, and virtualization helpers |
| `@kmsf/data-table/clipboard` | Clipboard helper subset |
| `@kmsf/data-table/selection` | Selection helper subset |
| `@kmsf/data-table/styles.css` | Optional table shell, theme classes, and built-in component skin |

Export helpers do not read UI state automatically. Pass the rows that should be exported and value getter columns explicitly.

```ts
const csv = exportKmsfRowsToCsv({ columns: exportColumns, rows });
const json = exportKmsfRowsToJson({ columns: exportColumns, rows });
```

## Important Props

| Prop | Description |
| --- | --- |
| `data` | Controlled row array. Replace the array from outside when the source data changes. |
| `columns` | Leaf column definitions. `field` supports nested paths. |
| `columnGroups` | Optional 2-depth parent header definitions. |
| `getRowId` | Stable row id resolver for selection, row movement, and callbacks. |
| `onChangeData` | Called when table-originated actions mutate data, such as paste or row movement. |
| `onChangeSelection` | Called when row, cell, or range selection changes. |
| `onChangeColumnLayout` | Called when column width, order, or visibility changes. |
| `onChangeSort` | Called when sort state changes. |
| `pagination` | Controls page index and page size. |
| `loading` | Shows skeleton rows for initial empty loading and an overlay for refetch loading with existing rows. |
| `loadingComponent` | Custom overlay content for refetch loading. |
| `emptyComponent` | Custom content when no rows are available and loading is false. |
| `skeletonRowCount` | Number of skeleton rows shown during empty initial loading. |
| `virtualized` | Enables the large-row window rendering path. |
| `"buffer-size"` | Row buffer size above and below the virtualized viewport. Default is `25`. |
| `rowHeight` | Visual row height and virtualized row-window calculation size. Keep CSS row-height tokens in sync when overriding table height styles. |
| `infiniteScroll` | Enables bottom-threshold controlled append loading on the body viewport. |
| `infiniteScrollThreshold` | Pixel distance from the body viewport bottom that triggers `onLoadMore`. Default is `160`. |
| `hasMoreRows` | Indicates whether more rows can be loaded. `false` suppresses additional load requests. |
| `loadingMore` | Blocks duplicate infinite load requests and renders a loading-more row. |
| `onLoadMore` | Called when infinite scroll reaches the configured threshold. Consumers append rows to `data`. |
| `lazyLoad` | Enables append-mode lazy datasource loading through `onLazyLoad`. |
| `lazyLoadBatchSize` | Number of rows requested per lazy load batch. Default is `30`. |
| `lazyLoadMode` | Lazy Load mode. The current supported value is `"append"`. |
| `lazyLoadThreshold` | Pixel distance from the body viewport bottom that triggers a lazy append request. |
| `onLazyLoad` | Async datasource callback receiving `offset`, `limit`, `reason`, and `AbortSignal`, and returning `rows` plus optional `total`. |
| `theme` | Optional `className`, `style`, and `density` skin hook. Shipped classes include `kmsf-data-table-theme--basic`, `--dark`, `--skyblue`, `--mint`, `--gray`, and `--orange`. |
| `showHeader` | Shows or removes the entire header area. |
| `cellSelection` | Enables or disables cell and range selection visuals. |
| `rowProps` | Supplies row-level class, style, disabled, and draggable behavior. |

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

## Playground

Run the package playground from the repository root:

```bash
npm --workspace=@kmsf/data-table run dev
```

The playground starts at `/docs/getting-started` and includes examples for CRUD, sizing, Theme, loading/empty state, headers, 2-depth headers, pagination, Infinite Scroll, Lazy Load, large data virtualization, cells, rows, components, selection, clipboard, context menus, and export helpers. Legacy `/examples/basic` and `/examples/body` URLs redirect to the current Getting Started and Virtualization pages. Repository documentation starts at `docs/user/01-quick-start.md`.

## Verification

Package scripts match `package.json`:

```bash
npm --workspace=@kmsf/data-table run lint
npm --workspace=@kmsf/data-table run test:run
npm --workspace=@kmsf/data-table run build
npm --workspace=@kmsf/data-table run verify
npm --workspace=@kmsf/data-table run verify:e2e
npm --workspace=@kmsf/data-table run verify:full
npm --workspace=@kmsf/data-table run test:perf
```

## Current Scope

Implemented now:

- CSR table rendering and controlled data updates.
- Row, cell, selection, clipboard, pagination, sorting, layout, header, component, and virtualization behavior.
- 2-depth visual column grouping through `columnGroups`.
- CSS custom-property table Theme support through the shipped stylesheet.
- Loading / Empty State rendering hooks.
- CSV / JSON export helpers.
- Controlled Infinite Scroll append loading.
- Append-mode Lazy Load datasource loading.
- Public helper subpaths for core, clipboard, and selection.

Not implemented yet:

- Dedicated external store adapter object. Use `data` plus `onChangeData` with `useState`, Zustand, Redux, or another store.
- Excel-like Visual Fill Handle UI. The `fillKmsfCellRange` core helper is available, but drag-handle UX is deferred.
- Server-side row model, viewport datasource model, row grouping, aggregation, pivoting, tree data, master/detail, charts integration, and AI assistant features.
