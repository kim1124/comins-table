# Column Pinning Design

**Date:** 2026-07-31
**Status:** Approved design
**Scope:** Flat Table column pinning, position locking, layout persistence, grouped headers, Summary Row, and responsive overflow

## 1. Context

Comins Table currently keeps the header, body, and Summary Row horizontally aligned by synchronizing their scroll positions. It does not expose a pinned-column state or calculate sticky offsets.

Column pinning must keep selected columns visible at the left or right edge while the center columns scroll. A pinned column is also position-locked: it cannot be moved by column reordering until it is unpinned.

The design must preserve the existing table DOM, column layout API, grouped-header rules, fixed-row virtualization, and application-owned state flow.

## 2. Goals

- Pin leaf columns or whole header groups to the left or right.
- Keep pinned header, body, skeleton, and Summary Row cells aligned.
- Treat pinning as the only V1 position-lock mechanism.
- Preserve configured pin intent when the viewport temporarily cannot fit it.
- Persist pin state through the existing column layout APIs.
- Keep DOM order, visual order, and keyboard order consistent.
- Preserve the fixed-height virtualization path.

## 3. Non-goals

- A built-in column menu or drag-to-pin drop zone.
- A separate `lockPosition` API for unpinned columns.
- Pinning only part of a header group.
- Pinning Row Detail content.
- Frozen rows.
- Column Pivot.
- A multi-table left/center/right rendering architecture.
- Automatic changes to application data.

## 4. Public API

### 4.1 Pin side

```ts
export type CominsColumnPinned = "left" | "right";
```

### 4.2 Column definitions

```ts
export type CominsTableColumn<TData, TValue = unknown> = {
  // Existing fields...
  pinned?: CominsColumnPinned;
};

export type CominsTableColumnGroup = {
  // Existing fields...
  pinned?: CominsColumnPinned;
};
```

`pinned` on a definition is the initial/default state. Runtime layout state takes precedence after state creation or layout restoration.

A grouped child column does not own an independent effective pin side. The containing group's `pinned` value controls the complete group block. A child definition's `pinned` value is ignored while that child belongs to a valid group.

### 4.3 Runtime layout

```ts
export type CominsColumnRuntimeState = {
  // Existing fields...
  pinned?: CominsColumnPinned;
};

export type CominsColumnGroupRuntimeState = {
  // Existing fields...
  pinned?: CominsColumnPinned;
};
```

`CominsColumnLayout` keeps its current shape. Pinning is added only as an optional field under existing column and group records:

```ts
export type CominsColumnLayout = {
  columns: Record<string, CominsColumnRuntimeState>;
  groups?: Record<string, CominsColumnGroupRuntimeState>;
  order: string[];
};
```

This preserves old serialized layouts. Missing `pinned` values mean center/unpinned.

### 4.4 Imperative changes

V1 uses the existing table ref contract:

- `getColumnLayout()` returns configured pin intent.
- `setColumnLayout(layout)` applies normalized pin intent.

No additional imperative pin/unpin methods are required. Applications may read the current layout, change the applicable `pinned` field, and call `setColumnLayout`.

Responsive effective unpinning does not change `getColumnLayout()` output and does not emit an application callback.

An accepted configured pin change follows the existing
`onChangeColumnLayout` callback semantics. Effective responsive changes do not
emit that callback because they do not change serialized layout state.

## 5. State Model

Pinning has two distinct states:

1. **Configured pin state:** the normalized intent stored in table state and serialized in the layout.
2. **Effective pin state:** the render-time result after responsive overflow handling.

The configured state is authoritative and stable. The effective state may temporarily move configured pinned blocks into the center zone without mutating the configured state.

The existing global `columnOrder` remains the canonical logical order. Pinning does not create separate persistent left, center, and right order arrays.

## 6. Normalization

### 6.1 Accepted values

- `"left"` and `"right"` are retained.
- Missing values mean center.
- Invalid runtime values from untyped persisted data are removed.
- Unknown column and group IDs follow the existing layout normalization behavior.

Normalization must not throw because persisted layouts may predate this feature.

### 6.2 Group ownership

For every valid header group:

- The group's runtime state wins over the group definition.
- If neither has `pinned`, the group is center.
- Child runtime and definition pin values are ignored.
- Normalized serialization omits child pin values owned by the group.
- All visible children occupy the same render zone as one atomic block.

Ungrouped leaf columns use their own runtime state and then their definition default.

This avoids partial group pinning and removes ambiguity when restoring old or externally edited layouts.

### 6.3 Derived zones

The normalized configured zones are derived from canonical order:

```text
[left pinned blocks] [center blocks] [right pinned blocks]
```

Within each zone, blocks retain their relative canonical order. A header group is one block whose children retain the group's internal order.

