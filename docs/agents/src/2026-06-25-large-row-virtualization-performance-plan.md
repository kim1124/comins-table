# Large Row Virtualization Performance Implementation Plan

> 2026-06-25 update: current playground/docs/perf gate scale is superseded by `docs/agents/src/2026-06-25-immutable-data-100k-performance-plan.md`. The implementation architecture remains useful, but 1,000,000-row playground controls and tests are historical context for this step.

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development or superpowers:executing-plans to implement this plan task-by-task. Also use superpowers:test-driven-development and superpowers:systematic-debugging before production behavior changes. Steps use checkbox (`- [x]`) syntax for tracking.

**Goal:** Improve large row virtualized scrolling so wheel scroll and scrollbar large jumps stay responsive while DOM Nodes, Event Listeners, and JS Heap recover after GC.

**Architecture:** Keep the current `data` array public contract and exclude column virtualization. Replace delayed virtual scroll commits with `requestAnimationFrame` coalescing, then position the small rendered row block with a vertical `translateY` offset over a virtual sizer so rendered rows remain bounded to visible rows plus `buffer-size`.

**Tech Stack:** React, TypeScript, Playwright, Chrome DevTools Protocol metrics, Vitest, Vite playground.

---

## Confirmed Decisions

- `data` array input stays as the supported API for this task.
- Column virtualization is out of scope because current target UI does not expect 100+ columns.
- Implementation follows recommended B option: rAF scroll commit plus translated visible row block.
- Internal body DOM/rendering structure may change as long as `KmsfDataTable` public props, events, and external usage remain compatible.
- Chrome DevTools Performance Monitor criteria may be automated with Playwright CDP `Performance.getMetrics`.

## Repo Facts

- `src/index.tsx` already accepts `"buffer-size"` and defaults it to `25`.
- `rowWindow` currently calculates `startIndex` and `endIndex` with visible viewport rows plus the configured buffer.
- `handleBodyScroll` currently delays virtualized `setScrollTop` with a `120ms` timeout.
- Virtualized body currently uses sticky body table plus a separate `.kmsf-data-table__body-virtual-sizer`.
- The current virtualized table does not use the computed top spacer as a `translateY` row block offset.

## Ask Gate

- `ask gate clear`
- User-owned decisions are closed before writing this plan.

## Requirement To Test Matrix

| Requirement | RED Test | Expected RED Reason | GREEN Evidence |
| --- | --- | --- | --- |
| Large wheel and scrollbar jumps stay responsive | Playwright `@perf` test in `test/playwright/specs/virtualization.spec.ts` | Current virtualized scroll commits after 120ms timeout and can miss frame budget | average wheel frame duration <= 24ms, p95 <= 32ms, max <= 50ms |
| Rendered row count remains bounded by visible rows plus buffer | Playwright DOM count assertions | Current count may pass, but must be retained after translated row block change | rendered rows <= visible rows + top buffer + bottom buffer + 5 |
| DevTools Performance Monitor metrics recover after GC | Playwright CDP metrics test | Current tests do not check heap/nodes/listeners recovery | after repeated scroll and GC, Nodes/EventListeners return within 10%, JSHeap within 20% of post-load baseline |
| Large jump reaches target row without blank/stale rows | Playwright large bottom jump assertion | Current delayed commit can render stale row window during fast jumps | last rendered data index > 999900 after jump |
| Internal virtual body uses translated visible row block | Playwright layout assertion | Current body table is sticky and has no transform offset | virtualized body table has transform matrix with positive Y offset after scroll |
| Existing selection, component layout, resize, and header sync remain intact | Existing focused Playwright specs | DOM structure changes can break event and layout paths | existing component/header/cell specs pass |

## File Map

- Modify: `src/index.tsx`
  - Scroll scheduling
  - Row window offset fields
  - Virtualized table style
  - Body table/sizer structure
- Modify: `example/src/styles.css`
  - Virtual body table positioning
  - Virtual sizer containment
  - Remove sticky positioning from virtualized body table
- Modify: `test/playwright/specs/virtualization.spec.ts`
  - Add CDP Performance metrics helper
  - Tighten large-row scroll performance gate
  - Add translated row block assertion
- Verify existing: `test/playwright/specs/component-renderer.spec.ts`
- Verify existing: `test/playwright/specs/header-quality.spec.ts`
- Update: `reports/2026-06-25.md`

