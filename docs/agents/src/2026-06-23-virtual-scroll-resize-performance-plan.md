# Virtual Scroll And Resize Performance Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:test-driven-development and superpowers:systematic-debugging. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix large-range virtualized body scroll stutter and first-move column resize jump in `@kmsf/data-table`.

**Architecture:** Coalesce high-frequency vertical scroll updates through `requestAnimationFrame` while keeping horizontal header/body scroll sync immediate. For column resize, snapshot all visible column widths at drag start and apply the snapshot before changing the target column so table-fixed redistribution cannot create a first-move jump.

**Tech Stack:** React, TypeScript, Playwright, Vitest, Vite playground.

---

## Confirmed Facts

- `KmsfDataTable` currently calls `setScrollTop(bodyViewport.scrollTop)` on every body scroll event.
- The virtualized body maps physical scroll to logical row position and renders top/bottom spacer rows in `<tbody>`.
- A 1,000,000 row bottom jump diagnostic against the running playground did not complete within 30 seconds in Playwright, reproducing the severe stutter path.
- Component column resize starts from measured rendered `th` width but writes only the target column width to column state. In the component example, a `-2px` first move changed the column width from about `342px` to about `403px`.
- Supervisor decisions are closed:
  - Virtualized body internal DOM/rendering strategy changes are allowed.
  - Resize may freeze all visible column widths at drag start if it prevents visual jump.
  - Performance gate starts with 1,000,000 row bottom jump plus 10 follow-up scrolls; target is average near 16ms and max under 50ms, with tolerance adjusted only if local harness variance requires it.

## Ask Gate

- `ask gate clear`
- No unresolved product, UX, public API, data, auth, migration, operation, or verification decision remains before implementation.

## Requirement To Test Matrix

| Requirement | RED Test | Expected RED Reason | GREEN Evidence |
| --- | --- | --- | --- |
| Large jump scroll remains responsive | `test/playwright/specs/virtualization.spec.ts` perf test for 1,000,000 row bottom jump then 10 small scrolls | Current synchronous state/layout path can stall after bottom jump | bounded rendered rows, last row reachable, average/max follow-up scroll duration within gate |
| Body virtualization does not over-render | Existing and new DOM count assertions in `virtualization.spec.ts` | Existing test covers count but not post-jump frame health | rendered body rows remain below threshold |
| Resize first move does not jump | `test/playwright/specs/component-renderer.spec.ts` component column resize assertion | Current table-fixed redistribution changes width by tens of pixels on a tiny first move | first `-2px` or `+2px` move changes width within small tolerance |
| Column layout callback remains valid | Existing header layout Playwright tests | Freezing all widths may emit additional column widths | layout still serializes and restore works |

## Task 1: Add RED Tests

**Files:**
- Modify: `test/playwright/specs/virtualization.spec.ts`
- Modify: `test/playwright/specs/component-renderer.spec.ts`

- [ ] **Step 1: Add virtualized large-jump responsiveness RED**

Add a focused `@perf` test that bottom-jumps the 1,000,000 row table, performs 10 follow-up scroll updates, and asserts:
- last rendered index remains above `999_900`
- rendered rows stay below `100`
- average follow-up duration is below `25ms`
- max follow-up duration is below `50ms`
- diagnostics are empty

- [ ] **Step 2: Add component column resize RED**

Add a component-column-specific test that drags `resize-button-component` by `-2px` and asserts the target header width changes by roughly `-2px`, with an `8px` tolerance.

- [ ] **Step 3: Verify RED**

Run:

```bash
../../node_modules/.bin/playwright test --config=playwright.config.ts test/playwright/specs/virtualization.spec.ts test/playwright/specs/component-renderer.spec.ts --grep "responsive after one million row jump|first-move width jump"
```

Expected:
- The virtualized scroll test fails or times out because the current path stalls after a bottom jump.
- The resize test fails because a tiny first move produces a large width delta.

## Task 2: Fix Virtualized Body Scroll Scheduling

**Files:**
- Modify: `src/index.tsx`
- Test: `test/playwright/specs/virtualization.spec.ts`

- [ ] **Step 1: Implement rAF-coalesced scroll state**

Add refs near `scrollTop` state:

```ts
const scrollFrameRef = useRef<number | null>(null);
const pendingScrollTopRef = useRef(0);
```

Update `handleBodyScroll` so vertical scroll state is coalesced with `requestAnimationFrame`. Keep horizontal header/body sync synchronous.

- [ ] **Step 2: Cleanup scheduled frame**

Add an unmount cleanup effect that cancels a pending animation frame.

- [ ] **Step 3: Verify focused GREEN**

Run:

```bash
../../node_modules/.bin/playwright test --config=playwright.config.ts test/playwright/specs/virtualization.spec.ts --grep "responsive after one million row jump|1000000 row virtualization smoke"
```

Expected: pass.

## Task 3: Fix First-Move Resize Jump

**Files:**
- Modify: `src/index.tsx`
- Test: `test/playwright/specs/component-renderer.spec.ts`
- Verify existing: `test/playwright/specs/header-quality.spec.ts`

- [ ] **Step 1: Snapshot all visible widths at resize start**

In the resize `onPointerDown`, compute current visible widths from DOM/header state before registering pointer move. Use measured header cell widths when available, otherwise fall back to current column state, column definition width, or `160`.

- [ ] **Step 2: Freeze snapshot on pointer move**

When handling pointer move, update state by first applying snapshot widths for all visible columns, then applying the target column width based on `startWidth + moveEvent.clientX - startX`.

- [ ] **Step 3: Verify focused GREEN**

Run:

```bash
../../node_modules/.bin/playwright test --config=playwright.config.ts test/playwright/specs/component-renderer.spec.ts test/playwright/specs/header-quality.spec.ts --grep "first-move width jump|resize handle"
```

Expected: pass.

## Task 4: Baseline Verification And Report

**Files:**
- Modify: `reports/2026-06-23.md`
- Check: `test-results`

- [ ] **Step 1: Run baseline**

Run:

```bash
npm run verify
```

Expected: pass.

- [ ] **Step 2: Run package browser gate if focused gates pass**

Run:

```bash
npm run verify:full
```

Expected: pass. If sandbox blocks `127.0.0.1:4002`, rerun with approved external execution and record the blocker/retry.

- [ ] **Step 3: Clean generated artifacts**

Run:

```bash
find test-results -maxdepth 3 -type f
```

Remove generated `.last-run.json` or error contexts after recording relevant failures.

- [ ] **Step 4: Update report**

Add timestamp, summary, changed files, commands actually run, pass/fail result, and residual risks.

## Residual Risks To Track

- The rAF scheduler should improve scroll stutter but may not fully solve table layout cost if `<tbody>` spacer rows still force expensive layout at extreme heights.
- Freezing visible widths may make `onChangeColumnLayout` include explicit widths for columns that were previously flexible.
- Playwright host timing can be noisy; browser-side `performance.now()` duration is the preferred gate.
- Historical dirty files outside this package remain unrelated and must not be reverted.
