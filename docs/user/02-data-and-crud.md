# Data And CRUD

[Documentation](../README.md) · [English guides](README.md) · [한국어](../ko/02-data-and-crud.md) · [Playground](http://127.0.0.1:4002/examples/crud)

Comins Table is designed around a controlled CSR data flow.

- `data` is the current row array.
- `onChangeData` receives the next row array after table-owned mutations such as paste or row movement.
- Application actions can call `addCominsRows`, `updateCominsRows`, `deleteCominsRows`, and `queryCominsRows` from `comins-table/core` when a framework-independent state transition is useful.

<!-- comins-doc-example: fragment -->
```ts
import {
  addCominsRows,
  createCominsTableState,
  deleteCominsRows,
  queryCominsRows,
  updateCominsRows,
} from "comins-table/core";

const state = createCominsTableState({
  columns,
  rows,
  getRowId: (row) => row.id,
});

const added = addCominsRows(state, [{ id: "p-2", name: "Beta" }]);
const updated = updateCominsRows(added, [{ id: "p-2", patch: { name: "Beta updated" } }]);
const deleted = deleteCominsRows(updated, ["p-1"]);
const nextRows = queryCominsRows(deleted);
```

Use `onClickRow` and `onClickCell` when the UI needs to open an editor, context panel, or details view from row or cell interaction payloads.
