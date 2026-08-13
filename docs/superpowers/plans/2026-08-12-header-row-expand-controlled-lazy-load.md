# Header Move, Row Expand, and Controlled Lazy Load Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Deliver explicit Header move controls and feedback, correctly contained Row Detail scrolling, and application-owned controlled Lazy Load data.

**Architecture:** Enforce move locks in `src/core.ts`, keep pointer and FLIP animation orchestration in `src/index.tsx`, and use module-scoped CSS for visual state. Lazy Load only emits requests while the Playground consumer owns fetch results and loading state.

**Tech Stack:** React 19, TypeScript, Vitest/jsdom, Playwright Chromium, Vite, Radix Icons, CSS.

## Global Constraints

- Preserve the current whole-header drag gesture and public `isRowExpandable` API.
- Keep Radix Icons within the approved license inventory; do not add a dependency.
- Use a 24px control slot and 15px internal icon.
- Do not read, alter, delete, or stage the user-owned `output/` directory.
- Do not commit, push, publish, or create a PR without separate approval.

---

### Task 1: Header move contract

**Files:**
- Modify: `src/core.ts`
- Modify: `src/index.tsx`
- Modify: `styles.css`
- Test: `test/basic-core.test.ts`
- Test: `test/table-interaction.test.tsx`
- Test: `test/playwright/specs/header-quality.spec.ts`

**Interfaces:**
- Produces: `CominsTableColumn.lockPosition?: boolean`, `CominsTableColumnGroup.lockPosition?: boolean`, `CominsTableProps.showColumnMoveHandle?: boolean`.
- Preserves: `moveCominsColumn(state, columnId, targetIndex)` and `moveCominsColumnGroup(state, groupId, targetIndex)` signatures.

- [x] **Step 1: Write failing lock and Header-handle tests**

```ts
expect(moveCominsColumn(state, "locked", 2)).toBe(state);
expect(moveCominsColumn(state, "movable", 0)).toBe(state);
expect(screen.getByTestId("column-move-handle-name")).toBeInTheDocument();
```

- [x] **Step 2: Run RED checks**

Run: `npm run test:run -- test/basic-core.test.ts test/table-interaction.test.tsx`

Expected: FAIL because lock metadata and Header handles are not implemented.

- [x] **Step 3: Implement core lock validation and Header controls**

```ts
lockPosition?: boolean;
showColumnMoveHandle?: boolean;
```

Reject moves that change any locked leaf/group anchor. Render handles only for movable definitions; the handle calls the existing pointer controller with immediate activation while the `<th>` retains intent-threshold behavior.

- [x] **Step 4: Add failing visual E2E assertions, then implement CSS and FLIP animation**

```ts
await expect(validTarget).toHaveCSS("border-color", "rgb(37, 99, 235)");
await expect(invalidTarget).toHaveCSS("border-color", "rgb(220, 38, 38)");
```

Use low-alpha backgrounds instead of element opacity. Capture cell rectangles before commit, apply individual `translate`, animate to zero, and bypass animation for reduced motion.

- [x] **Step 5: Run GREEN checks**

Run: `npm run test:run -- test/basic-core.test.ts test/table-interaction.test.tsx`

Run: `npm run test:e2e -- test/playwright/specs/header-quality.spec.ts --workers=1`

Expected: all selected tests pass.

### Task 2: Row Expand containment and disclosure motion

**Files:**
- Modify: `src/table-icons.tsx`
- Modify: `styles.css`
- Modify: `example/src/features/RowExpandFeature.tsx`
- Modify: `example/src/styles.css`
- Modify: `THIRD_PARTY_NOTICES.md`
- Modify: `test/license-gates.node.mjs`
- Test: `test/table-interaction.test.tsx`
- Test: `test/tree-table.test.tsx`
- Test: `test/playwright/specs/row-expand.spec.ts`

**Interfaces:**
- Preserves: `isRowExpandable`, `expandedRowIds`, and Row Detail height APIs.
- Produces: one stable `disclosureCollapsed`/`disclosureExpanded` right-chevron visual with CSS state rotation.

- [x] **Step 1: Write failing layout and rotation assertions**

