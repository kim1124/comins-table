# 2026-06-25 Immutable Data Contract and 100k Performance Gate Plan

## Status

- Supervisor approved the recommended direction after the 1,000,000 row heap analysis.
- `ask-plan` gate is closed.
- This plan supersedes the previous 1,000,000 row playground/perf gate for the current implementation step.

## Decisions

- Large-row playground, docs, and Playwright perf gates use 100,000 rows.
- The current `data` array prop contract remains. A lazy/viewport datasource is deferred.
- `data` is treated as immutable input. Consumers update by replacing the array reference.
- The table must not `Object.freeze` user data.
- The table must not clone the full incoming `data` array during state initialization or replace.
- In-place mutation of the same `data` array reference is unsupported and must not be documented as reactive.
- Lazy/index `rowIds` mode is excluded from this step.

## Requirement-to-Test Matrix

| Requirement | RED Test | Expected RED Reason | GREEN Evidence |
| --- | --- | --- | --- |
| Initial state keeps the incoming data array reference | `../../node_modules/.bin/vitest run test/basic-core.test.ts` | `createKmsfDataTableState` uses `cloneRows(rows)` | Vitest passes after clone removal |
| Replace state keeps the incoming replacement array reference | `../../node_modules/.bin/vitest run test/basic-core.test.ts` | `replaceKmsfRows` uses `cloneRows(rows)` | Vitest passes after clone removal |
| Row update does not mutate the original input array | `../../node_modules/.bin/vitest run test/basic-core.test.ts` | Existing immutable update path should pass; protects contract | Vitest passes |
| Playground exposes 100,000 row large-data control only | `../../node_modules/.bin/playwright test --config=playwright.config.ts test/playwright/specs/playground-layout-polish.spec.ts --grep "large data remains virtualized"` | `100만 행 로드` still exists and test expects removal | Playwright passes after example update |
| Large-row perf/browser gates run against 100,000 rows only | `npm run test:perf` | 1,000,000 row tests/buttons remain | Perf tests pass with 100,000 row labels and thresholds |

## Implementation Steps

1. Add RED Vitest assertions for immutable input reference and update immutability.
2. Update Playwright specs to use `10만 행 로드` and 100,000-row thresholds.
3. Remove full-array clone paths from `src/core.ts`.
4. Update the playground large-data example to remove the `100만 행 로드` button.
5. Update user docs and active agent plan docs to record the 100,000-row gate.
6. Run focused Vitest, focused Playwright, `npm run test:perf`, `npm run lint`, and package verification as time permits.

## Residual Risks

- 100,000 rows still require a full `data` array in browser memory by contract.
- True visible-only resource usage requires a future lazy/viewport datasource design.
- `rowIds` are still eagerly derived in this step, so row-id memory remains O(N).
