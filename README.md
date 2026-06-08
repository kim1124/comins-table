# @kmsf/data-table

KMSF-first React data table package. It provides a reusable `KmsfDataTable` component and framework-independent core helpers for rows, columns, layout, selection, clipboard, pagination, and virtualized rendering.

## Install

```bash
npm install @kmsf/data-table react react-dom
```

Peer dependencies:

- `react`: `>=18.0.0 <20.0.0`
- `react-dom`: `>=18.0.0 <20.0.0`

## Quick Start

```tsx
import { KmsfDataTable } from "@kmsf/data-table";
import { useState } from "react";

type Row = { id: string; name: string; value: number };

export function Example() {
  const [data, setData] = useState<Row[]>([{ id: "a", name: "Alpha", value: 1 }]);

  return (
    <KmsfDataTable<Row>
      getRowId={(row) => row.id}
      data={data}
      onChangeData={setData}
      columns={[
        { field: "name", label: "Name" },
        { field: "value", label: "Value", sort: true },
      ]}
    />
  );
}
```

## Implemented Features

- Basic `KmsfDataTable` rendering with `data`, `columns`, and `getRowId`
- Controlled external state flow with `data` and `onChangeData`
- Row full refresh, add, update, delete, and query helpers
- Pagination helpers and pagination props
- Theme, density, table class, row class, header style, and cell style
- Header show/hide, header formatting, boundary resize, 1-second long-press reorder, animated sort indicator, and column layout save/load
- Row click, multi-row selection, double click, context menu callback, drag reorder, row copy, and row paste
- Cell formatting, custom cell rendering, optional `cellSelection={false}`, context menu callback, cell copy, and cell paste
- Column-level `props.copyable` and `props.pasteable` guards
- Single row, multi row, single cell, cell range, and clear selection helpers through `selectRow`, `selectRows`, `selectCell`, and `selectCellRange`
- Multi-cell clipboard helpers and keyboard range copy/paste
- Fill helper for copying one source cell value into a target range
- Virtualized rendering path with split header/body tables for 100000 and 1000000 row smoke tests
- Public subpaths: `@kmsf/data-table/core`, `@kmsf/data-table/clipboard`, `@kmsf/data-table/selection`

## User Docs

- [Quick start](docs/user/01-quick-start.md)
- [Data and CRUD](docs/user/02-data-and-crud.md)
- [Core state](docs/user/03-core-state.md)
- [Styling](docs/user/04-styling.md)
- [Pagination](docs/user/05-pagination.md)
- [Header](docs/user/06-header.md)
- [Row](docs/user/07-row.md)
- [Cell](docs/user/08-cell.md)
- [Clipboard](docs/user/09-clipboard.md)
- [Selection](docs/user/10-selection.md)
- [Virtualization](docs/user/11-virtualization.md)
- [Playground](docs/user/12-playground.md)

## Playground

Run the local playground from the repository root:

```bash
npm --workspace=@kmsf/data-table run dev
```

The playground follows the `@kmsf/charts` docs shell: topbar, tabs, collapsible feature navigation, recreated center example content, and a main-content `옵션 가이드` tab. Each feature page starts with a Korean description and an option table. It includes a standalone `Context Menu 예제` page and a `테이블 사이즈` page for manual height, parent-size, and browser-resize examples.

## Verification

```bash
npm --workspace=@kmsf/data-table run test:run
npm --workspace=@kmsf/data-table run verify
npm --workspace=@kmsf/data-table run verify:full
npm --workspace=@kmsf/data-table run test:perf
```

## Current Limits

- Dedicated external store adapter object is not shipped; pass external `useState`, Zustand, Redux, or other store arrays through `data` and reflect internal edits through `onChangeData`.
- Visual fill handle UI is planned separately; `fillKmsfCellRange` is available as a core helper.
- Server-side row model, grouping, aggregation, pivoting, tree data, master/detail, export, charts integration, and AI assistant features are not part of the current core implementation.
