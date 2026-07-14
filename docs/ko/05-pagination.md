# Pagination

Pagination은 `pagination` prop 또는 `setCominsPagination` core helper로 제어한다.

```tsx
<CominsTable
  columns={[{ field: "name", label: "Name" }]}
  data={Array.from({ length: 25 }, (_value, index) => ({
    id: `row-${index}`,
    name: `Row ${index}`,
  }))}
  getRowId={(row) => row.id}
  pagination={{ pageIndex: 0, pageSize: 10 }}
/>
```

현재 React component는 client-side pagination 기준이다. Server-side row model은 후속 기능이다.
