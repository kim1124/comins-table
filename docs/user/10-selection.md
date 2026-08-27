# Selection

Selection supports row selection, single-cell selection, and range selection.

```ts
import {
  getCominsSelectedCellRange,
  isCominsCellSelected,
  isCominsRowSelected,
  selectCell,
  selectCellRange,
  selectRow,
} from "comins-table/selection";
```

`selectRow`, `selectCell`, and `selectCellRange` update the core state. `getCominsSelectedCellRange` reads the active range.

React users can subscribe to `onChangeSelection` on `CominsTable`.

```tsx
<CominsTable
  cellSelection
  columns={columns}
  data={data}
  onChangeSelection={(selection) => setSelection(selection)}
/>
```

Plain click replaces the selected Row, Ctrl/Cmd+click toggles Rows, and Shift+click selects the visible Row range from the last anchor. Dragging between Cells creates a Cell range when `cellSelection` is enabled.

See the controlled React example at [`/examples/selection-clipboard`](http://127.0.0.1:4002/examples/selection-clipboard). It displays the complete `onChangeSelection` payload and uses `copyable` and `pasteable` guards for a protected Column.

The live [`/api/ref`](http://127.0.0.1:4002/api/ref) example demonstrates `setSelectedRow(index)` and `setSelectedRows(indexes)`. Both methods resolve indexes against Rows currently visible after sorting and pagination.

Column Filtering preserves selected business Row IDs while their Rows are hidden, so they remain dormant and can reappear. A hidden Cell selection or Cell range is cleared because its visible address is no longer valid.