DOM cells are rendered in this derived zone order. The same order is used by header, body, Summary Row, selection navigation, clipboard ranges, and accessibility traversal.

## 7. Responsive Overflow Policy

### 7.1 Center visibility invariant

When pinned widths would consume the table viewport, the effective layout
reserves:

```ts
const MIN_PINNED_CENTER_WIDTH = 48;
```

For any non-empty visible layout whose container is at least 48 px wide, the
invariant is:

```text
container width - effective left width - effective right width >= 48px
```

If the container itself is narrower than 48 px, all configured pinned blocks
are rendered effectively in the center. If every block was configured pinned,
temporary demotion creates the effective center content needed to satisfy the
invariant.

### 7.2 Temporary demotion

When the invariant is not met:

1. Compare the total effective left and right pinned widths.
2. Choose the wider side; choose the right side on a tie.
3. Demote the pinned block nearest the center on that side.
4. Recompute the widths and repeat until the invariant is met.

Header groups are demoted atomically. Demoted blocks are placed into the center according to canonical order, not demotion order.

When the container grows, configured pinning is restored automatically from the unchanged configured state.

### 7.3 Measurement

The overflow policy uses the table container's observed content width and each visible column's resolved numeric width after:

- definition defaults,
- restored runtime width,
- minimum and maximum width constraints,
- user resize,
- hidden-state changes.

Pin offset calculation and effective-zone calculation run from the same resolved-width snapshot. They must not read individual cell geometry during render.

## 8. Rendering Architecture

### 8.1 Single-table zones

Header, body, and Summary Row retain their separate table elements and render the same effective column order and resolved widths. Body owns vertical scrolling. One native horizontal scroll rail follows Summary, or Body when Summary is absent, and synchronizes `scrollLeft` across all three rendering surfaces.

Pinned cells use CSS sticky positioning within their existing table:

```text
left offset  = cumulative width of preceding effective-left columns
right offset = cumulative width of following effective-right columns
```

Right offsets are accumulated from the outer right edge toward the center.

### 8.2 DOM attributes

Effective pinned cells expose internal styling and test markers:

```html
data-comins-pinned="left"
data-comins-pinned="right"
data-comins-pinned-boundary="left"
data-comins-pinned-boundary="right"
```

Only the center-facing outermost cell of a pinned zone receives the boundary marker.

Configured-but-temporarily-demoted cells do not expose `data-comins-pinned`.

### 8.3 Background and stacking

Sticky cells require an opaque background so scrolled center content cannot show through. Background tokens preserve current semantics:

- header cells use the header background,
- ordinary cells use the current row background,
- striped rows keep their stripe background,
- selected cells keep their selection background,
- Summary Row cells use the Summary Row background,
- skeleton cells use the skeleton background.

The boundary separator is derived from the active cell background and is darker than that background. The default fallback uses the table's neutral border family rather than black.

The stacking order is:

1. ordinary body cells,
2. pinned body and Summary Row cells,
3. ordinary header cells,
4. pinned header cells,
5. active resize and reorder affordances.

The implementation must verify focus outlines and selection overlays remain visible above pinned backgrounds.

### 8.4 Loading and empty states

- Per-column skeleton cells follow effective pinning and sticky offsets.
- Whole-table empty, error, and loading `colSpan` rows are not pinned.
- Infinite-loading sentinel rows remain unsupported by this feature contract when Row Grouping is active, but ordinary flat-table sentinels remain non-pinned.

## 9. Column Reordering and Resizing

### 9.1 Position lock

A configured pinned leaf or pinned group:

- cannot start pointer-based reordering,
- cannot be used as a movable group,
- does not expose a reorder affordance,
- remains keyboard-focusable for its existing header interactions.

Center columns can reorder only within the center zone. A reorder result cannot cross a pinned boundary or split a group.

Temporarily demoted columns remain position-locked because configured pin state, not effective render state, owns the lock.

### 9.2 Resize

Pinned columns and groups remain resizable. A direct resize of an effective pinned block is capped before it would consume the 48px center budget and demote itself. A block already demoted by the container behaves as center content until pinning can be restored. After each accepted width change, the table recomputes:

- effective zones within the accepted resize cap,
- left offsets,
- right offsets,
- header/body/Summary alignment.

Independent container resize, visibility changes, and layout restore still run responsive demotion. Resizing does not mutate pin intent.

## 10. Grouped Header Rules

- Pinning is configured at group level for grouped columns.
- The group header and every visible child use the same effective zone.
- Reordering and responsive demotion treat the group as one block.
- Hiding some children does not unpin the remaining children.
- A group with no visible children does not contribute width or offsets.

No cell may span a pinned-zone boundary.

## 11. Summary Row

Summary Row values and computation remain unchanged.

