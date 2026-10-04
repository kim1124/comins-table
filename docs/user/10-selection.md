# Selection

[Documentation](../README.md) · [English guides](README.md) · [한국어](../ko/10-selection.md) · [Playground](http://127.0.0.1:4002/examples/selection-clipboard)

Selection supports Row selection, single and discontiguous Cell selection, and rectangular range selection.

In 0.2.x, the root and `/selection` use React state. For neutral state, import selection helpers from `/core` instead. See the [0.2.0 migration](26-migration-0.2.0.md); state creation and selection operations must use the same contract.

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

The callback also reports selection cleared during input synchronization. For flat and Tree tables, changing the row ID sequence (including Tree collapse/expand) clears selection; updating values with the same IDs in the same order preserves it. An already empty selection does not emit another change notification when rows change.

<!-- comins-doc-example: fragment -->
```tsx
<CominsTable
  cellSelection
  columns={columns}
  data={data}
  onChangeSelection={(selection) => setSelection(selection)}
/>
```

With the default `rowSelectionOnClick={true}`, plain click replaces the selected Row and Cell. Ctrl/Cmd+click toggles both the Row and the addressed Cell, while Shift+click selects the visible Row range and rectangular Cell range from the last anchors. Dragging between Cells creates a rectangular range when `cellSelection` is enabled.

`CominsSelectionState.cell` remains the active focus and single-Cell Clipboard address. `CominsSelectionState.cells` contains the discontiguous Cell set used by Ctrl/Cmd interaction; it is optional for compatibility with application-created legacy state. `range` remains separate, and selecting a range clears the discontiguous set. With `clipboard`, discontiguous Cells can be copied as a matrix with unselected positions empty.

See the controlled React example at [`/examples/selection-clipboard`](http://127.0.0.1:4002/examples/selection-clipboard). It displays the complete `onChangeSelection` payload and uses `copyable` and `pasteable` guards for a protected Column.

The live [`/api/ref`](http://127.0.0.1:4002/api/ref) example demonstrates `setSelectedRow(index)` and `setSelectedRows(indexes)`. Both methods resolve indexes against Rows currently visible after sorting and pagination.

Column Filtering preserves selected business Row IDs while their Rows are hidden, so they remain dormant and can reappear. A hidden Cell selection or Cell range is cleared because its visible address is no longer valid.

## Independent Row and Cell selection

Set `rowSelectionOnClick={false}` to keep Cell clicks, Ctrl/Cmd clicks, Shift ranges, and context menus from changing selected Rows. Select Rows using application-owned checkboxes and the existing `setSelectedRows` API. The default remains `true` for existing Row-click workflows.

`CominsTableRef<TData>` provides `getSelectedRows(): TData[]`, `getSelectedCells(): CominsSelectedCell[]`, and `getSelection(): CominsSelectionState`. `CominsSelectedCell` contains `{ rowId, columnId, value }` with the raw value. Reads do not copy or change the selection. Row results follow data order; Cell ranges follow projected display order. The snapshot copies selection arrays and addresses; Row objects and Cell values remain application-owned references.

Only loaded Rows are returned; these methods never issue Viewport requests. `getSelection().rowIds` is the selected ID snapshot, distinct from available Row data. Call range/value getters when needed rather than on each render, as a large selection must be enumerated.

<!-- comins-doc-example: fragment -->
```tsx
const tableRef = useRef<CominsTableRef<PersonRow>>(null);

<CominsTable
  ref={tableRef}
  columns={columns}
  data={rows}
  getRowId={(row) => row.id}
  onChangeData={setRows}
  cellSelection
  rowSelectionOnClick={false}
  clipboard
/>;

// An application action selects five Rows independently of Cell interaction.
tableRef.current?.setSelectedRows([0, 1, 2, 3, 4]);
// After the user selects three Cells, these return five Rows and three Cells.
const selectedRows = tableRef.current?.getSelectedRows();
const selectedCells = tableRef.current?.getSelectedCells();
const selection = tableRef.current?.getSelection();
```

In this fully loaded example, selecting three Cells does not remove the five selected Rows. `copySelection()` chooses the Cells; `copySelection("rows")` explicitly chooses the Rows. See [Clipboard](09-clipboard.md) for user-gesture requirements and error handling. In Viewport mode, selection setters accept absolute indexes and skip unloaded Rows, and getters return only the selected data currently loaded.
