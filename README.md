# Comins Table

Comins Table is a controlled React data table for data-heavy application screens. It provides a reusable table component, framework-independent core helpers, virtualized rendering, selection, clipboard helpers, pagination, sorting, two-level headers, summary rows, controlled Tree Grid rendering, lazy loading, infinite scrolling, loading states, and CSS-variable based theming.

Comins Table is built as a standalone open-source package. It does not wrap another table or grid implementation.

## Repository Scope

Comins Table is maintained as an independent repository. This repository is the source of truth for the library, Playground, public documentation, tests, and releases.

Run development and verification commands from this repository root. Comins Table is not managed as a workspace package, so commands do not require an `npm --workspace` prefix. Future feature work and releases belong in this repository.

## Installation

```bash
npm install comins-table react react-dom
```

```tsx
import { CominsTable, type CominsTableColumn } from "comins-table";
import "comins-table/styles.css";
```

React and React DOM are peer dependencies:

| Package | Version |
| --- | --- |
| `react` | `>=18.0.0 <20.0.0` |
| `react-dom` | `>=18.0.0 <20.0.0` |

## Runtime Boundary

Comins Table is browser UI. Its package source does not make network requests, load remote assets, collect telemetry, or send error reports. Server rendering is not yet a supported integration contract; use an application client boundary where SSR is present.

## Supported Platforms

| Surface | Support |
| --- | --- |
| React | `>=18.0.0 <20.0.0` |
| React DOM | `>=18.0.0 <20.0.0` |
| Chrome and Edge | Current stable Chromium-based releases |
| Automated browser gate | Playwright-bundled Chromium |
| Firefox and Safari | Not in the supported contract until Firefox and WebKit projects are added |
| SSR | Client boundary required; server rendering is not currently supported |

## Quick Start

```tsx
import { useState } from "react";
import { CominsTable, type CominsTableColumn } from "comins-table";
import "comins-table/styles.css";

type UserRow = {
  active: boolean;
  age: number;
  id: string;
  name: string;
  role: string;
};

const columns: Array<CominsTableColumn<UserRow>> = [
  { field: "name", label: "Name", sort: true },
  { field: "age", label: "Age", sort: true },
  { field: "role", label: "Role" },
  {
    field: "active",
    label: "Active",
    cell: {
      format: ({ value }) => (value ? "Active" : "Inactive"),
    },
  },
];

export function UsersTable() {
  const [data, setData] = useState<UserRow[]>([
    { active: true, age: 31, id: "u-1", name: "Kim", role: "Admin" },
  ]);

  return (
    <CominsTable<UserRow>
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

## Core Model

Comins Table is a CSR-focused controlled component. The application owns the `data` array. Table operations such as row movement, paste, and selection emit callbacks like `onChangeData`, `onChangeSelection`, `onChangeColumnLayout`, and `onChangeSort`; the application then writes the next state back into the component.

The root export includes `CominsTable`, public types, and core helpers. Narrower helper sets are also available from stable subpaths.

| Import | Purpose |
| --- | --- |
| `comins-table` | React component, public types, and root helper exports |
| `comins-table/core` | State, row, column, pagination, sorting, layout, selection, clipboard, export, and virtualization helpers |
| `comins-table/clipboard` | Clipboard helper subset |
| `comins-table/selection` | Selection helper subset |
| `comins-table/styles.css` | Optional table shell, theme, and built-in component skin |

```ts
import {
  addCominsRows,
  applyCominsColumnLayout,
  copyCominsCellRange,
  createCominsTableState,
  deleteCominsRows,
  exportCominsRowsToCsv,
  exportCominsRowsToJson,
  fillCominsCellRange,
  pasteCominsCellRange,
  queryCominsRows,
  selectCell,
  selectCellRange,
  selectRow,
  serializeCominsColumnLayout,
  setCominsPagination,
  setCominsSortState,
  updateCominsRows,
} from "comins-table/core";
```

## Features

- Controlled `data` and `onChangeData` flow for application-owned state.
- Column definitions with `field`, `id`, `label`, `sort`, width constraints, row/cell `props`, header configuration, and cell configuration.
- Header visibility, keyboard sorting, `aria-sort`, resize, 6-pixel horizontal-drag column reorder with source placeholder, and layout persistence.
- Two-level headers through `columnGroups`.
- Row click, double click, keyboard callbacks, context menu callbacks, row selection, row drag reorder, row copy, and row paste.
- Cell formatting, custom renderer, cell events, single-cell selection, range selection, and drag range selection.
- Clipboard helpers with `props.copyable`, `props.pasteable`, and disabled guard support.
- Pagination, loading and empty states, virtualized rendering, infinite scroll, and append-mode lazy loading.
- Configurable Summary Row aggregation with `count`, `sum`, `avg`, `min`, `max`, custom aggregators, visible-column `colSpan`, output `format`, and row/cell styling.
- Controlled Tree Grid data with `{ item, expand, children }`, initial `defaultExpandAll`, array-based ref expansion, existing component/renderer cells, recursive sibling sorting, and accessible expanders.
- CSS-variable based themes, including `comins-table-theme--basic`, `--dark`, `--skyblue`, `--mint`, `--gray`, and `--orange`.
- Built-in header and cell controls: `button`, `input`, `checkbox`, `radio`, `select`, `toggle`, `progress`, header `menu`, and cell `virtual-list`.
- CSV and JSON export helpers.

## Props And Events

| Prop | Purpose |
| --- | --- |
| `data` | Controlled row array. Replace it with a new array when the source data changes. |
| `columns` | Leaf column definitions. `field` supports nested paths. |
| `columnGroups` | Optional two-level parent header definitions. |
| `getRowId` | Stable row id resolver used by selection, movement, and callbacks. |
| `onChangeData` | Receives data changes from paste and row movement. |
| `onChangeSelection` | Receives row, cell, and range selection changes. |
| `onChangeColumnLayout` | Receives column width, order, and visibility changes. |
| `onChangeSort` | Receives sort state changes. |
| `onClickCell` / `onClickRow` | Receives click payloads for cell and row interactions. |
| `pagination` | Controls `pageIndex` and `pageSize`. |
| `loading`, `emptyComponent`, `skeletonRowCount` | Control skeleton rows, refetch overlay, and empty state content. |
| `virtualized`, `"buffer-size"`, `rowHeight` | Enable and tune virtualized row rendering. |
| `infiniteScroll`, `infiniteScrollThreshold`, `hasMoreRows`, `loadingMore`, `onLoadMore` | Control append loading when the body viewport nears the bottom. |
| `lazyLoad`, `lazyLoadBatchSize`, `lazyLoadMode`, `lazyLoadThreshold`, `onLazyLoad` | Control async append-mode data loading with `AbortSignal`. |
| `summary` | Configures fixed footer aggregates, `colSpan`, `format`, `className`, and `style` by column. Tree Grid aggregates leaf items only. |
| `tree`, `defaultExpandAll` | Opt into controlled `{ item, expand, children }` data and set the initial fallback expansion state. `defaultExpandAll` defaults to `true`; explicit node state wins. Tree Grid does not support pagination, lazy loading, infinite scrolling, row drag, or row-level copy/paste in V1. |
| `theme` | Supplies optional `className`, inline `style`, and density settings. |
| `rowProps` | Supplies row class, style, disabled, and `rowProps.draggable` behavior. |

## Ref API

```tsx
const tableRef = useRef<CominsTableRef<UserRow>>(null);

