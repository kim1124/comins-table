# User Playground And Documentation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a user-facing playground and documentation set that demonstrates every currently implemented `@kmsf/data-table` core feature.

**Architecture:** Keep runtime package code in `src` unchanged unless documentation examples reveal a verified defect. Split the playground into feature scenarios under `example/src/features`, keep fixtures under `example/src/fixtures`, and put user-facing docs under `docs/user` so they are separate from agent-only `docs/agents`.

**Tech Stack:** React 18, TypeScript, Vite example app, local shadcn-compatible UI components, Tailwind-compatible CSS classes, Vitest, Playwright.

---

## Current Implemented Feature Coverage

| Area | Implemented Capability | Playground Page | User Doc |
| --- | --- | --- | --- |
| Basic | `KmsfDataTable`, `rows`, `columns`, `getRowId` | `Basic` | `docs/user/01-quick-start.md` |
| Data | full refresh, add, update, delete, query | `Basic CRUD` | `docs/user/02-data-and-crud.md` |
| Store State | internal component state, core state helpers | `Core Features` | `docs/user/03-core-state.md` |
| Theme | table theme, density, className, row class | `Basic` | `docs/user/04-styling.md` |
| Pagination | `pageIndex`, `pageSize`, page rows | `Basic CRUD` | `docs/user/05-pagination.md` |
| Header | show/hide, custom header, custom style | `Header` | `docs/user/06-header.md` |
| Header Layout | drag resize, drag reorder, save/load column layout | `Header` | `docs/user/06-header.md` |
| Row | row style, click, double click, context menu callback | `Tr / Row` | `docs/user/07-row.md` |
| Row Order | drag row reorder without row order persistence | `Tr / Row` | `docs/user/07-row.md` |
| Cell | formatter, custom renderer, style, context menu callback | `Td / Cell` | `docs/user/08-cell.md` |
| Clipboard | row copy/paste, cell copy/paste, copyable/pasteable | `Td / Cell` | `docs/user/09-clipboard.md` |
| Selection | single row, multi row, single cell, clear selection | `Core Features` | `docs/user/10-selection.md` |
| Virtualization | 100,000 and 1,000,000 row smoke path | `Body` | `docs/user/11-virtualization.md` |
| Playground | 20/80 layout, menu keyed destroy/recreate | all pages | `docs/user/12-playground.md` |

## Non-Goals

- Do not implement external store adapter in this plan.
- Do not implement range selection, fill handle, or multi-cell clipboard in this plan.
- Do not add AG Grid, MUI X, TanStack Table, or other grid runtime wrappers.
- Do not add package runtime dependency on shadcn/ui, Tailwind, or Radix.
- Do not document planned features as available features.

## File Structure

- Modify: `README.md` for install, quick start, feature list, playground command, docs index, and current limits.
- Create: `docs/user/01-quick-start.md` through `docs/user/12-playground.md` for the user docs listed in the coverage table.
- Create: `example/src/fixtures/people.ts` and `example/src/fixtures/columns.tsx` for shared sample rows, generated large rows, columns, formatters, renderers, styles, and clipboard guards.
- Create: `example/src/features/types.ts`, eight feature page components, and `example/src/features/featureRegistry.tsx`.
- Modify: `example/src/main.tsx` to keep only shell, menu state, keyed content boundary, and registry rendering.
- Modify: `example/src/styles.css` for scenario layout, table state panels, and compact control rows.
- Create: `test/playwright/specs/user-playground-docs.spec.ts` and `test/user-docs.test.ts`.
- Update: `docs/agents/example/plan.md` and `reports/YYYY-MM-DD.md`.

### Task 1: Lock Documentation Coverage Contract

**Files:**
- Create: `test/user-docs.test.ts`
- Test: `npm --workspace=@kmsf/data-table run test:run -- test/user-docs.test.ts`

- [ ] **Step 1: Write failing doc coverage test**

```ts
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const docs = [
  "01-quick-start.md",
  "02-data-and-crud.md",
  "03-core-state.md",
  "04-styling.md",
  "05-pagination.md",
  "06-header.md",
  "07-row.md",
  "08-cell.md",
  "09-clipboard.md",
  "10-selection.md",
  "11-virtualization.md",
  "12-playground.md",
];

const requiredTerms = [
  "KmsfDataTable",
  "createKmsfDataTableState",
  "addKmsfRows",
  "updateKmsfRows",
  "deleteKmsfRows",
  "queryKmsfRows",
  "setKmsfPagination",
  "serializeKmsfColumnLayout",
  "applyKmsfColumnLayout",
  "selectKmsfRow",
  "selectKmsfCell",
  "copyKmsfRow",
  "copyKmsfCell",
  "pasteKmsfRow",
  "pasteKmsfCell",
  "copyable",
  "pasteable",
  "virtualized",
  "onRowContextMenu",
  "onCellContextMenu",
];

describe("@kmsf/data-table user documentation", () => {
  it("documents every currently implemented core feature", () => {
    const merged = docs
      .map((file) => readFileSync(join(process.cwd(), "docs/user", file), "utf8"))
      .join("\n");

    for (const term of requiredTerms) {
      expect(merged).toContain(term);
    }
  });
});
```

