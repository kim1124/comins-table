# Core State

The core helpers are framework-independent functions for row, sort, layout, pagination, selection, clipboard, and export work.

```ts
import {
  applyCominsColumnLayout,
  createCominsTableState,
  queryCominsRows,
  serializeCominsColumnLayout,
  setCominsPagination,
  setCominsSortState,
} from "comins-table/core";
```

`createCominsTableState` creates a normalized state object from rows and columns. `queryCominsRows` reads the current row order after state transitions.

`setCominsPagination` updates page state. `setCominsSortState` updates sorting. `serializeCominsColumnLayout` and `applyCominsColumnLayout` are the persistence pair for column width, order, and visibility.

Core helpers do not own React state. They return the next state, and the application decides where to store it.
