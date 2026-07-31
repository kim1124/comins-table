# Row Grouping Design

**Date:** 2026-07-31
**Status:** Approved design
**Scope:** Client-side flat-row grouping, controlled group expansion, built-in aggregation, fixed-height group rows, virtualization, Row Detail integration, and Column Pinning integration

## 1. Context

Comins Table currently renders flat rows or Tree Grid nodes. Flat-table row callbacks, selection, sorting, clipboard operations, row references, and virtualization all assume that each visible row corresponds to application-owned `TData`.

Row Grouping introduces synthetic group rows that have no `TData`. Reusing Tree Grid nodes or injecting synthetic values into `data` would break the public data and callback contract. Grouping therefore requires a private projection layer that distinguishes group slots from leaf data slots while preserving all existing leaf-row meanings.

V1 remains client-side and fixed-height except for the already designed Row Detail height added to its owner data slot. Pagination, incremental loading, and row movement are excluded until a server grouping and cross-window state contract exists.

## 2. Goals

- Group flat `TData` rows by one or more visible or hidden columns.
- Keep grouping and group expansion application-controlled.
- Render synthetic fixed-height group rows without exposing fake `TData`.
- Preserve existing Row IDs, data indexes, event payloads, selection, and callbacks for leaf rows.
- Support built-in `count`, `sum`, `avg`, `min`, and `max` aggregation.
- Keep source grouping columns visible.
- Integrate with Column Pinning and Row Detail.
- Preserve the fixed-size virtualization fast path when no owner data slot includes an expanded Detail height.
- Bound high-cardinality memory by metadata and source indexes rather than duplicated row objects.

## 3. Non-goals

- Pagination while grouped.
- Infinite scrolling while grouped.
- Lazy loading or server-side grouping.
- Row drag or row reordering while grouped.
- Group-row selection or group tri-state selection.
- Custom aggregation functions.
- Aggregate-value sorting.
- Column Pivot.
- Automatically hiding grouped source columns.
- Reusing Tree Grid expansion state or node APIs.
- A full ARIA `treegrid` interaction model.
- Custom group-row or group-cell renderers beyond the group-label callback.
- Editing a group row.

## 4. Public API

### 4.1 Group keys and criteria

```ts
export type CominsRowGroupKey =
  | string
  | number
  | boolean
  | null
  | Date;

export type CominsRowGroupingSourceRow<TData> = {
  data: TData;
  dataIndex: number;
  id: CominsRowId;
};

export type CominsRowGroupingValueParams<TData> = {
  column: CominsTableRuntimeColumn<TData>;
  row: CominsRowGroupingSourceRow<TData>;
  value: unknown;
};

export type CominsRowGroupingLabelParams<TData> = {
  column: CominsTableRuntimeColumn<TData>;
  depth: number;
  firstRow: CominsRowGroupingSourceRow<TData>;
  key: CominsRowGroupKey;
};

export type CominsRowGroupingCriterion<TData> = {
  columnId: string;
  getKey?: (
    params: CominsRowGroupingValueParams<TData>,
  ) => CominsRowGroupKey | undefined;
  getLabel?: (
    params: CominsRowGroupingLabelParams<TData>,
  ) => React.ReactNode;
};
```

A criterion may use its column ID as shorthand:

```ts
export type CominsRowGroupingCriterionInput<TData> =
  | string
  | CominsRowGroupingCriterion<TData>;
```

For a string criterion or a criterion without `getKey`, the raw field value from the resolved column is used as the key.

Grouping callbacks use source data indexes because group membership is derived
before expansion creates visible leaf indexes. Existing leaf event callbacks
continue to use `CominsEventRow` and its visible `index`.

### 4.2 Aggregation

```ts
export type CominsRowGroupAggregation =
  | "avg"
  | "count"
  | "max"
  | "min"
  | "sum";
```

### 4.3 Controlled configuration

```ts
export type CominsRowGroupingConfig<TData> = {
  aggregations?: Readonly<
    Partial<Record<string, CominsRowGroupAggregation>>
  >;
  criteria: readonly CominsRowGroupingCriterionInput<TData>[];
  expandedGroupIds?: readonly string[];
  onChangeExpandedGroupIds?: (
    groupIds: string[],
  ) => void;
};
```