If an existing Summary Row cell span crosses an effective zone boundary, rendering splits it into contiguous internal fragments:

- each fragment stays within exactly one zone,
- the first logical fragment renders the original content,
- continuation fragments are empty and `aria-hidden="true"`,
- visual class and inline styling semantics are copied to every fragment,
- each fragment receives its own legal `colSpan`,
- only the primary fragment exposes the original public test identifier.

This split is a rendering detail and does not change the public Summary Row definition.

## 12. Row Detail and Virtualization

The owner data row's cells follow normal pinning.

The separate Row Detail cell spans the full visible column count and is not sticky. It scrolls horizontally as one detail surface and does not synthesize left or right detail fragments.

Pinning does not change virtual slot counts, slot heights, total height, or scroll anchoring. Fixed-height data and future fixed-height group slots therefore remain on the fixed-size virtualization path. A variable-height index is required only when another feature, such as an expanded detail, introduces a slot whose effective height differs from `rowHeight`.

## 13. Accessibility

- Rendered DOM order matches visual left/center/right order.
- Pinned cells are not duplicated.
- Native `table`, `th`, and `td` semantics remain.
- Keyboard traversal follows the rendered column order.
- Existing sort, resize, and selection labels remain available.
- Pinning itself adds no required focus stop because V1 has no built-in pin UI.
- Responsive effective demotion does not announce a state change because configured application state did not change.

## 14. Failure and Edge Handling

- Invalid pin values normalize to center.
- Missing width values use existing resolved-width defaults.
- A hidden pinned column contributes no offset.
- A group with invalid children follows existing group normalization before pin zones are derived.
- Duplicate layout order entries follow existing order normalization.
- A stale layout may restore a pin for a now-ungrouped column; it then behaves as a normal leaf pin.
- A stale child pin under a current group is ignored in favor of group state.
- Resize observation must tolerate an initial zero-width container without mutating configured pin state.

## 15. Verification Contract

### 15.1 Core unit tests

- Definition defaults initialize leaf and group pin state.
- Runtime layout state wins over defaults.
- Old layouts without pin fields restore unchanged.
- Invalid pin values normalize without throwing.
- Child pins are ignored inside groups.
- Zone derivation preserves canonical relative order.
- Pinned blocks reject reorder operations.
- Center reorder cannot cross pinned boundaries.
- Hidden and resized columns recompute offsets.
- Summary spans split at every effective zone boundary.

### 15.2 Component tests

- Header, body, skeleton, and Summary Row expose matching pin markers and offsets.
- Left and right pinned zones remain visible during horizontal scrolling.
- Striped, selected, focused, and Summary Row backgrounds remain opaque and semantically correct.
- Row Detail remains one non-sticky spanning cell.
- Header groups never render partially pinned.
- Responsive demotion preserves layout serialization and restores pins after growth.
- Direct resize of an effective pinned Column or Header Group stops at the 48px center budget without self-demotion.

### 15.3 Browser tests

- Pointer reorder cannot start from configured pinned columns, including temporarily demoted columns.
- Center columns reorder correctly beside both pinned zones.
- Column resize updates all three table surfaces without drift.
- Effective pinned Column and Header Group resize retains its pin while preserving the center budget.
- Focus and keyboard navigation follow visual order.
- Narrow-to-wide resizing performs deterministic demotion and restoration.
- Horizontal scrolling does not expose transparent gaps or black separators.

### 15.4 Performance tests

At the repository's large-row fixture:

- pinning does not increase rendered row count,
- horizontal scrolling remains within the existing interaction budget,
- column resize does not scan rendered cell geometry,
- memory growth is bounded by visible columns and column metadata, not row count.

Run the focused performance spec first and the complete performance gate once after a meaningful implementation or test-contract change.

## 16. Delivery Sequence

1. Add public types and state normalization.
2. Add pure configured/effective zone and offset helpers.
3. Apply effective ordering to all table surfaces.
4. Add sticky styling, opaque backgrounds, and boundary markers.
5. Enforce reorder locking and center-only movement.
6. Add responsive overflow demotion.
7. Split Summary Row spans by effective zone.
8. Add unit, component, browser, and performance coverage.
9. Update matching English and Korean public documentation.

## 17. Acceptance Criteria

The feature is complete only when:

- configured left and right pins remain visible through horizontal scrolling,
- pinned columns cannot be moved,
- center columns cannot cross a pinned boundary,
- group pinning is atomic,
- header, body, and Summary Row widths and offsets remain aligned,
- old layouts restore without migration,
- narrow viewports temporarily demote pins without losing configured intent,
- Summary Row spans never cross effective zones,
- Row Detail and fixed-size virtualization behavior remain intact,
- affected unit, browser, build, and performance gates pass.
