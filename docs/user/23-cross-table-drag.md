# Cross-Table Row and Group Drag

Cross-Table Drag extends the existing Row and Group Drag handles to another Comins Table. The application creates a Coordinator and passes the same object, `scope`, and a unique `tableId` to every participating Table.

```tsx
const coordinator = createCominsTableTransferCoordinator<Row, Group>({
  onTransfer: ({ source, target }) => {
    updateTable(source.tableId, source.data, source.groups);
    updateTable(target.tableId, target.data, target.groups);
  },
});

const tableTransfer = (tableId: string) => ({
  coordinator,
  scope: "people",
  tableId,
  resolveConflict: () => "reject" as const,
});

<CominsTable tableTransfer={tableTransfer("left")} rowProps={{ draggable: true }} />;
<CominsTable tableTransfer={tableTransfer("right")} rowProps={{ draggable: true }} />;
```

The Coordinator does not own application data and does not create optimistic Table state. It emits one immutable result containing both next models. Apply `result.source` and `result.target` in the same application transaction. If the application applies only one side, the library cannot repair the partial controlled update.

## Transfer rules

- Only Tables with the same Coordinator object and `scope`, unique `tableId` values, and the same `TData`/`TGroup` contract can transfer.
- Flat Rows move only to flat Tables. Grouped Rows move only to grouped Tables and require the target `setRowGroupId` when membership changes.
- Row Drag moves one Row. A Row can drop before a target Row, at the end of a flat body, or into a target Group Row, including a collapsed or empty Group.
- Moving the last member Row leaves the application-owned source Group in place as an empty Group.
- Group Drag moves one Group plus all member Rows. A successful Group transfer removes the source Group. Empty Groups are transferable.
- Group order is the real target `groups` array order. Group Rows are not automatically sorted.
- Business Row and Group IDs must remain stable across the transition.

Selection, Cell/range state, Row Detail expansion, and Group disclosure state do not move automatically. After a successful controlled render, focus moves to the destination Row or Group control when available, then falls back to the destination Table root.

## Permission and conflicts

The target Table owns `canTransfer` and `resolveConflict`. `canTransfer(intent)` can reject before model transition. Duplicate Row or Group IDs reject by default, including an undefined or unsupported resolver result.

Return `"overwrite"` only when destructive replacement is intended. Row overwrite removes the target Row with the same ID before insertion. Group overwrite removes the complete target Group and its member Rows, then inserts the source Group bundle; it never merges the two Groups. Resolved conflicts are included in `result.details` for audit or notification.

The pure `transferCominsRowBetweenTables()` and `transferCominsGroupBetweenTables()` helpers expose the same immutable reject/overwrite model transition for application JavaScript.

## Lifecycle and supported combinations

Duplicate registration of a `tableId` within one Coordinator scope fails closed. A stale/unmounted source or target, missing target identity, changed business ID, incompatible flat/grouped shape, or rejected callback produces no `onTransfer` call.

While a valid pointer is within the top or bottom edge of a different target body, Cross-Table Drag auto-scrolls that target vertically and re-resolves the Drop target. Local same-Table Drag behavior is unchanged. `pointercancel`, `Escape`, window blur, and unmount clear listeners, markers, and pending animation frames.

Cross-Table Transfer is unavailable with Tree Grid, Column Filtering, Infinite Scroll, and Lazy Load. Tree transfer remains a separate feature.

See the [`/examples/cross-table-drag`](http://127.0.0.1:4002/examples/cross-table-drag) Playground route.