The flat-table branch adds:

```ts
rowGrouping?: CominsRowGroupingConfig<TData>;
```

### 4.4 Prop discrimination

The existing flat prop definition is refactored internally into a shared base and two public-compatible branches:

```ts
type CominsUngroupedTableProps<TData> =
  CominsFlatTableBaseProps<TData> & {
    rowGrouping?: undefined;
  };

type CominsGroupedTableProps<TData> =
  Omit<
    CominsFlatTableBaseProps<TData>,
    | "hasMoreRows"
    | "infiniteScroll"
    | "infiniteScrollThreshold"
    | "lazyLoad"
    | "lazyLoadBatchSize"
    | "lazyLoadMode"
    | "lazyLoadThreshold"
    | "loadingMore"
    | "onLazyLoad"
    | "onLoadMore"
    | "pagination"
    | "rowProps"
  > & {
    hasMoreRows?: never;
    infiniteScroll?: never;
    infiniteScrollThreshold?: never;
    lazyLoad?: never;
    lazyLoadBatchSize?: never;
    lazyLoadMode?: never;
    lazyLoadThreshold?: never;
    loadingMore?: never;
    onLazyLoad?: never;
    onLoadMore?: never;
    pagination?: never;
    rowGrouping: CominsRowGroupingConfig<TData>;
    rowProps?: Omit<CominsTableRowProps<TData>, "draggable"> & {
      draggable?: never;
    };
  };

export type CominsTableProps<TData> =
  | CominsUngroupedTableProps<TData>
  | CominsGroupedTableProps<TData>;
```

The implementation may use differently named private base types, but exported assignability and restrictions must match this contract.

`CominsTreeTableProps<TData>` exposes `rowGrouping?: never`. Tree expansion, grouping expansion, and Row Detail remain separate public concepts.

## 5. Controlled Expansion Contract

- `expandedGroupIds` defaults to an empty array.
- Duplicate IDs are normalized by preserving first occurrence.
- Expanding appends the group ID; collapsing removes it.
- User disclosure actions call `onChangeExpandedGroupIds` with the next complete array.
- The component does not keep an independent expanded-group source of truth.
- Without `onChangeExpandedGroupIds`, disclosure buttons reflect state but are disabled.
- Unknown IDs are ignored during rendering.
- IDs for groups absent from the current data or criteria remain dormant.
- Toggling a visible group preserves dormant IDs in the callback value.
- The component does not emit cleanup callbacks solely to prune stale IDs.
- Empty or fully invalid `criteria` disables grouping and renders the ordinary flat projection.

This matches the controlled-state behavior of Row Detail while keeping row and group ID namespaces separate.

## 6. Criterion Normalization and Key Semantics

### 6.1 Criterion normalization

- Resolve string criteria to `{ columnId }`.
- Drop unknown column IDs.
- Drop duplicate column IDs after their first valid occurrence.
- Preserve the remaining criterion order as hierarchy order.
- Hidden columns remain valid grouping criteria.
- A callback identity change invalidates the grouping projection.

### 6.2 Supported keys

- Strings are used exactly.
- Finite numbers are supported; `-0` normalizes to `0`.
- Booleans are supported.
- Valid `Date` values normalize to their millisecond timestamp.
- `null` and `undefined` share one explicit empty-group key.
- `NaN`, infinities, invalid dates, objects, arrays, functions, and symbols share one unsupported-value key.

The default empty label is `(empty)`. The default unsupported label is `(unsupported)`. Applications grouping object-valued fields must provide `getKey` and return a supported key.

`getLabel` is invoked for supported and empty keys; the empty key is passed as
`null`. It is not invoked for an unsupported key, which always uses the
unsupported fallback label.

`depth` is zero-based. `firstRow` is the first source-order leaf assigned to
the group and does not change when sorting changes.

### 6.3 Stable group IDs

Group IDs are opaque public strings but deterministic for equal normalized paths.

