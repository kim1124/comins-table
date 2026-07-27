# Code Health, Consumer Playground, and E2E Validation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking. Do not dispatch subagents unless the maintainer explicitly requests multi-agent execution.

**Goal:** Review and improve Comins Table code health, correct the consumer-facing Infinite Scroll contract, add focused Selection/Clipboard and Ref API live examples, and validate every currently supported Chromium behavior through deterministic Playground E2E and performance gates.

**Architecture:** Preserve `CominsTable` public props, types, exports, controlled `data` ownership, and the client-only Chromium support boundary. Keep controlled Infinite Scroll application-owned, keep `lazyLoad` datasource-owned, expose Selection/Clipboard as one focused React example, and attach a Flat Table Ref live example to the existing `/api/ref` page without duplicating Tree Grid controls. Use existing unit, Playwright, CDP memory, security, hygiene, and build gates instead of adding dependencies.

**Tech Stack:** React 18+, TypeScript 7, ECMAScript 2022, Vite 8, Vitest 4 with jsdom, Playwright 1.61 with bundled Chromium, module-owned CSS.

## Global Constraints

- Run all commands from the independent repository root; do not use KMSF workspace commands.
- Start implementation in an isolated worktree from a maintainer-confirmed base after the planning checkout's unrelated `.codex/config.toml`, `AGENTS.md`, and report changes are committed or explicitly excluded.
- Preserve `CominsTableProps`, `CominsTreeTableProps`, `CominsTableRef`, package exports, CSS namespace, and package version `0.1.4`.
- Preserve the application-owned `data` plus `onChangeData` flow and stable `getRowId` behavior.
- Do not add or upgrade dependencies and do not run `npm audit fix`.
- Keep Firefox, Safari, SSR, server-side Row models, viewport datasources, visual Fill Handle UI, and unsupported Tree interactions outside this delivery.
- Keep English-first public guidance synchronized with matching Korean guidance.
- Use public-safe fixture values and repository-relative paths only; do not print sensitive detector matches.
- Add the smallest regression test before a behavior fix when the test can distinguish the defect.
- Run focused checks while changing behavior, then run each applicable broad gate once after the final meaningful change.
- Classify failures as product behavior, test contract, or execution environment before modifying code or retrying a broad gate.
- Do not push, publish, tag, create a GitHub Release, delete branches, or mutate provider settings.

---

## File Map

| File | Responsibility |
| --- | --- |
| `example/src/features/InfiniteScrollFeature.tsx` | Consumer-controlled `infiniteScroll` and `onLoadMore` example. |
| `example/src/features/LazyLoadFeature.tsx` | Existing datasource-owned `lazyLoad` example; retained as the contrasting contract. |
| `example/src/features/SelectionClipboardFeature.tsx` | New React Row/Cell/Range selection and clipboard example. |
| `example/src/features/RefApiFeature.tsx` | New Flat Table `CominsTableRef` live example for `/api/ref`. |
| `example/src/features/featureRegistry.tsx` | Registers consumer-facing examples and searchable option metadata. |
| `example/src/features/types.ts` | Adds `selection-clipboard` and `ref-api` feature IDs. |
| `example/src/docs/docsRoutes.tsx` | Adds the Selection/Clipboard route and attaches Ref live content to `/api/ref`. |
| `example/src/docs/codeSamples.ts` | Copyable React samples matching the live examples. |
| `example/src/docs/dataTableOptionGuide.ts` | Keeps public props/events/ref descriptions aligned with examples. |
| `docs/user/09-clipboard.md`, `docs/user/10-selection.md` | English Selection/Clipboard usage and Playground links. |
| `docs/ko/09-clipboard.md`, `docs/ko/10-selection.md` | Matching Korean Selection/Clipboard usage. |
| `docs/user/15-infinite-scroll.md`, `docs/ko/15-infinite-scroll.md` | Controlled Infinite Scroll contract and Lazy Load distinction. |
| `README.md`, `docs/user/12-playground.md`, `docs/ko/12-playground.md` | Current Playground route inventory and supported examples. |
| `test/playwright/specs/infinite-scroll.spec.ts` | Controlled append, dedupe, loading row, exhaustion, and refresh acceptance. |
| `test/playwright/specs/selection-clipboard.spec.ts` | New consumer selection and clipboard acceptance. |
| `test/playwright/specs/ref-api.spec.ts` | New Flat Table Ref API acceptance. |
| `test/playwright/specs/user-playground-docs.spec.ts` | Complete feature-route and lifecycle inventory. |
| `test/playwright/specs/playground-content-docs.spec.ts` | Live example descriptions and route/document alignment. |
| `test/playwright/specs/playground-layout-polish.spec.ts` | Pagination Row-boundary acceptance. |
| `test/playwright/specs/loading-empty-state.spec.ts` | Ready-state recovery acceptance. |
| `test/playwright/specs/visual-typography.spec.ts` | Desktop/mobile visual and overflow evidence for the new consumer routes. |
| `test/playwright/specs/memory-leak-full-audit.spec.ts` | CDP recovery for the expanded consumer feature lifecycle. |
| `test/user-docs.test.ts` | English/Korean docs and Playground contract assertions. |
| `src/*.ts`, `src/*.tsx`, `styles.css` | Code-health review target; modify only for confirmed defects. |
| `reports/2026-07-27.md` | Final changes, commands, results, failure classification, and residual risk. |

