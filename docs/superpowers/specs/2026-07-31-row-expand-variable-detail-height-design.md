# Row Expand and Variable Detail Height Design

## Goal

Add controlled flat Row Expand with a full-width Detail Row that supports both
fixed and content-sized heights while preserving the current fixed-height
virtualization fast path, 100,000-Row performance contract, table semantics,
and application-owned data flow.

This delivery introduces only the internal layout boundary needed for a future
Row Grouping feature. It does not implement Row Grouping or general
variable-height data rows.

## Confirmed product decisions

- A Detail region renders immediately after its owner data Row.
- A Detail region is a separate semantic table Row:
  `<tr><td colSpan={visibleColumnCount}><div>...</div></td></tr>`.
- A `div` is never rendered directly under a `tr`.
- Normal data Rows retain the existing fixed `rowHeight`.
- Detail height supports a positive pixel number or `"auto"`.
- The default Detail height is `300px`.
- `"auto"` is explicit opt-in behavior and uses `300px` as its initial estimate
  unless the application provides another positive estimate.
- Expanded state is controlled by application-owned Row IDs. It is not written
  into application Row data.
- Sorting, pagination, lazy loading, infinite scrolling, selection, clipboard,
  and Row movement continue to operate on owner data Rows. A Detail Row follows
  its owner and is not independently selectable, sortable, copyable, or
  movable.
- Flat Row Expand is unavailable in Tree Grid mode in this delivery. Tree
  expansion retains its current meaning and fixed-height virtualization.
- The current fixed-height public helper remains compatible. This delivery does
  not change `CominsVirtualRowsOptions.rowHeight` or the existing
  `getCominsVirtualRows` result contract.
- No runtime dependency is added.

## Scope

### Included

- Controlled flat Row expansion state.
- A default disclosure control in the first visible data Cell.
- Conditional Row expandability.
- Fixed Detail height.
- Per-Row fixed Detail height.
- Content-sized Detail height using measurement and caching.
- Virtualized and non-virtualized rendering.
- Logical-to-physical scroll mapping for bounded browser Scroll Height.
- Scroll-anchor preservation when Detail measurements change.
- Accessibility, focus restoration, documentation, Playground coverage, and
  focused performance regression coverage.
- A private virtual Slot and height-index abstraction that a later Row Grouping
  design may reuse.

### Excluded

- Arbitrary variable-height owner Rows.
- Content-wrapping owner Row auto-height.
- Row Grouping, aggregation, and Pivot public APIs or UI.
- Tree Grid Detail Rows.
- Nested Detail levels managed by Comins Table.
- An application-facing height-cache API.
- A new package subpath or new runtime dependency.
- Server-side Row models and viewport datasource models.
- Publishing, version changes, tags, Releases, and remote writes.

## Public API

The flat `CominsTableProps<TData>` branch adds the following optional props:

```ts
export type CominsRowDetailParams<TData> = {
  row: CominsEventRow<TData>;
};

export type CominsRowDetailHeight = number | "auto";

export type CominsTableProps<TData> = {
  // Existing props remain unchanged.

  estimatedRowDetailHeight?: number;
  expandedRowIds?: readonly CominsRowId[];
  getRowDetailHeight?: (
    params: CominsRowDetailParams<TData>,
  ) => CominsRowDetailHeight;
  isRowExpandable?: (
    params: CominsRowDetailParams<TData>,
  ) => boolean;
  onChangeExpandedRowIds?: (
    rowIds: CominsRowId[],
  ) => void;
  renderRowDetail?: (
    params: CominsRowDetailParams<TData>,
  ) => React.ReactNode;
};
```

### Public behavior

- `renderRowDetail` enables Row Expand. Without it, all new Row Detail props
  are inert and no disclosure control is rendered.
- `expandedRowIds` defaults to an empty array.
- Duplicate IDs are normalized by preserving their first occurrence. Expanding
  appends the owner ID; collapsing removes that ID.
- Row IDs whose owners are not in the current page or projection remain dormant.
  A visible-Row toggle preserves those dormant IDs in the next callback value
  so controlled expansion can survive sorting and pagination.
- Row IDs not present in the current controlled data are ignored by rendering.
  The component does not emit a cleanup callback solely to prune them.
