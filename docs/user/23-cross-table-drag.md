# Cross-Table Row and Group Drag

[Documentation](../README.md) · [English guides](README.md) · [한국어](../ko/23-cross-table-drag.md) · [Playground](http://127.0.0.1:4002/examples/cross-table-drag)

![Cross-Table Drag moves a complete Group bundle and reports a duplicate Row ID](../assets/comins-table-cross-table-drag.gif)

Cross-Table Drag extends the existing Row and Group Drag handles to another Comins Table. The application creates a Coordinator and passes the same object, `scope`, and a unique `tableId` to every participating Table.

```tsx
const coordinator = createCominsTableTransferCoordinator<Row, Group>({
  onTransfer: ({ source, target }) => {
    updateTable(source.tableId, source.data, source.groups);
    updateTable(target.tableId, target.data, target.groups);
  },
  onTransferRejected: ({ conflict, reason }) => {
    logTransferRejection({ conflict, reason });
  },
});

const tableTransfer = (tableId: string) => ({
  coordinator,
  scope: "people",
  tableId,
  resolveConflict: () => "reject" as const,
  rejectionFeedback: {
    duration: 2400,
    renderTooltip: (rejection) => (
      <>
        <strong>Duplicate ID</strong>
        <span>{`The ID "${String(
          rejection.conflict.kind === "group"
            ? rejection.conflict.groupId
            : rejection.conflict.rowId,
        )}" already exists.`}</span>
      </>
    ),
  },
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

When a pointer drop resolves a duplicate conflict to `"reject"`, the target Table receives a restrained error outline and a compact `Duplicate ID` Tooltip appears next to the release coordinates. The feedback is created only after `pointerup`, uses `pointer-events: none`, stays outside the semantic Table body, clamps to the browser viewport, and is announced as a polite live status. It therefore does not replace the hit-tested Drop target or block a later interaction.

`tableTransfer.rejectionFeedback` belongs to the target Table. Use `renderTooltip(rejection)` to replace the Tooltip body and `duration` to set its visible time from 500 through 10000 milliseconds; the default is 1800 milliseconds. Set `rejectionFeedback: false` to suppress the built-in Tooltip and outline. `Coordinator.onTransferRejected(rejection)` still receives the structured `reason: "duplicate-id"`, source/target Table IDs, transfer kind, and exact rejected conflict, including when built-in feedback is disabled. `canTransfer()` rejection remains application-owned and does not emit the duplicate-conflict notification.

The Tooltip visuals are customizable without replacing its positioning or accessibility behavior:

```css
.comins-table {
  --comins-table-tooltip-danger-background: #7f1d1d;
  --comins-table-tooltip-danger-border: rgba(254, 202, 202, 0.28);
  --comins-table-tooltip-danger-color: #ffffff;
  --comins-table-tooltip-danger-muted: #fecaca;
  --comins-table-tooltip-shadow: 0 12px 30px rgba(69, 10, 10, 0.28);
}
```

Return `"overwrite"` only when destructive replacement is intended. Row overwrite removes the target Row with the same ID before insertion. Group overwrite removes the complete target Group and its member Rows, then inserts the source Group bundle; it never merges the two Groups. Resolved conflicts are included in `result.details` for audit or notification.

The pure `transferCominsRowBetweenTables()` and `transferCominsGroupBetweenTables()` helpers expose the same immutable reject/overwrite model transition for application JavaScript. They have no Coordinator or pointer lifecycle, so rejected pure-helper calls return `null` without Tooltip feedback or `onTransferRejected`.

## Lifecycle and supported combinations

Duplicate registration of a `tableId` within one Coordinator scope fails closed. A stale/unmounted source or target, missing target identity, changed business ID, incompatible flat/grouped shape, or rejected callback produces no `onTransfer` call.

While a valid pointer is within the top or bottom edge of a different target body, Cross-Table Drag auto-scrolls that target vertically and re-resolves the Drop target. Local same-Table Drag behavior is unchanged. `pointercancel`, `Escape`, window blur, and unmount clear listeners, markers, and pending animation frames.

Cross-Table Transfer is unavailable with Tree Grid, Column Filtering, Infinite Scroll, and Lazy Load. Tree transfer remains a separate feature.

See the [`/examples/cross-table-drag`](http://127.0.0.1:4002/examples/cross-table-drag) Playground route.