## Task 1: Add RED CDP And Scroll Performance Tests

**Files:**
- Modify: `test/playwright/specs/virtualization.spec.ts`

- [x] **Step 1: Add CDP metric helper**

Add these helpers below `collectBrowserDiagnostics`.

```ts
type CdpPerformanceMetrics = {
  JSHeapUsedSize: number;
  JSEventListeners: number;
  Nodes: number;
};

async function readPerformanceMetrics(page: Page): Promise<CdpPerformanceMetrics> {
  const session = await page.context().newCDPSession(page);

  await session.send("Performance.enable");
  const metrics = await session.send("Performance.getMetrics");
  await session.detach();

  const values = new Map(metrics.metrics.map((metric) => [metric.name, metric.value]));

  return {
    JSHeapUsedSize: values.get("JSHeapUsedSize") ?? 0,
    JSEventListeners: values.get("JSEventListeners") ?? 0,
    Nodes: values.get("Nodes") ?? 0,
  };
}

async function collectGarbage(page: Page) {
  const session = await page.context().newCDPSession(page);

  await session.send("HeapProfiler.enable");
  await session.send("HeapProfiler.collectGarbage");
  await session.detach();
}
```

- [x] **Step 2: Add browser-side frame duration helper**

Add this helper below the CDP helpers.

```ts
async function runVirtualScrollFrames(page: Page, frames = 30) {
  return page.getByTestId("data-table-viewport").evaluate(
    async (element, frameCount) => {
      const durations: number[] = [];

      for (let index = 0; index < frameCount; index += 1) {
        const startedAt = performance.now();

        element.scrollTop = Math.max(0, element.scrollTop - 2400);
        element.dispatchEvent(new Event("scroll", { bubbles: true }));

        await new Promise<void>((resolve) => {
          requestAnimationFrame(() => resolve());
        });

        durations.push(performance.now() - startedAt);
      }

      const sorted = [...durations].sort((left, right) => left - right);
      const p95Index = Math.min(sorted.length - 1, Math.ceil(sorted.length * 0.95) - 1);

      return {
        average: durations.reduce((sum, value) => sum + value, 0) / durations.length,
        max: Math.max(...durations),
        p95: sorted[p95Index] ?? 0,
      };
    },
    frames,
  );
}
```

- [x] **Step 3: Add RED test for translated block and CDP recovery**

Add this test after the existing `1000000 row virtualization smoke @perf` test.

```ts
test("playground keeps devtools metrics bounded during one million row virtual scroll @perf", async ({ page }) => {
  test.setTimeout(45_000);
  const diagnostics = collectBrowserDiagnostics(page);
  await page.goto("/");
  await page.getByRole("button", { name: "대용량 데이터 표시" }).click();
  await page.getByRole("button", { name: "100만 행 로드" }).click();

  const viewport = page.getByTestId("data-table-viewport");
  await expect.poll(() => viewport.evaluate((element) => element.scrollHeight)).toBeGreaterThan(1_000_000);

  await collectGarbage(page);
  const postLoad = await readPerformanceMetrics(page);

  await viewport.evaluate((element) => {
    element.scrollTop = element.scrollHeight;
    element.dispatchEvent(new Event("scroll", { bubbles: true }));
  });

  await expect
    .poll(() =>
      viewport.evaluate((element) => {
        const rows = Array.from(
          element.querySelectorAll<HTMLTableRowElement>(
            ".kmsf-data-table__body-table tbody tr[data-kmsf-row-data-index]",
          ),
        );
        const last = rows[rows.length - 1];

        return Number(last?.getAttribute("data-kmsf-row-data-index") ?? "-1");
      }),
    )
    .toBeGreaterThan(999_900);

  const frameDurations = await runVirtualScrollFrames(page, 30);

  await collectGarbage(page);
  const afterScroll = await readPerformanceMetrics(page);
  const rowMetrics = await viewport.evaluate((element) => {
    const rows = Array.from(
      element.querySelectorAll<HTMLTableRowElement>(".kmsf-data-table__body-table tbody tr[data-kmsf-row-data-index]"),
    );
    const bodyTable = element.querySelector<HTMLElement>(".kmsf-data-table__body-table");
    const transform = window.getComputedStyle(bodyTable as Element).transform;

    return {
      renderedRows: rows.length,
      transform,
    };
  });

  expect(rowMetrics.renderedRows).toBeLessThanOrEqual(80);
  expect(rowMetrics.transform).not.toBe("none");
  expect(frameDurations.average).toBeLessThanOrEqual(24);
  expect(frameDurations.p95).toBeLessThanOrEqual(32);
  expect(frameDurations.max).toBeLessThanOrEqual(50);
  expect(afterScroll.Nodes).toBeLessThanOrEqual(Math.ceil(postLoad.Nodes * 1.1));
  expect(afterScroll.JSEventListeners).toBeLessThanOrEqual(Math.ceil(postLoad.JSEventListeners * 1.1));
  expect(afterScroll.JSHeapUsedSize).toBeLessThanOrEqual(Math.ceil(postLoad.JSHeapUsedSize * 1.2));
  expect(diagnostics).toEqual([]);
});
```

