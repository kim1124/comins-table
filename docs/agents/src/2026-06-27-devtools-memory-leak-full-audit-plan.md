# Chrome DevTools Memory Leak Full Audit Plan

> 2026-06-27 supervisor decision: the goal is memory leak removal, not explaining away DevTools number differences. Chrome DevTools Performance Monitor numbers after GC are the acceptance signal.

> **For agentic workers:** REQUIRED PROCESS: use systematic debugging before proposing another fix, use TDD before production behavior changes, and keep each leak hypothesis tied to a measurement. Do not mark a checkbox without command output or browser evidence.

**Goal:** Find and fix repeated data-table virtual scrolling retention so JS heap, DOM Nodes, and event listeners recover after large data table use and returning to the basic example page.

**Acceptance:** After forced GC, the final basic-page snapshot must be within 10% of the warmed basic-page snapshot for all three Chrome DevTools Performance Monitor targets: JS heap, DOM Nodes, and JS event listeners.

**Hard Rule:** If any metric cannot meet the 10% gate, report the exact metric, retained object / DOM / listener evidence, and why the retention is expected or currently unavoidable. Do not relax the threshold without supervisor confirmation.

---

## Confirmed Decisions

- Use Chrome DevTools Performance Monitor numbers as the final acceptance signal.
- Use Playwright CDP metrics only as automation and supporting evidence.
- Compare all data-table package code paths that can mount table UI, component renderers, playground examples, event handlers, timers, observers, portals, or data fixtures.
- Review all package-owned code, including `src`, `example/src`, `test`, runtime CSS, and package-local browser/build config.
- Do not limit the investigation to reproduction differences between DevTools and automation.
- Do not add a grid wrapper or new dependency to solve the leak.

## Repo-Verified Scope

### Runtime Source

- `src/clipboard.ts`
- `src/component-renderer.tsx`
- `src/core.ts`
- `src/index.tsx`
- `src/selection.ts`

### Playground And Examples

- `example/index.html`
- `example/src/components/**/*.tsx`
- `example/src/features/**/*.tsx`
- `example/src/fixtures/**/*.ts`
- `example/src/fixtures/**/*.tsx`
- `example/src/main.tsx`
- `example/src/styles.css`

### Tests And Verification Harness

- `test/**/*.test.ts`
- `test/**/*.test.tsx`
- `test/playwright/specs/**/*.spec.ts`
- `playwright.config.ts`
- `vite.example.config.ts`
- `vite.config.ts`
- `tsconfig*.json`
- `package.json`

### Exclusions

- `dist/` generated output is excluded from manual source audit.
- Font binaries under `example/public/fonts/` are excluded from source audit.

## Measurement Contract

Every browser memory snapshot must record:

- Scenario name
- Step name
- Absolute timestamp
- Whether forced GC was run
- JS heap
- DOM Nodes
- JS event listeners
- Documents
- Rendered table row count
- Live DOM element count
- Browser diagnostics

Primary comparison formula:

```text
afterBasicMetric <= ceil(warmedBasicMetric * 1.10)
```

If the warmed baseline value is small enough that 10% rounds to zero practical tolerance, use `ceil(warmed * 1.10)` and report the raw values rather than adding an implicit buffer.

The automated gate must warm the feature shell before taking the baseline by visiting package feature pages once without heavy scenario actions such as loading 100,000 rows. This excludes one-time React/Vite route and event-system initialization from the leak calculation while preserving the 10% threshold for repeated retention.

## Scenario Matrix

