# Comins Table

<img src="https://raw.githubusercontent.com/kim1124/comins-table/main/example/public/comins-symbol.svg" width="64" height="64" alt="Comins" />

A React data table backed by a framework-neutral TypeScript core. Build data-heavy screens with application-owned data, virtualized rows, Tree Grid, grouping, and customizable cells.

[![npm version](https://img.shields.io/npm/v/comins-table)](https://www.npmjs.com/package/comins-table)
[![TypeScript declarations](https://img.shields.io/npm/types/comins-table)](https://www.npmjs.com/package/comins-table)
[![Verify](https://github.com/kim1124/comins-table/actions/workflows/verify.yml/badge.svg?branch=main)](https://github.com/kim1124/comins-table/actions/workflows/verify.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

[한국어 가이드](https://github.com/kim1124/comins-table/blob/main/docs/ko/README.md)
· [English Guide](https://github.com/kim1124/comins-table/blob/main/docs/user/README.md)
· [Website](https://comins-website.vercel.app/ko/)
· [Changelog](https://github.com/kim1124/comins-table/blob/main/CHANGELOG.md)

![Comins Table: clipboard and Fill Handle, Tree drag, automatic row heights, and Viewport loading](https://raw.githubusercontent.com/kim1124/comins-table/main/docs/assets/comins-table-overview.gif)

The preview was recorded with 0.1.11. Feature-specific recordings and examples are available in the guides.

## Highlights

- **Application-owned data:** controlled updates with stable row IDs and reusable Core helpers.
- **Large datasets:** virtualization, automatic row heights, and bounded Viewport loading.
- **Table interactions:** sorting, filtering, column resizing and pinning, selection, clipboard, and Fill Handle.
- **Structured rows:** Tree Grid, row grouping, summaries, row details, and supported row/group drag operations.
- **Custom presentation:** cell/header renderers, built-in components, themes, and CSS variables.

## Installation

```bash
npm install comins-table react react-dom
```

React and React DOM `>=18.0.0 <20.0.0` are peer dependencies. TypeScript declarations are included for JavaScript entry points. Import `comins-table/styles.css` for the default table appearance.

## Quick Start

<!-- comins-doc-example: fragment -->
```tsx
import { useState } from "react";
import { CominsTable, type CominsTableColumn } from "comins-table";
import "comins-table/styles.css";

type UserRow = { id: string; name: string; age: number };

const columns: CominsTableColumn<UserRow>[] = [
  { field: "name", label: "Name", sort: true },
  { field: "age", label: "Age", sort: true },
];

export function UsersTable() {
  const [data, setData] = useState<UserRow[]>([
    { id: "u-1", name: "Example user", age: 31 },
  ]);

  return (
    <CominsTable
      columns={columns}
      data={data}
      getRowId={(row) => row.id}
      onChangeData={setData}
    />
  );
}
```

Your application owns `data`; connect `onChangeData` to retain table-side edits. See the [한국어 시작 가이드](https://github.com/kim1124/comins-table/blob/main/docs/ko/01-quick-start.md) or [English Quick Start](https://github.com/kim1124/comins-table/blob/main/docs/user/01-quick-start.md) for setup details.

## Documentation

| Language | Guides | 0.2.0 migration |
| --- | --- | --- |
| 한국어 | [기능별 가이드](https://github.com/kim1124/comins-table/blob/main/docs/ko/README.md) | [Core 마이그레이션](https://github.com/kim1124/comins-table/blob/main/docs/ko/26-migration-0.2.0.md) |
| English | [Feature guides](https://github.com/kim1124/comins-table/blob/main/docs/user/README.md) | [Core migration](https://github.com/kim1124/comins-table/blob/main/docs/user/26-migration-0.2.0.md) |

The [documentation index](https://github.com/kim1124/comins-table/blob/main/docs/README.md) links API usage, feature limits, and runnable examples. Browse the public website in [한국어](https://comins-website.vercel.app/ko/) or [English](https://comins-website.vercel.app/en/).

## Run the Playground locally

Clone the repository to run the examples; the Playground is not installed into consumer applications.

```bash
git clone https://github.com/kim1124/comins-table.git
cd comins-table
npm ci
npm run dev
```

Open [the Playground](http://127.0.0.1:4002/docs/getting-started). The [Playground guide](https://github.com/kim1124/comins-table/blob/main/docs/user/12-playground.md) lists examples and language controls.

## Version and support

**0.2.0** introduces the framework-neutral `comins-table/core` contract. React helpers and rendering types remain at `comins-table`; `/clipboard` and `/selection` retain their React-state contracts. See the migration guides above and the [changelog](https://github.com/kim1124/comins-table/blob/main/CHANGELOG.md) for version history.

The Table UI is client-only React; SSR and a Vue adapter are not currently supported. Chrome and Edge are the supported browser targets, with automated browser checks using Playwright Chromium. Firefox and Safari are outside the current support contract. Feature combinations and limits are documented in the corresponding guides.

The Table runtime makes no package-owned network requests and loads no remote assets, telemetry, or error reporting.

## License and support

[MIT](https://github.com/kim1124/comins-table/blob/main/LICENSE)
· [Issues](https://github.com/kim1124/comins-table/issues)
· [Report a security issue](https://github.com/kim1124/comins-table/blob/main/SECURITY.md)
