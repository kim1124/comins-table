# Pagination

Pass `pagination` to control page index and page size.

```tsx
<CominsTable
  columns={columns}
  data={data}
  pagination={{ pageIndex, pageSize }}
/>
```

The table renders the visible page from the controlled pagination state. External buttons can update the same state and then pass the next `pagination` prop.

The core helper `setCominsPagination` is available when pagination is managed through `createCominsTableState`.
