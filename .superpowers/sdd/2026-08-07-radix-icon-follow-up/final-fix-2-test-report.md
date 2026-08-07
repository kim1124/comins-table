# Final Fix 2: Row Expand height documentation contract test reinforcement

## Scope

- Important #2 follow-up: strengthen only `test/user-docs.test.ts` for the already-correct public Row Expand height guidance.
- No production documentation, runtime/public API, dependency, `output/`, or remote state changed.

## Added contract coverage

- `README.md`: a finite positive CSS pixel height is fixed with inline height; missing, invalid, and `"auto"` values are measured automatic Details without inline height; valid finite positive `estimatedRowDetailHeight` wins before matching-width measurement, with resolved `rowHeight` as fallback.
- `example/src/docs/dataTableOptionGuide.ts`: direct checks of the two public option descriptions cover fixed vs. measured automatic behavior, missing/invalid/`"auto"`, no inline height, valid estimate priority, and resolved `rowHeight` fallback.
- `example/src/docs/docsRoutes.tsx` English Row Expand route: check the extracted public route body for fixed behavior, missing/invalid/`"auto"` measured behavior without inline height, estimate priority, and fallback.
- `example/src/docs/docsRoutes.tsx` Korean Row Expand route: check the extracted public route object for the corresponding Korean contract.
- Every surface is separately checked for absence of the deprecated `300px` default/estimate.

## RED/GREEN evidence

- RED (README and option guide): intentionally required an automatic Detail to retain inline height; `npm run test:run -- test/user-docs.test.ts` failed in the README test. The same initial run also exposed the option guide source's literal `\\"auto\\"` representation, which the final assertion now verifies exactly.
- GREEN: after restoring the exact README and option-guide contract strings, the focused test passed 22/22.
- RED (English route): intentionally required `"auto"` Details to retain inline height; the English Playground route test failed with the extracted route body showing `without an inline height`.
- GREEN: restoring the real English route wording returned the focused test to 22/22.
- RED (Korean route): intentionally required `auto` Details to retain inline height; the Korean Playground route test failed with the extracted route object showing `inline height 없이 자동 측정합니다`.
- GREEN: restoring the real Korean route wording returned the focused test to 22/22.

## Final verification

- `npm run test:run -- test/user-docs.test.ts` — passed, 1 file / 22 tests.
- `git diff --check` — passed.

## Local commit

- `test: reinforce Row Expand height documentation contract` (this change set; see local Git history for the immutable commit ID).

## Preserved item

- Existing untracked `output/` remains untouched and unstaged.
