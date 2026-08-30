# Virtualization

[Documentation](../README.md) · [English guides](README.md) · [한국어](../ko/11-virtualization.md) · [Playground](http://127.0.0.1:4002/performance/virtualization)

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

Header and Body remain separate table elements. Body owns vertical scrolling and virtual range updates; horizontal overflow uses the single scrollbar at the bottom of the complete Table and synchronizes Header, Body, and Summary.

`"buffer-size"` controls how many rows remain mounted around the viewport. `rowHeight` must match the visual row height when CSS overrides `--comins-table-row-height`.

Data Rows and collapsed Detail owners keep the arithmetic fixed-height path.
The private height index is activated only when an effective expanded Detail
makes a data Slot taller than rowHeight.

Virtualization reduces DOM work, but the application still owns the full `data` array in the current CSR model.

Column Filtering derives source indexes before the virtual range. A Filter change therefore updates the logical projection while the application continues to own the unchanged full `data` array and stable Row IDs.