- `isRowExpandable` defaults to `true` for every flat data Row when
  `renderRowDetail` is present.
- A Row for which `isRowExpandable` returns `false` never renders a disclosure
  control or Detail Row, even if its ID is present in `expandedRowIds`.
- User disclosure actions calculate the next Row-ID array and call
  `onChangeExpandedRowIds`. The component does not keep an independent
  expanded-state source of truth.
- If `onChangeExpandedRowIds` is absent, the disclosure control reflects
  `expandedRowIds` but is disabled. This supports controlled read-only
  presentation without silently creating internal state.
- `getRowDetailHeight` defaults to `300`.
- A finite positive number is used as an exact Detail height in CSS pixels.
- `"auto"` enables measurement.
- A non-finite or non-positive numeric result falls back to `300`.
- `estimatedRowDetailHeight` is used only for unmeasured `"auto"` Details. A
  non-finite or non-positive value falls back to `300`.
- Public callbacks receive the same Row ID, data, data index, and visible index
  meaning used by the existing Row event payloads.

The `CominsTreeTableProps<TData>` branch explicitly omits the new Detail props
and exposes them as `never`, matching the existing Tree Grid compatibility
policy.

## Rendering and interaction semantics

For one expanded owner Row, the body renders:

```tsx
<>
  <tr data-testid={`row-${rowId}`}>
    {/* existing data Cells */}
  </tr>
  <tr
    className="comins-table__detail-row"
    data-detail-for={rowId}
  >
    <td
      className="comins-table__detail-cell"
      colSpan={Math.max(1, visibleColumns.length)}
    >
      <div
        aria-labelledby={toggleId}
        className="comins-table__detail-content"
        id={detailId}
        role="region"
      >
        {renderRowDetail(params)}
      </div>
    </td>
  </tr>
</>
```

- The disclosure button is prepended to the first visible owner Cell and
  reuses the existing presentational disclosure-button behavior.
- The button uses `aria-expanded`, `aria-controls`, and an explicit accessible
  name in the form `Expand <row-id> details` or
  `Collapse <row-id> details`, matching the existing Tree disclosure naming
  convention.
- The Detail content region uses a stable ID derived from the owner Row ID and
  component instance using DOM-safe encoding, and is labelled by the disclosure
  control.
- Disclosure pointer and keyboard actions stop propagation so they do not also
  trigger owner Row or Cell selection callbacks.
- Interactive elements inside Detail content do not participate in owner Row
  selection, Cell selection, clipboard ranges, or Row movement.
- Collapsing a Detail that currently contains focus moves focus to the owner
  disclosure button before unmounting the Detail.
- Owner Row parity remains based on its visible data index. Detail Rows use a
  neutral Detail background and do not change subsequent owner Row parity.
- The Detail Cell spans the current visible Column count and therefore follows
  Column visibility, reorder, resizing, and horizontal scrolling without
  synthesizing application Columns.

## Virtual layout model

### Virtual Slots

The mixed-height path virtualizes private Slots rather than treating Detail
Rows as business Rows:

```ts
type CominsDataVirtualSlot<TData> = {
  dataIndex: number;
  detail?: {
    estimated: boolean;
    height: number;
    mode: "auto" | "fixed";
  };
  kind: "data";
  row: TData;
  rowId: CominsRowId;
  visibleIndex: number;
};

type CominsGroupVirtualSlot = {
  groupId: string;
  height: number;
  kind: "group";
};

type CominsVirtualSlot<TData> =
  | CominsDataVirtualSlot<TData>
  | CominsGroupVirtualSlot;
```

Only `CominsDataVirtualSlot` is produced in this delivery. The private union
reserves a narrow, behavior-free Group Slot so a later Row Grouping design can
reuse height lookup without sharing public expansion state, IDs, sorting rules,
or callbacks.

A data Slot's size is:

```ts
slotHeight =
  rowHeight
  + (expanded ? resolvedDetailHeight : 0);
```

Rendering a data Slot produces one owner `<tr>` and, when expanded, one Detail
`<tr>`. If the viewport begins inside a Detail, the Slot remains mounted and its
owner Row may be clipped above the viewport. This preserves valid table order
and keeps the disclosure owner available in the same rendered block.