---

### Task 1: Isolate Execution and Lock the Existing Verification Inventory

**Files:**
- Read: `AGENTS.md`
- Read: `package.json`
- Read: `playwright.config.ts`
- Read: `example/src/features/featureRegistry.tsx`
- Read: `test/playwright/specs/*.spec.ts`

**Interfaces:**
- Consumes: repository `main`, existing `npm run verify`, `npm run test:e2e`, and `npm run test:perf` scripts.
- Produces: a clean isolated checkout and a recorded pre-change inventory of 18 feature routes, 88 non-performance E2E tests, and 24 performance E2E tests.

- [ ] **Step 1: Create an isolated implementation checkout**

Use `superpowers:using-git-worktrees` before changing files. Do not copy unrelated `.codex/config.toml`, `AGENTS.md`, or report changes from the planning checkout. If those files are still uncommitted, stop before worktree creation and ask the maintainer to identify the implementation base.

- [ ] **Step 2: Confirm repository and dependency state**

Run:

```bash
git status --short --branch
git log -1 --oneline
npm ls --depth=0
```

Expected: clean implementation worktree, `main`-based history, and no missing direct dependency. If a dependency is missing, stop and request approval before running a networked install.

- [ ] **Step 3: Record the current Playwright inventory without executing tests**

Run:

```bash
npm run test:e2e -- --list
npm run test:perf -- --list
```

Expected: 88 non-`@perf` tests and 24 `@perf` tests before new example coverage is added.

- [ ] **Step 4: Check the local browser-server boundary**

Run:

```bash
lsof -nP -iTCP:4002 -sTCP:LISTEN
```

Expected: no unrelated process owns port `4002`. Do not terminate an unresolved process; classify it as an execution-environment blocker first.

---

### Task 2: Strengthen Existing Pagination and Loading Browser Contracts

**Files:**
- Modify: `test/playwright/specs/playground-layout-polish.spec.ts:302-329`
- Modify: `test/playwright/specs/loading-empty-state.spec.ts:3-28`
- Review after a failed focused assertion: `example/src/features/PaginationFeature.tsx`
- Review after a failed focused assertion: `example/src/features/LoadingStateFeature.tsx`

**Interfaces:**
- Consumes: existing `pagination` prop and loading-mode buttons.
- Produces: browser proof that page controls change rendered Row boundaries and that Empty can return to Ready.

- [ ] **Step 1: Add Pagination Row-boundary assertions**

Extend the existing Pagination test with these observable contracts:

```ts
await expect(page.getByTestId("row-a")).toBeVisible();
await page.getByRole("button", { exact: true, name: "다음 페이지" }).click();
await expect(page.getByTestId("row-a")).toHaveCount(0);
await expect(page.getByTestId("row-row-30")).toBeVisible();
await page.getByRole("button", { exact: true, name: "마지막 페이지" }).click();
await expect(page.getByTestId("row-row-90")).toBeVisible();
await expect(
  page.getByTestId("pagination-viewport").locator("tbody tr[data-comins-row-data-index]"),
).toHaveCount(10);
```

- [ ] **Step 2: Add Loading Ready-recovery assertions**

After the Empty assertions, click the existing `데이터 표시` button and assert:

```ts
await page.getByRole("button", { exact: true, name: "데이터 표시" }).click();
await expect(page.getByTestId("row-a")).toBeVisible();
await expect(page.getByTestId("data-table-empty-state")).toHaveCount(0);
await expect(page.getByTestId("data-table-loading-overlay")).toHaveCount(0);
await expect(page.getByRole("columnheader", { exact: true, name: "Column1" })).toBeVisible();
```