Each path segment encodes:

- criterion column ID,
- normalized key type,
- normalized key payload,
- explicit payload lengths.

The full ID is prefixed with `comins-group:` and concatenates the ordered path segments. Length-prefix encoding is mandatory; delimiter-only concatenation and lossy hashes are not allowed.

Consequences:

- equal group paths produce equal IDs across sorting and collapse changes,
- values with different types do not collide,
- labels do not affect identity,
- criteria order does affect identity,
- group and business Row IDs cannot be confused internally.

Changing criteria, a key callback, or key values may intentionally produce new group IDs.

## 7. Group Tree and Projection

### 7.1 Private group metadata

Grouping uses a private structure equivalent to:

```ts
type CominsGroupNode = {
  aggregationState: ReadonlyMap<string, CominsAggregateState>;
  childGroupIds: string[];
  columnId: string;
  depth: number;
  firstSourceIndex: number;
  groupId: string;
  key: CominsNormalizedGroupKey;
  leafSourceIndexes?: number[];
  parentGroupId: string | null;
};
```

Only lowest-level groups store leaf source indexes. Parent groups store child IDs, not copied descendant-index arrays. No node stores copied `TData`.

### 7.2 Layered derivation

Derivation is split into three memoizable layers:

1. **Membership and aggregation:** `data`, Row IDs, normalized criteria, key callback identities, and aggregation configuration produce group metadata.
2. **Ordering:** current sort model orders sibling groups and lowest-level leaf indexes.
3. **Visible projection:** ordered metadata plus controlled expanded IDs produces virtual slots.

Changing expansion must not rebuild membership or aggregation.

### 7.3 Projection slots

The virtual projection distinguishes:

```ts
type CominsProjectionSlot =
  | {
      groupId: string;
      height: number;
      key: string;
      kind: "group";
    }
  | {
      dataIndex: number;
      height: number;
      key: string;
      kind: "data";
      rowId: CominsRowId;
      visibleLeafIndex: number;
    };
```

The data slot owns its optional Detail `<tr>` and includes the Detail height in
its slot height, matching the Row Expand design. The projection must retain
these mappings:

```text
virtual slot index
  <-> visible leaf index, when the slot is data
  <-> business Row ID
  <-> source data index
```

Synthetic group slots never receive a data index or business Row ID.

Collapsed subtrees are not traversed into visible slots. They remain only as group metadata.

## 8. Leaf Index and Callback Semantics

For every rendered leaf:

- `CominsEventRow.data` remains the original `TData`.
- `dataIndex` remains the source `data` index.
- `id` remains the application business Row ID.
- `index` is the visible leaf index after grouping, expansion, and sorting.
- Group slots do not increment the visible leaf index. A Detail `<tr>` is part
  of its owner data slot and has no independent visible leaf index.

Existing leaf row and cell callbacks continue to receive only real `TData`.

Group-row pointer, double-click, context-menu, and keyboard activity:

- does not call ordinary row callbacks,
- does not call ordinary cell callbacks,
- does not call application cell renderers or formatters,
- is handled only by the built-in disclosure control.

## 9. Sorting

Sorting follows a hierarchy-first model:

1. A sort rule whose column is an active grouping criterion sorts sibling groups at that criterion level by normalized group key.
2. Active grouping-column rules are consumed by group ordering.
3. Remaining sort rules sort leaf rows inside each lowest-level group using existing column comparators and stable tie behavior.
4. Without a grouped-column rule, sibling groups preserve the first source occurrence order.

Grouped-column rules do not additionally sort leaves by the same rule. Aggregate results are not sortable in V1.

Collapsing or expanding groups does not change ordering.

Group-key ordering uses a stable built-in total order. Values of the same type
compare naturally; strings use code-point order, booleans use `false` before
`true`, numbers use numeric order, and dates use timestamp order. Different
types use the fixed rank empty, unsupported, boolean, number, date, string.
Descending sort reverses the result. A custom leaf-column sort function is not
called for synthetic group keys.

## 10. Aggregation

### 10.1 Input rows

