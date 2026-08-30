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
