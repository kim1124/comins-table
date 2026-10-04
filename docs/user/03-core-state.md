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

## React Ref API

The following methods belong to `CominsTableRef`, not the neutral Core state helpers.

For ordinary array-backed Tables, `setSelectedRow`, `setSelectedRows`, and `setMoveTargetRow` use the visible Row index after current sorting and pagination. Viewport selection setters use absolute dataset indexes and skip unloaded Rows; movement is unavailable. `getColumnLayout`, `setColumnLayout`, `getSortState`, `setSortState`, `getSortModel`, `setSortModel`, and `clearSort` read and update the current Header view state. `expand(nodeIds?)` and `fold(nodeIds?)` accept readonly Tree Grid node-id arrays; flat tables ignore them.

`getSelectedRows()` returns loaded selected business data in data order. `getSelectedCells()` returns `{ rowId, columnId, value }` for available selected Cells; ranges use projected display order. `getSelection()` copies the selection IDs and addresses, including Row IDs retained after Viewport cache eviction. Row objects and Cell values remain application-owned references.


See [Selection](10-selection.md), [Clipboard](09-clipboard.md), and [Tree Grid](17-tree-grid.md) for selection, copy, Fill, and expansion controls.

## 0.2.0 migration

See the [complete migration guide](26-migration-0.2.0.md) for entry-point selection, React and neutral examples, installation boundaries, and the consumer verification checklist.

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
