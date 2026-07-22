# Column Reorder and Virtual List Selection Design

## Goal

Make column reordering respond like an immediate desktop drag interaction and make Virtual List item and overflow interactions visibly select their owning row, while preserving header sorting, resize isolation, built-in component event isolation, and the current controlled table state model.

## Confirmed product decisions

### Column reorder activation and feedback

- The primary desktop interaction is a left-button drag. A mouse pointer activates column movement after at least 6 pixels of horizontal movement when the horizontal delta is greater than the vertical delta.
- A press and release below the movement threshold remains a header click and keeps the current sort cycle.
- Vertical movement that reaches the threshold before horizontal intent is established cancels both column movement and the pending sort click.
- The moving header keeps its original table geometry as a source placeholder. Its visible label and controls are replaced by a muted placeholder treatment without removing the header cell or changing the body column layout.
- The existing pointer-following ghost and target insertion marker remain. The source placeholder, ghost, and target marker are visible at the same time after activation.
- Column order changes only once on pointer release over a valid target. Dragging does not continuously reorder header or body cells.
- The same activation and cleanup rules apply to flat columns, individual child columns, and two-level parent groups. A parent group remains a single movable block, and its source placeholder covers the parent and child-header area belonging to that block.
- Touch and other non-mouse pointer behavior retain the current long-press activation in this delivery. Touch-specific interaction redesign is outside the approved desktop scope.
- A dedicated header drag handle remains a documented future alternative. This delivery does not add a handle, a public handle prop, or handle-specific styling.

### Virtual List row selection

- Activating an enabled Virtual List item requests selection of the owning row before invoking the existing item-selection behavior.
- A pointer item activation follows the table's normal row-click rules: a plain click selects only that row, `Ctrl`/`Cmd` toggles the row in multi-selection, and `Shift` selects the visible range from the current row anchor.
- `Enter` and `Space` activation follow the same selection path. Modifier keys are honored when present; an unmodified keyboard activation selects only the owning row.
- When `more: true` and the preview overflows, the overflow control is a button even before its row is selected. Activating it selects only the owning row and expands the bounded virtual list in the same user action.
- Search remains available only while the owning row is the single selected row. Selecting an item can therefore reveal Search; selecting multiple rows can hide it again. The always-actionable More button can restore the required single-row state and expand the list.
- Disabled rows, disabled cells, and disabled items do not request row selection or item activation.
- Built-in component events remain isolated. Virtual List interactions do not bubble into cell or row click handling and do not invoke `onClickCell` or `onClickRow`.

## Implementation design

### Shared column pointer interaction

`src/index.tsx` will replace the duplicated flat-column and group-header long-press branches with one internal column-pointer controller. The controller owns the interaction kind and id, source coordinates, activation state, sort-suppression state, pointer type, and cleanup callbacks. It delegates only target resolution and the final layout operation to the existing column- and group-specific functions.

For a mouse interaction, the controller compares absolute horizontal and vertical deltas on every pointer move:

- activate when horizontal movement is at least 6 pixels and greater than vertical movement;
- cancel before activation when vertical movement is at least 6 pixels and greater than or equal to horizontal movement;
- otherwise remain pending so normal click sorting is still possible.

After activation, the current ghost position and drop-target state continue to update from pointer movement. Pointer release commits only a valid target. `pointercancel`, `Escape`, and window blur clear the pending timer/listeners and all placeholder, ghost, and marker state without changing the column order. Cleanup must be idempotent so unmounting or receiving more than one termination signal cannot leave a stale move state.

Resize boundaries and interactive Header components continue to stop the pointer sequence before it reaches the reorder controller. No drag-and-drop dependency and no new public column option are introduced.

### Source placeholder rendering

The source header remains in the table and retains its resolved width, `colSpan`, and `rowSpan`. Move state adds module-namespaced data/class hooks that suppress the moving header's visual content and apply the placeholder background and border. The content remains in the accessibility tree so the header name and column structure do not disappear while dragging; the floating ghost remains `aria-hidden`.

For a parent-group move, the group header and its child headers receive the placeholder state as one visual block. Body cells stay in their original order until the move is committed. The target indicator remains an overlay/marker rather than inserting a live empty column, avoiding repeated table re-layout during pointer movement.

### Internal Virtual List interaction bridge

The table-owned cell rendering path will pass an internal interaction context through `renderCominsContentWithComponents` and `renderCominsBuiltInComponent` to the Virtual List renderer. The context exposes row-selection requests for the current visible row entry. It is not added to `CominsCellComponentPayload`, the public component configuration, or package exports.

The normal-selection request reuses the existing row-click selection helper and row anchor, including visible-range calculation. The exclusive-selection request used by More calls the same core row-selection operation without multi/toggle flags and updates the row anchor. Both requests reject disabled row/cell state.

The Virtual List continues to stop component events. An enabled Item first sends the normal-selection request, then updates its local selected value and invokes `onClickItem`. More sends the exclusive-selection request and sets its local expanded state in the same handler. The existing callback payload remains the event-start snapshot; this delivery does not add a second selection callback or change public callback timing.

### State and failure behavior

