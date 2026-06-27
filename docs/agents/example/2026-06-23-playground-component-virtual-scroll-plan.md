# Playground Component and Virtual Scroll TDD Plan

## Metadata

- Date: 2026-06-23
- Scope: `@kmsf/data-table` playground, built-in component layout, virtualized body rendering
- Status: Supervisor decisions reflected; implementation not started
- ask gate: clear

## Confirmed Facts

- Current Header example has separate `초기화` and `복원` buttons.
  - `초기화` only clears the saved layout string.
  - `복원` resets the table column layout to `defaultColumnLayout`.
- Current Cell example mixes `cell.components` examples into the Td Cell page.
- Current Component example owns the built-in button/input/checkbox/radio/select/toggle/progress/menu/virtual-list examples.
- Current input/select CSS declares `width: 100%`, but component slot/group flex sizing can still constrain the rendered control width.
- Current virtual-list `more` prop does not create an independent More behavior; the `...` button is currently coupled to selected row state.
- Current large body virtualization keeps rendered rows bounded, but uses very large table spacer rows.
- Core virtualization helper already has `KmsfVirtualRowsOptions.overscan`.
- `KmsfDataTable` public props do not currently expose a user-adjustable virtual buffer option.
- `KmsfDataTable` body rendering currently hardcodes `2` rows of overscan above/below the viewport.
- 100만 row with `rowHeight=36` creates a logical height of 36,000,000px.
- Chromium clamps the observed `scrollHeight` near 33,554,432px in the current playground.
- In one-off browser measurement, 100만 row large jump scroll took about 685ms to 3.4s while rendered rows remained under 20.

## Confirmed Supervisor Decisions

- Header `초기화` / `복원` are merged into one `초기화` action.
- Large data example must keep its current large-data meaning; do not reduce it to 30 rows.
- General samples should show 30 rows per page.
- Virtual List More button must not depend on row or cell selection.
- More button, row selection, and cell selection are separate events.
- Playground changes are included in the same implementation scope.
- Virtualized body buffer size must be user-adjustable.
- The default virtualized body buffer should be in the 20-30 row range above and below the viewport, not 2 or 5.

## Goal

Improve playground correctness, component layout, and large-scroll performance while keeping the existing `KmsfDataTable`
prop API stable except for the new public `"buffer-size"?: number` virtualization buffer prop.

## Non-Goals

- Do not introduce a new grid/table dependency.
- Do not add server-side row model or lazy data-source API in this task.
- Do not redesign the full data-table state architecture.
- Do not remove the existing 10만/100만 row large-data demo.
- Do not change unrelated app/root `apps/kmsf` dirty changes.

## Required Behavior

### Header Example

- Remove `Header 컴포넌트 이벤트 대기`.
- Remove separate `복원`.
- Keep one `초기화` button.
- `초기화` clears saved layout state and restores default column layout.
- Header action set becomes: `표시`, `숨김`, `저장`, `불러오기`, `초기화`.

### General Sample Pagination

- Basic, CRUD, Header, Td Cell, Tr Row, Context Menu, Component examples use `pageSize: 30`.
- Large data/body example keeps large virtualized data behavior.
- Size examples keep enough rows to demonstrate scroll/height behavior.
- Feature registry examples and visible copy should not claim `pageSize: 10` for updated examples.

### Td Cell Example

- Remove built-in component columns from Td Cell page.
- Remove `cellSelection` toggle and visible active/inactive state area.
- Rebuild Td Cell page around 6 columns only:
  - base raw/text cell
  - formatted cell
  - styled cell
  - renderer cell
  - guarded/copy-paste behavior cell
  - event target cell
- Set all Td Cell columns to 100px width.
- If the table width exceeds the content area, horizontal scroll appears.
- Keep cell click, double click, context menu, keydown examples.

### Tr Row Example

- Add row styling demonstration.
- Add row format/rendering demonstration through cell output that depends on row state.
- Keep row click, double click, context menu, keydown, disabled, draggable examples.

### Component Example