Every aggregate uses all descendant leaf rows, independent of group expansion.

Aggregation reads the raw field value of the configured output column. It does not invoke cell renderers or formatters.

Unknown aggregation column IDs and invalid reducer names from untyped runtime
input are ignored. Hidden aggregate columns remain configured and compute their
result, but do not render a cell until made visible.

### 10.2 Reducers

- `count`: counts descendant leaf rows, including rows whose field value is empty.
- `sum`: sums finite numeric field values.
- `avg`: tracks finite numeric `sum` and `count`, then returns `sum / count`.
- `min`: returns the minimum finite numeric field value.
- `max`: returns the maximum finite numeric field value.

For `sum`, `avg`, `min`, and `max`, non-numeric and non-finite values are ignored. If no finite numeric value exists, the rendered result is empty. `sum` of a group with no numeric values is also empty, not `0`.

Reducers update in one pass during membership construction. Parent reducer state is updated directly while ingesting each row; it is not recomputed by collecting descendant arrays.

### 10.3 Display

- The group-label cell renders the disclosure control, indentation, grouping column label, and resolved group label.
- Configured aggregate columns render the reducer result as plain text.
- The group-label cell takes precedence if it is also configured as an aggregate output column.
- Other group cells are empty.
- Group rows do not invoke normal cell renderers, formatters, tooltips, or component placements.

The Summary Row keeps its existing application-facing computation over original leaf data. Group rows and aggregate display values are not passed into Summary Row callbacks.

## 11. Group Row Rendering

### 11.1 Cell structure

Every group row renders one cell per currently visible column so it can share Column Pinning widths and zones.

The label cell is:

1. the first effective left-pinned visible column, or
2. the first visible column when there is no effective left pin.

The label cell renders as `<th scope="row">`; remaining cells render as `<td>`.

Indentation is based on group depth and uses logical inline padding. The disclosure button remains a real button and is the only group-row interactive control.

### 11.2 Height

Every group slot has exactly `rowHeight`.

Application row styles and row-height callbacks are not evaluated for group rows. Group rows use module-scoped theme tokens for their background, borders, indentation, and disclosure states.

### 11.3 Source columns

Grouping does not hide source columns. Applications may separately hide them through the existing column layout state.

Grouping by a hidden column still renders a label in the chosen visible label cell and uses the grouping column's label in the built-in group label.

## 12. Selection, Clipboard, and Focus

### 12.1 Group-row exclusion

Group rows:

- cannot be row-selected,
- cannot be cell-selected,
- cannot be range endpoints,
- are skipped by keyboard cell navigation,
- are excluded from copy and paste,
- are excluded from row references exposed to selection logic.

Shift selection and range selection traverse only currently visible leaf rows.

### 12.2 Hidden leaf selections

Collapsing a group does not remove selected business Row IDs. Hidden selected leaves remain dormant and reappear selected when their group is expanded.

Hidden selected leaves are not copied while collapsed.

If the active cell or either range endpoint becomes hidden by collapse:

- clear the cell and range portion of selection,
- preserve row ID selection,
- emit the resulting selection once through the existing selection callback.

### 12.3 Focus correction

When a user collapses a group from its disclosure button, focus remains on that button.

When controlled props externally collapse a group containing the focused leaf:

- if focus was inside the table, move focus to the nearest now-visible collapsed ancestor's disclosure button,
- if focus was outside the table, do not steal focus.

## 13. Row Drag and Imperative Row Movement

Grouped leaf and group rows are never draggable, regardless of untyped runtime props.

The grouped prop branch rejects `rowProps.draggable`. Runtime rendering also forces `draggable={false}` as defense against JavaScript callers.

`CominsTableRef.setMoveTargetRow` performs no state change while grouping is active. This behavior avoids treating a synthetic projection index as a source data index.

## 14. Row Detail Integration

Row Detail remains valid for grouped leaf rows:

- `isRowExpandable`, `renderRowDetail`, and Detail height callbacks receive the original leaf payload.
- An owner data slot renders its Detail `<tr>` immediately after the leaf
  `<tr>`.
