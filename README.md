# Comins Table

Comins Table is a controlled React data table for data-heavy application screens, with virtualized rendering, precise selection, movable headers, Summary Row aggregation, Tree Grid data, built-in component cells, and framework-independent core helpers.

[![npm version](https://img.shields.io/npm/v/comins-table)](https://www.npmjs.com/package/comins-table)
[![TypeScript declarations](https://img.shields.io/npm/types/comins-table)](https://www.npmjs.com/package/comins-table)
[![Verify](https://github.com/kim1124/comins-table/actions/workflows/verify.yml/badge.svg?branch=main)](https://github.com/kim1124/comins-table/actions/workflows/verify.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

![Comins Table sorting, column reorder, Row selection, Summary Row, and Tree Grid demo](https://raw.githubusercontent.com/kim1124/comins-table/main/docs/assets/comins-table-demo.gif)

## Why Comins Table

| Area | Shipped capabilities |
| --- | --- |
| Controlled data | Application-owned `data`, CRUD helpers, `onChangeData`, pagination, sorting, and layout callbacks |
| Rendering and scale | Fixed-height virtualization with a tested 100,000-row route, infinite scroll, append-mode lazy loading, loading, and empty states |
| Interaction | Accessible Header sorting, resize, 6-pixel horizontal column reorder with source placeholder, Row and Cell selection, ranges, clipboard, and context menu callbacks |
| Data structure | Summary Row count/sum/avg/min/max/custom aggregation, `colSpan`, `format`, style/class hooks, and controlled Tree Grid expand/fold |
| Custom UI | Cell/Header renderers, built-in button/input/checkbox/radio/select/toggle/progress/menu/Virtual List components, and CSS-variable themes |

Comins Table is standalone and does not wrap another table or grid implementation.

## Support

| Surface | Support |
| --- | --- |
| React | `>=18.0.0 <20.0.0` |
| React DOM | `>=18.0.0 <20.0.0` |
| TypeScript | Declarations bundled with every JavaScript entry point; CSS available through the stylesheet export |
| Chrome and Edge | Current stable Chromium-based releases |
| Automated browser gate | Playwright-bundled Chromium |
| Firefox and Safari | Outside the supported contract until Firefox and WebKit projects are added |
| SSR | Client boundary required; server rendering is not currently supported |
| Runtime network behavior | No package-owned requests, remote assets, telemetry, or error reporting |

## Installation

```bash
npm install comins-table react react-dom
```

```tsx
import { CominsTable, type CominsTableColumn } from "comins-table";
import "comins-table/styles.css";
```

React and React DOM are peer dependencies. Import `comins-table/styles.css` when the default table shell, themes, and built-in component skin are required.

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
    { active: true, age: 31, id: "u-1", name: "Example user", role: "Admin" },
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

## Controlled Model

Comins Table is a CSR-focused controlled component for application-owned data. The application owns the `data` array.

Only `onChangeData` requires application write-back. It emits the next flat Row array or Tree Grid node array after table-owned mutations; pass that array back through `data` to retain the change.

Selection, column layout, and sort are internal view state. `onChangeSelection`, `onChangeColumnLayout`, and `onChangeSort` observe those changes so an application can coordinate or persist them externally; the table updates the corresponding view state even when a callback is omitted.

Where restoration is supported, use the supported Ref API: `setSelectedRow` and `setSelectedRows` restore Row selection by visible index, `setColumnLayout` restores layout, and `setSortState` and `clearSort` restore or clear sorting. `getColumnLayout` and `getSortState` read the current layout and sort state.

## Package Entry Points

| Import | Purpose |
| --- | --- |
| `comins-table` | React component, public types, and root helper exports |
| `comins-table/core` | State, row, column, pagination, sorting, layout, selection, clipboard, export, and virtualization helpers |
| `comins-table/clipboard` | Clipboard helper subset |
| `comins-table/selection` | Selection helper subset |
| `comins-table/styles.css` | Optional table shell, theme, and built-in component skin |

## Header And Layout

Sortable headers support pointer and keyboard activation and expose `aria-sort`. Columns support width constraints and resize interactions.

A left-button mouse interaction activates column movement after a 6-pixel horizontal drag, provided horizontal movement remains greater than vertical movement. The source becomes a source placeholder while a ghost and target marker show the proposed move. Pointer Up commits only over a valid target; vertical intent, pointer cancellation, `Escape`, and window blur cancel the pending move. Non-mouse pointers retain one-second long-press compatibility. Parent header groups move their children as one block.

Use `getColumnLayout()` and `setColumnLayout()` through the Ref API, or `serializeCominsColumnLayout()` and `applyCominsColumnLayout()` from `comins-table/core`, to persist and restore order, widths, and visibility.

## Rows, Cells, And Selection

Rows expose click, double-click, keyboard, and context-menu callbacks. Cells expose the corresponding Cell callbacks plus `format`, `renderer`, and props hooks.

A normal Row interaction selects one Row, `Ctrl`/`Cmd` toggles a Row, and `Shift` extends the visible Row range from the selection anchor. Cell selection supports a single Cell, `Ctrl`/`Cmd` multi-selection, and `Shift` or pointer-drag ranges. Built-in component interactions remain isolated from `onClickCell` and `onClickRow` callback payloads so component actions do not also trigger the owning Cell or Row action.

## Virtualization And Loading

Set `virtualized`, `rowHeight`, and `"buffer-size"` for fixed-height windowed rendering. The performance Playground includes a tested 100,000-row route while keeping only the current window and buffer mounted.

`infiniteScroll` requests application-owned append loading near the body viewport boundary. `lazyLoad` supports asynchronous append-mode batches with an `AbortSignal`. When `loading` is true, an empty table renders skeleton Rows and a populated table keeps its Rows visible under a loading overlay. `emptyComponent` controls the no-data content.

## Summary Row

See the [Summary Row guide](https://github.com/kim1124/comins-table/blob/main/docs/user/18-summary-row.md) and run the [`/examples/summary-row`](http://127.0.0.1:4002/examples/summary-row) Playground route.

Configure `summary.columns` with built-in `count`, `sum`, `avg`, `min`, and `max` aggregation or a custom aggregator. The object form supports visible-column `colSpan`, post-aggregation `format`, and per-cell `className` and `style`; `summary.className` and `summary.style` apply to the footer Row.

## Tree Grid

See the [Tree Grid guide](https://github.com/kim1124/comins-table/blob/main/docs/user/17-tree-grid.md) and run the [`/examples/tree-grid`](http://127.0.0.1:4002/examples/tree-grid) Playground route.

Set `tree` and provide controlled `{ item, expand, children }` nodes. `defaultExpandAll` supplies the initial fallback expansion state and defaults to `true`; explicit node state wins. `expand(nodeIds?)` and `fold(nodeIds?)` update multiple node ids, while an omitted argument targets every branch and an empty array is a no-op. Descendant-only expansion is blocked while an ancestor remains folded unless both ids are included in the same call.

Tree Grid reuses `cell.components` and `cell.renderer`, so component cells and custom React renderers work against each node's `item`. The Tree Grid Playground includes an exactly 10,000-node virtual example.

## Components And Renderers

Cell components include `button`, `input`, `checkbox`, `radio`, `select`, `toggle`, `progress`, and `virtual-list`; Header components also support `menu`. Use `cell.renderer` or `header.renderer` when the built-in component types are not sufficient.

Virtual List Item activation follows the normal Row selection modifiers. More selects its owning Row exclusively before expanding the virtualized list. Search is available only while exactly one Row is selected. Keyboard activation keeps the More button focused after expansion. Item and More actions remain isolated from the Row and Cell click callbacks.

## Clipboard And Export

`copyCominsRow`, `copyCominsCell`, and `copyCominsCellRange` read Row or Cell selections. `pasteCominsRow`, `pasteCominsCell`, and `pasteCominsCellRange` apply clipboard data while respecting `props.copyable`, `props.pasteable`, and disabled guards. `fillCominsCellRange` remains a framework-independent core helper; no visual fill handle is presented as shipped UI.

Use `exportCominsRowsToCsv` and `exportCominsRowsToJson` with the exact rows and export columns the application wants to serialize. Export remains independent of visible pagination, filtering, and selection unless the application passes those rows.

## Styling And Themes

The package stylesheet exposes module-local `--comins-table-*` CSS variables and does not apply a global reset. The six shipped theme classes are `comins-table-theme--basic`, `comins-table-theme--dark`, `comins-table-theme--skyblue`, `comins-table-theme--mint`, `comins-table-theme--gray`, and `comins-table-theme--orange`.

Use `theme.className`, `theme.style`, Row class/style hooks, Cell props, and renderer output for application-specific presentation. Keep virtualized `rowHeight` aligned with `--comins-table-row-height` when overriding height tokens.

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

`setSelectedRow`, `setSelectedRows`, and `setMoveTargetRow` use the visible Row index after current sorting and pagination. `getColumnLayout`, `setColumnLayout`, `getSortState`, `setSortState`, and `clearSort` read and update the current Header view state. `expand(nodeIds?)` and `fold(nodeIds?)` accept readonly Tree Grid node-id arrays; flat tables ignore them.

## Playground

```bash
npm run dev
```

The local Playground starts at [`/docs/getting-started`](http://127.0.0.1:4002/docs/getting-started). Key routes include [`/examples/summary-row`](http://127.0.0.1:4002/examples/summary-row), [`/examples/tree-grid`](http://127.0.0.1:4002/examples/tree-grid), [`/examples/component`](http://127.0.0.1:4002/examples/component), and [`/performance/virtualization`](http://127.0.0.1:4002/performance/virtualization).

## Documentation

Start with the [English Quick Start](https://github.com/kim1124/comins-table/blob/main/docs/user/01-quick-start.md), then browse [all English feature guides](https://github.com/kim1124/comins-table/tree/main/docs/user). The detailed [Tree Grid](https://github.com/kim1124/comins-table/blob/main/docs/user/17-tree-grid.md) and [Summary Row](https://github.com/kim1124/comins-table/blob/main/docs/user/18-summary-row.md) contracts include runnable examples and edge cases. [Korean guides](https://github.com/kim1124/comins-table/tree/main/docs/ko) are retained as secondary documentation.

Use the [source repository](https://github.com/kim1124/comins-table) for development context, review the [changelog](https://github.com/kim1124/comins-table/blob/main/CHANGELOG.md) for version history, and follow the [security policy](https://github.com/kim1124/comins-table/blob/main/SECURITY.md) for vulnerability reporting.

## Current Boundaries

Comins Table currently ships a CSR controlled data model. Server-side Row models, Row grouping, pivoting, charts, AI assistance, remote Tree loading, hierarchy pagination, Tree Row drag, Tree Row copy/paste, Firefox, Safari, and SSR are not shipped or supported. Flat Row Expand details and master/detail layouts also remain outside the current package contract.

The visual fill handle is not shipped or supported. `fillCominsCellRange` remains available as a core helper without a drag-handle UI.

## Development

```bash
npm run lint
npm run test:run
npm run build
npm run test:e2e
npm run test:perf -- --workers=1
npm run test:consumer
npm run verify
npm run docs:readme-gif
```

`npm run docs:readme-gif` is a maintainer command that captures the real hidden Playground fixture and regenerates the checked-in README animation.

## Trusted Publishing

The package bootstrap is complete. Trusted publishing for later versions uses the manual `publish.yml` OIDC trusted publisher and `npm stage publish` through the protected `npm` environment. The workflow builds one exact package artifact, verifies and scans that artifact before staging, and requires maintainer approval before public publication. Token-based publication is not part of this release path.