- Input and SelectBox fill the component cell width when consumer does not provide narrower styles.
- Input and SelectBox resize with column width changes.
- Built-in components default alignment remains center.
- Header component and header label do not overlap.
- Virtual List `...` More button works independently of row/cell selection.
- Virtual List Search may still require the search-specific sample behavior, but More expansion must not use row selection as a precondition.

### Large Data Scroll Performance

- 100만 row large jump scroll must stay responsive.
- The table must be able to reach the last rows, not stop around row `932053`.
- Rendered row DOM remains bounded.
- Virtualized body exposes a user-adjustable buffer/overscan prop.
- Default buffer uses a practical 20-30 row range above and below the viewport.
- Browser console warning/error count remains zero.

## Root Cause Hypothesis For Large Scroll

Current virtualized body uses table rows as top/bottom spacers. At 100만 rows, spacer heights reach tens of millions of pixels. This triggers browser scroll-height clamping and expensive table layout/reflow on jump scroll.

The likely fix is to stop using giant table row spacer heights for large virtualized bodies. Use a bounded scroll coordinate strategy, such as segmented virtual scrolling or a translated row window inside a non-table-sized scroll track.

## TDD Sequence

### 1. Header RED

- Update `header-basic.spec.ts` / layout polish spec.
- Assert `Header 컴포넌트 이벤트 대기` is absent.
- Assert `복원` is absent.
- Assert `초기화` restores default order and clears saved layout.
- Expected RED reason: current page still renders event output and separate `복원`.

### 2. Pagination RED

- Add/adjust playground spec to assert general examples render 30 body rows where the dataset has at least 30 rows.
- Assert Body large-data page is excluded from this 30-row limit and remains virtualized.
- Expected RED reason: current examples use 10, 20, 100, or all rows.

### 3. Td Cell RED

- Update `cell-row-examples.spec.ts`.
- Assert component controls are absent from Td Cell page.
- Assert no `cellSelection` toggle/state is visible.
- Assert exactly 6 visible headers in Td Cell page.
- Assert each Td Cell header width is about 100px.
- Assert horizontal overflow exists when viewport/content is narrower than total columns.
- Expected RED reason: current Td Cell page renders built-in component columns and cell selection toggle.

### 4. Tr Row RED

- Update row example browser test.
- Assert row styling and row-dependent formatted/rendered cell output are visible.
- Expected RED reason: current row page has limited row formatting proof.

### 5. Component Layout RED

- Update `component-renderer.spec.ts`.
- Assert input/select width is within 1px of the containing component cell content box, not just the current slot.
- Resize the component column and assert input/select width changes accordingly.
- Assert header component and header label bounding boxes do not overlap.
- Expected RED reason: current slot/group layout can constrain input/select width and header component/header label can overlap.

### 6. Virtual List More RED

- Update `component-renderer.spec.ts`.
- Assert `virtual-list-more` `...` is a button before row selection.
- Click it without selecting the row.
- Assert the list expands and rendered item count is bounded.
- Assert row selected state did not change because of More click.
- Expected RED reason: current `...` button is selection-gated.

### 7. Large Scroll Performance RED

- Add focused Playwright `@perf` test.
- Load 100만 rows.
- Jump scroll to bottom.
- Assert:
  - interaction duration stays below a defined smoke threshold.
  - rendered rows remain bounded with the default 20-30 row buffer.
  - last visible row range reaches the final dataset region.
  - no browser diagnostics.
- Expected RED reason: current jump scroll takes seconds and bottom scroll cannot reach the last row range due browser scroll-height clamp.

### 7.1 Virtual Buffer API RED

- Add focused Vitest/type coverage for a public table buffer prop.
- Prop name: `"buffer-size"?: number`.
- Assert the default path uses 20-30 rows above/below the viewport.
- Assert a consumer-provided value changes the rendered virtual range.
- Expected RED reason: current public `KmsfDataTableProps` does not expose overscan and body rendering hardcodes `2`.

### 8. GREEN Implementation

