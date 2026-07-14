# Summary Row and Tree Grid Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Deliver operational release gates, a controlled Summary Row, and a Tree Grid with its runnable Playground and public documentation.

**Architecture:** Keep the flat-table state model intact. Implement summary calculation as pure helpers. Implement Tree Grid as a tree-data adapter that projects nested nodes into the existing item-row renderer. Tree expansion owns hierarchy visibility; it is not the future flat Row Expand or Row Grouping state model.

**Tech Stack:** React 18+, TypeScript, Vite, Vitest, Playwright, GitHub Actions.

## Global Constraints

- Do not add dependencies.
- Preserve every existing flat `CominsTableProps<TData>` call site.
- Tree input is `CominsTreeNode<TItem>` with `item`, optional `expand`, and optional recursive `children`.
- Existing columns, formatters, renderers, row props, events, and `getRowId` receive `item`, never a Tree node.
- Tree ids are globally unique; Tree V1 rejects pagination, lazy loading, infinite scrolling, and row drag/reorder.
- Tree virtualization uses fixed `rowHeight`; dynamic Row Expand is not included.
- Summary uses all controlled flat data before pagination and all Tree leaf items regardless of expansion.
- Add `/examples/tree-grid`, `docs/user/17-tree-grid.md`, and `docs/ko/17-tree-grid.md`.
- Do not publish, tag, or release `0.1.0`.

---

## File map

| File | Responsibility |
| --- | --- |
| `.gitignore`, `.github/workflows/verify.yml`, `scripts/consumer-smoke.mjs` | Artifact hygiene, CI, and consumer-install validation. |
| `src/summary.ts` | Summary types and pure aggregation. |
| `src/tree.ts` | Tree type, projection, sorting, and immutable updates. |
| `src/index.tsx`, `styles.css` | Summary footer, Tree adapter, expander, and layout styles. |
| `test/summary-core.test.ts`, `test/tree-core.test.ts`, `test/tree-table.test.tsx` | Test-first core and component contracts. |
| `example/src/features/TreeGridFeature.tsx` and docs-route files | Runnable Tree Grid feature and discovery. |
| `docs/user/17-tree-grid.md`, `docs/ko/17-tree-grid.md`, `README.md` | Public documentation. |
| `reports/2026-07-14.md` | Commands, results, and residual risks. |

### Task 1: Establish operational quality gates

**Files:**
- Modify: `.gitignore`, `package.json`, `example/src/docs/dataTableOptionGuide.ts`
- Create: `.github/workflows/verify.yml`, `scripts/consumer-smoke.mjs`

**Interfaces:**
- Consumes: existing `verify`, `test:e2e`, package exports, and distributed CSS entrypoint.
- Produces: `npm run test:consumer`, CI, ignored artifacts, and accurate Export Helper roadmap copy.

- [ ] **Step 1: Write the failing consumer entrypoint**

Add `"test:consumer": "node scripts/consumer-smoke.mjs"` to `package.json`.

Run: `npm run test:consumer`

Expected: FAIL because `scripts/consumer-smoke.mjs` is absent.

- [ ] **Step 2: Implement the minimal consumer smoke script**

Create `scripts/consumer-smoke.mjs` to:
1. create a temporary consumer directory with `mkdtemp`;
2. run `npm pack --pack-destination <temporary directory>`;
3. initialize the consumer and install the tarball plus `react` and `react-dom`;
4. assert resolution of `comins-table`, `comins-table/core`, `comins-table/clipboard`, `comins-table/selection`, and `comins-table/styles.css`;
5. remove the temporary directory in a `finally` block.

Create a CI workflow that runs `npm ci`, `npm run verify`, and `npm run test:e2e` on pull requests and pushes to `main`. Add `reports/artifacts/` to `.gitignore`. Remove only the stale claim that CSV/JSON export is unavailable from `dataTableOptionGuide.ts`.

- [ ] **Step 3: Verify and commit**

Run: `npm run test:consumer`

Expected: PASS.

Run: `git check-ignore reports/artifacts/visual-typography/data-table-desktop.png`

Expected: the artifact path is printed.

Commit:
~~~bash
git add .gitignore .github/workflows/verify.yml package.json scripts/consumer-smoke.mjs example/src/docs/dataTableOptionGuide.ts
git commit -m "chore: add package verification gates"
~~~

### Task 2: Add Summary Row through tests

**Files:**
- Create: `src/summary.ts`, `test/summary-core.test.ts`
- Modify: `src/index.tsx`, `styles.css`, `test/table-interaction.test.tsx`

**Interfaces:**
- Produces:
~~~ts
export type CominsSummaryBuiltin = "avg" | "count" | "max" | "min" | "sum";
export type CominsSummaryAggregator<TData> = (input: {
  column: CominsTableRuntimeColumn<TData>;
  rows: readonly TData[];
  values: readonly unknown[];
}) => React.ReactNode;
export type CominsTableSummaryConfig<TData> = {
  columns: Partial<Record<string, CominsSummaryBuiltin | CominsSummaryAggregator<TData>>>;
  label?: React.ReactNode;
};
export function getCominsSummaryValues<TData>(
  rows: readonly TData[],
  columns: readonly CominsTableRuntimeColumn<TData>[],
  summary: CominsTableSummaryConfig<TData>,
): Record<string, React.ReactNode>;
~~~

