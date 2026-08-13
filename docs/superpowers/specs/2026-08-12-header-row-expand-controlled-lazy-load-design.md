# Header Move, Row Expand, and Controlled Lazy Load Design

## Goal

Improve column-moving feedback and control, keep expanded rows inside the Table viewport, and make Lazy Load follow the same application-owned `data` contract as the rest of Comins Table.

## Approved scope

- Valid Header drop targets use a blue border and low-alpha blue background. Invalid targets use a red border and low-alpha red background. The header or cell content itself does not become transparent.
- A 24px Header move-handle slot with a 15px Radix icon is visible by default. `showColumnMoveHandle={false}` hides it while preserving the existing whole-header gesture.
- `lockPosition` is available on columns and groups. A locked item cannot move, and no other move may change a locked item's position. Locked items never show a move handle.
- Header columns enforce enough minimum width to keep the move handle, sort status, custom Header slots, and resize target available. Label text may still truncate.
- Normal Header and Summary Row boundaries use the same directional colors as body Rows and Cells: horizontal boundaries resolve through `--comins-table-row-border`, and vertical splits resolve through `--comins-table-cell-border`. Valid/invalid move feedback keeps its blue/red outlines.
- A committed Header move uses a short FLIP-style position animation and honors `prefers-reduced-motion`.
- Row Expand keeps the Table bottom border inside each fixed sample and exposes detail content through the Table body vertical scrollbar.
- When the last visible owner Row is expanded, its Cell bottom border remains visible as the separator before the Detail Row. The viewport-end border suppression applies only when no Detail follows that owner.
- The Playground card whose only purpose is a non-expandable final Row is removed. Public `isRowExpandable` remains unchanged.
- Row disclosure uses one right-chevron glyph whose CSS transform rotates to 90 degrees while expanded. The transition is disabled for reduced motion.
- Sorted states use Radix `ThickArrowUpIcon` and `ThickArrowDownIcon` while preserving the existing 15px icon box and MIT notice workflow.
- The Row Expand Playground permits only one expanded owner per sample. The library keeps its existing multiple-ID controlled contract and adds no new mode prop.
- The read-only controlled disclosure remains a supported controlled-state contract, but its dedicated Playground card is removed because it is an edge case rather than a primary workflow.
- Measured automatic Detail growth must not create a scroll feedback loop: after the measurement settles, scrolling cannot increase the body `scrollHeight` or continually shrink the scrollbar thumb.
- Lazy Load remains enabled by `lazyLoad={true}`, but `data`, `loading`, `loadingMore`, and `hasMoreRows` are controlled by the application.
- `onLazyLoad` receives `{ offset, limit, reason, signal }` and returns `void | Promise<void>`. Comins Table never stores callback results.
- Playground refresh clears the mapped Row array, requests offset `0` with reason `refresh`, and remaps the fetched response. No imperative ref method is added.

## Architecture and data flow

Core move functions enforce position locks so pointer UI, ref-driven layout operations, and future callers share one rule. React rendering adds the move handle and calculates move eligibility from the runtime definitions. The existing whole-header pointer path remains; the handle starts the same controller immediately to make trackpad intent explicit.

Each Row Expand sample normalizes the callback's next ID array to its final ID, so a newly opened owner replaces the previously open owner without changing the reusable library contract. Automatic Detail virtualization keeps configured owner Row height and rendered owner Row geometry aligned, and the physical scroll position is bounded by the virtual sizer rather than transformed content overflow.

Before a valid drop commits, the Table records rendered Header/body/summary cell positions. A layout effect compares post-commit positions, applies per-cell `translate`, and returns them to zero over a short CSS transition. The animation never changes layout measurements and is skipped when reduced motion is requested.

Lazy Load only coordinates request timing and cancellation. Initial and scroll requests call the consumer callback; offsets are derived from current controlled `data.length`. The consumer fetches, replaces or appends its array, updates total-derived `hasMoreRows`, and owns loading/error state. An abort or stale request cannot remap rows in the Playground example.

## Error and edge behavior

- A locked source or a target that would shift a locked position produces an invalid drop and no layout callback.
- Cross-depth and cross-parent moves remain invalid.
- A rejected Lazy Load callback releases the internal request guard; presentation and retry UI remain application-owned.
- Scroll loading is suppressed while `loading`, `loadingMore`, an internal callback invocation, or `hasMoreRows === false` is active.
- Arbitrary custom Header renderer width cannot be inferred; the Table protects built-in control slots while custom content may still use column `minWidth`.
- An application may still render multiple Details by writing multiple IDs back through `expandedRowIds`; single expansion is a Playground policy only.
- A controlled Row Expand surface without `onChangeExpandedRowIds` remains disabled and read-only even though the dedicated demonstration card is removed.

## Verification

- Unit tests cover column/group lock invariants, controlled Lazy Load callback behavior, and disclosure icon state.
- Playwright covers handle visibility and immediate drag, valid/invalid target styling, locked headers, minimum controls width, post-drop movement animation, fixed Row Expand scrolling, disclosure rotation, removed card, fetch-backed refresh clearing/remapping, and stale request safety.
- Playwright compares Header and Summary horizontal/vertical boundary colors with real body Row/Cell boundaries and covers the last visible expanded owner separator.
- Row Expand Playwright coverage also asserts one-open-at-a-time sample behavior and stable automatic-Detail `scrollHeight` after repeated scrolling.
- Icon unit and license gates assert the thick sorted-state glyphs and exact Radix export inventory.
- Public docs tests cover English/Korean API wording. License gates cover the exact retained Radix icon inventory and notices.
- Final gates are focused Playwright specs, documentation tests, license/security gates, and `npm run verify`.

## Non-goals

- No `refreshLazyLoad()` ref API.
- No removal of `isRowExpandable`.
- No automatic retry or built-in error renderer.
- No dependency, package-version, release, commit, push, or PR change.
- No new single/multiple expansion prop and no change to the read-only controlled-state semantics.
