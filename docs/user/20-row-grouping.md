# Row Grouping

Comins Table groups application-owned flat `data` on the client. Synthetic group rows describe hierarchy and aggregate values; they are never exposed as `TData`, business Row IDs, or ordinary Row/Cell callback payloads.

Run the [`/examples/row-grouping`](http://127.0.0.1:4002/examples/row-grouping) Playground route for single-level, nested, hidden-criterion, Row Detail, aggregation, and 100000-leaf virtualization examples.

## Controlled configuration

```tsx
const [expandedGroupIds, setExpandedGroupIds] = useState<string[]>([]);

<CominsTable
  columns={columns}
  data={rows}
  getRowId={(row) => row.id}
  multiSort
  rowGrouping={{
    aggregations: {
      amount: "sum",
      id: "count",
    },
    criteria: ["region", "team"],
    expandedGroupIds,
    onChangeExpandedGroupIds: setExpandedGroupIds,
  }}
  virtualized
/>;
```

The `rowGrouping` prop accepts `CominsRowGroupingConfig<TData>`. Its `criteria` array accepts a Column ID or a `CominsRowGroupingCriterion`. Missing Columns and duplicate Column IDs after the first valid occurrence are ignored. A criterion remains valid when its source Column is hidden; source Columns otherwise remain visible.

Use `getKey` when the raw field value needs a supported grouping key:

```tsx
rowGrouping={{
  criteria: [
    "region",
    {
      columnId: "amount",
      getKey: ({ value }) =>
        typeof value === "number" && value >= 100 ? "high" : "low",
      getLabel: ({ key }) => key === "high" ? "High value" : "Standard value",
    },
  ],
}}
```

`CominsRowGroupKey` supports strings, finite numbers, booleans, valid `Date` objects, and `null`. `null` and `undefined` share the `(empty)` group. Invalid Dates, non-finite numbers, objects, arrays, functions, and symbols share `(unsupported)`. Applications grouping object-valued fields should return a supported key from `getKey`.

Group IDs are opaque deterministic strings derived from the typed criterion path. Labels, sorting, and expansion do not change them. Treat IDs received by `onChangeExpandedGroupIds` as opaque values and feed them back through `expandedGroupIds`.

`expandedGroupIds` is the only expansion source of truth. When `onChangeExpandedGroupIds` is omitted, disclosure buttons are disabled and read-only.

## Aggregation and sorting

`rowGrouping.aggregations` maps an output Column ID to `count`, `sum`, `avg`, `min`, or `max`.

- `count` includes every descendant leaf, including empty values.
- Numeric reducers use finite numbers only.
- `sum`, `avg`, `min`, and `max` render empty when the group has no finite numeric value.
- Aggregation reads raw fields and does not invoke Cell renderers or formatters.
- Expansion does not change aggregate input.

Sorting is hierarchy-first. A sort rule for an active grouping Column orders sibling groups at that depth. That rule is consumed by group ordering. Remaining sort rules order leaves inside the lowest-level group with existing Column comparators and stable source-order ties. Without a grouping sort rule, sibling groups keep first source occurrence order.

## Leaf-only interaction

Each group row renders one Cell per current visible Column. The first visible Cell is a native `<th scope="row">` with disclosure, indentation, criterion label, and group label. Other Cells display configured aggregates. Group rows do not call Cell renderers, formatters, tooltips, ordinary Row/Cell callbacks, selection, Clipboard, Row Detail, or drag behavior.

Visible leaf callbacks retain their existing contract:

- `row.data` is the original `TData`.
- `row.dataIndex` is the source `data` index.
- `row.id` is the business Row ID.
- `row.index` is the visible leaf index; group rows do not increment it.

`expandedRowIds`, `onChangeExpandedRowIds`, and `renderRowDetail` continue to target visible business leaves. A collapsed group keeps selected Row IDs and expanded Detail IDs dormant. A Cell or range hidden by collapse is cleared once. If an externally controlled collapse removes the focused leaf while focus belongs to the table, focus moves to the nearest collapsed ancestor disclosure.

Cell range highlighting, copy, and paste follow current grouped leaf order and never include synthetic group rows.

## Virtualization and boundaries

Fixed-height group and leaf rows share the arithmetic virtualization path. An expanded fixed or automatic Row Detail adds height only to its owner data slot and switches that projection to the mixed-height index. Group slots never receive business Row IDs or source data indexes.

Row Grouping is a client-side flat-table feature. It cannot be combined with:

- `pagination`
- `infiniteScroll`, `hasMoreRows`, `loadingMore`, or `onLoadMore`
- `lazyLoad` or `onLazyLoad`
- `tree`
- `rowProps.draggable`
- imperative `setMoveTargetRow`

The public TypeScript props reject these combinations. Runtime guards keep the paths inert for untyped callers. Column Pinning, Visual Fill Handle UI, server-side grouping, pivoting, custom reducers, aggregate sorting, and group selection are not part of this Row Grouping release.
