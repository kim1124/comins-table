# Playground option toggle buttons

- Recorded: 2026-09-22 16:10 KST.
- Scope: replace standalone Playground option checkboxes with the existing `Button` and `aria-pressed` styling. No library API or data-flow changes.
- Local changes only; existing uncommitted work preserved.

## Changes

- `example/src/features/ViewportFeature.tsx`: automatic height, slow response, failed requests.
- `example/src/features/TreeDragSample.tsx`: allow parent changes, automatic height.
- `example/src/features/AutoRowHeightFeature.tsx`: Row Detail.
- `example/src/features/ClipboardEditSample.tsx`: automatic height.
- `example/src/features/RowGroupingFeature.tsx`: Row and Group movement.
- `example/src/features/ColumnGroupFeature.tsx`: static and dynamic Header Group visibility.
- `example/src/features/featureRegistry.tsx`: Header Group visibility example now refers to a toggle button.
- Updated existing interaction selectors/assertions in `header-basic`, `playground-layout-polish`, `playground-request-fixes`, `tree-row-drag`, `viewport-datasource`, `playground-audit-regressions`, and `human-review-drag` Playwright specs.
- Labels, initial values, and option state handlers retain their meaning. Native buttons support Enter and Space. The existing mint pressed state distinguishes enabled options.
- Row-selection checkboxes, built-in Checkbox demonstrations, and MultiSelect checkboxes remain selection controls.

## Verification

- `npm run lint`: passed.
- `git diff --check`: passed.
- Direct in-app browser interaction: clicked option buttons on all six changed routes. Confirmed Viewport automatic height off/on with mouse and Space; enabled slow/error responses, changed query, observed retry controls, disabled failures and restored loaded data through Retry. Confirmed Header Group disappears and returns with click/Enter, Tree options toggle, Row Detail becomes visible, Paste automatic-height state changes, and Group movement toggles with click/Space.
- Browser error log for the direct verification tab: empty.
- Screenshot: [Viewport toggle controls](artifacts/toggle-controls-2026-09-22/viewport.png).
- Full UI regression: `PLAYWRIGHT_REUSE_EXISTING_SERVER=1 npm run test:e2e -- --workers=1` passed, 231 tests (3.7 minutes). Log: `artifacts/toggle-controls-2026-09-22/e2e.log`.
- Focused drag/scroll performance regression: `npm run test:perf -- test/playwright/specs/human-review-drag.spec.ts --workers=1` with server reuse passed, 4 tests (5 seconds), including the updated Tree automatic-height toggle setup. Log: `artifacts/toggle-controls-2026-09-22/perf.log`. Full performance and library verification suites were not rerun for this Playground control-only change.
- The first sandboxed E2E attempt could not bind port 4002 (`listen EPERM`). Retried outside the sandbox against the existing development server; this is an execution-environment failure.

## Human review follow-up: Auto row height controls

- Corrected the earlier incomplete conversion: only the Row Detail checkbox had been converted, leaving three existing Boolean action buttons without toggle styling or pressed state.
- `AutoRowHeightFeature.tsx` now uses the existing Button and `aria-pressed` for long content, narrow width, and the cell renderer's expanded content. Korean/English labels describe the enabled state; initial values and handlers retain the existing behavior.
- Fresh direct interaction: long-content Row height 79 → 159 → 79px with mouse/Space; narrow viewport width 758 → 418 → 758px with mouse/Enter; renderer height 79 → 139 → 79px with mouse/Space; Row Detail became visible. All pressed states matched the actions; browser error log empty.
- Fresh checks: TypeScript and diff whitespace passed; affected viewport-datasource and localization E2E specs passed all 14 tests (16.8 seconds). Full E2E and performance suites were not repeated for this example-only button change.
- [Corrected Auto row height screenshot](artifacts/toggle-controls-2026-09-22/auto-row-height-fixed.png), [affected E2E log](artifacts/toggle-controls-2026-09-22/auto-row-height-e2e.log).
