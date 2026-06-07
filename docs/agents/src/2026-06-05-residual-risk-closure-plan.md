# Data Table Residual Risk Closure Plan

## Goal

Close the remaining `@kmsf/data-table` basic/core residual risks except package MIT publication metadata, which is intentionally deferred by MS.

## Confirmed Decisions

- Keep package publication metadata unchanged for now. Do not convert `private` or add MIT release metadata in this batch.
- Add `data` as the only React row input prop for external `useState` or external store state arrays.
- Remove `rows`, `defaultRows`, and `defaultData`; compatibility aliases are intentionally not kept.
- Expose `onChangeData` so internal row/cell mutations can be reflected into external state.
- Reset selection when row identity changes through full data refresh, row delete, row insert, row reorder, or row paste.
- Implement full range selection behavior in core and React UI.
- Implement fill behavior as a core helper first, without a visual fill handle.
- Implement multi-cell clipboard with per-column `copyable` and `pasteable` guards.
- Stop multi-cell paste at the existing table boundary. Do not auto-add rows.
- Add repeated playground lifecycle smoke to the browser gate.
- Complete the playground shadcn/Tailwind scaffold without making package runtime depend on shadcn, Radix, or Tailwind.
- Add public API and subpath boundary coverage.
- Update user docs and playground examples for every implemented feature.

## TDD Order

1. Add focused failing tests for `data`/`onChangeData` controlled usage and removed `rows`/`defaultRows`/`defaultData` props.
2. Implement minimal React prop/state handling to pass the controlled data tests.
3. Add focused failing tests for selection reset on row identity changes.
4. Implement selection reset in the core row replacement path.
5. Add focused failing tests for range selection helpers.
6. Implement range selection state, address expansion, and range predicates.
7. Add focused failing tests for multi-cell copy/paste and fill helper.
8. Implement guarded matrix clipboard and fill behavior.
9. Add focused failing React interaction tests for range drag, Shift-click, and range keyboard copy/paste.
10. Implement React range UI interaction and selected range attributes.
11. Add playground examples for controlled data, range, matrix clipboard, and fill helper.
12. Add lifecycle smoke and shadcn/Tailwind scaffold boundary tests.
13. Add public API/subpath boundary tests.
14. Update README, user docs, and report.
15. Run focused tests, then `verify:full`, `test:perf`, stale artifact check, and `git diff --check`.

## Completion Gate

- Focused Vitest tests must show RED before production behavior changes and GREEN after implementation.
- `npm --workspace=@kmsf/data-table run verify:full` must pass.
- `npm --workspace=@kmsf/data-table run test:perf` must pass.
- Playwright `test-results` must not retain active artifact files.
- `git diff --check` must pass.
- `packages/data-table/reports/2026-06-05.md` must record commands actually run and residual risks.
