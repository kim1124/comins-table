# Final Fix 6: capped-height concurrent Detail snapshot regression test

## Scope

- Added one test only in `test/table-interaction.test.tsx`.
- The test covers a virtualized Row Expand table whose logical height is `1,800,300px` (50,000 Rows at `36px` plus a `300px` automatic Detail) while physical scroll height remains capped at `1,500,000px`.
- No runtime, public API, dependency, `output/`, or remote state changed.

## Contract under test

- The committed projection and `contentWidth` remain fixed while a concurrent candidate suspends.
- Only the candidate viewport height changes from `432px` to `50,000px`.
- An existing automatic Detail `ResizeObserver` measurement changes `300px` to `420px` and therefore triggers the real Detail anchor path.
- The physical `scrollTop` remains the committed-viewport result (`749,950`, one-decimal tolerance), and the virtual sizer remains capped at `1,500,000px`.

## RED/GREEN evidence

- RED (test expectation): the intentionally leaked-candidate expectation `749,948.58` failed against the committed result `749,949.9996666643` (difference `1.4196666643px`).
- GREEN (current source): restoring the committed-viewport expectation `749,950` passed the focused test.
- RED (candidate viewport leak mutation): temporarily assigning `committedDetailObserverSnapshotRef.current = detailObserverSnapshotCandidate` during render made the suspended candidate overwrite the committed snapshot. The focused test then received `745,746.5695615395` rather than `749,950` and failed.
- GREEN (source restored): removing that temporary assignment restored the focused test. `src/index.tsx` has no final diff.

## Verification

- `npm run test:run -- test/table-interaction.test.tsx -t "keeps capped Detail anchors"` — passed, 1 selected test.
- `npm run test:run -- test/virtual-layout.test.ts test/table-interaction.test.tsx` — passed, 112 tests.
- `npx playwright test --config=playwright.config.ts test/playwright/specs/memory-leak-full-audit.spec.ts --grep "full audit releases Row Expand Detail observers" --workers=1` — passed, 1 Row Expand perf test.
- `npm run verify` — passed: hygiene, security 17, licenses 27, TypeScript, Vitest 275, and build.
- `git diff --check` — passed before commit.

## Local commit

- `test: cover capped concurrent Detail viewport snapshot` (this change set; see local Git history for the immutable commit ID).

## Preserved item

- Existing untracked `output/` remains untouched and unstaged.