- [x] **Step 4: Tighten existing follow-up scroll perf gate**

In `playground keeps follow-up scroll responsive after one million row jump @perf`, replace the final duration assertions.

```ts
expect(avgMs).toBeLessThanOrEqual(24);
expect(Math.max(...durations)).toBeLessThanOrEqual(50);
```

- [x] **Step 5: Verify RED**

Run:

```bash
../../node_modules/.bin/playwright test --config=playwright.config.ts test/playwright/specs/virtualization.spec.ts --grep "devtools metrics bounded|responsive after one million row jump"
```

Expected:
- `devtools metrics bounded` fails because the virtualized body table does not use a transform offset.
- The tightened responsiveness test fails or is flaky because the current virtualized path commits scroll state after a timeout.

## Task 2: Implement rAF-Coalesced Virtual Scroll Commit

**Files:**
- Modify: `src/index.tsx`
- Test: `test/playwright/specs/virtualization.spec.ts`

- [x] **Step 1: Add a small setter guard**

Add this helper near `handleBodyScroll`.

```ts
const commitPendingScrollTop = () => {
  setScrollTop((current) => {
    const next = pendingScrollTopRef.current;

    return Math.abs(current - next) > 0.5 ? next : current;
  });
};
```

- [x] **Step 2: Replace delayed virtual scroll commit with rAF coalescing**

Replace the vertical scheduling block in `handleBodyScroll` with this logic. Keep horizontal header/body scroll sync after this block.

```ts
if (scrollCommitTimeoutRef.current !== null) {
  window.clearTimeout(scrollCommitTimeoutRef.current);
  scrollCommitTimeoutRef.current = null;
}

if (scrollFrameRef.current === null) {
  scrollFrameRef.current = window.requestAnimationFrame(() => {
    scrollFrameRef.current = null;
    commitPendingScrollTop();
  });
}
```

- [x] **Step 3: Verify rAF scheduling does not regress basic smoke**

Run:

```bash
../../node_modules/.bin/playwright test --config=playwright.config.ts test/playwright/specs/virtualization.spec.ts --grep "100000 row virtualization smoke|1000000 row virtualization smoke"
```

Expected:
- Basic smoke tests pass.
- The translated block test still fails until Task 3.

## Task 3: Convert Virtualized Body To Translated Visible Row Block

**Files:**
- Modify: `src/index.tsx`
- Modify: `example/src/styles.css`
- Test: `test/playwright/specs/virtualization.spec.ts`

- [x] **Step 1: Rename row window offset to a render offset**

In `rowWindow`, replace `topSpacerHeight`/`bottomSpacerHeight` semantics for the virtualized path with an explicit `renderOffset`.

```ts
const renderOffset = scrollScale > 0 ? logicalTopSpacerHeight / scrollScale : logicalTopSpacerHeight;

return {
  entries: createVisibleRowEntries(sortedRowIndexes, state.rows, state.rowIds, startIndex, endIndex),
  renderOffset,
  scrollHeight: physicalTotalHeight,
};
```

For the non-virtualized return value, add `renderOffset: 0`.

- [x] **Step 2: Update derived height usage**

Replace references to `rowWindow.topSpacerHeight` and `rowWindow.bottomSpacerHeight` in `renderedRowsHeight`.

```ts
const renderedRowsHeight = rowWindow.entries.length * rowHeight;
const emptyFillerHeight = virtualized ? 0 : Math.max(0, containerHeight - renderedRowsHeight);
```

- [x] **Step 3: Apply transform to the virtualized body table**

Replace the body table style with a virtualized-aware style.