- Header:
  - remove event output.
  - merge reset/restore into one `초기화`.
- Playground pagination:
  - set general sample `pageSize` to 30.
  - preserve body/size large-scroll demonstrations.
- Td Cell:
  - replace component columns with six Td-focused columns.
  - set fixed width 100px and enable horizontal scroll through existing table overflow contract.
- Tr Row:
  - extend columns/formatting and rowProps examples only within the row page.
- Component renderer layout:
  - adjust component slot/group CSS so single fill-capable controls can use full cell width.
  - keep default center alignment for non-fill components.
  - keep user-provided component styles respected.
- Virtual list:
  - make More expansion independent from selection.
  - keep search input behavior separate from More.
  - keep event propagation isolated from row/cell selection.
- Virtualized body:
  - replace large `tr` spacer strategy for big row counts with a bounded coordinate strategy.
  - expose user-adjustable buffer through `"buffer-size"?: number`.
  - set the default virtual overscan to a 20-30 row range.
  - clamp negative or invalid values to a safe minimum.
  - keep current public API and DOM row count contract.

### 9. Refactor

- Only refactor after focused tests pass.
- Keep CSS changes scoped to `.kmsf-data-table__component-*`, `.kmsf-data-table__body-*`, and playground selectors.
- Avoid broad renaming or unrelated cleanup.

## Requirement-To-Test Matrix

| Requirement | Test Evidence |
| --- | --- |
| Header event output removed | Playwright header spec |
| Header reset/restore merged | Playwright header layout restore spec |
| General samples show 30 rows | Playwright playground pagination spec |
| Large data remains large | Playwright virtualization spec |
| Td Cell is no longer component demo | Playwright cell-row examples spec |
| Td Cell 6 columns, 100px width, horizontal scroll | Playwright geometry spec |
| Tr Row has styling/format proof | Playwright row examples spec |
| Input/select fill cell and resize with column | Playwright component geometry spec |
| Header component/label no overlap | Playwright component geometry spec |
| More button independent from selection | Playwright virtual-list spec |
| Large jump scroll responsive and reaches final range | Playwright `@perf` virtualization spec |
| User-adjustable virtual buffer | Vitest/type coverage plus Playwright range proof |
| No console warning/error | shared diagnostics collector |

## Verification Commands

Focused RED/GREEN commands:

- `../../node_modules/.bin/playwright test --config=playwright.config.ts test/playwright/specs/header-basic.spec.ts`
- `../../node_modules/.bin/playwright test --config=playwright.config.ts test/playwright/specs/cell-row-examples.spec.ts`
- `../../node_modules/.bin/playwright test --config=playwright.config.ts test/playwright/specs/component-renderer.spec.ts`
- `../../node_modules/.bin/playwright test --config=playwright.config.ts test/playwright/specs/virtualization.spec.ts`
- `../../node_modules/.bin/vitest run test/component-renderer-api.test.tsx test/basic-core.test.ts`

Baseline/final:

- `npm run lint`
- `npm run verify`
- `npm run test:perf`
- `npm run verify:full`
- `git diff --check -- <changed files>`

If Playwright webServer bind fails with `listen EPERM 127.0.0.1:4002`, rerun the same command with approved external execution and record both attempts.

## Ask Gate

- `ask-research`: repo files and live playground measurement completed; no external/current web research needed.
- `ask-question`: user-owned decisions are closed.
- `ask-plan`: final plan can be written because no unresolved product/UX/performance decisions remain.

## Residual Risks To Track

- The large-scroll fix may require changing the internal virtualized body DOM structure; public API must remain stable.
- Browser geometry thresholds for performance smoke tests can vary by machine load; use a smoke threshold high enough to avoid flake while still catching multi-second regressions.
- Search-specific Virtual List behavior should remain separate from More; verify both examples after implementation.
- Adding `"buffer-size"?: number` is a public API expansion and must be covered by type/user docs.
- Existing unrelated `apps/kmsf` dirty changes are outside this package plan and must not be touched.
