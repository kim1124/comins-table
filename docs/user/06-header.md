# Header

Columns can enable sorting, width constraints, resizing, and custom header content.

```tsx
const columns: Array<CominsTableColumn<PersonRow>> = [
  { field: "name", id: "name", label: "Name", sort: true, width: 160 },
  { field: "age", id: "age", label: "Age", sort: true, width: 120 },
];
```

Use `onChangeSort` for controlled sort updates and `onChangeColumnLayout` for width, order, and visibility persistence.

## Column reorder

- A left-button mouse interaction activates column reorder at a 6-pixel horizontal drag threshold. Horizontal movement must be greater than vertical movement.
- Pointer Up below the threshold preserves the normal click and sort behavior. Vertical intent cancels both the pending reorder and sort.
- After activation, the source header becomes a source placeholder while a ghost and target marker show the pending move.
- A move commits only on Pointer Up over a valid target. Pointer cancellation, `Escape`, or window blur cancels it without changing the layout.
- For non-mouse pointer input, one-second long-press compatibility is retained.
- Parent groups use the same interaction and move all child columns as one block.
- A dedicated drag handle remains a future alternative; it is not a shipped API.

Two-level headers use `columnGroups`.

```tsx
<CominsTable
  columns={columns}
  columnGroups={[
    { id: "profile", label: "Profile", children: ["name", "age"] },
  ]}
  data={data}
/>
```

Parent groups resize their child columns proportionally and move as a block. Nested groups are not part of the first public release.
