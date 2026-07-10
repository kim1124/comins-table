# Header

Columns can enable sorting, width constraints, resizing, and custom header content.

```tsx
const columns: Array<CominsTableColumn<PersonRow>> = [
  { field: "name", id: "name", label: "Name", sort: true, width: 160 },
  { field: "age", id: "age", label: "Age", sort: true, width: 120 },
];
```

Use `onChangeSort` for controlled sort updates and `onChangeColumnLayout` for width, order, and visibility persistence.

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
