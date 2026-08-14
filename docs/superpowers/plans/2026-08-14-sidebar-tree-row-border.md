# Sidebar, Tree Anchor, and Row Border Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Keep Playground navigation labels English, lock the Tree Grid expander column at the far left, and restore the final Row border for short virtualized content.

**Architecture:** `DocsShell` will build localized route/search pages separately from stable English Sidebar groups. `CominsTreeTableInner` will derive an internal locked anchor column and pass its ID through the existing Tree render context, while core column-order normalization enforces declared locked positions for layout restoration. Row rendering will distinguish the last mounted virtual slot from the last logical Row and suppress its border only when virtual content reaches the viewport boundary.

**Tech Stack:** React 19, TypeScript 7, Vitest/jsdom, Playwright, Vite.

## Global Constraints

- Preserve all existing public exports and application-owned `data`/callback flows.
- Add no dependency and perform no unrelated refactor or bulk format.
- Sidebar group/link labels are English; localized article, search, controls, and accessibility labels remain locale-specific.
- Tree Grid first declared column is the fixed Tree anchor and its move handle is absent.
- Nonvirtualized Row border/filler behavior is unchanged.

---

### Task 1: Stable English Sidebar navigation

**Files:**
- Modify: `test/playwright/specs/playground-localization.spec.ts`
- Modify: `example/src/components/docs/DocsShell.tsx`

**Interfaces:**
- Consumes: `createDocsPages(locale)` and `createDocsNavGroups(pages)`.
- Produces: localized `docsPages` for routes/search and English-only `docsNavGroups` for `DocsSidebar`.

- [ ] **Step 1: Write the failing browser test**

Add a test that loads Korean `/examples/header`, reads all Sidebar `h2` and `a` text, and compares them with the literal English group and link arrays. Assert the article heading is still `헤더 기본`, switch to English, and assert the same Sidebar arrays remain unchanged.

```ts
expect(await navigation.locator("h2").allTextContents()).toEqual([
  "Getting Started", "Basics", "Styling", "Header", "Cell", "Examples", "Row / Context", "API", "Body / Performance",
]);
expect(await navigation.locator("a").allTextContents()).toEqual([
  "Getting Started", "CRUD", "Sizing", "Loading / Empty State", "Theme", "Header Basics", "Header Groups",
  "Cells", "Components", "Selection & Clipboard", "Rows", "Row Expand", "Summary Row", "Tree Grid",
  "Context Menu", "Export Helper", "Props", "Ref API", "Pagination", "Infinite Scroll", "Lazy Load", "Virtualization",
]);
```

- [ ] **Step 2: Run the focused test and verify RED**

Run: `npm run test:e2e -- --workers=1 test/playwright/specs/playground-localization.spec.ts`

Expected: FAIL because Korean Sidebar categories and multiple link labels differ from the English literals.

- [ ] **Step 3: Separate Sidebar metadata from localized route metadata**

In `DocsShell`, keep `createDocsPages(locale)` for `DocsTopNav` and `Routes`, and memoize `createDocsNavGroups(createDocsPages("en"))` independently for `DocsSidebar`.

```tsx
const docsPages = useMemo(() => createDocsPages(locale), [locale]);
const docsNavGroups = useMemo(() => createDocsNavGroups(createDocsPages("en")), []);
```

- [ ] **Step 4: Re-run the focused test and verify GREEN**

Run: `npm run test:e2e -- --workers=1 test/playwright/specs/playground-localization.spec.ts`

Expected: all localization scenarios pass and locale switching does not remount live routes.

### Task 2: Fixed Tree Grid anchor column

**Files:**
- Modify: `test/tree-table.test.tsx`
- Modify: `src/core.ts`
- Modify: `src/index.tsx`
- Modify: `test/playwright/specs/tree-grid.spec.ts`
- Modify: `docs/user/17-tree-grid.md`
- Modify: `docs/ko/17-tree-grid.md`

**Interfaces:**
- Consumes: `CominsTableColumn.lockPosition`, `normalizeColumnOrder`, `CominsTreeRenderContext`, and `CominsTableRef.setColumnLayout`.
- Produces: internal `treeColumnId: string | null` and Tree-wrapper columns whose first declaration has `lockPosition: true`.

- [ ] **Step 1: Write the failing Tree unit test**

Render a controlled Tree with a ref, request layout order `["age", "name"]`, and assert literal observable behavior:

```ts
expect([...container.querySelectorAll("th[data-comins-column-id]")].map((header) => header.getAttribute("data-comins-column-id"))).toEqual(["name", "age"]);
expect(container.querySelector("[data-testid='header-name']")?.getAttribute("data-column-position-locked")).toBe("true");
expect(container.querySelector("[data-testid='column-move-handle-name']")).toBeNull();
expect(container.querySelector("[data-testid='tree-expander-root']")?.closest("td")?.getAttribute("data-comins-cell-column-id")).toBe("name");
```

- [ ] **Step 2: Run the Tree unit test and verify RED**

Run: `npm run test:run -- test/tree-table.test.tsx`

Expected: FAIL because the first Tree column is movable and the expander follows visible index `0`.

- [ ] **Step 3: Enforce the declared position of locked columns**

After group-aware ordering in `normalizeColumnOrder`, move each `lockPosition` column back to its declared column index. This makes initial and ref-applied layouts honor the same lock contract as pointer moves.

