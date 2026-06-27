# Component Renderer and Playground Layout Contract Plan

## Summary

- Fix the repeated component example layout before resuming large-data virtualization work.
- Keep the component example page as repeated Card/sample sections.
- Align all playground examples to the same containment contract: content width stays fixed, table overflow stays inside the data-table viewport, and browser/document width must not grow after column resize.
- Split header label, header components, and sort/menu affordances into separate layout zones so labels and components do not overlap.
- Ensure built-in components without an explicit `align` render visually centered in the `td`.
- Apply the follow-up header slot order: left slot, label, 5px gap, sort indicator, right slot.
- Make header components default to left alignment while cell components keep center alignment.
- Make the Td Cell example resizable by removing fixed `maxWidth: 100` from its sample columns.

## Ask Gate

- ask-plan decision loop is closed.
- Accepted supervisor decisions:
  - Header DOM structure may change to separate label/component/action zones.
  - Component examples must keep the repeated Card/sample structure.
  - The repeated component Card/table wrappers must follow the same playground containment contract as other examples.
  - Header sort indicator must render after the label with a 5px gap, then before the right slot.
  - Header component default direction/alignment is left.
  - Cell component default alignment remains center.
  - Td Cell example column `maxWidth` constraints must be removed.
- ask gate clear.

## Confirmed Facts

- The common `.feature-panel` layout uses `flex: 1 1 0`, `min-width: 0`, and `overflow: hidden`.
- `ComponentFeature` overrides that contract with `.feature-panel--components { flex: 0 0 auto; height: auto; overflow: visible; }`.
- Size examples also use multiple samples, but each `.size-case` contains its table with `overflow: hidden`.
- Component examples render multiple `FeatureSampleSection` Cards and wrap each table in `.component-example-table-wrap`.
- Current header rendering combines `column.label` and `header.components` into one `headerBody` and then places that into one header content span.
- Component slot markup sets `data-kmsf-component-align={component.align ?? "center"}`, but the CSS slot does not enforce horizontal center by default.
- Existing Playwright coverage checks component existence, row count, and some clipping behavior, but it does not enforce a shared example layout contract across all feature pages.
- The current follow-up implementation has a separated `.kmsf-data-table__header-label` and `.kmsf-data-table__header-components`, but it still combines left and right header slots into one component area.
- `CellFeature` sample columns currently use `width: 100`, `minWidth: 100`, and `maxWidth: 100`, so resize is clamped back to 100px.

## Scope

### In Scope

- `src/index.tsx`
- `styles.css`
- `example/src/features/ComponentFeature.tsx`
- `example/src/features/CellFeature.tsx`
- `example/src/styles.css`
- `test/playwright/specs/component-renderer.spec.ts`
- `test/playwright/specs/cell-row-examples.spec.ts`
- `test/playwright/specs/playground-layout-polish.spec.ts`
- Scope-local report `reports/2026-06-24.md`

### Out of Scope

- Large row virtual scroll performance redesign.
- New runtime dependency.
- Public `KmsfDataTable` prop/type changes.
- Server-side, viewport, or lazy data source API.
- Broad visual redesign of all examples beyond containment consistency.

## Required Behavior

- Header label and header components must not overlap at default width or after component column resize.
- Header label, component area, and sort/menu area must be independently constrained with ellipsis/overflow behavior.
- Header column structure must be equivalent to `<slot #left><label><sort-indicator><slot #right>`.
- Header sort indicator must keep a 5px gap from the label and render before the right slot.
- Header components without explicit `direction` must render in the left slot.
- Header left/right slots must not steal label overflow space beyond their constrained width.
- Built-in cell components without explicit `align` must render visually centered in the cell.
- Built-in header components without explicit `align` must render with left slot behavior.
- `align="start"` and `align="end"` must control horizontal positioning, not vertical-only positioning.
- Input/select/virtual-list components must keep their existing full-width cell behavior.
- Td Cell example columns must start at 100px but allow column resize by removing fixed `maxWidth: 100`.
- Component examples must keep repeated Card/sample sections.
- Component example Card/table wrappers must not increase document or feature content width after column resize.
- If resized columns exceed the table viewport, horizontal scroll must appear inside the data-table body viewport.
- All playground examples should follow the same outer content width containment rule.

## TDD Sequence

1. RED: Add playground layout contract coverage.
   - Iterate all feature menu entries.
   - Assert the active feature content width does not exceed the available content viewport.
   - For component examples, resize a component column wider than the sample width.
   - Assert `document.documentElement.scrollWidth` does not grow beyond viewport tolerance.
   - Assert the component table body viewport has horizontal overflow when total column width exceeds its container.
   - Expected RED reason: component page uses `overflow: visible` and auto-height/auto-width wrappers.