- [ ] **Step 2: Verify RED**

Run: `npm --workspace=@kmsf/data-table run test:run -- test/user-docs.test.ts`

Expected: FAIL because `docs/user` files do not exist.

- [ ] **Step 3: Create user docs**

Create all `docs/user/*.md` files listed in the file structure. Each document must include one focused TypeScript or TSX example and a short "Current limits" section when a related advanced feature is unavailable.

- [ ] **Step 4: Verify GREEN**

Run: `npm --workspace=@kmsf/data-table run test:run -- test/user-docs.test.ts`

Expected: PASS.

### Task 2: Refresh README For External Users

**Files:**
- Modify: `README.md`
- Test: `test/user-docs.test.ts`

- [ ] **Step 1: Extend doc coverage test**

Add README assertions to `test/user-docs.test.ts`.

```ts
it("keeps README aligned with the shipped playground", () => {
  const readme = readFileSync(join(process.cwd(), "README.md"), "utf8");

  expect(readme).toContain("npm --workspace=@kmsf/data-table run dev");
  expect(readme).toContain("docs/user/01-quick-start.md");
  expect(readme).not.toContain("does not currently ship a browser example server");
});
```

- [ ] **Step 2: Verify RED**

Run: `npm --workspace=@kmsf/data-table run test:run -- test/user-docs.test.ts`

Expected: FAIL because the current README still says the browser example server does not exist.

- [ ] **Step 3: Update README**

README must include:
- Install
- Peer dependencies
- Quick start
- Implemented feature list
- Playground command
- User docs index
- Verification commands
- Current limits

- [ ] **Step 4: Verify GREEN**

Run: `npm --workspace=@kmsf/data-table run test:run -- test/user-docs.test.ts`

Expected: PASS.

### Task 3: Split Playground Into Feature Scenarios

**Files:**
- Create: `example/src/fixtures/people.ts`
- Create: `example/src/fixtures/columns.tsx`
- Create: `example/src/features/types.ts`
- Create: `example/src/features/featureRegistry.tsx`
- Modify: `example/src/main.tsx`
- Test: `test/playwright/specs/user-playground-docs.spec.ts`

- [ ] **Step 1: Write failing registry Playwright test**

```ts
import { expect, test } from "@playwright/test";

const pages = [
  "Basic",
  "Basic CRUD",
  "Header",
  "Body",
  "Td / Cell",
  "Tr / Row",
  "Core Features",
  "Advanced Features",
];

test("user playground exposes every implemented feature page", async ({ page }) => {
  await page.goto("/");

  for (const label of pages) {
    await page.getByRole("button", { name: label, exact: true }).click();
    await expect(page.getByRole("main", { name: "데이터 테이블 예제" })).toHaveAttribute(
      "data-feature-label",
      label,
    );
    await expect(page.getByTestId("data-table-viewport")).toBeVisible();
  }
});
```

- [ ] **Step 2: Verify RED**

Run: `npm --workspace=@kmsf/data-table run test:e2e -- test/playwright/specs/user-playground-docs.spec.ts`

Expected: FAIL because `data-feature-label` and full scenario registry do not exist.

- [ ] **Step 3: Add fixture and feature registry files**

Move reusable rows and columns out of `example/src/main.tsx`. Add `featureRegistry` with one component per menu. Keep `FeatureContent key={activeFeature}` to preserve destroy/recreate behavior.

- [ ] **Step 4: Verify GREEN**

Run: `npm --workspace=@kmsf/data-table run test:e2e -- test/playwright/specs/user-playground-docs.spec.ts`

Expected: PASS.

### Task 4: Basic And CRUD Examples

**Files:**
- Create: `example/src/features/BasicFeature.tsx`
- Create: `example/src/features/BasicCrudFeature.tsx`
- Modify: `example/src/features/featureRegistry.tsx`
- Test: `test/playwright/specs/user-playground-docs.spec.ts`

- [ ] **Step 1: Write CRUD browser assertions**