```ts
for (const [declaredIndex, column] of columns.entries()) {
  if (!column.lockPosition) continue;
  const currentIndex = normalizedOrder.indexOf(column.id);
  if (currentIndex < 0 || currentIndex === declaredIndex) continue;
  normalizedOrder.splice(currentIndex, 1);
  normalizedOrder.splice(Math.min(declaredIndex, normalizedOrder.length), 0, column.id);
}
```

- [ ] **Step 4: Bind Tree rendering to an internal anchor ID**

In `CominsTreeTableInner`, memoize a column list where index `0` is copied with `lockPosition: true`, derive `treeColumnId` from `id ?? field`, pass both to the inner Table, and render the expander only when `column.id === treeContext.treeColumnId`.

- [ ] **Step 5: Verify the Tree unit test is GREEN**

Run: `npm run test:run -- test/tree-table.test.tsx test/basic-core.test.ts`

Expected: Tree anchor assertions and existing locked column/group movement tests pass.

- [ ] **Step 6: Add browser coverage and bilingual documentation**

Extend the Tree Grid Playwright scenario to assert that `header-name` is locked, its handle count is `0`, `header-age` still has a handle, and the first expander Cell has `data-comins-cell-column-id="name"`. Add the fixed first-declared-column contract to both Tree Grid user guides.

- [ ] **Step 7: Run focused Tree browser and docs tests**

Run: `npm run test:e2e -- --workers=1 test/playwright/specs/tree-grid.spec.ts`

Run: `npm run test:run -- test/user-docs.test.ts`

Expected: both commands pass.

### Task 3: Final Row border for short virtualized content

**Files:**
- Modify: `test/playwright/specs/row-expand.spec.ts`
- Modify: `src/index.tsx`
- Modify: `docs/user/19-row-expand.md`
- Modify: `docs/ko/19-row-expand.md`

**Interfaces:**
- Consumes: `entry.visibleIndex`, `visibleRowCount`, `rowWindow.scrollHeight`, `containerHeight`, `virtualized`, and existing `.comins-table__tr--viewport-end` styling.
- Produces: a viewport-end flag that represents the last logical Row at a filled viewport boundary.

- [ ] **Step 1: Write the failing Row Border browser test**

In the automatic Detail scenario, before expansion assert the sizer is shorter than the viewport and the final Row Cell keeps a `1px` bottom border.

```ts
await expect.poll(async () => ({
  clientHeight: await automatic.evaluate((element) => element.clientHeight),
  sizerHeight: await sizer.evaluate((element) => element.getBoundingClientRect().height),
})).toMatchObject({ clientHeight: 371, sizerHeight: 216 });
await expect(automatic.getByTestId("row-auto-6").locator(".comins-table__td").first()).toHaveCSS("border-bottom-width", "1px");
```

Use relational numeric assertions if browser rounding differs; the behavioral invariant is `sizerHeight < clientHeight` plus a `1px` border.

- [ ] **Step 2: Run the Row Expand spec and verify RED**

Run: `npm run test:e2e -- --workers=1 test/playwright/specs/row-expand.spec.ts`

Expected: FAIL with actual bottom width `0px` on `row-auto-6`.

- [ ] **Step 3: Correct viewport-end classification**

Keep the nonvirtual branch unchanged. For virtualized Rows, require both the final logical visible index and content height that reaches the viewport within a one-pixel tolerance before applying the border-suppression class.

```ts
const isLastRenderedSlot = entryIndex === rowWindow.slots.length - 1;
const isLastLogicalRow = entry.visibleIndex === visibleRowCount - 1;
const virtualContentFillsViewport = rowWindow.scrollHeight >= containerHeight - 1;
const isViewportEndRow = isLastRenderedSlot && (
  virtualized
    ? isLastLogicalRow && virtualContentFillsViewport
    : emptyFillerHeight === 0
);
```

- [ ] **Step 4: Re-run the Row Expand spec and verify GREEN**

Run: `npm run test:e2e -- --workers=1 test/playwright/specs/row-expand.spec.ts`

Expected: the new final Row border assertion and existing Detail scroll/measurement assertions pass.

- [ ] **Step 5: Document the boundary behavior**

Add matching English and Korean statements that short virtualized content retains the final Row separator while content reaching the viewport uses the outer Table frame as its terminal border.

### Task 4: Integrated verification and live Playground review

**Files:**
- Modify: `reports/2026-08-14.md`

**Interfaces:**
- Consumes: all changes from Tasks 1-3.
- Produces: focused/full verification evidence and a live browser confirmation record.

- [ ] **Step 1: Run focused unit and browser suites together**

Run: `npm run test:run -- test/tree-table.test.tsx test/basic-core.test.ts test/user-docs.test.ts`

Run: `npm run test:e2e -- --workers=1 test/playwright/specs/playground-localization.spec.ts test/playwright/specs/tree-grid.spec.ts test/playwright/specs/row-expand.spec.ts`

- [ ] **Step 2: Run the required full gates**

Run: `npm run verify`

Run: `npm run test:e2e -- --workers=1`

Expected: all required module and shared-interaction gates pass.

- [ ] **Step 3: Review the live Playground**

Open `/examples/tree-grid` and `/examples/row-expand` in the running Playground. Confirm English Sidebar names in Korean locale, absent first Tree handle with the expander in `name`, and a visible final Row separator in the measured automatic-height example.

- [ ] **Step 4: Record the result**

Append the work time, changed files, executed commands, pass/fail results, and any remaining unverified browser/platform risk to `reports/2026-08-14.md`.
