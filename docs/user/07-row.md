# Row

Rows support click, double click, keyboard payloads, context menus, selection, and drag movement.

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