- Group rows do not expose Row Detail disclosure and cannot own Detail content.
- Collapsing a group preserves controlled `expandedRowIds` as dormant.
- Re-expanding the group restores the Detail when its owner ID remains expanded.

Group slots remain fixed at `rowHeight`. A collapsed data slot is also
`rowHeight`; an expanded data slot is `rowHeight + resolvedDetailHeight`.
Only an expanded data slot whose resulting height differs from `rowHeight`
activates the variable-height index.

## 15. Column Pinning Integration

Group rows render the same effective visible column sequence as data rows.

- Pinned group-row cells use the same sticky offsets and backgrounds.
- The label is placed in the first effective left-pinned cell when available.
- Aggregate cells remain in their configured columns.
- Responsive pin demotion may move the label cell on the next render.
- Group identity and expansion state do not depend on pinning.

No group-row cell span may cross a pinned boundary because V1 renders one cell per visible column.

## 16. Virtualization and Scroll Correction

### 16.1 Fixed fast path

When every effective slot has `height === rowHeight`, virtualization uses arithmetic fixed-size lookup even if the projection includes group slots.

The height index is constructed only when at least one expanded owner data slot
has a resulting height that differs from `rowHeight`.

### 16.2 Projection changes

Expanding or collapsing groups can insert or remove many fixed-height slots. Before applying a new visible projection:

1. capture the first fully visible slot's stable key and its viewport offset,
2. rebuild the projection,
3. find the same key in the next projection,
4. adjust `scrollTop` to preserve its viewport offset.

If that anchor belongs to a descendant removed by collapse, use the collapsing group's stable slot key as the replacement anchor.

User scrolling takes precedence over observer or projection corrections. Corrections are coalesced to one animation frame and clamp to the legal scroll range.

## 17. Loading, Empty, and Error States

- Ordinary initial loading and skeleton presentation remain supported.
- Skeleton rows are not grouped because application data is not yet available.
- Empty data renders the existing empty state, not an empty synthetic group.
- A grouping callback error follows the existing render error behavior; Comins Table does not swallow application callback exceptions.
- Pagination, infinite-loading sentinels, lazy-load requests, and load-more callbacks are statically and dynamically disabled in the grouped branch.

## 18. Accessibility

V1 preserves native table semantics and does not claim full `treegrid` support.

- Group rows use native `<tr>`.
- The label cell uses `<th scope="row">`.
- The disclosure button exposes `aria-expanded`.
- Its accessible label identifies expand or collapse action and hierarchy depth.
- Disabled controlled read-only disclosures use native `disabled`.
- Indentation is visual and is not presented as additional table columns.
- Group rows are absent from row-selection semantics.
- DOM column order matches visual and keyboard order.

The hierarchy is conveyed through disclosure state, group labels, and indentation. A future `treegrid` role requires a separate keyboard and ARIA contract.

## 19. Compatibility Matrix

| Feature | Grouping V1 |
| --- | --- |
| Flat data | Supported |
| Multi-column sort | Supported with hierarchy-first rules |
| Column resize/reorder | Supported for columns |
| Column Pinning | Supported |
| Row Detail | Supported for leaf rows |
| Fixed-size virtualization | Supported |
| Variable Detail virtualization | Supported through owner data-slot height |
| Summary Row | Supported; original leaf data only |
| Row/cell selection | Supported for visible leaves |
| Clipboard | Supported for visible leaves |
| Tree Grid | Prohibited |
| Pagination | Prohibited |
| Infinite scroll | Prohibited |
| Lazy load | Prohibited |
| Row drag/reorder | Prohibited |
| Group selection | Deferred |
| Custom aggregation | Deferred |
| Pivot | Deferred |

## 20. Performance and Memory Contract

At the repository's large-row fixtures:

- membership construction is linear in `row count × grouping depth`,
- aggregation is performed during the same pass,
- only lowest-level groups retain leaf source-index arrays,
- parent groups retain child IDs and reducer state,
- no group metadata duplicates `TData`,
- visible projection construction traverses only expanded branches,
- expansion-only changes reuse membership and reducer state,
- rendered DOM remains bounded by the virtual window.