- [ ] **Step 1: Write failing aggregation tests**

In `test/summary-core.test.ts`, test:
~~~ts
expect(getCominsSummaryValues(rows, columns, { columns: { age: "sum", name: "count" } }))
  .toEqual({ age: 73, name: 2 });
expect(getCominsSummaryValues([{ age: 31 }, { age: "unknown" }], columns, { columns: { age: "avg" } }))
  .toEqual({ age: 31 });
~~~

Add a custom aggregator test that receives every source row and resolved value.

Run: `npm run test:run -- test/summary-core.test.ts`

Expected: FAIL because the helper is absent.

- [ ] **Step 2: Implement pure aggregation**

Implement `src/summary.ts`. Resolve configured column fields, count all resolved values, filter finite numeric values for `sum`, `avg`, `min`, and `max`, and return `null` when a numeric aggregate has no numeric values. Re-export the types and helper from `src/index.tsx`.

- [ ] **Step 3: Verify core green state**

Run: `npm run test:run -- test/summary-core.test.ts`

Expected: PASS.

- [ ] **Step 4: Write and satisfy footer interaction test**

Add a test with pagination page size 1 and two rows; assert `summary-cell-age` still contains `73`. It must fail before the footer exists.

Add `summary?: CominsTableSummaryConfig<TData>` to flat props. Render a footer table after the body viewport, reuse resolved visible columns and column sizing, and expose `data-testid="summary-cell-<column id>"`. Add footer CSS without changing virtual-scroll height.

Run: `npm run test:run -- test/summary-core.test.ts test/table-interaction.test.tsx`

Expected: PASS.

- [ ] **Step 5: Commit**

~~~bash
git add src/summary.ts src/index.tsx styles.css test/summary-core.test.ts test/table-interaction.test.tsx
git commit -m "feat: add controlled summary row"
~~~

### Task 3: Add Tree data projection through tests

**Files:**
- Create: `src/tree.ts`, `test/tree-core.test.ts`
- Modify: `src/index.tsx`

**Interfaces:**
- Produces:
~~~ts
export type CominsTreeNode<TItem> = {
  children?: readonly CominsTreeNode<TItem>[];
  expand?: boolean;
  item: TItem;
};
export type CominsVisibleTreeRow<TItem> = {
  depth: number;
  expanded: boolean;
  hasChildren: boolean;
  item: TItem;
  path: readonly number[];
  rowId: CominsRowId;
};
export function flattenCominsTree<TItem>(
  nodes: readonly CominsTreeNode<TItem>[],
  getRowId: (item: TItem, index: number) => CominsRowId,
): CominsVisibleTreeRow<TItem>[];
~~~

- [ ] **Step 1: Write failing Tree utility tests**

Use a root with `expand: true` and one child. Assert pre-order `[["root", 0], ["child", 1]]`, collapsed-descendant exclusion, immutable `toggleCominsTreeNode`, duplicate-id rejection with `Duplicate tree row id: dup`, and recursive sibling sorting that keeps each parent before its descendants.

Run: `npm run test:run -- test/tree-core.test.ts`

Expected: FAIL because the module and functions are absent.

- [ ] **Step 2: Implement Tree utilities**

Create `flattenCominsTree`, `getCominsTreeLeafItems`, `toggleCominsTreeNode`, `updateCominsTreeItem`, and `sortCominsTreeSiblings`. Validate every global id before emitting rows. Each update clones only arrays and nodes on the target path.

- [ ] **Step 3: Verify and commit**

Run: `npm run test:run -- test/tree-core.test.ts`

Expected: PASS.

~~~bash
git add src/tree.ts test/tree-core.test.ts src/index.tsx
git commit -m "feat: add tree data projection helpers"
~~~

### Task 4: Integrate Tree Grid without changing flat behavior

**Files:**
- Modify: `src/index.tsx`, `styles.css`, `test/public-api.test.tsx`, `test/table-interaction.test.tsx`
- Create: `test/tree-table.test.tsx`

**Interfaces:**
- Consumes: Tree utilities and Summary helper.
- Produces: a `tree: true` controlled prop branch and accessible fixed-height Tree rendering.

- [ ] **Step 1: Write failing public API and DOM tests**

Render:
~~~tsx
<CominsTable
  tree
  columns={[{ field: "name", label: "Name", sort: true }, { field: "age", label: "Age" }]}
  data={treeData}
  getRowId={(item) => item.id}
  onChangeData={onChangeData}
  summary={{ columns: { age: "sum" } }}
/>
~~~

Assert existing `name` columns resolve from `item`; collapsed child text is absent; clicking `tree-expander-root` calls `onChangeData` with `expand: true`; `aria-expanded` switches; leaf-only summary excludes parents. Add `@ts-expect-error` cases for Tree plus `pagination`, `infiniteScroll`, `lazyLoad`, and `rowProps.draggable`.

