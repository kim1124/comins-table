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

## Data ownership and view state

Comins Table is a CSR-focused controlled component for application-owned data. The application owns the Row array or Viewport snapshot passed through `data`.

For table-owned data mutations, `onChangeData` emits the next flat Row array or Tree Grid node array; pass that array back through `data` to retain the mutation. Viewport mode uses a controlled block snapshot instead of a full array; `useCominsViewport` connects that snapshot and its callbacks. Other controlled models use their matching callback and value prop rather than `onChangeData`.

Selection, column layout, and sort are internal view state. `onChangeSelection`, `onChangeColumnLayout`, `onChangeSort`, and `onChangeSortModel` observe those changes so an application can coordinate or persist them externally; the table updates the corresponding view state even when a callback is omitted.

Where restoration is supported, use the supported Ref API: `setSelectedRow` and `setSelectedRows` restore Row selection by visible index, `setColumnLayout` restores layout, and `setSortState` and `clearSort` restore or clear sorting. `setSortModel` restores the complete ordered model; `getColumnLayout`, `getSortState`, and `getSortModel` read the current layout and sort state.


See [Core State and Ref API](03-core-state.md) and [controlled Row Expand](19-row-expand.md) for related contracts.

## Playground data

The CRUD example uses `column1` through `column6` for both editable data keys and Column labels. A separate internal `id` remains stable for selection and deletion and is omitted from the JSON editor. All six displayed fields, including `column4`, can be updated without changing the Row identity. These are example field names; the library accepts application-defined fields and labels. For range-loaded data and loaded Cell edits, use [Viewport Datasource](25-viewport-datasource.md) instead of the array CRUD helpers.