Performance coverage must include:

- low-cardinality groups with large leaf sets,
- high-cardinality groups approaching one lowest-level group per row,
- multiple grouping levels,
- all groups collapsed,
- a deeply expanded path,
- grouping plus Column Pinning,
- grouping plus fixed and `"auto"` Row Detail heights.

The implementation must use the existing performance budgets rather than defining a weaker grouping-specific exception.

## 21. Verification Contract

### 21.1 Pure unit tests

- Criteria normalize missing and duplicate columns.
- Supported, empty, and unsupported keys produce stable typed IDs.
- Labels do not affect group identity.
- Membership preserves source indexes and does not copy rows.
- Parent groups do not store descendant-index arrays.
- Built-in reducers follow empty and numeric rules.
- Grouped sort rules order siblings; remaining rules order leaves.
- Visible projection emits correct group and data slot order, including owner
  data-slot Detail heights.
- Visible leaf indexes exclude group slots and are not incremented by Detail
  `<tr>` elements.
- Expansion-only changes reuse group metadata.

### 21.2 Component tests

- Group rows render one cell per visible column.
- Group rows never invoke ordinary row, cell, renderer, or formatter callbacks.
- Controlled expansion preserves dormant IDs.
- Read-only expansion controls are disabled.
- Selection skips group rows and preserves hidden Row IDs.
- Collapse clears hidden cell/range endpoints once.
- Row Detail appears only for leaf rows.
- Summary Row receives only original leaf data.
- Row drag remains disabled for JavaScript callers.

### 21.3 Browser tests

- Disclosure interaction expands and collapses nested groups.
- Focus remains stable on user collapse.
- External collapse corrects focus only when required.
- Keyboard cell navigation skips group rows.
- Copy and paste exclude group rows and collapsed leaves.
- Column Pinning keeps group-row cells aligned during horizontal scroll.
- Large collapse above the viewport preserves a stable scroll anchor.
- Sorting does not reset group expansion IDs.

### 21.4 Type tests

- Existing ungrouped flat props remain assignable.
- Grouped props reject pagination, infinite scroll, lazy load, and row drag.
- Tree props reject grouping.
- Grouping and Row Detail props are assignable together.
- Built-in aggregation names reject unsupported strings.

### 21.5 Performance tests

Run the focused grouping/virtualization performance spec first. After a meaningful implementation or test-contract change, run the complete performance gate once.

The test must record projection size, rendered row count, interaction timing, and heap/counter signals already supported by the repository. Environment-only server bind failures are reported separately from product failures.

## 22. Delivery Sequence

1. Add public key, criterion, aggregation, configuration, and discriminated prop types.
2. Implement pure criterion, key, ID, membership, aggregation, and ordering helpers in a private grouping module.
3. Introduce the shared projection-slot mapping without changing ungrouped behavior.
4. Render fixed-height group rows with native disclosure semantics.
5. Route selection, callbacks, clipboard, and focus through leaf mappings.
6. Add hierarchy-first sorting and controlled expansion.
7. Integrate Row Detail and the shared fixed/variable virtualization decision.
8. Integrate Column Pinning and group-row styling.
9. Add unit, type, component, browser, and performance coverage.
10. Update matching English and Korean public documentation.

## 23. Acceptance Criteria

The feature is complete only when:

- multi-level grouping produces deterministic IDs and hierarchy,
- controlled expansion works without internal fallback state,
- group rows never masquerade as `TData`,
- leaf event payload meanings remain unchanged,
- built-in aggregations are correct for all descendant leaves,
- grouped source columns remain visible unless independently hidden,
- group rows are excluded from selection, clipboard, callbacks, Detail, and drag,
- Column Pinning and Row Detail follow their respective contracts,
- fixed-height group projections keep the arithmetic fast path,
- collapse and expansion preserve scroll and focus anchors,
- high-cardinality memory avoids copied row and descendant arrays,
- prohibited prop combinations fail type coverage and remain inert at runtime,
- affected unit, type, browser, build, and performance gates pass.
