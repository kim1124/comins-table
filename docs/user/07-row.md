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

The ref methods `setSelectedRow`, `setSelectedRows`, and `setMoveTargetRow` use the visible row index after sorting and pagination.
