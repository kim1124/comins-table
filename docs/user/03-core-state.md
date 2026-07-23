# Core State

The core helpers are framework-independent functions for row, sort, layout, pagination, selection, clipboard, and export work.

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

`setCominsPagination` updates page state. `setCominsSortState` replaces sorting with one rule, while `setCominsSortModel` applies an ordered `CominsSortModel` for lexicographic multi-column sorting. Invalid, duplicate, missing, and non-sortable Column rules are normalized away. `serializeCominsColumnLayout` and `applyCominsColumnLayout` are the persistence pair for column width, order, and visibility.

```ts
const sorted = setCominsSortModel(state, [
  { columnId: "role", direction: "asc" },
  { columnId: "age", direction: "desc" },
]);
```

Core helpers do not own React state. They return the next state, and the application decides where to store it.