Run: `npm run test:run -- test/tree-table.test.tsx test/public-api.test.tsx`

Expected: FAIL because `tree` is absent.

- [ ] **Step 2: Implement Tree prop and adapter**

Split public props into flat and Tree branches. The Tree branch takes `readonly CominsTreeNode<TData>[]`, `tree: true`, and tree-typed `onChangeData`; type it so pagination, lazy load, infinite scroll, and draggable row props are `never`.

Build the row window from `flattenCominsTree`, send `entry.item` through existing cells, callbacks, selection, and formatters, and retain an entry path map for immutable input/paste updates. Compute Tree summaries from `getCominsTreeLeafItems(data)`. Suppress row movement and remote-load paths in Tree mode.

- [ ] **Step 3: Render expander and indentation**

In the first visible data cell, render an expander only for nodes with children. It must use `data-testid="tree-expander-<row id>"`, an explicit `aria-label`, `aria-expanded`, and click propagation cancellation before emitting the immutable next tree. Apply `--comins-tree-depth` and indent by `calc(var(--comins-tree-depth) * 16px)`. Preserve the existing fixed `rowHeight`.

- [ ] **Step 4: Verify and commit**

Run: `npm run test:run -- test/tree-core.test.ts test/tree-table.test.tsx test/public-api.test.tsx test/table-interaction.test.tsx`

Expected: PASS.

Run: `npm run lint`

Expected: PASS.

~~~bash
git add src/index.tsx styles.css test/tree-table.test.tsx test/table-interaction.test.tsx test/public-api.test.tsx
git commit -m "feat: render controlled tree grid"
~~~

### Task 5: Add Tree Grid Playground, docs, and browser checks

**Files:**
- Create: `example/src/features/TreeGridFeature.tsx`, `test/playwright/specs/tree-grid.spec.ts`, `docs/user/17-tree-grid.md`, `docs/ko/17-tree-grid.md`
- Modify: `example/src/features/types.ts`, `example/src/features/featureRegistry.tsx`, `example/src/docs/codeSamples.ts`, `example/src/docs/docsRoutes.tsx`, `README.md`, `reports/2026-07-14.md`

**Interfaces:**
- Produces: `/examples/tree-grid`, sidebar/search discovery, runnable usage code, English/Korean documentation, and end-to-end coverage.

- [ ] **Step 1: Write failing route test**

Create a Playwright test that opens `/examples/tree-grid`, finds the `Tree Grid` heading, toggles `tree-expander-department-engineering`, expects `Platform Team` to appear, verifies `aria-expanded`, and asserts the restrictions text includes pagination, lazy loading, infinite scrolling, and row drag.

Run: `npm run test:e2e -- test/playwright/specs/tree-grid.spec.ts --workers=1`

Expected: FAIL because the route is absent.

- [ ] **Step 2: Implement Playground and docs route**

Create `TreeGridFeature` with controlled nested department/team data, existing `PersonRow` columns, a collapsed `department-engineering` root, a `Platform Team` child, summary, and virtualization. Register `tree-grid` in feature types and registry. Add route `/examples/tree-grid` under `Row / Context`; add a code sample and docs paragraphs covering the exact `item`/ `expand`/ `children` shape, global ids, leaf summary, and V1 restrictions.

- [ ] **Step 3: Write public Markdown**

Add the controlled Tree example to both documentation files. Update README features, props, Playground route listing, and scope exclusions only after the route exists. Do not add any release command.

- [ ] **Step 4: Verify and commit**

Run: `npm run test:e2e -- test/playwright/specs/tree-grid.spec.ts test/playwright/specs/docs-playground-routing.spec.ts test/playwright/specs/playground-content-docs.spec.ts --workers=1`

Expected: PASS with no console warning or page error.

Run: `npm run verify && npm run test:e2e -- --workers=1 && npm run test:perf -- --workers=1 && npm run test:consumer && npm pack --dry-run --json`

Expected: every command passes; the package is not published.

Update `reports/2026-07-14.md` with exact results and any unrun manual DevTools check.

~~~bash
git add example/src/features/TreeGridFeature.tsx example/src/features/types.ts example/src/features/featureRegistry.tsx example/src/docs/codeSamples.ts example/src/docs/docsRoutes.tsx test/playwright/specs/tree-grid.spec.ts docs/user/17-tree-grid.md docs/ko/17-tree-grid.md README.md reports/2026-07-14.md
git commit -m "docs: add tree grid playground guide"
~~~

## Plan self-review

- Spec coverage: operational gates, Summary Row, Tree behavior, Row Expand/Grouping boundaries, Playground, English/Korean docs, tests, and no-release constraint map to Tasks 1–5.
- Placeholder scan: each task provides paths, public interfaces, failing-test conditions, passing commands, and commit scope.
- Type consistency: `CominsTreeNode`, `CominsVisibleTreeRow`, `CominsTableSummaryConfig`, `getCominsSummaryValues`, `flattenCominsTree`, `toggleCominsTreeNode`, `getCominsTreeLeafItems`, and `updateCominsTreeItem` use the same names throughout.
