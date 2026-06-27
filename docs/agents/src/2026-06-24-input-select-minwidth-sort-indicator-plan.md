# Input / Select Selection Gate, Minimum Width, and Sort Indicator Plan

## Summary

- Define Cell `input` and `select` built-in components as row-selection gated data-table default behavior.
- A Cell `input` or `select` renders as an editable component only when exactly one row is selected and the current row is that selected row.
- When no row is selected, or multiple rows are selected, the Cell renders only the connected formatted value.
- Header `input` and `select` components are not row-bound and keep their existing component rendering behavior.
- Set the global effective column minimum width to 50px.
- Prevent header labels, sort indicators, and header/cell components from overlapping at the 50px minimum width.
- Treat the sort indicator as layout-visible only when it is actually shown on screen. Unsorted sortable columns must not reserve indicator layout space.
- When the sort indicator is visible, place it 10px to the right of the header label.

## Ask Gate

- ask-question / ask-plan decision loop is closed.
- Accepted supervisor decisions:
  - Cell `input` and `select` selection gating is a data-table default behavior, not a playground-only behavior.
  - Global effective column minimum width is fixed at 50px.
  - Sort indicator layout visibility is based on whether the indicator is visually output on screen.
  - Unsorted columns are included in hidden-indicator behavior.
- ask gate clear.

## Confirmed Facts

- Cell component payload already includes `row.selected` and `selection.selectedRowCount`.
- Cell components currently render whenever `column.cell.components` exists, independent of row selection state.
- The current column width calculation falls back to `column.minWidth ?? 48`.
- The current column resize pointer path clamps with `column.minWidth ?? 48`.
- The current sort indicator CSS uses `margin-left: 5px`.
- The current unsorted sort indicator has `opacity: 0`, so it is visually hidden but still occupies layout space.
- The current header layout already separates left slot, label, sort indicator, and right slot.

## Scope

### In Scope

- `src/index.tsx`
- `styles.css`
- `example/src/features/ComponentFeature.tsx`
- `example/src/features/CellFeature.tsx` if sample min-width behavior needs alignment with the new 50px global floor
- `example/src/styles.css`
- `test/component-renderer-api.test.tsx`
- `test/table-interaction.test.tsx`
- `test/playwright/specs/component-renderer.spec.ts`
- `test/playwright/specs/cell-row-examples.spec.ts`
- Scope-local report `reports/2026-06-24.md`

### Out of Scope

- Large row virtual scroll performance redesign.
- New public `KmsfDataTable` props or component config types.
- New dependency.
- Server-side row model, lazy data source, or editor lifecycle redesign.
- Broad playground visual redesign beyond examples needed to verify the behavior.

## Required Behavior

- Cell `input` and `select` built-ins:
  - Render the editable built-in component only when `payload.selection.selectedRowCount === 1` and `payload.row.selected === true`.
  - Render only the formatted Cell value when `selectedRowCount` is `0`.
  - Render only the formatted Cell value when `selectedRowCount` is greater than `1`.
  - Preserve existing Header `input` and `select` rendering.
  - Preserve event isolation when the editable component is rendered.
  - Preserve component-only behavior for other built-ins such as button, checkbox, radio, toggle, progress, menu, and virtual-list.

- Column minimum width:
  - Use an effective minimum width of 50px globally.
  - Clamp resize interactions to at least 50px.
  - Do not allow explicit column `minWidth` values below 50px to reduce the effective minimum.
  - Keep explicit `minWidth` values above 50px.
  - Ensure table-owned horizontal overflow still handles total column width exceeding the viewport.

- Header layout:
  - Header label, sort indicator, left slot, and right slot must remain separately constrained.
  - At 50px column width, label text must ellipsis or clip within the header cell.
  - At 50px column width, components and labels must not overlap.
  - In unsorted state, the sort indicator must not reserve layout width.
  - In non-sortable state, the sort indicator must not reserve layout width.
  - In sorted asc/desc state, the sort indicator must render 10px to the right of the label.
  - When the indicator is hidden, the header label should remain centered within the available label area.

## TDD Sequence

1. RED: Add Cell input/select selection-gate tests.
   - Cover no selected row: Cell input/select config renders formatted value only.
   - Cover exactly one selected row: selected row renders input/select component and unselected rows render formatted value only.
   - Cover multiple selected rows: all rows render formatted value only.
   - Cover Header input/select: still renders as a component.
   - Expected RED reason: current Cell components render regardless of row selection.