- An invalid or unchanged column drop target restores the visual state without emitting a layout change.
- A cancelled move never emits a sort or layout change.
- A sort click below the movement threshold emits only the existing sort behavior.
- If the Virtual List has no internal table interaction context, its public item callback still runs, but it cannot mutate table row selection. Normal Comins Table rendering always supplies the context.
- If row selection is rejected because the row or cell is disabled, More does not expand and an Item does not update its local selection or fire its item callback.
- Changing selection away from a Virtual List row retains the current reset behavior for Search query, expansion, scroll position, and local virtual window state.

## Accessibility and interaction contract

- Header sorting remains keyboard-accessible through the current focused-header `Enter` and `Space` behavior.
- The source placeholder does not remove header semantics, and the moving ghost and target marker remain presentation-only.
- Virtual List items remain `button` elements with `role="option"` and `aria-selected` state.
- The overflow control is a real button whenever `more: true` has overflow. Its accessible label describes expansion rather than row selection; selection is a supporting side effect of the action.
- Keyboard Item and More activation produce the same row-selection and expansion result as pointer activation.
- Focus remains on the activated Item or More control. Selecting the row does not move focus to the table row.

## Playground and public documentation

- The Header Playground demonstrates immediate drag activation, the source placeholder, the moving ghost, and the target marker without a one-second wait.
- The Component Virtual List examples demonstrate that Item activation selects the row and that More selects and expands in one action.
- English-first public guidance in `README.md` and `docs/user/06-header.md`/`08-cell.md` is updated with matching Korean guidance in `docs/ko/06-header.md`/`08-cell.md`.
- Documentation removes the one-second mouse long-press contract and states the 6-pixel horizontal threshold, click-to-sort boundary, source placeholder, and non-mouse long-press compatibility behavior.
- Virtual List guidance states the normal Item selection rules, exclusive More behavior, Search's single-row dependency, and continued Cell/Row callback isolation.

## Verification design

### Focused unit and interaction coverage

- Column-pointer behavior: below-threshold click, 6-pixel horizontal activation, vertical cancellation, invalid-target cancellation, pointer cancellation, `Escape`, blur cleanup, and idempotent cleanup.
- Flat Header behavior: source placeholder, ghost, target marker, valid reorder, unchanged-target no-op, click sorting, and resize isolation.
- Two-level Header behavior: parent block placeholder/reorder, child movement within its permitted group, and unchanged cross-group restrictions.
- Virtual List behavior: plain Item selection, `Ctrl`/`Cmd` toggle, `Shift` visible-range selection, keyboard activation, disabled Item/row/cell, and `onClickItem` execution.
- More behavior: actionable before selection, exclusive selection plus same-action expansion, bounded DOM rendering, Search visibility after single selection, and reset after multi-selection.
- Event isolation: Virtual List Item and More do not invoke `onClickCell` or `onClickRow` and do not start cell-range selection.

### Repository gates

1. Run the focused Vitest component/interaction tests.
2. Run `test/playwright/specs/header-basic.spec.ts`, `header-quality.spec.ts`, and `component-renderer.spec.ts` with one worker.
3. Run `npm run test:run -- test/user-docs.test.ts` after public documentation changes.
4. Run the baseline `npm run verify` after all code and test-contract changes.
5. Run `npm run test:e2e -- --workers=1` because shared Header and Component interaction behavior changes.
6. Record commands, results, failure classification, and residual risks in `reports/2026-07-22.md`.

## Expected implementation files

| Area | Files |
| --- | --- |
| Column interaction | `src/index.tsx`, `styles.css` |
| Virtual List interaction | `src/index.tsx`, `src/component-renderer.tsx` |
| Unit and DOM interaction tests | `test/component-renderer-api.test.tsx` and focused table tests selected during planning |
| Browser tests | `test/playwright/specs/header-basic.spec.ts`, `header-quality.spec.ts`, `component-renderer.spec.ts` |
| Playground | Existing Header and `example/src/features/ComponentFeature.tsx` examples |
| Public guidance | `README.md`, `docs/user/06-header.md`, `docs/ko/06-header.md`, `docs/user/08-cell.md`, `docs/ko/08-cell.md` |
| Work record | `reports/2026-07-22.md` |

## Prioritized remaining work

The dedicated Header drag handle is retained as an alternative interaction, not part of this implementation. The broader roadmap remains ordered as follows:

1. Global/per-column reorder controls, multi-column sort, and the visual Fill Handle UI.
2. Variable-height virtualization, Flat Row Expand, and master/detail.
3. Row Grouping followed by Pivot.
4. Server-side row and viewport datasource models, which remain deferred while CSR is the active product scope.
5. Remote Tree loading, hierarchy pagination, Tree row drag, and row-level Tree clipboard behavior.
6. Firefox/Safari verification, charts integration, and AI-assisted features.

A separate external-store adapter is not planned; applications continue to pass their array or store state through `data` and receive table-originated changes through `onChangeData`.

## Explicit exclusions

- No live target-gap column re-layout while dragging.
- No dedicated Header drag handle implementation or public reorder configuration in this delivery.
- No change to Header sort order, column group movement boundaries, resize semantics, or saved layout shape.
- No public row-selection method added to component payloads or package exports.
- No change to other built-in component event propagation.
- No touch interaction redesign, new runtime dependency, version change, package publication, tag, GitHub Release, or remote push.
