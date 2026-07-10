# Virtualization

Set `virtualized` for large row sets.

```tsx
<CominsTable
  columns={columns}
  data={rows100000}
  virtualized
  rowHeight={36}
  buffer-size={10}
/>
```

The package is validated against a 100000-row virtualization scenario. Performance review uses Chrome DevTools Performance Monitor counters such as DOM Node count and JS heap size.

`"buffer-size"` controls how many rows remain mounted around the viewport. `rowHeight` must match the visual row height when CSS overrides `--comins-table-row-height`.

Virtualization reduces DOM work, but the application still owns the full `data` array in the current CSR model.
