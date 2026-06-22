# Styling

Table 전체 스타일은 `className`, `style`, `theme`로 제어한다. Row 스타일은 `rowProps`, column/cell 스타일은 `columns[].cell.props`로 둔다.

```tsx
<KmsfDataTable
  className="example-table"
  columns={[
    {
      field: "name",
      header: { props: { className: "header-cell", title: "Name" } },
      label: "Name",
      cell: {
        props: {
          className: ({ row }) => (row.data.role === "Owner" ? "cell-owner" : undefined),
          style: { textAlign: "left" },
        },
      },
    },
  ]}
  data={data}
  getRowId={(row) => row.id}
  rowProps={{
    className: (row) => (row.role === "Owner" ? "row-owner" : undefined),
    disabled: (row) => row.locked === true,
    style: (row) => (row.locked ? { opacity: 0.5 } : undefined),
  }}
  theme={{ density: "compact" }}
/>
```

`rowProps.disabled`는 해당 row의 row/cell interaction을 모두 차단한다.