### Fixed-height fast path

When every effective virtual Slot has `height === rowHeight`, the component
uses exact fixed-height arithmetic. This includes a future Row Grouping
projection whose Group Slots also have exactly `rowHeight`:

```ts
totalHeight = virtualSlotCount * rowHeight;
startIndex = Math.floor(logicalScrollTop / rowHeight);
```

No measurement observer, height index, per-Slot height allocation, or
variable-layout lookup runs on this path. A fixed-height projection may still
own its normal lightweight Slot metadata. Existing consumers that do not
enable Row Expand retain their current runtime behavior.

### Mixed-height path

When at least one effective data Slot has an expanded Detail and therefore a
height different from `rowHeight`, a private height index owns Slot sizes and
supports:

- total height lookup;
- prefix-height lookup;
- Slot-height updates;
- lower-bound lookup from logical offset to Slot index.

The implementation uses a Fenwick tree with the following bounds:

- build or rebuild: `O(N)`;
- total height: `O(1)`;
- prefix height: `O(log N)`;
- one measured-height update: `O(log N)`;
- logical-offset lower bound: `O(log N)`.

Sorting, pagination projection, controlled data replacement, effective
expandability changes, and expanded-ID changes may rebuild the Slot order.
Resize measurements update only the affected Slot.

The height index is a private module with pure unit coverage. `src/index.tsx`
consumes its range result and remains responsible for React rendering and
interaction callbacks.

## Bounded physical scrolling

The current `1,500,000px` physical Scroll Height cap remains. Mixed-height
layout calculates:

```ts
logicalTotalHeight = heightIndex.total();
physicalTotalHeight = Math.min(
  logicalTotalHeight,
  MAX_PHYSICAL_TOTAL_HEIGHT,
);
scrollScale =
  logicalScrollableHeight / physicalScrollableHeight;
logicalScrollTop = physicalScrollTop * scrollScale;
```

The height index finds the first visible Slot and overscanned start Slot from
`logicalScrollTop`.

Because rendered Row and Detail heights remain real CSS pixels rather than
being visually scaled, the rendered table block is locally anchored:

```ts
renderOffset =
  physicalScrollTop
  - (logicalScrollTop - overscannedStartLogicalOffset);
```

This keeps the correct intra-Slot position visible when a large Detail spans
the viewport under compressed physical scrolling. The fixed-height path keeps
its current calculation in this delivery.

The virtual body disables native scroll anchoring for the translated table
block. Comins Table owns anchor correction because the absolute table and
separate virtual sizer do not form a normal document-flow anchor relationship.

## Automatic Detail measurement

### Observation

- Fixed numeric Details are never observed.
- `"auto"` Details render with their cached height or
  `estimatedRowDetailHeight`.
- The observed node is the inner `.comins-table__detail-content` block, not the
  `<tr>`. This avoids browser-specific table-border measurement differences.
- One shared `ResizeObserver` observes all mounted automatic Detail blocks.
- The observer reads `borderBoxSize[0].blockSize` when available and falls back
  to `getBoundingClientRect().height`.
- Measurements are batched by the observer callback and committed once per
  callback, not once per individual entry.
- The implementation does not add a second animation-frame delay unless a
  measured browser regression demonstrates a need.

### Cache

The automatic-height cache is private and keyed by owner Row ID:

```ts
type CominsDetailMeasurement = {
  height: number;
  width: number;
};

Map<CominsRowId, CominsDetailMeasurement>
```

- Width is normalized to an integer CSS pixel.
- A cached measurement is used only when its width matches the current Detail
  content width.
- A width mismatch falls back to the estimate until the mounted Detail is
  remeasured.
- Hidden or removed owner Row IDs are ignored by layout. After a controlled data
  reference change, a reconciliation pass removes cache entries whose IDs are
  absent from the complete controlled Row-ID set.
- Collapsing a Row retains its last valid measurement so re-expansion at the
  same width avoids an unnecessary initial jump.
- If `ResizeObserver` is unavailable, the Detail receives an initial
  `getBoundingClientRect()` measurement after mount. Later asynchronous size
  changes use the last known value in that environment.

## Scroll-anchor preservation