```ts
await expect(detailTable.locator(".comins-table__body")).toHaveJSProperty("scrollHeight", expect.any(Number));
expect(expander.querySelector("svg[data-comins-icon='disclosureExpanded']")).not.toBeNull();
```

- [x] **Step 2: Run RED checks**

Run: `npm run test:run -- test/table-interaction.test.tsx test/tree-table.test.tsx`

Run: `npm run test:e2e -- test/playwright/specs/row-expand.spec.ts --workers=1`

Expected: FAIL on missing contained scroll/rotation and the still-present non-expandable card.

- [x] **Step 3: Implement sample containment, card removal, and CSS rotation**

```css
.comins-row-detail-expander[aria-expanded="true"] .comins-table-icon {
  transform: rotate(90deg);
}
```

Keep the card height fixed, make its inner Table flex child shrink with `min-height: 0`, and let the Table body own vertical overflow.

- [x] **Step 4: Update the exact Radix inventory and run GREEN checks**

Run: `npm run test:licenses`

Run: `npm run test:e2e -- test/playwright/specs/row-expand.spec.ts --workers=1`

Expected: all selected checks pass and no new asset/dependency appears.

### Task 3: Controlled Lazy Load

**Files:**
- Modify: `src/index.tsx`
- Modify: `example/src/features/LazyLoadFeature.tsx`
- Modify: `example/src/features/LoadingStateFeature.tsx`
- Modify: `example/src/features/featureRegistry.tsx`
- Modify: `example/src/docs/dataTableOptionGuide.ts`
- Modify: `example/src/docs/codeSamples.ts`
- Modify: `example/src/docs/docsRoutes.tsx`
- Modify: `docs/user/16-lazy-load.md`
- Modify: `docs/ko/16-lazy-load.md`
- Modify: `docs/user/15-infinite-scroll.md`
- Modify: `docs/ko/15-infinite-scroll.md`
- Test: `test/table-interaction.test.tsx`
- Test: `test/public-api.test.tsx`
- Test: `test/tree-table.test.tsx`
- Test: `test/user-docs.test.ts`
- Test: `test/playwright/specs/lazy-load.spec.ts`

**Interfaces:**
- Produces: `onLazyLoad?: (request: CominsLazyLoadRequest) => void | Promise<void>`.
- Consumes: controlled `data`, `loading`, `loadingMore`, and `hasMoreRows`.

- [x] **Step 1: Write failing controlled-data unit tests**

```tsx
const { rerender } = render(<CominsTable data={[]} lazyLoad onLazyLoad={loadRows} />);
await waitFor(() => expect(loadRows).toHaveBeenCalledWith(expect.objectContaining({ offset: 0 })));
expect(screen.queryAllByRole("row")).toHaveLength(1);
rerender(<CominsTable data={remoteRows} lazyLoad onLazyLoad={loadRows} />);
```

- [x] **Step 2: Run RED checks**

Run: `npm run test:run -- test/table-interaction.test.tsx test/public-api.test.tsx test/tree-table.test.tsx`

Expected: FAIL because callback results still populate internal rows.

- [x] **Step 3: Remove internal result storage and gate controlled requests**

```ts
onLazyLoad?: (request: CominsLazyLoadRequest) => void | Promise<void>;
const offset = reason === "scroll" ? data.length : 0;
```

Await callback completion only for request de-duplication/cancellation. Use `hasMoreRows`, `loading`, and `loadingMore` to stop redundant scroll calls.

- [x] **Step 4: Rewrite the fetch example and refresh behavior**

```ts
setRows([]);
await loadRows({ offset: 0, limit: BATCH_SIZE, reason: "refresh", signal });
```

The consumer ignores stale responses, replaces rows for initial/refresh, appends for scroll, and computes `hasMoreRows` from `rows.length < total`.

- [x] **Step 5: Update English/Korean docs and run GREEN checks**

Run: `npm run test:run -- test/table-interaction.test.tsx test/public-api.test.tsx test/tree-table.test.tsx test/user-docs.test.ts`

Run: `npm run test:e2e -- test/playwright/specs/lazy-load.spec.ts --workers=1`