- [ ] **Step 3: Run the two focused specs**

Run:

```bash
npm run test:e2e -- test/playwright/specs/playground-layout-polish.spec.ts test/playwright/specs/loading-empty-state.spec.ts --workers=1
```

Expected: PASS if the current wiring is correct. If an assertion fails consistently, preserve the failing test, apply the smallest product fix, and rerun only these specs.

- [ ] **Step 4: Commit the isolated test-contract increment**

Run only after the focused specs pass:

```bash
git add test/playwright/specs/playground-layout-polish.spec.ts test/playwright/specs/loading-empty-state.spec.ts
git commit -m "test: strengthen pagination and loading browser contracts"
```

Include product files in the same commit only if a confirmed regression required a fix.

---

### Task 3: Correct Infinite Scroll to the Controlled React Contract

**Files:**
- Modify: `example/src/features/InfiniteScrollFeature.tsx`
- Modify: `example/src/features/featureRegistry.tsx:139-149`
- Modify: `example/src/docs/codeSamples.ts`
- Modify: `example/src/docs/docsRoutes.tsx:293-307`
- Modify: `example/src/docs/dataTableOptionGuide.ts`
- Modify: `docs/user/15-infinite-scroll.md`
- Modify: `docs/ko/15-infinite-scroll.md`
- Modify: `test/playwright/specs/infinite-scroll.spec.ts`
- Modify: `test/user-docs.test.ts`

**Interfaces:**
- Consumes:

```ts
infiniteScroll?: boolean;
infiniteScrollThreshold?: number;
hasMoreRows?: boolean;
loadingMore?: boolean;
onLoadMore?: () => void;
```

- Produces: a consumer-owned `rows` array that appends remote batches and remains visibly distinct from `lazyLoad/onLazyLoad`.

- [ ] **Step 1: Rewrite the focused E2E contract before the example**

Keep the existing DummyJSON route mock, but make the test assert:

1. Initial consumer fetch loads `40 / 80`.
2. The table receives controlled Rows and renders `row-dummy-1`.
3. Repeated bottom-scroll events while `loadingMore` is true produce exactly one `skip=40` request.
4. The loading row is visible while that request is pending.
5. Appending completes at `80 / 80`, then the loading row is removed.
6. `hasMoreRows=false` prevents another request after the mocked total is reached.
7. Refresh aborts any pending request, replaces Rows from `skip=0`, and restores `40 / 80`.

Run:

```bash
npm run test:e2e -- test/playwright/specs/infinite-scroll.spec.ts --workers=1
```

Expected: FAIL because the current example uses `lazyLoad/onLazyLoad`.

- [ ] **Step 2: Implement application-owned controlled loading**

In `InfiniteScrollFeature.tsx`:

- Replace `data={[]}`, `lazyLoad`, `lazyLoadBatchSize`, `lazyLoadThreshold`, and `onLazyLoad`.
- Own `rows`, `total`, `initialLoading`, `loadingMore`, a synchronous pending-request guard, and request cancellation in React state/refs.
- Fetch the first `BATCH_SIZE` rows on mount.
- Append from `offset=rows.length` in an application callback.
- Abort the previous application request on refresh and unmount.
- Pass this exact table contract:

```tsx
<CominsTable
  columns={columns}
  data={rows}
  getRowId={(row) => row.id}
  hasMoreRows={rows.length < total}
  infiniteScroll
  infiniteScrollThreshold={140}
  loading={initialLoading}
  loadingMore={loadingMore}
  onLoadMore={() => void appendRows()}
  pagination={{ pageIndex: 0, pageSize: Math.max(rows.length, BATCH_SIZE) }}
  virtualized
/>
```

Guard `appendRows` with a ref before starting the Promise so repeated scroll events cannot race React state propagation. Guard exhaustion separately. Ignore aborted or stale responses; do not add retry or error UI as a table-owned feature.

- [ ] **Step 3: Align registry, route copy, samples, and public docs**

Replace every statement that describes the Infinite Scroll page as `lazyLoad/onLazyLoad`. The final distinction must be:

- Infinite Scroll: consumer owns `rows`, request lifecycle, `hasMoreRows`, and `loadingMore`; Table emits `onLoadMore`.
- Lazy Load: Table requests `{ offset, limit, reason, signal }` through `onLazyLoad` and appends the result.