2. RED: Add header label/component non-overlap coverage.
   - Open component example.
   - Locate a header with both label and header component.
   - Measure label zone and component zone rects.
   - Resize the component column narrower and wider.
   - Assert label and component rects do not overlap and both remain within the `th`.
   - Expected RED reason: current header body is a single composed span.

3. RED: Add actual component centering coverage.
   - Cover button, checkbox, radio, toggle, progress, and menu trigger.
   - Compare the actual control rect center with the containing `td` content rect center.
   - Keep input/select width-fill assertions separate.
   - Expected RED reason: slot defaults do not enforce horizontal center on the actual rendered control.

4. GREEN: Split header layout.
   - Replace single `headerBody` span composition with explicit header content zones.
   - Keep `header.renderer` as the highest-priority escape hatch.
   - For `header.components`, render left slot, label, sort indicator, and right slot in separate constrained zones.
   - Keep a 5px label-to-sort-indicator gap.
   - Preserve sort activation and resize handle behavior.

5. GREEN: Fix component slot alignment.
   - Add horizontal `justify-content` handling for center/start/end.
   - Preserve vertical centering.
   - Ensure fixed-size controls are centered and full-width controls still fill the cell.

6. GREEN: Normalize component example containment.
   - Keep repeated Cards.
   - Remove or narrow the `.feature-panel--components` overflow/auto-height exception.
   - Add containment to component section, Card body, sample, and table wrapper as needed.
   - Ensure overflow scroll is owned by `.kmsf-data-table__body-viewport`.

7. RED/GREEN: Make Td Cell example columns resizable.
   - RED: Drag a Td Cell header resize handle and assert the target header width changes from 100px.
   - Expected RED reason: `maxWidth: 100` clamps the sample column width.
   - GREEN: Remove `maxWidth: 100` from Td Cell sample columns; keep initial `width: 100`.
   - Preserve horizontal overflow and six-column focused Cell example structure.

8. Refactor only after focused tests pass.
   - Extract shared repeated-sample CSS only if it reduces duplication without changing behavior.
   - Avoid broad style cleanup.

## Verification Matrix

| Requirement | Focused Evidence | Browser Proof |
| --- | --- | --- |
| Header label/component do not overlap | Playwright rect assertion | default, narrow resize, wide resize |
| Header slot order | Playwright rect assertion | left slot <= label <= sort indicator <= right slot |
| Header sort indicator spacing | Playwright geometry assertion | label right to indicator left is 5px +/- tolerance |
| Header default component direction | Playwright example assertion | component without `direction` appears in left slot |
| Component default center alignment | Playwright geometry assertion | actual control center equals cell content center within tolerance |
| Td Cell columns resize | Playwright drag assertion | target header width changes from 100px after resize |
| Component example keeps repeated Cards | Existing plus focused Playwright assertion | all component sections visible |
| Component resize does not grow document width | Playwright scrollWidth assertion | `documentElement.scrollWidth <= viewport width + tolerance` |
| Horizontal overflow stays in table viewport | Playwright viewport metrics | body viewport `scrollWidth > clientWidth`, `overflow-x: auto` |
| All examples follow content containment | Playwright feature iteration | active feature width stays within content width |
| Browser diagnostics clear | shared diagnostics collector | no console warning/error |

## Verification Commands

- Focused RED/GREEN:
  - `../../node_modules/.bin/playwright test --config=playwright.config.ts test/playwright/specs/component-renderer.spec.ts test/playwright/specs/playground-layout-polish.spec.ts test/playwright/specs/cell-row-examples.spec.ts`
- Package baseline:
  - `npm --workspace=@kmsf/data-table run verify`
- Full browser gate when ready:
  - `npm --workspace=@kmsf/data-table run verify:full`
- Diff hygiene:
  - `git diff --check -- src/index.tsx styles.css example/src/features/ComponentFeature.tsx example/src/features/CellFeature.tsx example/src/styles.css test/playwright/specs/component-renderer.spec.ts test/playwright/specs/cell-row-examples.spec.ts test/playwright/specs/playground-layout-polish.spec.ts docs/agents/src/2026-06-24-component-renderer-playground-layout-plan.md reports/2026-06-24.md`

## Residual Risks

- Header DOM split can affect CSS selectors used by tests or consumers relying on internal DOM. Public props and types remain unchanged.
- Header slot order changes visible placement for existing `header.components` without `direction`; this is an accepted supervisor decision.
- Component centering must not break full-width input/select behavior.
- Td Cell example resize behavior changes the previous fixed-width sample contract; tests that expected every header to remain exactly 100px must be updated.
- Containment fixes can hide unintended overflow; Playwright must prove table-owned horizontal scroll still works.
- Current workspace has many unrelated modified files. Implementation must avoid reverting unrelated user changes.
