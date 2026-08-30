# Selection

[Documentation](../README.md) · [English guides](README.md) · [한국어](../ko/10-selection.md) · [Playground](http://127.0.0.1:4002/examples/selection-clipboard)

Selection supports Row selection, single and discontiguous Cell selection, and rectangular range selection.

<!-- comins-doc-example: fragment -->
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

`selectRow`, `selectCell`, and `selectCellRange` update the core state. `CominsCellSelectionOptions` adds `multi` and `toggle` behavior to `selectCell`; `getCominsSelectedCellRange` reads only the active rectangular range.

React users can subscribe to `onChangeSelection` on `CominsTable`.

<!-- comins-doc-example: fragment -->
```tsx
<CominsTable
  cellSelection
  columns={columns}
  data={data}
  onChangeSelection={(selection) => setSelection(selection)}
/>
```

Plain click replaces the selected Row and Cell. Ctrl/Cmd+click toggles both the Row and the addressed Cell, while Shift+click selects the visible Row range and rectangular Cell range from the last anchors. Dragging between Cells creates a rectangular range when `cellSelection` is enabled.

`CominsSelectionState.cell` remains the active focus and single-Cell Clipboard address. `CominsSelectionState.cells` contains the discontiguous Cell set used by Ctrl/Cmd interaction; it is optional for compatibility with application-created legacy state. `range` remains separate, and selecting a range clears the discontiguous set. Discontiguous Cells are visual selection only in 0.1.9 and are not converted into a Clipboard matrix.

See the controlled React example at [`/examples/selection-clipboard`](http://127.0.0.1:4002/examples/selection-clipboard). It displays the complete `onChangeSelection` payload and uses `copyable` and `pasteable` guards for a protected Column.

The live [`/api/ref`](http://127.0.0.1:4002/api/ref) example demonstrates `setSelectedRow(index)` and `setSelectedRows(indexes)`. Both methods resolve indexes against Rows currently visible after sorting and pagination.

Column Filtering preserves selected business Row IDs while their Rows are hidden, so they remain dormant and can reappear. A hidden Cell selection or Cell range is cleared because its visible address is no longer valid.
