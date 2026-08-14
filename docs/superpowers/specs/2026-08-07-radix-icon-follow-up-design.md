# Radix Icon Follow-up And Row Detail Sizing Design

## Context

The initial Radix integration standardized disclosure, sort, Column Move,
Playground search, and pagination icons while preserving the existing public
interaction contracts. Browser review identified four follow-up requirements:

1. Row Detail must not default to a 300px fixed block.
2. Sort states must use directional arrows instead of filled triangles.
3. A future Column Filter icon needs placement guidance without shipping a
   filter feature.
4. A Column Move source placeholder must keep the source column name visible.

The user also requires every interactive Radix icon to retain an internal SVG
size comparable to the surrounding content. Comins therefore keeps a `15px`
SVG inside a `24px` interaction slot rather than shrinking the SVG to create
spacing.

## Selected Approach

Use the existing private semantic icon boundary and current Row Detail
measurement pipeline. Change defaults and presentation without adding public
icon APIs or a new filtering API.

The rejected alternatives are:

- Treat every numeric Detail height as `min-height`. This would silently change
  the existing fixed-height API and make exact-height layouts non-deterministic.
- Keep a 300px fixed default and apply CSS `min-height`. This would not activate
  the existing ResizeObserver measurement and would leave virtualization with
  stale offsets.
- Add a disabled Filter button now. This would expose an interaction that has no
  controlled state, callback, or documented behavior.

## Row Detail Height Contract

`getRowDetailHeight` keeps its current return type:

```ts
type CominsRowDetailHeight = number | "auto";
```

Resolution rules are:

1. A finite positive number is an exact fixed CSS-pixel height.
2. The explicit value `"auto"` activates mounted Detail measurement.
3. An absent `getRowDetailHeight` callback also activates mounted Detail
   measurement.
4. A callback result that is `undefined`, non-finite, zero, or negative is
   treated as automatic rather than as a 300px fixed block.
5. Before automatic measurement exists at the current owner ID and width,
   `estimatedRowDetailHeight` is used when it is a finite positive number.
6. Without a valid explicit estimate, the current resolved `rowHeight` is used
   as the automatic estimate.
7. ResizeObserver measurements continue to update the owner Slot and virtual
   height index. A width mismatch returns to the current estimate until a new
   measurement arrives.

This is a public default-behavior change. English and Korean Row Expand docs and
the changelog must state that numeric heights remain fixed while missing and
`"auto"` heights grow with measured content.

## Row Leading Controls

When Row Expand is enabled, the first visible Cell uses a stable leading-control
layout in this visual order:

1. Row Detail disclosure slot.
2. Row drag slot when the Row is draggable.
3. Cell content.

The disclosure is always the leftmost control. A non-expandable Row renders an
empty disclosure spacer while Row Expand is enabled so labels stay aligned
between expandable and non-expandable Rows.

Both disclosure and Row drag controls use a `24px` square layout slot. The
Radix disclosure SVG remains `15px × 15px`. The Row drag visual also occupies a
`15px × 15px` content box; its existing dots remain presentation-only. Enlarging
the layout slot must not shrink either internal visual.

Disclosure button name, `aria-expanded`, `aria-controls`, disabled behavior,
focus restoration, click isolation, and keyboard isolation remain unchanged.
The Row drag pointer lifecycle and Row selection isolation also remain
unchanged.

## Sort Icons

The private semantic icon mapping changes as follows:

- `sortAscending` uses Radix `ArrowUpIcon`.
- `sortDescending` uses Radix `ArrowDownIcon`.
- The unsorted indicator remains visually absent.

The arrow SVG remains `15px × 15px`. Header click, `Enter`/`Space`, Shift
multi-sort, `aria-sort`, priority badges, and indicator animation remain
unchanged.

Because the exact Radix import inventory is part of the fail-closed license
contract, the source allowlist and `THIRD_PARTY_NOTICES.md` inventory replace
`TriangleUpIcon` and `TriangleDownIcon` with `ArrowUpIcon` and `ArrowDownIcon`.
The dependency version, revision, integrity, and MIT text do not change.

## Future Column Filter Guidance

No filter runtime, prop, callback, state, icon import, button, or placeholder is
shipped in this change. Developer-facing design guidance records the future
contract:

- A Filter control belongs at the Header's right edge, after sort metadata and
  before the resize hit area.
- It must be a focusable button with a column-specific accessible name and an
  explicit active-filter state.
- Its pointer and keyboard events must not trigger Header sort, resize, or
  Column Move.
- Filter state and data transformation must remain application-owned through a
  separately approved controlled API.
- An actual Radix Filter icon is selected and added to license inventory only
  when that API is approved and implemented.

Public user documentation must not present Column Filter as available.

## Column Move Source Placeholder

The existing source Header retains its width, row span, column span, darker
background, dashed outline, Header semantics, and position in the table.

During an active move:

- the plain source column name stays visible and centered in each source Header
  cell;
- sort metadata, Header component slots, menus, and resize controls are hidden;
- the visible source name is presentation-only and does not duplicate the
  accessible Header name;
- the pointer-following ghost continues to show the drag-handle icon and the
  same source label;
- parent-group movement shows the corresponding parent and child names in the
  placeholder cells that form the moving block;
- valid and invalid drop markers and all cancellation rules remain unchanged.

The implementation may reuse the existing Header label when it is plain text,
but it must render the normalized column label rather than an arbitrary custom
Header renderer. This prevents interactive custom Header content from remaining
active inside a source placeholder.

## Verification

Tests are written and observed failing before production changes.

- Row Detail unit tests cover missing, `"auto"`, invalid, fixed numeric, explicit
  estimate, and resolved-row-height estimate contracts in virtualized and
  non-virtualized tables.
- Row Detail browser tests cover leftmost disclosure order, stable spacer
  alignment, `24px` slots, `15px` SVG content, automatic growth, and focus.
- Header unit and browser tests cover `ArrowUpIcon`, `ArrowDownIcon`, `15px` SVG
  geometry, visible source names, hidden Header controls, group placeholders,
  drag ghost, drop target, and cancellation cleanup.
- License tests cover the exact changed Radix import and notice inventory.
- Documentation tests ensure Filter remains future guidance rather than a
  supported public API.
- Required closure is `npm run verify`, focused Row Expand and Header E2E,
  `npm run test:perf -- --workers=1`, ordinary Chromium E2E with one worker,
  package artifact verification, consumer smoke, and browser screenshots.

## Out Of Scope

- A public icon override API.
- A Column Filter runtime or public API.
- Changing a positive numeric Row Detail height into a minimum height.
- Tree Grid disclosure layout changes beyond shared icon-size protection.
- Remote push, pull request, merge, release, or npm publication.
