# Residual Risk Resolution Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Resolve the known post-basic residual risks for `@kmsf/data-table` without expanding the runtime core beyond table fundamentals.

**Architecture:** Keep `src/core.ts` as the framework-independent table state layer, add focused modules only when a feature boundary is clearer outside the current core file, and keep playground-only UI dependencies outside package runtime. Every behavior change starts with a failing Vitest or Playwright test and ends with package verification.

**Tech Stack:** React 18+, TypeScript, Vite, Vitest, React Testing Library, Playwright, Tailwind CSS, shadcn-compatible playground components.

---

## Current Baseline

- Basic TDD scope `BT-01` to `BT-12` is implemented and verified.
- `verify:full` covers lint, Vitest, build, and non-perf Playwright checks.
- `test:perf` covers the 1,000,000-row virtualization smoke separately.
- Runtime context menu remains callback-only. Playground renders the menu example locally.
- Runtime package does not depend on shadcn/ui or Tailwind.

## Risk Inventory

| ID | Risk | Resolution Direction | Primary Gate |
| --- | --- | --- | --- |
| RR-01 | Package release contract is incomplete for MIT publication. | Add metadata and package contract tests. | `test/package-contract.test.ts` |
| RR-02 | Deleted or replaced rows can leave stale selection state. | Prune row and cell selection whenever row ids change. | `test/selection-core.test.ts` |
| RR-03 | External store adapter API is not implemented. | Add minimal external store contract using snapshot, subscribe, and dispatch. | `test/store-adapter.test.tsx` |
| RR-04 | Range selection, fill handle, and multi-cell clipboard are not implemented. | Add range state first, then clipboard/fill helpers. | `test/range-selection-core.test.ts`, `test/clipboard-core.test.ts` |
| RR-05 | Menu destroy/recreate lifecycle has no repeated soak gate. | Add repeated playground navigation smoke and stale listener diagnostics. | `test/playwright/specs/lifecycle-soak.spec.ts` |
| RR-06 | Tailwind/shadcn scaffold is only local-compatible, not a real scaffold. | Add playground Tailwind config and shadcn-compatible component boundary without runtime dependency. | `test/playwright/specs/basic-playground.spec.ts` |
| RR-07 | Core and future extension boundaries are not enforced by tests. | Add public API boundary tests and define subpath export candidates. | `test/public-api-boundary.test.ts` |

## Execution Order

1. Close RR-01 and RR-02 first because they are small correctness and release-readiness items.
2. Implement RR-03 before server-side row model or advanced data source work.
3. Implement RR-04 after RR-03 so clipboard and selection changes can work with controlled and external store modes.
4. Implement RR-05 and RR-06 after interaction APIs are stable.
5. Implement RR-07 before adding heavy features such as export, grouping, tree data, or AI assistant extensions.

### Task 1: Package Contract Gate

**Files:**
- Modify: `package.json`
- Create: `test/package-contract.test.ts`
- Update: `reports/2026-06-04.md`

- [ ] **Step 1: Write the failing test**

```ts
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

type PackageJson = {
  exports?: Record<string, unknown>;
  files?: string[];
  license?: string;
  name?: string;
  peerDependencies?: Record<string, string>;
  private?: boolean;
};

const packageJson = JSON.parse(readFileSync(join(process.cwd(), "package.json"), "utf8")) as PackageJson;

describe("@kmsf/data-table package contract", () => {
  it("is publishable as an MIT package with React peer dependencies", () => {
    expect(packageJson.name).toBe("@kmsf/data-table");
    expect(packageJson.private).not.toBe(true);
    expect(packageJson.license).toBe("MIT");
    expect(packageJson.peerDependencies?.react).toBe(">=18.0.0 <20.0.0");
    expect(packageJson.peerDependencies?.["react-dom"]).toBe(">=18.0.0 <20.0.0");
    expect(packageJson.files).toContain("dist");
    expect(packageJson.exports?.["."]).toBeDefined();
  });
});
```

- [ ] **Step 2: Run the focused test and verify RED**

Run: `npm --workspace=@kmsf/data-table run test:run -- test/package-contract.test.ts`

Expected: FAIL because the current package is still marked private and does not declare `license: "MIT"`.

- [ ] **Step 3: Apply the minimal package metadata change**

Set `private` to `false` or remove it, and add `license: "MIT"` in `package.json`. Do not add new dependencies.

