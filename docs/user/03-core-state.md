# Core State

[Documentation](../README.md) · [English guides](README.md) · [한국어](../ko/03-core-state.md) · [Props](http://127.0.0.1:4002/api/props) · [Ref API](http://127.0.0.1:4002/api/ref)

The core helpers are framework-independent functions for row, sort, layout, pagination, selection, clipboard, and export work.

<!-- comins-doc-example: compile=core-state -->
```ts
import {
  applyCominsColumnLayout,
  createCominsTableState,
  queryCominsRows,
  serializeCominsColumnLayout,
  setCominsPagination,
  setCominsSortModel,
  setCominsSortState,
} from "comins-table/core";
```

`createCominsTableState` creates a normalized state object from rows and columns. `queryCominsRows` reads the current row order after state transitions.

`setCominsPagination` updates page state. `setCominsSortState` replaces sorting with one rule, while `setCominsSortModel` applies an ordered `CominsSortModel` for lexicographic multi-column sorting. Invalid, duplicate, missing, and non-sortable Column rules are normalized away. `serializeCominsColumnLayout` and `applyCominsColumnLayout` are the persistence pair for Column order and the supported Column/Group runtime state: visibility, Column width, and `pinned` placement.

<!-- comins-doc-example: fragment -->
```ts
const sorted = setCominsSortModel(state, [
  { columnId: "role", direction: "asc" },
  { columnId: "age", direction: "desc" },
]);
```

Core helpers do not own React state. They return the next state, and the application decides where to store it.

## 0.2.0 migration (unreleased)

`comins-table/core` now exposes framework-neutral runtime and types. Column and Group labels are strings; Core state has no theme or renderer metadata. Core cell policies use `cell.disabled`, `cell.copyable`, and `cell.pasteable` directly, alongside `cell.parseClipboard` and `cell.validateFill`.

<!-- comins-doc-example: fragment -->
```ts
import { createCominsTableState, pasteCominsText } from "comins-table/core";

const state = createCominsTableState({
  rows: [{ id: "a", age: 31 }],
  getRowId: row => row.id,
  columns: [{ field: "age", label: "Age", cell: {
    pasteable: ({ row }) => row.data.age >= 0,
    parseClipboard: ({ text }) => Number(text),
  } }],
});
const edited = pasteCominsText(state, { rowId: "a", columnId: "age" }, "42");
```

For existing React state, import helpers and types from `comins-table` instead of `/core`. This retains JSX labels, `cell.props` guards, renderer callbacks, and themes. React-only exports such as `CominsTableCellConfig`, `CominsTableTheme`, `formatCominsCellValue`, `getCominsCellClassName`, `getCominsCellStyle`, and `setCominsTableTheme` are available only from the root.

`comins-table/clipboard` and `comins-table/selection` retain their React-state contracts. Use the corresponding `/core` helpers with neutral state; do not mix the two state contracts. The package still declares React peer dependencies, the React table remains client-only, and this separation does not declare SSR or Vue support.
