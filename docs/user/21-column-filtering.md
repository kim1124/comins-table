# Column Filtering

Comins Table provides controlled client-side Column Filtering for flat application-owned `data`. Each Column opts into a value kind through `columns[].filter`, while the application owns both the complete `columnFiltering.model` and the currently open Header Filter popover.

Run the [`/examples/column-filtering`](http://127.0.0.1:4002/examples/column-filtering) Playground route for text, number, UTC date, boolean, Summary Row, sorting, and Row Grouping integration.

## Controlled model

```tsx
type Row = {
  active: boolean;
  amount: number;
  id: string;
  joinedAt: string;
  name: string;
};

const [model, setModel] = useState<CominsColumnFilterModel>([]);
const [openColumnId, setOpenColumnId] = useState<string | null>(null);

const columns: Array<CominsTableColumn<Row>> = [
  { field: "name", filter: { kind: "text" }, label: "Name", sort: true },
  { field: "amount", filter: { kind: "number" }, label: "Amount", sort: true },
  { field: "joinedAt", filter: { kind: "date" }, label: "Joined", sort: true },
  { field: "active", filter: { kind: "boolean" }, label: "Enabled", sort: true },
];

<CominsTable
  columnFiltering={{
    model,
    onChangeModel: setModel,
    onChangeOpenColumnId: setOpenColumnId,
    openColumnId,
  }}
  columns={columns}
  data={rows}
  getRowId={(row) => row.id}
/>
```

`CominsColumnFilteringConfig` never stores application state internally. `onChangeModel` receives the next complete array after editing or clearing one Column. `onChangeOpenColumnId` receives the next Column ID or `null`; writing it back to `openColumnId` opens one popover at a time.

If `onChangeOpenColumnId` is omitted, Header Filter buttons are disabled. If an externally controlled popover is open without `onChangeModel`, its editor is read-only. Filter buttons and popovers isolate click, keyboard, pointer, sorting, resize, and Column Move interactions. Outside pointer input and `Escape` close through the controlled callback; `Escape` returns focus to the trigger.

## Column configuration and operators

`CominsColumnFilterConfig<TData, TValue>` uses `CominsColumnFilterKind`; each rule uses a `CominsColumnFilterOperator`. They support these values:

| Kind | Operators |
| --- | --- |
| `text` | `contains`, `notContains`, `startsWith`, `endsWith`, `equals`, `notEquals`, `isEmpty`, `isNotEmpty` |
| `number` | `equals`, `notEquals`, `greaterThan`, `greaterThanOrEqual`, `lessThan`, `lessThanOrEqual`, `between`, `isEmpty`, `isNotEmpty` |
| `date` | The same comparison, range, and empty operators as `number` |
| `boolean` | `equals`, `notEquals`, `isEmpty`, `isNotEmpty` |

Text matching is case-insensitive by default. Set `caseSensitive: true` on the Column Filter configuration for exact casing. Whitespace is a text value; only `null`, `undefined`, and `""` are empty.

Number comparison accepts finite numeric Row values and finite numeric model values. `between` normalizes reversed endpoints into an inclusive range. Non-numeric Row values and `NaN` do not match numeric rules.

Date filtering uses UTC calendar days. Model values should be exact `YYYY-MM-DD` strings, and Row values may be valid dates, timestamps, or date strings that normalize to a UTC day. Invalid calendar dates are ignored rather than coerced.

Use `filter.getValue` when the comparison value differs from the normal nested `field` value:

```tsx
{
  field: "owner",
  label: "Owner",
  filter: {
    kind: "text",
    getValue: ({ row }) => row.owner?.displayName,
  },
}
```

## Normalization

`CominsColumnFilterRule` contains `columnId`, `operator`, optional `value`, and optional `valueTo`. Rules across different Columns use AND. When duplicate valid rules address one Column, the first valid rule wins.

Unknown Columns, Columns without `filter`, unsupported operator/kind pairs, invalid values, and malformed untyped entries are ignored. If no valid rule remains, all source Rows are visible. The original `data` array and business Row identities are never mutated.

## Projection, sorting, and Summary

The client-side projection order is:

1. Filter source Row indexes.
2. Build Row Group membership when configured.
3. Apply the existing Row sorting policy.
4. Apply flat pagination or virtualization.
5. Render leaf Rows and fixed-height Details.

Summary Row aggregation uses filtered leaf Rows before flat pagination. Header sorting does not modify or reorder the Filter model. An out-of-range flat `pageIndex` is clamped to the final page produced by the filtered Row count.

Selected Row IDs and expanded Row Detail IDs that are filtered out stay dormant and can reappear when the Filter changes. Hidden Cell or range selection is cleared because those addresses require a visible projection.

## Row Grouping integration

`columnFiltering` can be combined with controlled single-depth `rowGrouping`. Filtering changes only Group membership input:

- Every explicit Group remains visible, including Groups with zero filtered members.
- The application-owned `groups` array remains the Group position and order source of truth.
- Group counts and built-in aggregates use filtered members.
- Existing Header sorting still runs independently inside each Group and never reorders Group Rows.
- Controlled Group expansion IDs stay intact.
- Group Drag may remain enabled because it changes the explicit Group model, not the filtered Row projection.

## Boundaries

Column Filtering is a CSR flat-data feature. It cannot be combined with Tree Grid, Infinite Scroll, Lazy Load, `loadingMore`, or Row Drag. Passing a `columnFiltering` configuration disables Row Drag even when the model is empty, because movement through a potentially partial projection is ambiguous. Grouped Filtering also inherits the Row Grouping prohibition on pagination.

Server-side filtering, custom Filter editor renderers, OR groups, multi-rule-per-Column evaluation, locale-aware text collation, fuzzy search, relative dates, Tree filtering, and remote datasource filtering are outside this release. Applications can still implement these policies by producing their own controlled `data` before passing it to Comins Table.
