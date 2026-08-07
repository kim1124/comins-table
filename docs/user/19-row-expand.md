# Row Expand

Row Expand adds a controlled full-width Detail region immediately after a flat
owner business Row. The application owns the expanded IDs and Detail content;
Comins Table keeps sorting, pagination, loading, movement, selection, clipboard,
and callbacks addressed to owner Rows only.

Open `/examples/row-expand` after `npm run dev` for fixed, automatic, tall,
read-only controlled, and non-expandable examples.

## Public Types

```ts
export type CominsRowDetailParams<TData> = {
  row: CominsEventRow<TData>;
};

export type CominsRowDetailHeight = number | "auto";

export type CominsRowDetailProps<TData> = {
  estimatedRowDetailHeight?: number;
  expandedRowIds?: readonly CominsRowId[];
  getRowDetailHeight?: (
    params: CominsRowDetailParams<TData>,
  ) => CominsRowDetailHeight;
  isRowExpandable?: (params: CominsRowDetailParams<TData>) => boolean;
  onChangeExpandedRowIds?: (rowIds: CominsRowId[]) => void;
  renderRowDetail?: (
    params: CominsRowDetailParams<TData>,
  ) => React.ReactNode;
};
```

`renderRowDetail` enables the flat Row Expand surface. Without it, all other
Detail props remain inert.

## Controlled State

```tsx
const [expandedRowIds, setExpandedRowIds] = useState<readonly string[]>([]);

<CominsTable
  columns={columns}
  data={rows}
  expandedRowIds={expandedRowIds}
  getRowId={(row) => row.id}
  onChangeExpandedRowIds={setExpandedRowIds}
  renderRowDetail={({ row }) => <Detail row={row.data} />}
/>;
```

`expandedRowIds` defaults to an empty array. A disclosure calls
`onChangeExpandedRowIds` with the next deduplicated owner ID array; the
application writes it back to keep the UI controlled. If the callback is
omitted for an otherwise expandable Row, the read-only controlled disclosure
reflects the supplied state but is disabled. Its effective Detail remains
mounted when its ID is present.

IDs remain dormant when their owner is filtered out, paged out, not loaded, or
temporarily unavailable. They are preserved in subsequent callback input and
become effective again when the owner returns. An ID is effective only when the
current flat data contains the owner and `isRowExpandable` does not return
`false`. This is a separate contract from read-only control: a non-expandable
Row renders neither a disclosure nor a Detail, even when a change callback and
controlled ID are present.

## Detail Height

`getRowDetailHeight` accepts a finite positive CSS pixel height or `"auto"`.
Only a finite positive number is fixed: its Detail keeps that inline height.
Missing values, invalid numeric values, and `"auto"` use automatic measurement,
so the rendered Detail has no inline height.

```tsx
<CominsTable
  estimatedRowDetailHeight={300}
  getRowDetailHeight={({ row }) => (row.id === "large" ? 480 : "auto")}
  renderRowDetail={({ row }) => <Detail row={row.data} />}
/>
```

Before an automatic Detail has a matching-width measurement,
`estimatedRowDetailHeight` is used when it is a finite positive value; otherwise
the current resolved `rowHeight` is the estimate. Measurements are cached by
owner ID and width. A width mismatch returns to that estimate until the shared
`ResizeObserver` reports the new border-box height. Fixed Details are not
observed and never use `estimatedRowDetailHeight`.

## Semantic DOM And Focus

Each effective Detail is a semantic sibling of its owner:

```html
<tr data-comins-row-data-index="0">...</tr>
<tr data-detail-for="row-id">
  <td colspan="current visible Column count">
    <div role="region" aria-labelledby="owner-disclosure-id">...</div>
  </td>
</tr>
```

The owner disclosure exposes `aria-expanded`. `aria-controls` is present only
while the controlled region is mounted. The region is labelled by that
disclosure. Its accessible name is exactly `Expand <row-id> details` or
`Collapse <row-id> details`. Native Enter and Space activation is preserved,
while disclosure keydown events do not enter owner Cell or Row keyboard and
clipboard handling. Interactive Detail content stays in the normal tab order.
When a controlled collapse unmounts a Detail that contains focus, focus returns
to the owner disclosure.

The Detail cell spans the effective visible Column count after Column hide,
restore, and reorder. It is one non-sticky full-width cell and scrolls
horizontally with the body.

## Compatibility

| Surface | Row Expand behavior |
| --- | --- |
| Sorting | Owner and Detail move together; controlled IDs do not change. |
| Pagination | Off-page IDs stay dormant and are preserved. |
| Infinite Scroll and Lazy Load | Offsets, limits, thresholds, and counts use owner business Rows only. |
| Row movement | The owner Slot moves as one unit; Detail is never a target. |
| Row, Cell, and range selection | Detail has no Row or Cell address and cannot enter a range. |
| Copy and paste | Detail content is neither a clipboard source nor target. |
| Context menu and double-click | Owner callbacks ignore Detail content and disclosure events. |
| Loading, empty, filler, Summary, and infinite-loading Rows | Structural Rows have no disclosure or Detail. |
| Tree Grid | Unsupported; the runtime wrapper strips untyped flat Detail props. |

## Virtualization And Performance

Data Rows and collapsed Detail owners keep the arithmetic fixed-height path.
The private height index is activated only when an effective expanded Detail
makes a data Slot taller than rowHeight.

The owner and its optional Detail are one private virtual Slot. This keeps a
Detail taller than the viewport mounted while the outer body viewport scrolls
through it, without turning Detail content into a business Row.

Prefer a finite fixed height for bounded panels, large lists, or nested
application widgets, and give large inner content its own scroll or
virtualization. Use `"auto"` for bounded content that genuinely needs measured
height. One shared `ResizeObserver` observes mounted automatic Detail blocks
only; fixed Details do not allocate measurements.

## Unsupported Boundaries

- Tree Grid Row Details are unsupported.
- General automatic height for owner data Rows is unsupported; `rowHeight`
  remains the owner Row contract.
- Nested managed Details are unsupported. An application may render ordinary
  content inside one Detail, but Comins Table does not manage a second Detail
  hierarchy.