| Scenario | Required Path | 10% Gate |
| --- | --- | --- |
| Basic baseline | Open basic example, force GC, snapshot | Baseline only |
| 100,000 row virtual scroll | Basic baseline -> large data -> 100,000 rows -> wheel -> scrollbar down/up -> basic -> force GC | Required |
| Physical scrollbar drag | Same path with headed Chrome native scrollbar thumb drag | Required in headed Chrome |
| Component columns | Component example -> selection -> input/select/menu/virtual-list interactions -> basic -> force GC | Required |
| Context menu | Context menu example -> open row and cell menus repeatedly -> close -> basic -> force GC | Required |
| Header interactions | Header example -> resize/reorder/sort interactions -> basic -> force GC | Required |
| Row interactions | Row example -> drag/reorder/selection interactions -> basic -> force GC | Required |
| Cell interactions | Cell example -> cell selection/range/copy-paste interactions -> basic -> force GC | Required |
| Table size/layout | Size example -> resize modes and scroll interactions -> basic -> force GC | Required |
| Feature lifecycle soak | Repeatedly switch through every feature page and return to basic -> force GC | Required |

## Static Audit Checklist

- [ ] `addEventListener` / `removeEventListener` pairs across all source and example code.
- [ ] `setTimeout`, `setInterval`, `requestAnimationFrame`, and cleanup on unmount.
- [ ] `ResizeObserver`, `MutationObserver`, and observer disconnect paths.
- [ ] React portals and document/window listeners in component renderer popovers.
- [ ] Virtualized row keying, cell/component keying, and mount/unmount behavior.
- [ ] Feature page remount keying and inactive example disposal.
- [ ] Large fixture generation and closures that may retain 100,000 row arrays after navigation.
- [ ] Context menu, component renderer, selection drag, header drag, row drag, and scroll listener lifecycles.
- [ ] Tests that create globals on `window` and whether they can affect repeated browser runs.

## Implementation Plan

### Task 1: Establish A 10% DevTools Memory Harness

- Add or extend Playwright helpers in `test/playwright/specs/virtualization.spec.ts` or a package-local helper module.
- Warm the feature shell, then collect forced-GC snapshots before and after each scenario.
- Fail the test when JS heap, DOM Nodes, or event listeners exceed 10% after returning to basic.
- Keep headed physical scrollbar drag as a headed-only check, and keep headless CDP checks for automation.

Expected RED:

- At least one expanded scenario may exceed the 10% gate or expose a missing cleanup path.
- If no scenario fails, report the exact values and continue with static audit before declaring closure.

### Task 2: Run Full Static Lifecycle Audit

- Search all package-owned source for manual listeners, timers, observers, portals, globals, and table keying.
- Classify each finding as `safe`, `needs test`, or `needs fix`.
- Do not change production code until the finding is tied to a failing test or a direct lifecycle proof.

Expected output:

- A source-by-source audit table in `reports/2026-06-27.md` or a follow-up report.
- Clear statement for any code path that cannot affect DOM Node/listener retention.

### Task 3: Fix Confirmed Retention Paths One At A Time

- For each confirmed leak, write or tighten the failing browser test first.
- Apply the smallest production code change.
- Re-run the focused test and then the full package gate.
- Do not mix unrelated cleanup into the leak fix.

Expected GREEN:

- The failing scenario passes the 10% gate.
- Existing `npm run test:perf`, `npm run verify`, and `npm run verify:full` pass.

### Task 4: Final Chrome DevTools Performance Monitor Review

- Run the supervisor path in a real headed Chrome flow.
- Record warmed basic, 100,000-row load, down scroll, up scroll, and final basic snapshots after GC.
- Compare all final basic metrics against the 10% gate.
- If the gate fails, attach exact retained metric evidence and continue investigation.

## Required Verification Commands

```bash
npm run test:perf
npm run verify
npm run verify:full
git diff --check
```

For headed physical scrollbar verification:

```bash
../../node_modules/.bin/playwright test --config=playwright.config.ts test/playwright/specs/virtualization.spec.ts --grep "physical scrollbar drag" --headed
```

## Completion Criteria

- All scenario matrix rows either pass the 10% gate or have a documented blocker with retained evidence.
- Full static audit covers every package-owned code path listed in this plan.
- Required verification commands pass, or failures are reported as blockers.
- `reports/YYYY-MM-DD.md` includes timestamp, changed files, commands, pass/fail status, exact metric values, and residual risks.