```ts
test("basic crud page demonstrates add update delete query and pagination", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Basic CRUD", exact: true }).click();

  await page.getByRole("button", { name: "Add Row" }).click();
  await expect(page.getByTestId("row-d")).toBeVisible();

  await page.getByRole("button", { name: "Update Beta" }).click();
  await expect(page.getByTestId("cell-b-age")).toContainText("43");

  await page.getByRole("button", { name: "Delete Alpha" }).click();
  await expect(page.getByTestId("row-a")).toHaveCount(0);

  await page.getByRole("button", { name: "Owners Only" }).click();
  await expect(page.getByTestId("query-result")).toContainText("Owner");

  await page.getByRole("button", { name: "Next Page" }).click();
  await expect(page.getByTestId("pagination-state")).toContainText("pageIndex:1");
});
```

- [ ] **Step 2: Verify RED**

Run: `npm --workspace=@kmsf/data-table run test:e2e -- test/playwright/specs/user-playground-docs.spec.ts`

Expected: FAIL because these user controls do not exist.

- [ ] **Step 3: Implement Basic and Basic CRUD pages**

Use existing `KmsfDataTable` props and core helpers. Do not add external state libraries. Keep table data local to each feature page.

- [ ] **Step 4: Verify GREEN**

Run: `npm --workspace=@kmsf/data-table run test:e2e -- test/playwright/specs/user-playground-docs.spec.ts`

Expected: PASS.

### Task 5: Header, Row, Cell, And Clipboard Examples

**Files:**
- Create: `example/src/features/HeaderFeature.tsx`
- Create: `example/src/features/RowFeature.tsx`
- Create: `example/src/features/CellFeature.tsx`
- Modify: `test/playwright/specs/header-basic.spec.ts`
- Modify: `test/playwright/specs/row-basic.spec.ts`
- Modify: `test/playwright/specs/context-menu.spec.ts`

- [ ] **Step 1: Write header assertions**

```ts
test("header page demonstrates hide show resize reorder save and load", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Header", exact: true }).click();

  await page.getByRole("button", { name: "Hide Header" }).click();
  await expect(page.locator("thead")).toHaveCount(0);

  await page.getByRole("button", { name: "Show Header" }).click();
  await expect(page.locator("thead")).toBeVisible();

  await page.getByTestId("header-age").dragTo(page.getByTestId("header-name"));
  await expect(page.getByTestId("layout-order")).toHaveText("age,name,role");

  await page.getByRole("button", { name: "Save Layout" }).click();
  await expect(page.getByTestId("saved-layout-json")).toContainText("age");

  await page.getByRole("button", { name: "Load Layout" }).click();
  await expect(page.getByTestId("layout-order")).toHaveText("age,name,role");
});
```

- [ ] **Step 2: Write row and cell assertions**

```ts
test("row and cell pages demonstrate callbacks context menu and clipboard", async ({ page }) => {
  await page.goto("/");

  await page.getByRole("button", { name: "Tr / Row", exact: true }).click();
  await page.getByTestId("row-a").click();
  await expect(page.getByTestId("event-log")).toContainText("row click:a");
  await page.getByTestId("row-a").click({ button: "right" });
  await expect(page.getByRole("menuitem", { name: "Row a" })).toBeVisible();

  await page.getByRole("button", { name: "Td / Cell", exact: true }).click();
  await page.getByTestId("cell-a-name").click({ button: "right" });
  await expect(page.getByRole("menuitem", { name: "Cell a:name" })).toBeVisible();
  await expect(page.getByTestId("cell-a-role")).toContainText("Owner");
});
```

- [ ] **Step 3: Verify RED**

Run: `npm --workspace=@kmsf/data-table run test:e2e -- test/playwright/specs/header-basic.spec.ts test/playwright/specs/row-basic.spec.ts test/playwright/specs/context-menu.spec.ts`

Expected: FAIL because the new visible user controls and logs do not exist.

- [ ] **Step 4: Implement the three pages**

Header page must include show/hide, save/load layout JSON, drag resize, and drag reorder. Row page must include row style, click, double-click, context menu, and row drag reorder. Cell page must include formatted value, custom renderer, cell style, context menu, row/cell copy-paste, and `copyable`/`pasteable` disabled column example.

- [ ] **Step 5: Verify GREEN**

Run: `npm --workspace=@kmsf/data-table run test:e2e -- test/playwright/specs/header-basic.spec.ts test/playwright/specs/row-basic.spec.ts test/playwright/specs/context-menu.spec.ts`

Expected: PASS.

### Task 6: Core State, Selection, And Virtualization Examples

**Files:**
- Create: `example/src/features/CoreFeature.tsx`
- Create: `example/src/features/BodyFeature.tsx`
- Modify: `test/playwright/specs/virtualization.spec.ts`
- Test: `test/playwright/specs/user-playground-docs.spec.ts`

- [ ] **Step 1: Write core and virtualization assertions**

