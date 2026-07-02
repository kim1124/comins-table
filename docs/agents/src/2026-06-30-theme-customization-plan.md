# 2026-06-30 Theme Customization Implementation Plan

## Scope

- Add runtime Theme support for `@kmsf/data-table` without introducing a new dependency or a new `theme.preset` public prop.
- Keep the public API on existing `theme.className`, `theme.style`, `theme.density`, and `rowHeight`.
- Move table shell skin responsibilities into package root `styles.css`.
- Add a playground Theme route with Basic, Dark, Skyblue, Mint, Gray, and Orange samples.
- Document the rowHeight and virtualization contract.

## Supervisor Decisions

- Theme sample API remains class-based through `theme.className`.
- Theme does not include row height presets.
- `styles.css` expands from built-in component skin to table shell plus theme classes.
- 2026-06-30 follow-up: Theme sample selection uses a Select Box instead of a button list.
- 2026-06-30 follow-up: Sample classes were limited to `basic`, `dark`, `skyblue`, and `mint`.
- 2026-06-30 follow-up: Sample classes are expanded to `basic`, `dark`, `skyblue`, `mint`, `gray`, and `orange`.
- 2026-06-30 follow-up: Dark header uses a dark green header, Skyblue is based on `#87CEEB`, Mint is based on `#98FF98`, Gray is based on `#bcbcbc`, and Orange is added.
- 2026-06-30 follow-up: Header border, header split border, cell border, and row border are separate CSS custom properties.
- 2026-06-30 follow-up: Row striping uses actual row parity attributes, not CSS `nth-child`, so virtualized row reuse does not invert even/odd colors.
- ask gate clear.

## Requirement To Test Matrix

| Requirement | Expected RED | GREEN Evidence |
| --- | --- | --- |
| Package CSS exposes table shell and theme classes | `test/public-api-boundary.test.ts` fails because `--kmsf-data-table-accent`, theme classes, and shell selectors do not exist | `npm run test:run -- test/public-api-boundary.test.ts` passed |
| Theme page exposes 6 shipped themes through Select Box | `theme-playground.spec.ts` fails because Gray/Orange options are not present | `npm run test:e2e -- test/playwright/specs/theme-playground.spec.ts` passed |
| Theme row striping uses actual row parity | `theme-playground.spec.ts` fails because row parity attributes and even/odd colors do not exist | `npm run test:e2e -- test/playwright/specs/theme-playground.spec.ts` passed |
| Theme header/cell/row separators remain visually distinct | `theme-playground.spec.ts` fails because split/border colors are missing or indistinct | `npm run test:e2e -- test/playwright/specs/theme-playground.spec.ts` passed |
| Theme switch applies immediately without route remount | Theme Playwright spec fails if mount id changes or class/computed colors do not change | Theme Playwright spec passed |
| Theme switch does not grow rendered virtual rows | Theme Playwright spec fails if rendered row count changes after theme changes | Theme Playwright spec passed |
| Existing docs playground routes remain stable | docs/playground specs fail if route/nav/content contracts regress | Focused docs/playground e2e bundle passed |
| Theme route participates in package performance audit | `test:perf` fails if feature lifecycle/perf route labels drift or counters exceed limits | `npm run test:perf` passed |

## Implementation Notes

- `src/index.tsx` derives the currently rendered theme directly from props, so changing `theme` no longer triggers `createKmsfDataTableState`.
- Package `styles.css` defines table shell variables, sample theme classes, header/body/cell/selection/resize/drop marker styles, and component skin variables.
- Playground `ThemeFeature` sets both `rowHeight={32}` and CSS row/cell height tokens to keep visual and virtualized height contracts aligned.

## Verification

- `npm run test:run -- test/public-api-boundary.test.ts`: passed.
- `npm run test:e2e -- test/playwright/specs/theme-playground.spec.ts`: passed.
- Focused docs/playground Playwright bundle: passed, 28 passed.
- `npm run verify:full`: passed after sandbox webServer bind retry with elevated permissions, 71 passed / 1 skipped in Playwright.
- `npm run test:perf`: passed, 11 passed.
- 2026-06-30 follow-up `npm run test:run -- test/public-api-boundary.test.ts`: passed, 3 passed.
- 2026-06-30 follow-up `npm run test:e2e -- test/playwright/specs/theme-playground.spec.ts`: passed, 1 passed.
- 2026-06-30 follow-up `npm run verify:full`: passed, Vitest 81 passed, Playwright 71 passed / 1 skipped.
- 2026-06-30 follow-up RED `npm run test:run -- test/public-api-boundary.test.ts`: failed as expected because split/border variables were not exposed yet.
- 2026-06-30 follow-up RED `npm run test:e2e -- test/playwright/specs/theme-playground.spec.ts`: failed as expected because Gray/Orange were not exposed yet.
- 2026-06-30 follow-up `npm run test:run -- test/public-api-boundary.test.ts`: passed, 3 passed.
- 2026-06-30 follow-up `npm run test:e2e -- test/playwright/specs/theme-playground.spec.ts`: passed, 1 passed.
- 2026-06-30 follow-up `npm run test:e2e -- test/playwright/specs/selection-style.spec.ts`: passed, 2 passed.
- 2026-06-30 follow-up docs route E2E bundle: passed, 8 passed.
- 2026-06-30 follow-up `npm run verify`: passed, Vitest 81 passed and build passed.
- 2026-06-30 follow-up `npm run verify:full`: passed, Vitest 81 passed, Playwright 71 passed / 1 skipped.
- 2026-06-30 follow-up `npm run test:perf`: passed, 11 passed.

## Residual Risks

- `verify:full` still reports one existing skipped Playwright test: `playground releases devtools counters after physical scrollbar drag and return to basic`.
- Mobile visual verification remains intentionally deferred by prior supervisor direction.