Before applying a measurement batch or rebuilding sizes while scrolled, the
layout records:

- the first visible Slot's stable key;
- the logical offset inside that Slot.

After updating sizes:

1. Resolve the same Slot in the next projection.
2. Clamp the prior intra-Slot offset to the Slot's new height.
3. Recalculate logical total height and physical scroll scale.
4. Set physical `scrollTop` to the value that preserves the Slot and intra-Slot
   position.
5. Synchronize the component's pending and committed scroll refs so the
   programmatic write does not create an oscillating correction loop.

If the anchor Slot no longer exists, use the nearest surviving previous Slot,
then the next Slot, then zero.

Opening a Detail from its visible owner keeps the owner Row's top position
stable. Closing a Detail keeps the owner stable unless the owner itself is
outside the current projection due to a simultaneous controlled data change.

## Data-flow compatibility

### Sorting

Expanded state remains keyed by stable owner Row ID. Sorting changes Slot order;
the Detail follows its owner without changing `expandedRowIds`.

### Pagination

Only owners in the current non-virtualized page produce Slots. Expanded IDs for
other pages remain controlled but dormant and reappear when their owners return.

### Lazy loading and infinite scrolling

The Detail is derived after the currently loaded owner rows are resolved. It
does not count as a loaded data Row and does not change lazy-load offsets,
batch sizes, total data counts, or load-more thresholds.

### Selection and clipboard

All current visible-index and data-index calculations continue to refer to
owner data Rows. Detail Rows do not enter selected Row ranges or Cell address
matrices.

### Row movement

The owner and Detail render as one virtual Slot. A successful owner Row move
therefore moves the Detail with it. Detail content has no Row drag handle and
cannot become a move target. Existing move callbacks continue to use business
data indexes.

### Loading, empty, summary, and filler rows

Skeleton, empty, infinite-loading, summary, and filler Rows never become
expandable and do not enter `expandedRowIds`. Existing loading and summary
contracts remain unchanged.

## Error and edge handling

- Duplicate owner Row IDs continue to be invalid input under the existing
  stable-ID contract; Row Expand does not create an alternate identity.
- An expanded Row whose `renderRowDetail` returns `null` still has its configured
  fixed height. In `"auto"` mode, an empty Detail resolves to its measured
  wrapper height, including application padding.
- An error thrown by application render or callback code follows React's
  existing error-boundary behavior; Comins Table does not swallow it.
- A Detail height change smaller than `0.5px` does not update the height index,
  preventing ResizeObserver feedback loops.
- Automatic Detail content should be bounded. Large lists or nested tables
  should use a fixed Detail height and their own internal scroll or
  virtualization rather than expanding the outer Detail to all content.
- Smooth programmatic scrolling is not added in this delivery. Measurement
  correction uses immediate scroll writes.

## Styling

Add module-scoped variables with theme-compatible defaults:

```css
--comins-table-detail-background:
  var(--comins-table-surface);
--comins-table-detail-border:
  var(--comins-table-row-border);
--comins-table-detail-padding: 12px;
```

- The Detail Cell spans all visible Columns and has zero padding and border.
- The inner Detail content wrapper owns the theme background, padding, bottom
  and right borders, application layout, and overflow. Its measured border box
  is therefore the complete Detail height used by the virtual Slot.
- The Detail content wrapper uses `box-sizing: border-box`.
- Fixed height applies to the Detail content wrapper's border box.
- Automatic height never receives a fixed inline height.
- Detail styles do not alter owner Row or Cell height tokens.
- Theme overrides remain scoped through the current Comins Table root.

## Performance requirements

- With no expanded Rows, existing 100,000-Row tests must retain their bounded
  mounted-Row counts and current physical Scroll Height contract.
- Opening one fixed Detail in a 100,000-Row data set must not allocate one DOM
  node per data Row.
- Fixed Details perform no DOM measurement.
- Automatic measurement observes only mounted Detail blocks.
- Repeated expand, collapse, width resize, and route-away cycles must release
  observed elements and leave no unbounded measurement-cache, DOM-node, event
  listener, or heap growth.
- A Detail taller than the viewport must remain scrollable through the outer
  viewport without a blank gap or repeated jump.
- Measurement and range updates remain batched with the current scroll
  animation-frame scheduling.