Keep external request failure/retry policy application-owned.

- [ ] **Step 4: Add documentation assertions**

In `test/user-docs.test.ts`, assert that English and Korean Infinite Scroll docs and the Playground source contain:

```ts
for (const term of ["infiniteScroll", "hasMoreRows", "loadingMore", "onLoadMore"]) {
  expect(infiniteScrollDocs).toContain(term);
  expect(infiniteScrollPlayground).toContain(term);
}
expect(infiniteScrollPlayground).not.toContain("onLazyLoad=");
```

- [ ] **Step 5: Run focused browser and docs checks**

Run:

```bash
npm run test:e2e -- test/playwright/specs/infinite-scroll.spec.ts --workers=1
npm run test:run -- test/user-docs.test.ts
```

Expected: PASS with mocked requests only; no live DummyJSON dependency.

- [ ] **Step 6: Commit the controlled Infinite Scroll increment**

Run:

```bash
git add example/src/features/InfiniteScrollFeature.tsx example/src/features/featureRegistry.tsx example/src/docs/codeSamples.ts example/src/docs/docsRoutes.tsx example/src/docs/dataTableOptionGuide.ts docs/user/15-infinite-scroll.md docs/ko/15-infinite-scroll.md test/playwright/specs/infinite-scroll.spec.ts test/user-docs.test.ts
git commit -m "fix: demonstrate controlled infinite scroll"
```

---

### Task 4: Add the Selection and Clipboard Consumer Example

**Files:**
- Create: `example/src/features/SelectionClipboardFeature.tsx`
- Create: `test/playwright/specs/selection-clipboard.spec.ts`
- Modify: `example/src/features/types.ts:3-22`
- Modify: `example/src/features/featureRegistry.tsx`
- Modify: `example/src/docs/docsRoutes.tsx`
- Modify: `example/src/docs/codeSamples.ts`
- Modify: `docs/user/09-clipboard.md`
- Modify: `docs/user/10-selection.md`
- Modify: `docs/ko/09-clipboard.md`
- Modify: `docs/ko/10-selection.md`
- Modify: `docs/user/12-playground.md`
- Modify: `docs/ko/12-playground.md`
- Modify: `README.md`
- Modify: `test/user-docs.test.ts`
- Modify: `test/playwright/specs/user-playground-docs.spec.ts:19-38`
- Modify: `test/playwright/specs/playground-content-docs.spec.ts:19-34`

**Interfaces:**
- Consumes:

```ts
type CominsSelectionState = {
  cell: CominsCellAddress | null;
  range: CominsCellRange | null;
  rowIds: CominsRowId[];
};

onChangeSelection?: (selection: CominsSelectionState) => void;
onChangeData?: (data: TData[]) => void;
cellSelection?: boolean;
```

- Produces: `FeatureId` value `selection-clipboard`, route `/examples/selection-clipboard`, live selection JSON, and controlled paste results.

- [ ] **Step 1: Add failing route and interaction tests**

Create three tests in `selection-clipboard.spec.ts`:

1. Plain click, Ctrl/Cmd click, and Shift click update visible selected Rows and the selection JSON.
2. Cell click and same-table pointer drag create a Cell range without reordering Rows.
3. Ctrl/Cmd+C and Ctrl/Cmd+V update controlled `data`; a `copyable:false, pasteable:false` guard Column remains unchanged.

Use:

```ts
const primaryModifier = process.platform === "darwin" ? "Meta" : "Control";
```

Assert stable `data-testid` values and `data-selected-row`, `data-selected`, and `data-range-selected` attributes. Do not assert private React state.

Run:

```bash
npm run test:e2e -- test/playwright/specs/selection-clipboard.spec.ts --workers=1
```

Expected: FAIL because the route and component do not exist.

- [ ] **Step 2: Implement one focused controlled React example**

Create `SelectionClipboardFeature` with:

- One `useState`-owned `PersonRow[]`.
- One `CominsSelectionState` status initialized to empty selection.
- `onChangeData={setRows}` and `onChangeSelection={setSelection}`.
- An explicit `cellSelection` prop so the live contract is visible in copied source.
- A compact table with stable Row IDs.
- A normal editable/copyable `name` Column, another copyable value Column, and one guarded Column using `cell.props.copyable=false` and `cell.props.pasteable=false`.
- A visible selection JSON panel and short keyboard/pointer instructions.
- A reset action that replaces Rows and remounts only this sample so selection and clipboard state return to the documented baseline.