- [ ] **Step 4: Verify GREEN**

Run: `npm --workspace=@kmsf/data-table run test:run -- test/package-contract.test.ts`

Expected: PASS.

### Task 2: Selection Pruning

**Files:**
- Modify: `src/core.ts`
- Modify: `test/selection-core.test.ts`
- Update: `reports/2026-06-04.md`

- [ ] **Step 1: Write stale-selection tests**

```ts
it("prunes selected rows and cells when rows are deleted", () => {
  let state = createKmsfDataTableState({ columns, getRowId: (row) => row.id, rows });

  state = selectKmsfRow(state, "a");
  state = selectKmsfRow(state, "b", { multi: true });
  state = selectKmsfCell(state, { columnId: "name", rowId: "b" });
  state = deleteKmsfRow(state, "b");

  expect(state.selection.rowIds).toEqual(["a"]);
  expect(state.selection.cell).toBeNull();
});
```

- [ ] **Step 2: Run the focused test and verify RED**

Run: `npm --workspace=@kmsf/data-table run test:run -- test/selection-core.test.ts`

Expected: FAIL because deleted row ids can remain in selection.

- [ ] **Step 3: Implement selection pruning in row replacement path**

Update the row replacement helper so every row mutation recalculates valid row ids and filters `selection.rowIds`. Clear `selection.cell` when its `rowId` no longer exists.

- [ ] **Step 4: Verify GREEN**

Run: `npm --workspace=@kmsf/data-table run test:run -- test/selection-core.test.ts`

Expected: PASS.

### Task 3: External Store Adapter

**Files:**
- Create: `src/store.ts`
- Modify: `src/index.tsx`
- Create: `test/store-adapter.test.tsx`
- Update: `reports/2026-06-04.md`

- [ ] **Step 1: Write adapter contract tests**

```tsx
it("renders from an external store snapshot and reacts to dispatch", () => {
  const store = createKmsfDataTableStore({ columns, getRowId: (row) => row.id, rows });

  render(<KmsfDataTable columns={columns} getRowId={(row) => row.id} store={store} />);
  expect(screen.getByTestId("cell-a-name")).toHaveTextContent("Alpha");

  act(() => {
    store.dispatch({ row: { age: 35, id: "d", name: "Delta", role: "Owner" }, type: "row/add" });
  });

  expect(screen.getByTestId("cell-d-name")).toHaveTextContent("Delta");
});
```

- [ ] **Step 2: Run the focused test and verify RED**

Run: `npm --workspace=@kmsf/data-table run test:run -- test/store-adapter.test.tsx`

Expected: FAIL because `createKmsfDataTableStore` and the `store` prop do not exist.

- [ ] **Step 3: Add the minimal external store API**

Expose a store with `getSnapshot()`, `subscribe(listener)`, and `dispatch(action)` methods. In React, subscribe with `useSyncExternalStore`. Keep the existing `rows` prop path working.

- [ ] **Step 4: Verify focused and baseline gates**

Run: `npm --workspace=@kmsf/data-table run test:run -- test/store-adapter.test.tsx`

Run: `npm --workspace=@kmsf/data-table run verify:full`

Expected: PASS.

### Task 4: Range Selection Model

**Files:**
- Modify: `src/core.ts`
- Create: `test/range-selection-core.test.ts`
- Update: `reports/2026-06-04.md`

- [ ] **Step 1: Write range selection tests**

```ts
it("stores an anchor and focus cell range independently from row selection", () => {
  let state = createKmsfDataTableState({ columns, getRowId: (row) => row.id, rows });

  state = selectKmsfCellRange(state, {
    anchor: { columnId: "name", rowId: "a" },
    focus: { columnId: "role", rowId: "c" },
  });

  expect(state.selection.range).toEqual({
    anchor: { columnId: "name", rowId: "a" },
    focus: { columnId: "role", rowId: "c" },
  });
  expect(getKmsfSelectedCellRange(state).map((cell) => `${cell.rowId}:${cell.columnId}`)).toEqual([
    "a:name",
    "a:age",
    "a:role",
    "b:name",
    "b:age",
    "b:role",
    "c:name",
    "c:age",
    "c:role",
  ]);
});
```

- [ ] **Step 2: Run the focused test and verify RED**