```tsx
style={
  virtualized
    ? {
        transform: `translate3d(0, ${rowWindow.renderOffset}px, 0)`,
        width: tableWidth,
      }
    : { width: tableWidth }
}
```

- [x] **Step 4: Keep the virtual sizer as the only scroll height source**

Keep the existing sizer after the table.

```tsx
{virtualized ? (
  <div
    aria-hidden="true"
    className="kmsf-data-table__body-virtual-sizer"
    style={{ height: rowWindow.scrollHeight, width: tableWidth }}
  />
) : null}
```

- [x] **Step 5: Change CSS from sticky table to absolute translated table**

Replace the virtualized body table CSS.

```css
.kmsf-data-table__body-virtual-sizer {
  contain: strict;
  pointer-events: none;
  position: relative;
}

.kmsf-data-table__body-table--virtualized {
  background: var(--kmsf-color-surface);
  contain: layout paint style;
  left: 0;
  position: absolute;
  top: 0;
  will-change: transform;
  z-index: 1;
}
```

- [x] **Step 6: Verify focused GREEN**

Run:

```bash
../../node_modules/.bin/playwright test --config=playwright.config.ts test/playwright/specs/virtualization.spec.ts --grep "devtools metrics bounded|responsive after one million row jump|1000000 row virtualization smoke"
```

Expected:
- The translated block assertion passes.
- Rendered row count remains bounded.
- Large jump reaches the bottom range.
- CDP metrics recover within thresholds after GC.

## Task 4: Regression Coverage For Existing Interaction Paths

**Files:**
- Verify: `test/playwright/specs/component-renderer.spec.ts`
- Verify: `test/playwright/specs/header-quality.spec.ts`
- Verify: `test/playwright/specs/cell-row-examples.spec.ts`

- [x] **Step 1: Run component renderer regression**

Run:

```bash
../../node_modules/.bin/playwright test --config=playwright.config.ts test/playwright/specs/component-renderer.spec.ts
```

Expected:
- Header/cell component alignment remains valid.
- Component column resize first move remains stable.
- Virtual-list component tests remain valid.

- [x] **Step 2: Run header and cell regression**

Run:

```bash
../../node_modules/.bin/playwright test --config=playwright.config.ts test/playwright/specs/header-quality.spec.ts test/playwright/specs/cell-row-examples.spec.ts
```

Expected:
- Header sync, resize, selection, cell/row examples remain valid.
- Console diagnostics remain empty.

## Task 5: Package Verification And Report

**Files:**
- Modify: `reports/2026-06-25.md`
- Check: `test-results`

- [x] **Step 1: Run package lint/build/unit baseline**

Run:

```bash
npm run verify
```

Expected:
- TypeScript, Vitest, and build pass.

- [x] **Step 2: Run package browser gate**

Run:

```bash
npm run verify:full
```

Expected:
- Baseline and Playwright pass.
- If the environment blocks browser/server binding, record exact blocker and rerun only with approved execution.

- [x] **Step 3: Check generated artifacts**

Run:

```bash
find test-results -maxdepth 3 -type f
```

Expected:
- No active artifacts remain in `test-results` after relevant failure evidence is copied to `reports/artifacts/`.

- [x] **Step 4: Run diff hygiene**

Run:

```bash
git diff --check -- src/index.tsx example/src/styles.css test/playwright/specs/virtualization.spec.ts reports/2026-06-25.md
```

Expected:
- No whitespace errors.

- [x] **Step 5: Update report**

Add:
- timestamp
- summary
- changed files
- commands actually run
- pass/fail result
- residual risks

## Residual Risks To Track

- The current `data` array contract means 100만 row array heap cost remains by design.
- If translated table rows break native table layout in a browser-specific path, a follow-up may need `display: grid` for virtualized `tbody` and `tr`.
- CDP metric thresholds can be noisy across machines; if RED is too strict due local harness variance, record measured values before adjusting thresholds.
- This plan intentionally excludes column virtualization.
- No git commit is part of this plan. Commit requires explicit supervisor approval.

## Self Review

- Spec coverage: data array retention, column virtualization exclusion, buffer-size approach, translated row block, CDP metrics, GC recovery, wheel/drag large jump, browser diagnostics are covered.
- Placeholder scan: no placeholder markers or undefined future task remains.
- Type consistency: helper names and metric property names are defined before use.