```ts
test("core page demonstrates selection and serialized state helpers", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Core Features", exact: true }).click();

  await page.getByRole("button", { name: "Select Alpha" }).click();
  await expect(page.getByTestId("selection-state")).toContainText("a");

  await page.getByRole("button", { name: "Select Alpha Name Cell" }).click();
  await expect(page.getByTestId("selection-state")).toContainText("name");

  await page.getByRole("button", { name: "Serialize Layout" }).click();
  await expect(page.getByTestId("core-state-json")).toContainText("order");
});

test("body page demonstrates virtualized large row rendering", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Body", exact: true }).click();

  await page.getByRole("button", { name: "Load 100000 Rows" }).click();
  await expect(page.getByTestId("virtual-row-count")).toHaveText("100000");

  await page.getByRole("button", { name: "Load 1000000 Rows" }).click();
  await expect(page.getByTestId("virtual-row-count")).toHaveText("1000000");
});
```

- [ ] **Step 2: Verify RED**

Run: `npm --workspace=@kmsf/data-table run test:e2e -- test/playwright/specs/user-playground-docs.spec.ts test/playwright/specs/virtualization.spec.ts`

Expected: FAIL until the new core page controls exist.

- [ ] **Step 3: Implement Core and Body pages**

Core page must use current exported helpers only. Body page must keep `virtualized` rendering and avoid rendering all rows in the DOM.

- [ ] **Step 4: Verify GREEN**

Run: `npm --workspace=@kmsf/data-table run test:e2e -- test/playwright/specs/user-playground-docs.spec.ts test/playwright/specs/virtualization.spec.ts`

Expected: PASS.

### Task 7: Advanced Page And Availability Boundaries

**Files:**
- Create: `example/src/features/AdvancedFeature.tsx`
- Modify: `docs/user/12-playground.md`
- Test: `test/playwright/specs/user-playground-docs.spec.ts`

- [ ] **Step 1: Write availability assertions**

```ts
test("advanced page clearly separates unavailable future capabilities", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Advanced Features", exact: true }).click();

  await expect(page.getByTestId("advanced-unavailable")).toContainText("external store adapter");
  await expect(page.getByTestId("advanced-unavailable")).toContainText("range selection");
  await expect(page.getByTestId("advanced-unavailable")).toContainText("server-side row model");
});
```

- [ ] **Step 2: Verify RED**

Run: `npm --workspace=@kmsf/data-table run test:e2e -- test/playwright/specs/user-playground-docs.spec.ts`

Expected: FAIL because the advanced availability panel does not exist.

- [ ] **Step 3: Implement the boundary page**

Render disabled items for unavailable features and link them to `docs/agents/src/2026-06-04-residual-risk-resolution-plan.md`. Do not present those items as supported APIs.

- [ ] **Step 4: Verify GREEN**

Run: `npm --workspace=@kmsf/data-table run test:e2e -- test/playwright/specs/user-playground-docs.spec.ts`

Expected: PASS.

### Task 8: Final Verification And Report

**Files:**
- Update: `reports/2026-06-05.md`

- [ ] **Step 1: Run documentation scan**

Run: `rg -n "does not currently ship a browser example server|external store adapter.*implemented|range selection.*implemented|fill handle.*implemented" README.md docs/user example/src`

Expected: no matches.

- [ ] **Step 2: Run focused tests**

Run: `npm --workspace=@kmsf/data-table run test:run -- test/user-docs.test.ts`

Expected: PASS.

- [ ] **Step 3: Run browser checks**

Run: `npm --workspace=@kmsf/data-table run test:e2e`

Expected: PASS.

- [ ] **Step 4: Run package baseline**

Run: `npm --workspace=@kmsf/data-table run verify:full`

Expected: PASS.

- [ ] **Step 5: Run perf smoke**

Run: `npm --workspace=@kmsf/data-table run test:perf`

Expected: PASS.

- [ ] **Step 6: Check artifacts and whitespace**

Run: `find test-results -maxdepth 3 -type f -print`

Expected: no active artifact files.

Run: `git diff --check`

Expected: PASS.

- [ ] **Step 7: Update report**

Record changed files, commands actually run, pass/fail result, and remaining gaps in `reports/2026-06-05.md`.

## Completion Criteria

- Every currently implemented core feature has at least one user-facing playground page.
- Every currently implemented core feature has one user-facing Markdown doc section.
- README no longer contains stale example-server information.
- Playwright verifies menu navigation, feature-specific controls, destroy/recreate behavior, and browser diagnostics.
- User docs clearly separate implemented features from unavailable advanced features.
- `verify:full`, `test:perf`, `git diff --check`, and artifact cleanup checks pass before completion.
