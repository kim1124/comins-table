# Row

[Documentation](../README.md) · [English guides](README.md) · [한국어](../ko/07-row.md) · [Row](http://127.0.0.1:4002/examples/row) · [Context Menu](http://127.0.0.1:4002/examples/context-menu)

Rows support click, double click, keyboard payloads, context menus, selection, and drag movement.

<!-- comins-doc-example: fragment -->
```tsx
<CominsTable
  columns={columns}
  data={data}
  getRowId={(row) => row.id}
  onClickRow={({ row }) => openDetails(row.id)}
  rowProps={{
    draggable: (row) => row.status !== "locked",
    className: (row) => ({ "row-locked": row.status === "locked" }),
  }}
/>
```

`rowProps.draggable` controls whether row drag movement is enabled for a row. Selection state is emitted through `onChangeSelection`.

## Row Drag lifecycle

`onBeforeRowDrag`, `onRowDrag`, and `onAfterDragRow` expose the handle gesture without taking model ownership away from `onChangeData` or the Cross-Table Coordinator.

- `onBeforeRowDrag(payload)` runs before pointer listeners are registered. Return `false` to cancel the gesture; a cancelled-before-start gesture does not call the later lifecycle callbacks.
- `onRowDrag(payload)` runs only when `CominsRowDragTarget` identity or validity changes. It is not a raw pointer-move stream.
- `onAfterDragRow(payload)` runs once for every started gesture with `CominsRowDragResult` (`moved`, `cancelled`, or `rejected`) and a `CominsRowDragReason` such as `drop`, `unchanged`, `invalid-target`, `duplicate-id`, `escape`, or `blur`.

`CominsBeforeRowDragPayload`, `CominsRowDragPayload`, and `CominsAfterDragRowPayload` keep the typed source Row, optional source Group/Table identity, pointer event, and target identity. Returning `false` from the before callback never mutates Rows. Same-Table, cross-Group, and Cross-Table Row gestures use the same lifecycle contract; Cross-Table model updates still belong to the Coordinator.

Opening a Row or Cell context menu preserves the current single or multiple Row selection when the target Row is already selected. Opening it on an unselected Row switches to that Row exclusively; Cell context menus apply the same Row policy before updating Cell focus.

The Playground context menu enables View and Create with zero selected Rows, enables every action with one selected Row, and disables only Update when multiple Rows are selected. Delete is enabled whenever at least one Row is selected.

## Playground context menu 0/1/N matrix

| Selected Rows | View | Create | Update | Delete |
| ---: | :---: | :---: | :---: | :---: |
| 0 | Enabled | Enabled | Disabled | Disabled |
| 1 | Enabled | Enabled | Enabled | Enabled |
| N | Enabled | Enabled | Disabled | Enabled |

Selecting a menu item shows its action name in the Playground Alert; the example does not mutate application data.

The ref methods `setSelectedRow`, `setSelectedRows`, and `setMoveTargetRow` use the visible row index after sorting and pagination.

The live [`/api/ref`](http://127.0.0.1:4002/api/ref) example shows `setMoveTargetRow(2, 0)` clearing active sorting and committing the moved visible Row order through controlled `onChangeData`.

When `columnFiltering` is configured, Row Drag and `setMoveTargetRow` are disabled because movement through a potentially partial projection is ambiguous. Group Drag remains a separate Group-model operation in the supported Row Grouping combination.