Expected: all selected tests pass.

### Task 4: Integrated verification and evidence

**Files:**
- Modify: `reports/2026-08-12.md`
- Preserve: `output/`

**Interfaces:**
- Consumes: all completed behavior and documentation from Tasks 1-3.
- Produces: validation evidence and final Playground screenshots outside the user-owned `output/` tree.

- [x] **Step 1: Run integrated browser checks**

Run: `npm run test:e2e -- test/playwright/specs/header-quality.spec.ts test/playwright/specs/row-expand.spec.ts test/playwright/specs/lazy-load.spec.ts --workers=1`

- [x] **Step 2: Run repository gates**

Run: `npm run verify`

Run: `git diff --check`

Expected: all required gates pass with no whitespace errors.

- [x] **Step 3: Capture final Playground evidence**

Use the live Vite Playground at `http://127.0.0.1:4002` and capture Header Move, Row Expand, and Lazy Load at a Galaxy-compatible viewport. Store captures under the Codex visualization directory, not `output/`.

- [x] **Step 4: Update the work report**

Record changed files, exact commands, pass/fail counts, omitted checks, and residual risks in `reports/2026-08-12.md`.

### Task 5: Thick sorted-state icons and license inventory

**Files:**
- Modify: `src/table-icons.tsx`
- Modify: `THIRD_PARTY_NOTICES.md`
- Modify: `scripts/check-licenses.mjs`
- Test: `test/table-icons.test.tsx`
- Test: `test/license-gates.node.mjs`

**Interfaces:**
- Preserves: `CominsTableIconName` and the 15px icon box.
- Produces: `sortAscending` mapped to `ThickArrowUpIcon` and `sortDescending` mapped to `ThickArrowDownIcon`.

- [x] **Step 1: Change icon and inventory assertions to the approved thick exports**
- [x] **Step 2: Run the icon and license tests and confirm they fail against the thin exports**
- [x] **Step 3: Replace only the two Radix mappings and exact notice/checker inventory entries**
- [x] **Step 4: Re-run the icon and license tests and confirm they pass**

### Task 6: Stable measured automatic Detail scrolling

**Files:**
- Modify: `src/virtual-layout.ts`
- Modify: `styles.css`
- Test: `test/virtual-layout.test.ts`
- Test: `test/playwright/specs/row-expand.spec.ts`

**Interfaces:**
- Preserves: `rowHeight`, automatic Detail measurement, and mixed virtual Slot APIs.
- Produces: rendered owner Rows whose geometry matches virtual Row height and a stable body `scrollHeight` after Detail growth.

- [x] **Step 1: Add an E2E assertion that records settled `scrollHeight`, scrolls repeatedly, and rejects any growth beyond one pixel**
- [x] **Step 2: Run the focused E2E and confirm the current transformed-table feedback loop fails**
- [x] **Step 3: Bound body-cell vertical padding by the existing aligned CSS Row token and clamp the physical mixed-range input without coupling `rowHeight` to styling tokens**
- [x] **Step 4: Re-run the focused E2E and confirm stable scroll extent and reachable bottom content**

### Task 7: Single-expansion Playground policy and read-only card removal

**Files:**
- Modify: `example/src/features/RowExpandFeature.tsx`
- Modify: `docs/user/19-row-expand.md`
- Modify: `docs/ko/19-row-expand.md`
- Test: `test/playwright/specs/row-expand.spec.ts`
- Test: `test/user-docs.test.ts`

**Interfaces:**
- Preserves: library-level multiple `expandedRowIds` and read-only callback omission semantics.
- Produces: one-open-at-a-time behavior within each Playground sample and no dedicated read-only card.

- [x] **Step 1: Add failing E2E and documentation assertions for single expansion and removed card**
- [x] **Step 2: Normalize each sample callback to the final next ID and remove the read-only card**
- [x] **Step 3: Add a controlled single-expansion recipe and remove stale Playground inventory wording in both languages**
- [x] **Step 4: Re-run focused E2E and user-document tests**

### Task 8: Final regression gates

