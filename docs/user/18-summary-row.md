# Summary Row

Summary Row renders fixed footer values against the table's current visible-column layout. Configure each column by its resolved column id (the explicit `id`, or the column `field` when no id is supplied).

```tsx
<CominsTable
  columns={columns}
  data={rows}
  getRowId={(row) => row.id}
  summary={{
    label: "Summary",
    columns: {
      item: "count",
      quantity: "sum",
      unitPrice: "avg",
      amount: {
        aggregate: "sum",
        className: "summary-amount",
        format: ({ value }) => `₩${Number(value).toLocaleString()}`,
        style: { fontWeight: 700 },
      },
      score: "max",
    },
  }}
/>
```

## Built-in and custom aggregation

The built-in aggregate names are `count`, `sum`, `avg`, `min`, and `max`. `count` returns the number of supplied rows. Numeric aggregates ignore values that are not finite numbers and return an empty cell when no numeric value exists.

A function may replace a built-in aggregate when the result needs domain-specific calculation:

```tsx
summary={{
  columns: {
    amount: ({ rows, values, column }) => calculateTotal(rows, values, column),
  },
}}
```

The aggregator receives the runtime `column`, all aggregated `rows`, and the raw field `values`.

## colSpan and format

Use the object form to span visible summary cells or customize the aggregated output:

```tsx
summary={{
  columns: {
    item: { aggregate: "count", colSpan: 2 },
    amount: {
      aggregate: "sum",
      format: ({ value, values, rows, column }) => formatAmount(value),
    },
  },
}}
```

`colSpan` starts at the configured visible column, skips the covered summary cells, and is clamped to the remaining visible columns. `format` runs after aggregation and receives `value`, `values`, `rows`, and `column`. The public option remains `format`, matching the existing cell formatting terminology.

## Row and cell styling

`summary.className` and `summary.style` apply to the footer row. A column descriptor's `className` and `style` apply only to that summary cell.

```tsx
summary={{
  className: "summary-row",
  style: { background: "#f8fafc" },
  columns: {
    amount: {
      aggregate: "sum",
      className: "summary-cell--emphasis",
      style: { color: "#0369a1" },
    },
  },
}}
```

With flat `infiniteScroll` or `lazyLoad`, Summary Row aggregates the rows currently present in controlled `data`; it does not imply an unloaded remote total. In Tree Grid, it aggregates all leaf `item` rows, including leaves below folded parents, and excludes parent values to avoid double counting.

Run `npm run dev`, then open `/examples/summary-row` for built-in, `colSpan`, `format`, and styling examples.
