# Virtualization

[Documentation](../README.md) · [English guides](README.md) · [한국어](../ko/11-virtualization.md) · [Playground](http://127.0.0.1:4002/performance/virtualization)

Set `virtualized` for large row sets.

<!-- comins-doc-example: fragment -->
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

Uniform fixed-height Rows keep the arithmetic path. Row-specific or automatic heights and expanded Details use the private height index. See [automatic Row height](24-auto-row-height.md).

For ordinary array-backed Tables, virtualization reduces DOM work while the application still owns the full `data` array. Viewport mode additionally limits loaded data with a block cache.

Column Filtering derives source indexes before the virtual range. A Filter change therefore updates the logical projection while the application continues to own the unchanged full `data` array and stable Row IDs.

For bounded remote data, use [Viewport Datasource](25-viewport-datasource.md); the full CSR array contract remains available.

## Choosing a data-loading mode

| Mode | Data kept by the application | Scroll behavior |
| --- | --- | --- |
| Array + `virtualized` | Full Row array | Mount only the current window and buffer |
| Infinite Scroll / Lazy Load | Rows accumulated by append requests | Reach later data by loading successive batches |
| Viewport Datasource | Bounded blocks through `useCominsViewport` | Request arbitrary ranges using a known total count |

Automatic heights can be combined with virtualization and Viewport loading. They measure mounted content and estimate unknown heights; they do not pre-measure the full dataset. See [Automatic Row Height](24-auto-row-height.md) and [Viewport Datasource](25-viewport-datasource.md).