Run: `npm --workspace=@kmsf/data-table run test:run -- test/range-selection-core.test.ts`

Expected: FAIL because range selection exports do not exist.

- [ ] **Step 3: Add range state and helpers**

Add `selection.range`, `selectKmsfCellRange`, `clearKmsfCellRange`, and `getKmsfSelectedCellRange`. Respect current column order and visible row order.

- [ ] **Step 4: Verify GREEN**

Run: `npm --workspace=@kmsf/data-table run test:run -- test/range-selection-core.test.ts`

Expected: PASS.

### Task 5: Multi-Cell Clipboard and Fill Handle

**Files:**
- Modify: `src/core.ts`
- Modify: `test/clipboard-core.test.ts`
- Update: `reports/2026-06-04.md`

- [ ] **Step 1: Write clipboard matrix tests**

```ts
it("copies a selected cell range and pastes it from the target cell", () => {
  let state = createKmsfDataTableState({ columns, getRowId: (row) => row.id, rows });
  state = selectKmsfCellRange(state, {
    anchor: { columnId: "name", rowId: "a" },
    focus: { columnId: "age", rowId: "b" },
  });

  const copied = copyKmsfCellRange(state);
  state = pasteKmsfCellRange(state, copied, { columnId: "name", rowId: "b" });

  expect(getKmsfCellValue(state, "b", "name")).toBe("Alpha");
  expect(getKmsfCellValue(state, "b", "age")).toBe(31);
  expect(getKmsfCellValue(state, "c", "name")).toBe("Beta");
  expect(getKmsfCellValue(state, "c", "age")).toBe(42);
});
```

- [ ] **Step 2: Run the focused test and verify RED**

Run: `npm --workspace=@kmsf/data-table run test:run -- test/clipboard-core.test.ts`

Expected: FAIL because multi-cell clipboard exports do not exist.

- [ ] **Step 3: Implement matrix copy and paste**

Add `copyKmsfCellRange` and `pasteKmsfCellRange`. Apply existing column `copyable` and `pasteable` guards per cell. Preserve target row ids.

- [ ] **Step 4: Add fill helper tests**

```ts
it("fills a target range from a source cell while respecting pasteable guards", () => {
  let state = createKmsfDataTableState({ columns, getRowId: (row) => row.id, rows });

  state = fillKmsfCellRange(state, {
    source: { columnId: "role", rowId: "a" },
    target: {
      anchor: { columnId: "role", rowId: "b" },
      focus: { columnId: "role", rowId: "c" },
    },
  });

  expect(getKmsfCellValue(state, "b", "role")).toBe("Owner");
  expect(getKmsfCellValue(state, "c", "role")).toBe("Owner");
});
```

- [ ] **Step 5: Implement fill helper and verify**

Run: `npm --workspace=@kmsf/data-table run test:run -- test/clipboard-core.test.ts test/range-selection-core.test.ts`

Expected: PASS.

### Task 6: Playground Lifecycle Soak

**Files:**
- Modify: `example/src/main.tsx`
- Create: `test/playwright/specs/lifecycle-soak.spec.ts`
- Update: `reports/2026-06-04.md`

- [ ] **Step 1: Write repeated navigation Playwright test**

```ts
test("playground repeatedly destroys and recreates menu content without stale artifacts", async ({ page }) => {
  const diagnostics = collectBrowserDiagnostics(page);
  await page.goto("/");

  for (let index = 0; index < 30; index += 1) {
    await page.getByRole("button", { name: "Header" }).click();
    await page.getByRole("button", { name: "Body" }).click();
    await page.getByRole("button", { name: "Td / Cell" }).click();
    await page.getByRole("button", { exact: true, name: "Basic" }).click();
  }

  await expect(page.getByTestId("feature-content")).toHaveAttribute("data-feature", "basic");
  await expect(page.getByRole("menu", { name: "데이터 테이블 컨텍스트 메뉴" })).toHaveCount(0);
  await expect.poll(() => page.evaluate(() => window.__kmsfDataTableLifecycle?.activeMountCount ?? 0)).toBe(1);
  expect(diagnostics).toEqual([]);
});
```

- [ ] **Step 2: Run the focused test and verify RED**

Run: `npm --workspace=@kmsf/data-table run test:e2e -- test/playwright/specs/lifecycle-soak.spec.ts`