Do not add a visual Fill Handle, browser Clipboard permission flow, or application store adapter.

- [ ] **Step 3: Register and document the route**

Add `"selection-clipboard"` to `FeatureId`, add the registry entry, and add a `featurePage` route with:

```ts
path: "/examples/selection-clipboard"
category: "Examples"
label: "Selection & Clipboard"
featureId: "selection-clipboard"
```

Update the route inventories, search data, README, English/Korean Playground docs, Selection docs, and Clipboard docs.

- [ ] **Step 4: Add documentation contract assertions**

Assert that the user docs and Playground source include:

```ts
[
  "onChangeSelection",
  "cellSelection",
  "copyable",
  "pasteable",
  "Ctrl",
  "Shift",
  "/examples/selection-clipboard",
]
```

Keep `fillCominsCellRange` documented as a core helper without visual UI.

- [ ] **Step 5: Run focused browser and docs checks**

Run:

```bash
npm run test:e2e -- test/playwright/specs/selection-clipboard.spec.ts test/playwright/specs/user-playground-docs.spec.ts test/playwright/specs/playground-content-docs.spec.ts --workers=1
npm run test:run -- test/user-docs.test.ts
```

Expected: PASS with no console warning or page error.

- [ ] **Step 6: Commit the Selection/Clipboard increment**

Run:

```bash
git add example/src/features/SelectionClipboardFeature.tsx example/src/features/types.ts example/src/features/featureRegistry.tsx example/src/docs/docsRoutes.tsx example/src/docs/codeSamples.ts docs/user/09-clipboard.md docs/user/10-selection.md docs/ko/09-clipboard.md docs/ko/10-selection.md docs/user/12-playground.md docs/ko/12-playground.md README.md test/user-docs.test.ts test/playwright/specs/selection-clipboard.spec.ts test/playwright/specs/user-playground-docs.spec.ts test/playwright/specs/playground-content-docs.spec.ts
git commit -m "feat: add selection and clipboard playground"
```

---

### Task 5: Add a Live Flat Table Ref API Example

**Files:**
- Create: `example/src/features/RefApiFeature.tsx`
- Create: `test/playwright/specs/ref-api.spec.ts`
- Modify: `example/src/features/types.ts`
- Modify: `example/src/features/featureRegistry.tsx`
- Modify: `example/src/docs/docsRoutes.tsx:256-278`
- Modify: `example/src/docs/codeSamples.ts`
- Modify: `example/src/docs/dataTableOptionGuide.ts`
- Modify: `docs/user/06-header.md`
- Modify: `docs/user/07-row.md`
- Modify: `docs/user/10-selection.md`
- Modify: `docs/ko/06-header.md`
- Modify: `docs/ko/07-row.md`
- Modify: `docs/ko/10-selection.md`
- Modify: `test/user-docs.test.ts`
- Modify: `test/playwright/specs/user-playground-docs.spec.ts`
- Modify: `test/playwright/specs/playground-content-docs.spec.ts`
- Modify: `test/playwright/specs/visual-typography.spec.ts`

**Interfaces:**
- Consumes:

```ts
type CominsTableRef<TData> = {
  clearSort: () => void;
  getColumnLayout: () => CominsColumnLayout;
  getSortModel: () => CominsSortModel;
  setColumnLayout: (layout: CominsColumnLayout) => void;
  setMoveTargetRow: (targetIdx: number, sourceIdx: number) => void;
  setSelectedRow: (index: number) => void;
  setSelectedRows: (indexes: number[]) => void;
  setSortModel: (sortModel: CominsSortModel) => void;
};
```

- Produces: `FeatureId` value `ref-api` and live content on the existing `/api/ref` route.

- [ ] **Step 1: Add failing Ref API browser tests**

Create two tests:

1. `setSelectedRows([0, 2])`, `setSortModel(...)`, and `clearSort()` update Row selection, Header sort priority, and visible status JSON.
2. `getColumnLayout()`, a deliberate layout mutation, `setColumnLayout(saved)`, and `setMoveTargetRow(2, 0)` update visible Column/Row order and controlled `data`.

Run:

```bash
npm run test:e2e -- test/playwright/specs/ref-api.spec.ts --workers=1
```

Expected: FAIL because `/api/ref` has documentation but no live feature.