## Accessibility

- The disclosure control is a native button.
- It supports `Enter` and `Space` through native button behavior.
- `aria-expanded` reflects controlled state.
- `aria-controls` points to the mounted Detail region only while expanded.
- The Detail region has an accessible relationship to its owner control.
- Detail interactive content remains in normal Tab order while mounted.
- Collapse restores focus to the owner disclosure when focus was inside the
  removed Detail.
- Read-only disclosure controls expose the native disabled state and cannot be
  activated.
- Detail Row presence does not change owner Row `aria-selected`.

## Testing strategy

### Pure unit tests

- Height-index build, total, prefix, update, and lower-bound behavior.
- Mixed fixed and estimated Slot heights.
- Height changes above, inside, and below the viewport.
- Anchor fallback when the prior Slot is removed.
- Physical/logical coordinate mapping below and above the height cap.
- Large Detail intra-Slot render-offset calculation.
- Width-aware measurement cache lookup and eviction.
- Invalid Detail-height normalization.

### React DOM interaction tests

- Controlled expand and collapse callback payloads.
- Read-only controlled state when the change callback is absent.
- Conditional expandability.
- Correct `<tr><td colSpan><div>` structure.
- Owner and Detail event isolation.
- Detail follows owner sorting, pagination, and movement.
- Selection and clipboard exclude Details.
- Fixed Detail avoids observer registration.
- Automatic Detail measurement updates the Slot height.
- Collapse focus restoration.
- Type coverage rejects flat Detail props on `CominsTreeTableProps`.
- The runtime Tree wrapper does not forward Row Detail props into the flat body.

### Playwright tests

- Playground fixed-height and automatic-height examples.
- Asynchronous Detail content growth without scroll jump.
- Width change causing text wrap and remeasurement.
- Detail taller than the viewport.
- Scrollbar drag across expanded Details under bounded physical height.
- Horizontal scroll and Column resize/reorder with correct Detail `colSpan`.
- No browser diagnostics or ResizeObserver loop errors.
- Repeated expand/collapse memory-counter scenario.

### Regression gates

Run focused unit and browser tests first, then:

```bash
npm run verify
npm run test:e2e -- --workers=1
npm run test:perf -- --workers=1
```

The full performance gate is required because this delivery changes virtual
range, Scroll Height, and memory-observer behavior.

## Delivery order

1. Add pure virtual Slot, height-index, and coordinate-mapping utilities with
   fixed and mixed-height unit tests.
2. Add controlled API types and non-virtualized fixed Detail rendering.
3. Integrate fixed Details with the virtual mixed-height path while preserving
   the no-Detail fast path.
4. Add automatic measurement, width-aware cache, and scroll-anchor correction.
5. Add accessibility and interaction compatibility behavior.
6. Add Playground examples and matching English/Korean public documentation.
7. Run focused tests, full verification, and performance/memory gates.

The fixed and automatic modes belong to one public Row Expand delivery, but the
implementation checkpoints remain separate so failures can be isolated.

## Expected files

| Area | Expected files |
| --- | --- |
| Public types and rendering | `src/index.tsx` |
| Private layout utilities | `src/virtual-layout.ts` |
| Styles | `styles.css` |
| Pure tests | `test/virtual-layout.test.ts` |
| DOM interaction tests | focused files under `test/` |
| Browser and performance tests | focused files under `test/playwright/specs/` |
| Playground | Row feature files and route/registry files under `example/src/` |
| Public documentation | `README.md`, `docs/user/`, `docs/ko/` |
| Work record | `reports/YYYY-MM-DD.md` |

Exact test and Playground filenames are selected during implementation planning
after checking the closest existing feature patterns.

## Row Grouping boundary

The future Row Grouping design may reuse only:

- the private `CominsVirtualSlot` shape;
- the height-index API;
- logical/physical coordinate mapping;
- range lookup and local render anchoring.

It must define its own group IDs, controlled expanded-group state, sorting and
aggregation projection, disclosure callbacks, clipboard rules, and public API.
Row Expand owner IDs and Detail callbacks are not reused as Grouping state.

This boundary is now justified because Row Expand requires the mixed-height
layout. It does not pre-implement Row Grouping.