**Files:**
- Modify: `reports/2026-08-12.md`
- Preserve: `output/`

**Interfaces:**
- Consumes: Tasks 5-7.
- Produces: fresh local verification evidence without commit, push, publish, or PR creation.

- [x] **Step 1: Run the affected Vitest, license, and documentation checks**
- [x] **Step 2: Run focused Row Expand and Header Playwright checks**
- [x] **Step 3: Run `npm run verify`, full non-performance E2E, the full performance suite, and `git diff --check`**
- [x] **Step 4: Verify the live Playground, preserve the existing Galaxy-compatible captures, and update the work report**

### Task 9: Header and Summary boundary color alignment

**Files:**
- Modify: `styles.css`
- Test: `test/playwright/specs/header-quality.spec.ts`
- Test: `test/playwright/specs/summary-row.spec.ts`

**Interfaces:**
- Preserves: `--comins-table-header-border` and `--comins-table-header-split-border` as externally overridable CSS tokens.
- Produces: default horizontal Header/Summary boundaries matching `--comins-table-row-border`, and vertical splits matching `--comins-table-cell-border` across every built-in theme.

- [x] **Step 1: Add failing computed-style comparisons**

```ts
expect(await header.evaluate((element) => getComputedStyle(element).borderBottomColor)).toBe(
  await bodyCell.evaluate((element) => getComputedStyle(element).borderBottomColor),
);
expect(await summaryCell.evaluate((element) => getComputedStyle(element).borderRightColor)).toBe(
  await bodyCell.evaluate((element) => getComputedStyle(element).borderRightColor),
);
```

- [x] **Step 2: Run the Header and Summary specs and confirm RED against the accent-colored Header tokens**

Run: `npm run test:e2e -- test/playwright/specs/header-quality.spec.ts test/playwright/specs/summary-row.spec.ts --workers=1`

- [x] **Step 3: Alias the Header boundary tokens to the Row/Cell tokens in the base and built-in themes**

```css
--comins-table-header-border: var(--comins-table-row-border);
--comins-table-header-split-border: var(--comins-table-cell-border);
```

- [x] **Step 4: Re-run the two specs and confirm GREEN without changing blue/red move outlines**

### Task 10: Last expanded owner Row separator

**Files:**
- Modify: `src/index.tsx`
- Test: `test/playwright/specs/row-expand.spec.ts`

**Interfaces:**
- Preserves: the outer Table bottom border and the unexpanded viewport-end Row suppression.
- Produces: a one-pixel `row-border` separator between the last visible owner Row and its mounted Detail Row.

- [x] **Step 1: Add a failing E2E assertion for the last visible fixed owner**

```ts
await fixed.getByTestId("row-detail-toggle-fixed-4").click();
await expect(fixed.getByTestId("row-fixed-4").locator("td").first()).toHaveCSS("border-bottom-width", "1px");
await expect(fixed.getByTestId("row-detail-content-fixed-4")).toHaveCSS("border-bottom-width", "1px");
```

- [x] **Step 2: Run the Row Expand spec and confirm RED because `viewport-end` removes the owner Cell border**

Run: `npm run test:e2e -- test/playwright/specs/row-expand.spec.ts --workers=1`

- [x] **Step 3: Apply viewport-end suppression only when the owner has no mounted Detail**

```tsx
isViewportEndRow && !rowDetailExpanded ? "comins-table__tr--viewport-end" : undefined
```

- [x] **Step 4: Re-run the Row Expand spec and confirm GREEN**

### Task 11: Integrated boundary verification

**Files:**
- Modify: `reports/2026-08-12.md`
- Preserve: `output/`

**Interfaces:**
- Consumes: Tasks 9-10.
- Produces: fresh local evidence without commit, push, PR, publish, or dependency changes.

- [x] **Step 1: Run the affected Playwright specs together, including all built-in themes**
- [x] **Step 2: Run `npm run verify`, full non-performance E2E, and `git diff --check`**
- [x] **Step 3: Reload the live Playground and visually verify Header, Summary, and last Row Detail boundaries**
- [x] **Step 4: Record exact verification results in `reports/2026-08-12.md`**
