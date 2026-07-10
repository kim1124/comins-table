# Loading And Empty State

Use `loading` for initial loading and refetch states.

```tsx
<CominsTable
  columns={columns}
  data={data}
  loading={isLoading}
  loadingComponent={<span>Refreshing...</span>}
  emptyComponent={<span>No rows</span>}
  skeletonRowCount={5}
  persistHeaderWhenEmpty
/>
```

When `loading` is true and no rows exist, the table renders skeleton rows. When rows already exist, it keeps the current rows visible and renders an overlay. When loading is false and there are no visible rows, `emptyComponent` is rendered.