2. RED: Add browser coverage for Component examples.
   - Open the component examples for Input and Select.
   - Assert initial no-selection state shows connected values, not input/select controls.
   - Select a single row and assert only that row shows the input/select control.
   - Select multiple rows and assert input/select controls are removed and connected values remain.
   - Assert browser diagnostics have no warning/error.
   - Expected RED reason: current playground renders the controls on every row.

3. RED: Add column minimum width coverage.
   - Resize a representative column below 50px.
   - Assert the measured header/body column width does not go below 50px.
   - Assert component and text content stay clipped or ellipsized inside the cell.
   - Expected RED reason: current clamp is 48px and example constraints may not align with the new global floor.

4. RED: Add sort indicator layout coverage.
   - In unsorted state, assert the indicator is not layout-visible and the label remains centered.
   - Sort the column and assert the indicator becomes visible.
   - Assert the visible indicator is 10px to the right of the label within tolerance.
   - Resize the column to 50px and assert label/indicator/components do not overlap.
   - Expected RED reason: current hidden indicator still occupies layout space and uses 5px margin.

5. GREEN: Implement selection-gated Cell input/select rendering.
   - Add a small helper that detects Cell editable built-ins requiring row-selection gating.
   - Use existing payload fields to decide whether to render components or formatted value.
   - Keep `cell.renderer` highest priority.
   - Keep other built-in component behavior unchanged.

6. GREEN: Apply global 50px effective minimum.
   - Centralize the effective column minimum calculation if needed.
   - Use the same minimum in width normalization and resize pointer path.
   - Adjust examples only where they conflict with the 50px floor.

7. GREEN: Adjust sort indicator visibility and spacing.
   - Add a render/layout state that distinguishes visible asc/desc from hidden none/non-sortable.
   - Remove hidden indicator layout reservation.
   - Set visible label-to-indicator spacing to 10px.
   - Preserve `aria-sort` and header click sorting behavior.

8. Refactor only after focused tests pass.
   - Avoid broad style cleanup.
   - Keep internal DOM selector changes limited to the affected header/component areas.

## Verification Matrix

| Requirement | Focused Evidence | Browser Proof |
| --- | --- | --- |
| Cell input/select gated by single row selection | Vitest/jsdom component rendering assertions | Component Input/Select examples no-selection, single-selection, multi-selection |
| Header input/select unaffected | Vitest/jsdom header component assertion | Component Header input/select still visible |
| Global minimum width 50px | Vitest/jsdom or focused interaction test | Playwright resize below 50px and measured width |
| Content does not overflow at minimum width | CSS/DOM assertions | Playwright rect assertions for text/component containment |
| Hidden sort indicator reserves no layout space | Playwright geometry assertion | unsorted state label centered, indicator not layout-visible |
| Visible sort indicator spacing | Playwright geometry assertion | sorted asc/desc indicator 10px from label |
| No overlap at 50px | Playwright rect assertions | label, indicator, slots inside header cell |
| Browser diagnostics clear | shared diagnostics collector | no console warning/error |

## Verification Commands

- Focused RED/GREEN:
  - `../../node_modules/.bin/vitest run test/component-renderer-api.test.tsx test/table-interaction.test.tsx`
  - `../../node_modules/.bin/playwright test --config=playwright.config.ts test/playwright/specs/component-renderer.spec.ts test/playwright/specs/cell-row-examples.spec.ts`
- Package baseline:
  - `npm --workspace=@kmsf/data-table run verify`
- Full browser gate:
  - `npm --workspace=@kmsf/data-table run verify:full`
- Diff hygiene:
  - `git diff --check -- src/index.tsx styles.css example/src/features/ComponentFeature.tsx example/src/features/CellFeature.tsx example/src/styles.css test/component-renderer-api.test.tsx test/table-interaction.test.tsx test/playwright/specs/component-renderer.spec.ts test/playwright/specs/cell-row-examples.spec.ts docs/agents/src/2026-06-24-input-select-minwidth-sort-indicator-plan.md docs/agents/src/plan.md docs/agents/example/plan.md reports/2026-06-24.md`

## Residual Risks

- Cell `input` and `select` behavior change is package default behavior. Consumers that expected always-visible editors will see formatted values until exactly one row is selected.
- If a consumer uses Cell `input` or `select` in a table without row selection UX, the component will not appear until the selection state has exactly one selected row.
- Header internal layout CSS will change again for hidden indicator space. Public props/types remain unchanged, but undocumented internal selector overrides may need adjustment.
- At the 50px minimum width, very dense header configurations may necessarily clip text or components; the completion requirement is no overlap and no external overflow, not full readability.
- Current workspace has many unrelated modified files. Implementation must avoid reverting unrelated user changes.
