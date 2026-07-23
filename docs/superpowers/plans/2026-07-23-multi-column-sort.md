# Multi-column Sort Implementation Plan

**Goal:** Add opt-in, priority-ordered multi-column sorting to Flat and Tree tables while preserving the existing single-sort API and making the behavior explicit in the Playground and public documentation.

**Architecture:** Add an ordered `CominsSortModel` beside the existing first-rule `sort` projection. Centralize normalization and composite comparison in core helpers, route Header gestures through one model transition helper, and reuse the resulting model for Flat sorted indexes and recursive Tree sibling sorting.

**Tech Stack:** React 18+, TypeScript 7, Vitest 4 with jsdom, Playwright 1.61, Vite 8, module-owned CSS.

## Constraints

- Preserve all existing single-sort types and method signatures.
- `multiSort` defaults to `false`; only Shift gestures are additive.
- Include Tree Grid and two-level child Headers in the first delivery.
- Keep English and Korean public documentation synchronized.
- Do not add dependencies or change package version.
- Do not push, publish, tag, create a Release, or change provider settings.

## Task 1: Lock the core model contract with failing tests

Files: `test/basic-core.test.ts`, `test/tree-table.test.tsx`, `test/public-api.test.tsx`.

- Add type/API coverage for `CominsSortModel`, Ref model methods, `multiSort`, and `onChangeSortModel`.
- Add composite comparison, stable tie, custom comparator, duplicate/invalid rule normalization, and legacy single-sort tests.
- Add Tree sibling composite-sort coverage.
- Run the focused tests and record the expected RED result.

## Task 2: Implement the core and public API

Files: `src/core.ts`, `src/index.tsx`, and any export/type fixtures affected by public declarations.

- Add the model type, state field, normalizer, setter, clearer, and composite comparator.
- Preserve `sort` as the first-rule projection and keep existing helpers working.
- Add `multiSort`, `onChangeSortModel`, `getSortModel`, and `setSortModel`.
- Normalize the model when Column definitions change and clear the full model during Row movement.
- Apply the composite comparator to Tree sibling sorting.

## Task 3: Implement Header interaction, priority UI, and accessibility

Files: `src/index.tsx`, `styles.css`, `test/table-interaction.test.tsx`, `test/component-renderer-api.test.tsx`.

- Add a pure single/additive model transition.
- Route click, `Enter`, `Space`, and their Shift variants through it.
- Add data attributes, priority badge, hidden status, and Header component payload metadata.
- Keep parent Group Headers unsortable and retain drag-derived click suppression.
- Run focused DOM interaction tests to GREEN.

## Task 4: Add the required Playground and public documentation

Files: `example/src/features/HeaderFeature.tsx`, related fixtures/registry, `README.md`, `docs/user/06-header.md`, `docs/ko/06-header.md`, `test/user-docs.test.ts`.

- Add a two-level Multi-column Sort sample with repeated values and visible model JSON.
- Document normal versus Shift interaction, priority order, Ref/model APIs, Tree behavior, and accessibility boundary.
- Add documentation assertions that prevent the feature or Playground example from disappearing.

## Task 5: Browser and performance acceptance

Files: `test/playwright/specs/header-basic.spec.ts`, `test/playwright/specs/header-quality.spec.ts`, and the focused performance spec selected from the existing virtualization suite.

- Verify flat and two-level child multi-sort, badge order, keyboard parity, JSON model output, and parent non-sortability.
- Verify Column drag completion still suppresses only its derived click.
- Exercise a 100,000-Row three-rule model while preserving bounded virtual DOM rendering.

## Task 6: Final gates and work record

Files: `reports/2026-07-23.md`.

Run in order:

1. Focused Vitest files changed by Tasks 1-4.
2. `npm run test:run -- test/user-docs.test.ts`.
3. Affected Header and performance Playwright specs with one worker.
4. `npm run verify`.
5. `npm run test:e2e -- --workers=1`.
6. `npm run test:perf -- --workers=1` once after all meaningful code/test-contract changes.

Record exact results, failure classification, cleanup, and residual risks. Do not claim completion if a required product or test-contract failure remains.