tableRef.current?.getColumnLayout();
tableRef.current?.setColumnLayout(savedLayout);
tableRef.current?.getSortState();
tableRef.current?.setSortState({ columnId: "age", direction: "desc" });
tableRef.current?.clearSort();
tableRef.current?.setSelectedRow(0);
tableRef.current?.setSelectedRows([0, 1]);
tableRef.current?.setMoveTargetRow(3, 1);
tableRef.current?.expand(["department-1", "team-1-1"]);
tableRef.current?.fold(["team-1-1"]);
tableRef.current?.expand(); // all Tree Grid branches
tableRef.current?.fold(); // all Tree Grid branches
```

`setSelectedRow`, `setSelectedRows`, and `setMoveTargetRow` use the visible row index after current sorting and pagination are applied.
`expand(nodeIds?)` and `fold(nodeIds?)` accept readonly Tree Grid node-id arrays. Omitting the array targets every branch; an empty array is a no-op. A folded ancestor blocks descendant-only expansion unless both ids are included in the same call. Flat tables ignore these methods.

## Documentation

English user documentation starts at `docs/user/01-quick-start.md`. Detailed Tree Grid and Summary Row contracts are in `docs/user/17-tree-grid.md` and `docs/user/18-summary-row.md`.

The previous Korean documentation is preserved under `docs/ko/` as secondary documentation while the public package moves to English-first docs.

## Playground

```bash
npm run dev
```

The playground starts at `/docs/getting-started` and includes examples for CRUD, sizing, theme, loading and empty states, headers, column groups, pagination, infinite scroll, lazy load, virtualization, cells, rows, Summary Row, Tree Grid, built-in components, selection, clipboard, context menu, and export helpers. The Tree Grid route includes a 30-node baseline and an exactly 10000-node virtualized example.

## Development

```bash
npm run lint
npm run test:run
npm run build
npm run test:e2e
npm run test:perf -- --workers=1
npm pack --dry-run --json
```

## Release Bootstrap

`comins-table` does not yet exist on the npm registry. npm cannot register trusted or staged publishing for a brand-new package, so the first public version must be published interactively by the maintainer with npm 2FA and without an automation token.

After that bootstrap publication, register `kim1124/comins-table`, `publish.yml`, and the `npm` environment as the trusted publisher. Allow only `npm stage publish`, disallow token publishing, and require maintainer 2FA approval for every staged version. The repository workflow is intentionally manual and refuses non-`main` refs, mismatched versions, and missing bootstrap packages.

## Current Scope

Comins Table currently ships CSR table rendering, controlled data updates, row/cell selection, clipboard helpers, pagination, sorting, layout helpers, two-level headers, built-in controls, virtualized rendering, Summary Row aggregation, controlled Tree Grid rendering, loading and empty states, CSV/JSON export helpers, controlled infinite scrolling, and append-mode lazy loading.

It does not currently ship server-side row models, row grouping, pivoting, flat Row Expand detail areas, master/detail, charts integration, an AI assistant, or a drag-handle UI for Excel-like visual fill. Tree Grid V1 deliberately excludes remote tree loading, hierarchy pagination, row drag, and row-level copy/paste. The `fillCominsCellRange` core helper exists, but the drag UX remains outside the first public release.
