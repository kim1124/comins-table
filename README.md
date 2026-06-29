# @kmsf/data-table

`@kmsf/data-table`은 KMSF에서 재사용하기 위한 CSR 중심 React data table package다. `KmsfDataTable` 컴포넌트와 framework-independent core helper를 제공한다.

## 설치

```bash
npm install @kmsf/data-table react react-dom
```

Peer dependencies:

- `react`: `>=18.0.0 <20.0.0`
- `react-dom`: `>=18.0.0 <20.0.0`

## 빠른 시작

```tsx
import { KmsfDataTable } from "@kmsf/data-table";
import { useState } from "react";

type Row = { id: string; name: string; value: number };

export function Example() {
  const [data, setData] = useState<Row[]>([{ id: "a", name: "Alpha", value: 1 }]);

  return (
    <KmsfDataTable<Row>
      columns={[
        { field: "name", label: "Name" },
        { field: "value", label: "Value", sort: true },
      ]}
      data={data}
      getRowId={(row) => row.id}
      onChangeData={setData}
    />
  );
}
```

## 구현된 기능

- `data`, `columns`, `getRowId` 기반 table rendering
- `data`와 `onChangeData`를 통한 controlled CSR state flow: Controlled external state flow with `data` and `onChangeData`
- row refresh, add, update, delete, query helper
- pagination helper와 pagination props
- theme, density, table/row/header/cell class와 style
- header show/hide, formatting, boundary resize, long-press reorder, sort indicator
- `columnGroups` 기반 2-depth header와 group width 조정 helper
- column layout save/load: `getColumnLayout`, `setColumnLayout`, `onChangeColumnLayout`
- row click, double click, context menu, drag reorder, copy/paste
- single/multi row selection, single/range cell selection
- keyboard row/cell copy/paste와 multi-cell clipboard helper
- Header/Cell built-in component 배열
- Header-only menu popover
- Cell-only virtual list
- `cell.renderer`, `cellSelection={false}`, copyable/pasteable guard
- virtualized rendering path와 split header/body table 구조
- public subpaths:
  - `@kmsf/data-table/core`
  - `@kmsf/data-table/clipboard`
  - `@kmsf/data-table/selection`

## 사용자 문서

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

루트에서 실행:

```bash
npm --workspace=@kmsf/data-table run dev
```

기본 포트는 `4002`다.

Playground는 feature navigation과 recreated content boundary를 사용한다. Context menu, built-in component, table size, header, row, cell, selection, virtualization 예제를 브라우저에서 확인할 수 있다.

## 검증

```bash
npm --workspace=@kmsf/data-table run lint
npm --workspace=@kmsf/data-table run test:run
npm --workspace=@kmsf/data-table run build
npm --workspace=@kmsf/data-table run verify
npm --workspace=@kmsf/data-table run verify:full
npm --workspace=@kmsf/data-table run test:perf
```

## 현재 제한

- 전용 external store adapter 객체는 아직 제공하지 않는다. 외부 `useState`, Zustand, Redux 등에서 관리하는 배열을 `data`로 전달하고, table-originated 변경은 `onChangeData`에서 반영한다.
- Excel-like Visual Fill Handle UI는 아직 제공하지 않는다. `fillKmsfCellRange` helper는 core에 있다.
- server-side row model, lazy-load row model, grouping, aggregation, pivoting, tree data, master/detail, export, charts integration, AI assistant 기능은 현재 core 범위 밖이다.