- [ ] **Step 2: Implement the Flat Table Ref example**

Create `RefApiFeature` with a `CominsTableRef<PersonRow>`, controlled Rows, and explicit buttons:

- Select Row 2.
- Select Rows 1 and 3.
- Apply a two-rule sort model.
- Clear sort.
- Save current layout.
- Apply a visible layout change.
- Restore the saved layout.
- Move visible Row 1 to visible position 3.

Display the current selection, sort model, and saved layout as JSON. Drive displayed state through existing callbacks and Ref getters; do not introduce new public methods.

- [ ] **Step 3: Attach the feature to the existing API route**

Add `"ref-api"` to `FeatureId`, register it, and convert `/api/ref` to the existing `featurePage` helper with `featureId: "ref-api"`. Keep the route path and sidebar label unchanged.

Do not duplicate `expand/fold`: link to the existing Tree Grid route for hierarchical Ref controls.

- [ ] **Step 4: Align code samples and user guidance**

Keep `refApiSamples` copyable and ensure the English/Korean Header, Row, and Selection docs link each Ref method to its actual visible-index semantics.

- [ ] **Step 5: Run focused browser and docs checks**

Extend `visual-typography.spec.ts` to visit `/examples/selection-clipboard` and `/api/ref` at `1440x1000` and `390x844`. Reuse `expectBaseTypography` and `expectNoRootHorizontalOverflow`, and write these deterministic artifacts:

```text
reports/artifacts/visual-typography/selection-clipboard-desktop.png
reports/artifacts/visual-typography/selection-clipboard-mobile.png
reports/artifacts/visual-typography/ref-api-desktop.png
reports/artifacts/visual-typography/ref-api-mobile.png
```

Run:

```bash
npm run test:e2e -- test/playwright/specs/ref-api.spec.ts test/playwright/specs/user-playground-docs.spec.ts test/playwright/specs/playground-content-docs.spec.ts test/playwright/specs/visual-typography.spec.ts --workers=1
npm run test:run -- test/user-docs.test.ts
```

Expected: PASS with `/api/ref` still directly routable and searchable.

- [ ] **Step 6: Commit the Ref API increment**

Run:

```bash
git add example/src/features/RefApiFeature.tsx example/src/features/types.ts example/src/features/featureRegistry.tsx example/src/docs/docsRoutes.tsx example/src/docs/codeSamples.ts example/src/docs/dataTableOptionGuide.ts docs/user/06-header.md docs/user/07-row.md docs/user/10-selection.md docs/ko/06-header.md docs/ko/07-row.md docs/ko/10-selection.md test/user-docs.test.ts test/playwright/specs/ref-api.spec.ts test/playwright/specs/user-playground-docs.spec.ts test/playwright/specs/playground-content-docs.spec.ts test/playwright/specs/visual-typography.spec.ts
git commit -m "feat: add ref api live example"
```

---

### Task 6: Perform the Code-Health, Memory, Unused-Code, and Security Review

**Files:**
- Review: `src/core.ts`
- Review: `src/index.tsx`
- Review: `src/component-renderer.tsx`
- Review: `src/column-pointer.ts`
- Review: `src/clipboard.ts`
- Review: `src/selection.ts`
- Review: `src/summary.ts`
- Review: `src/tree.ts`
- Review: `styles.css`
- Review: `example/src/**/*.tsx`
- Delete after reference proof: `example/src/features/CoreFeature.tsx`
- Retain: `example/src/features/AdvancedFeature.tsx`
- Modify: focused source and test files only when a defect is confirmed.

**Interfaces:**
- Consumes: current public contracts and existing unit/E2E/performance tests.
- Produces: evidence-backed findings classified by severity and the smallest regression-safe fixes.

- [ ] **Step 1: Scan lifecycle ownership and cleanup symmetry**

Run:

```bash
rg -n "useEffect|addEventListener|removeEventListener|setTimeout|clearTimeout|setInterval|clearInterval|AbortController|ResizeObserver|IntersectionObserver|requestAnimationFrame|cancelAnimationFrame" src example/src
```

For every allocation, verify the same owner cleans it on dependency change and unmount. Pay special attention to Table pointer controllers, lazy-load aborts, virtual-list document listeners, and the newly controlled Infinite Scroll request.

- [ ] **Step 2: Review hot paths and allocation behavior**

Inspect:

- Row ID derivation and visible-index mapping.
- Sort and multi-sort comparison loops.
- Virtual range calculation and DOM key stability.
- Header layout normalization.
- Cell component configuration and per-render closures.
- Selection, clipboard, Summary, and Tree traversal.

Treat a performance concern as actionable only when source complexity or a focused measurement demonstrates avoidable repeated work. Do not rewrite stable code solely for style.

- [ ] **Step 3: Review unsafe browser and text-rendering surfaces**

Run:

```bash
rg -n "dangerouslySetInnerHTML|\\.innerHTML|eval\\(|new Function|document\\.write|target=\"_blank\"|window\\.open|postMessage|localStorage|sessionStorage" src example/src scripts
```

Confirm that user values render through React escaping, external links use the required isolation, and no credential-bearing storage or dynamic code execution exists. Redact any sensitive scanner output.

- [ ] **Step 4: Prove and remove the known unused Core example**

Run:

```bash
rg -n "CoreFeature" example src test README.md docs/user docs/ko
```

Expected: only `example/src/features/CoreFeature.tsx` defines the symbol. Delete that file. Retain `AdvancedFeature.tsx` because `test/user-docs.test.ts` reads its unsupported-feature boundary.

- [ ] **Step 5: Use a fixed regression workflow for each confirmed finding**

For each defect:

1. Record the file, observable failure, severity, and affected public contract.
2. Add the smallest unit or E2E regression that fails for that defect.
3. Run only that test and confirm RED.
4. Apply the minimal source change.
5. Run the focused test and confirm GREEN.
6. Avoid public API, dependency, and unrelated formatting changes.

Do not create speculative patches for unconfirmed memory or security concerns.

- [ ] **Step 6: Run local security and read-only dependency checks**

Run:

```bash
npm run check:hygiene
npm run test:security
npm audit --omit=dev --audit-level=high
```

Expected: local gates pass and no unresolved high/critical production dependency advisory remains. If registry access is blocked, report the audit as an execution-environment gap; do not run `npm audit fix`.

- [ ] **Step 7: Commit only evidence-backed health changes**

Stage exact changed source/test files and the proven unused `CoreFeature.tsx` deletion. Use:

```bash
git commit -m "refactor: improve table code health"
```

If the review confirms no product defect, commit only the unused-file removal with:

```bash
git commit -m "chore: remove unused core playground"
```

---

### Task 7: Expand Lifecycle and Memory Acceptance for New Routes

**Files:**
- Modify: `test/playwright/specs/memory-leak-full-audit.spec.ts:88-106, 339-360`
- Modify: `test/playwright/specs/lifecycle-soak.spec.ts:19-35`
- Review after a focused lifecycle failure: `test/playwright/specs/selection-clipboard.spec.ts`
- Review after a focused lifecycle failure: `test/playwright/specs/ref-api.spec.ts`

**Interfaces:**
- Consumes: `Selection & Clipboard` and `Ref API` sidebar labels and feature IDs.
- Produces: CDP and lifecycle proof that the new live examples release DOM, listeners, and heap after route exit.

- [ ] **Step 1: Add both new local routes to lifecycle sequences**

Add:

```ts
["Selection & Clipboard", "selection-clipboard"],
["Ref API", "ref-api"],
```

to `warmMemoryBaseline` and the repeated feature-lifecycle scenario. Add both routes to the normal lifecycle soak loop while preserving return to Getting Started.

- [ ] **Step 2: Run the focused lifecycle tests**

Run:

```bash
npm run test:e2e -- test/playwright/specs/lifecycle-soak.spec.ts --workers=1
npm run test:perf -- test/playwright/specs/memory-leak-full-audit.spec.ts --workers=1
```

Expected:

- Exactly one active feature mount after navigation.
- No stale menu, request, or callback after route exit.
- Documents return to baseline.
- DOM Nodes, JS event listeners, and JS heap return within the existing 10% relative threshold after GC and return to Basic.

- [ ] **Step 3: Diagnose before changing thresholds**

If a memory assertion fails:

1. Confirm the selected route and table locator.
2. Confirm the initial Basic baseline was warmed.
3. Confirm application fetches are mocked or aborted.
4. Confirm GC completed before the snapshot.
5. Identify retained DOM/listener ownership.

Do not loosen the 10% threshold to make a failure pass.

- [ ] **Step 4: Commit the lifecycle acceptance increment**

Run:

```bash
git add test/playwright/specs/memory-leak-full-audit.spec.ts test/playwright/specs/lifecycle-soak.spec.ts
git commit -m "test: cover new playground lifecycle"
```

Include a product file only when the focused memory proof required a confirmed cleanup fix.

---

### Task 8: Run Full Project Gates and Record Closure

**Files:**
- Create or update: `reports/2026-07-27.md`
- Inspect: `reports/artifacts/visual-typography/*`
- Inspect: `reports/artifacts/memory-leak-full-audit-*.json`

**Interfaces:**
- Consumes: all accepted code, docs, and test changes.
- Produces: reproducible completion evidence and explicit residual risks.

- [ ] **Step 1: Confirm the final test inventory**

Run:

```bash
npm run test:e2e -- --list
npm run test:perf -- --list
```

Expected: the original 88 non-performance tests plus five new Selection/Clipboard and Ref API tests, for 93 non-performance tests total; 24 performance tests remain unless a focused health regression adds another `@perf` case.

- [ ] **Step 2: Run the module baseline once**

Run:

```bash
npm run verify
```

Expected: hygiene, security, TypeScript, Vitest, and build all pass.

- [ ] **Step 3: Run the complete consumer E2E gate once**

Run:

```bash
CI=1 npm run test:e2e -- --workers=1
```

Expected: all non-`@perf` tests pass with no unexplained browser warning, page error, or live external API dependency.

- [ ] **Step 4: Inspect generated visual evidence**

Open the generated desktop and mobile typography screenshots and verify:

- Docs shell and live samples are not clipped.
- Selection/Clipboard controls remain readable.
- Ref API JSON output does not create root horizontal overflow.
- New routes preserve the current 12px Spoqa Han Sans Neo typography contract.

Remove generated artifacts only after recording whether they were inspected and whether the repository intends to retain them.

- [ ] **Step 5: Run the complete performance gate once**

Run:

```bash
CI=1 npm run test:perf -- --workers=1
```

Expected: all `@perf` tests pass, including 100,000-Row virtualization, physical scrollbar recovery, Tree 10,000-node virtualization, component virtual-list bounds, and the expanded feature lifecycle.

- [ ] **Step 6: Review the final diff and sensitive-data boundary**

Run:

```bash
git diff --check
git status --short
git diff --stat main...HEAD
git diff main...HEAD -- src example test docs README.md styles.css package.json package-lock.json reports
```

Expected: no unrelated `.codex/config.toml` or `AGENTS.md` changes, no lockfile change, no dependency change, and no public API change.

- [ ] **Step 7: Record the work report**

Append a new code-health and Playground validation section to the existing `reports/2026-07-27.md`; preserve its earlier guidance-adoption evidence. If the implementation branch does not contain that maintainer-owned report, stop and reconcile the base instead of recreating or overwriting it. Record:

- Work date and approved scope.
- Changed files grouped by consumer example, tests, docs, and code-health fixes.
- Exact command results and test counts.
- Product, test-contract, and environment failure classifications.
- Memory leak judgment separated from non-leak performance findings.
- Failed or unrun checks.
- Residual risks, including unsupported browsers and any manual visual caveat.

- [ ] **Step 8: Commit the closure evidence**

Run:

```bash
git add reports/2026-07-27.md
git commit -m "docs: record table health validation"
```

Do not push or publish without a separate explicit maintainer command.

---

## Completion Criteria

- Infinite Scroll visibly uses `infiniteScroll`, `hasMoreRows`, `loadingMore`, and `onLoadMore`; Lazy Load remains `onLazyLoad`-based.
- `/examples/selection-clipboard` demonstrates controlled Row, Cell, Range, clipboard, and guard behavior.
- `/api/ref` contains a live Flat Table Ref example without duplicating Tree Grid controls.
- Every registered feature route mounts, unmounts, and reports browser diagnostics cleanly.
- Pagination Row boundaries and Loading Ready recovery are browser-verified.
- Confirmed inefficiency, cleanup, unused-code, and security findings are minimally fixed; speculative findings are reported without patches.
- `CoreFeature.tsx` is removed only after zero-reference proof; `AdvancedFeature.tsx` remains for unsupported-boundary tests.
- `npm run verify`, full non-performance E2E, and full performance E2E pass.
- Memory/no-memory-leak judgment is reported separately from other performance findings.
- Public API, dependency graph, package version, and unsupported-feature boundary remain unchanged.
- No external write, push, publish, tag, Release, or branch deletion occurs.