Expected: FAIL because lifecycle diagnostics are not exposed yet.

- [ ] **Step 3: Add playground-only lifecycle diagnostics**

Expose `window.__kmsfDataTableLifecycle.activeMountCount` in `example/src/main.tsx`. Increment on mount and decrement on unmount. Do not add this to package runtime.

- [ ] **Step 4: Verify GREEN and no active artifacts**

Run: `npm --workspace=@kmsf/data-table run test:e2e -- test/playwright/specs/lifecycle-soak.spec.ts`

Run: `find test-results -maxdepth 3 -type f -print`

Expected: Playwright PASS and no active artifact files left under `test-results`.

### Task 7: Tailwind and shadcn Playground Scaffold

**Files:**
- Create or modify: `components.json`
- Create or modify: `tailwind.config.ts`
- Modify: `example/src/components/ui/button.tsx`
- Create: `example/src/components/ui/context-menu.tsx`
- Modify: `example/src/main.tsx`
- Modify: `test/playwright/specs/context-menu.spec.ts`
- Update: `reports/2026-06-04.md`

- [ ] **Step 1: Write scaffold boundary test**

Add assertions that runtime package imports do not reference `@radix-ui`, `shadcn`, or Tailwind config files.

Run: `npm --workspace=@kmsf/data-table run test:run -- test/public-api-boundary.test.ts`

Expected: FAIL until the boundary test file exists.

- [ ] **Step 2: Add playground UI components**

Move context menu markup into `example/src/components/ui/context-menu.tsx`. Keep component APIs local to the playground and do not import them from `src`.

- [ ] **Step 3: Verify playground behavior**

Run: `npm --workspace=@kmsf/data-table run test:e2e -- test/playwright/specs/context-menu.spec.ts`

Run: `npm --workspace=@kmsf/data-table run verify:full`

Expected: PASS.

### Task 8: Public API Boundary and Extension Readiness

**Files:**
- Modify: `package.json`
- Modify: `src/index.tsx`
- Create: `src/core/index.ts`
- Create: `test/public-api-boundary.test.ts`
- Update: `reports/2026-06-04.md`

- [ ] **Step 1: Write public API boundary tests**

```ts
it("keeps core exports available from the root entry", async () => {
  const entry = await import("../src");

  expect(entry.KmsfDataTable).toBeDefined();
  expect(entry.createKmsfDataTableState).toBeDefined();
  expect(entry.copyKmsfCell).toBeDefined();
  expect(entry.pasteKmsfCell).toBeDefined();
});

it("does not expose heavy extension names from the root entry", async () => {
  const entry = await import("../src");

  expect(entry.KmsfExcelExport).toBeUndefined();
  expect(entry.KmsfChartsPanel).toBeUndefined();
  expect(entry.KmsfAiAssistant).toBeUndefined();
});
```

- [ ] **Step 2: Run the focused test**

Run: `npm --workspace=@kmsf/data-table run test:run -- test/public-api-boundary.test.ts`

Expected: PASS for current root exports, then keep this as a guard before adding subpath exports.

- [ ] **Step 3: Define subpath export candidates only after a feature exists**

Use package subpaths such as `@kmsf/data-table/core`, `@kmsf/data-table/clipboard`, and `@kmsf/data-table/virtualization` only when their APIs become stable enough to document. Do not add empty subpaths.

- [ ] **Step 4: Run final gates**

Run: `npm --workspace=@kmsf/data-table run verify:full`

Run: `npm --workspace=@kmsf/data-table run test:perf`

Run: `npm_config_cache=/private/tmp/kmsf-npm-cache npm pack --workspace=@kmsf/data-table --dry-run`

Run: `git diff --check`

Expected: all commands PASS.

## Completion Criteria

- Each risk has a focused RED/GREEN record in `reports/YYYY-MM-DD.md`.
- `verify:full` passes after every behavior milestone.
- `test:perf` passes before claiming large-row performance confidence.
- `npm pack --dry-run` passes after package metadata or export changes.
- `test-results` has no active artifact files after Playwright runs.
- Any skipped verification is reported as a residual risk with the exact blocker.

## Deferred Beyond This Plan

- Server-side row model.
- Grouping, aggregation, pivoting, tree data, and master/detail.
- CSV/Excel import/export.
- Charts integration with `@kmsf/charts`.
- AI assistant extension.
