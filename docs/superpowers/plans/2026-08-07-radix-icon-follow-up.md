# Radix Icon Follow-up And Row Detail Sizing Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make unspecified Row Details auto-size from the current Row height, place a full-size disclosure before Row drag, replace triangle sort glyphs with Radix arrows, document the deferred Filter contract, and keep Column Move source labels visible.

**Architecture:** Keep the public Row Detail callback type and private semantic icon boundary. Represent automatic and fixed Detail modes explicitly in `virtual-layout.ts`, reuse the current measurement/virtual-height pipeline, and add presentation-only leading-control and placeholder-label layers without changing application-owned state or Header pointer behavior.

**Tech Stack:** React 18, TypeScript 7 unstable AST license gate, Radix Icons 1.3.2, Vitest, Playwright Chromium, Vite, Node test runner.

## Global Constraints

- A positive numeric Row Detail height remains exact and fixed.
- Missing, invalid, or `"auto"` Row Detail height uses automatic measurement.
- Automatic measurement uses valid `estimatedRowDetailHeight` first and otherwise the resolved `rowHeight`.
- Disclosure and Row drag each keep a `24px × 24px` slot with `15px × 15px` internal content.
- Disclosure is visually left of Row drag and Cell content whenever Row Expand is enabled.
- Sort uses Radix `ArrowUpIcon` and `ArrowDownIcon`; the unsorted indicator remains visually absent.
- Column Filter remains unimplemented and must not gain a public prop, callback, state, button, or icon import.
- Source placeholders keep the exact column/group name visible while preserving width, semantics, darker dashed styling, ghost, marker, and cancellation behavior.
- Preserve exports (`comins-table`, `/core`, `/clipboard`, `/selection`, `/styles.css`) and do not expose private icons.
- Preserve the user-owned untracked `output/` tree.
- Do not push, create a PR, merge, publish, tag, or create a Release.

---

### Task 1: Make missing and invalid Row Detail heights automatic

**Files:**
- Modify: `src/virtual-layout.ts:3-90`
- Modify: `src/index.tsx:1997-2024, 2145-2169, 3715-3730`
- Modify: `test/virtual-layout.test.ts:20-36`
- Modify: `test/table-interaction.test.tsx:3410-3495`

**Interfaces:**
- Produces: `normalizeCominsDetailHeight(value)` returning `{ mode: "auto" } | { height: number; mode: "fixed" }`.
- Produces: `normalizeCominsDetailEstimate(value, fallbackHeight)` returning a finite positive estimate.
- Consumes: the current resolved `rowHeight` as the automatic fallback estimate.

- [ ] **Step 1: Write failing normalization tests**

```ts
expect(normalizeCominsDetailHeight(240)).toEqual({ height: 240, mode: "fixed" });
expect(normalizeCominsDetailHeight("auto")).toEqual({ mode: "auto" });
expect(normalizeCominsDetailHeight(undefined)).toEqual({ mode: "auto" });
expect(normalizeCominsDetailHeight(0)).toEqual({ mode: "auto" });
expect(normalizeCominsDetailHeight(Number.POSITIVE_INFINITY)).toEqual({ mode: "auto" });
expect(normalizeCominsDetailEstimate(undefined, 36)).toBe(36);
expect(normalizeCominsDetailEstimate(180, 36)).toBe(180);
expect(normalizeCominsDetailEstimate(-1, 42)).toBe(42);
```

- [ ] **Step 2: Write failing rendered-behavior tests**

Replace the legacy 300px-default tests with real DOM behavior:

```tsx
it("auto-sizes an expanded Detail when no height callback is provided", () => {
  const element = renderTableElement(
    <CominsTable
      columns={columns}
      data={rows}
      expandedRowIds={["a"]}
      getRowId={(row) => row.id}
      renderRowDetail={({ row }) => <span>{row.data.name}</span>}
      rowHeight={40}
    />,
  );

  expect(
    element.querySelector<HTMLElement>("[data-testid='row-detail-content-a']")?.style.height,
  ).toBe("");
});
```

Add the following literal cases using the same real `CominsTable` harness:

```tsx
// virtualized missing callback
expect(virtualizedElement.querySelector<HTMLElement>(
  "[data-testid='row-detail-content-a']",
)?.style.height).toBe("");

// invalid callback results
for (const rowId of ["zero", "negative", "nan", "infinity"]) {
  expect(invalidElement.querySelector<HTMLElement>(
    `[data-testid='row-detail-content-${rowId}']`,
  )?.style.height).toBe("");
}

// valid numeric callback
expect(fixedElement.querySelector<HTMLElement>(
  "[data-testid='row-detail-content-a']",
)?.style.height).toBe("96px");
```

- [ ] **Step 3: Run the focused unit tests and verify RED**

```bash
npm run test:run -- test/virtual-layout.test.ts test/table-interaction.test.tsx
```

Expected: the new auto-mode and missing fixed-style assertions fail because current normalization returns a 300px fixed fallback.

- [ ] **Step 4: Implement explicit auto/fixed normalization**

```ts
export function normalizeCominsDetailHeight(
  value: number | "auto" | undefined,
): { mode: "auto" } | { height: number; mode: "fixed" } {
  return typeof value === "number" && Number.isFinite(value) && value > 0
    ? { height: value, mode: "fixed" }
    : { mode: "auto" };
}

export function normalizeCominsDetailEstimate(
  value: number | undefined,
  fallbackHeight: number,
) {
  if (typeof value === "number" && Number.isFinite(value) && value > 0) {
    return value;
  }

  return Math.max(1, fallbackHeight);
}
```

Pass `rowHeight` into every estimate normalization call. Do not apply a fixed inline height for auto mode.
Remove the now-unused private `COMINS_DEFAULT_DETAIL_HEIGHT` and `COMINS_DEFAULT_ROW_DETAIL_HEIGHT` constants and their test import; no 300px fallback remains in production.

- [ ] **Step 5: Run focused unit tests and verify GREEN**

```bash
npm run test:run -- test/virtual-layout.test.ts test/table-interaction.test.tsx
```

- [ ] **Step 6: Commit the Row Detail height contract**

```bash
git add src/virtual-layout.ts src/index.tsx test/virtual-layout.test.ts test/table-interaction.test.tsx
git commit -m "fix: auto-size unspecified Row Details"
```

---

### Task 2: Put full-size disclosure before Row drag

**Files:**
- Modify: `src/index.tsx:3799-4087`
- Modify: `src/row-detail.tsx:6-35`
- Modify: `styles.css:251-311, 786-807`
- Modify: `example/src/styles.css:1321-1342`
- Modify: `test/table-interaction.test.tsx`
- Modify: `test/playwright/specs/row-expand.spec.ts`

**Interfaces:**
- Produces: `.comins-row-leading-controls`, `.comins-row-detail-expander-spacer`, and a `24px` `.comins-row-drag-handle` with a `15px` presentation visual.
- Preserves: existing disclosure and drag `data-testid` values and pointer handlers.

- [ ] **Step 1: Write failing DOM-order and spacer tests**

```ts
const firstCell = element.querySelector("[data-testid='cell-a-name']")!;
const leading = firstCell.querySelector(".comins-row-leading-controls")!;

expect([...leading.children].map((child) => child.getAttribute("data-comins-row-leading-control")))
  .toEqual(["disclosure", "drag"]);
expect(firstCell.querySelector(".comins-row-detail-expander-spacer")).not.toBeNull();
```

Use `isRowExpandable={({ row }) => row.id === "a"}` and assert the second Row directly:

```ts
const secondCell = element.querySelector("[data-testid='cell-b-name']")!;
expect(secondCell.querySelector("[data-testid='row-detail-toggle-b']")).toBeNull();
expect(secondCell.querySelector(".comins-row-detail-expander-spacer")).not.toBeNull();
expect(secondCell.querySelector("[data-comins-row-leading-control='drag']")).not.toBeNull();
```

- [ ] **Step 2: Write failing browser geometry tests**

```ts
const toggle = fixed.getByTestId("row-detail-toggle-fixed-1");
const drag = fixed.getByTestId("row-drag-handle-fixed-1");
const toggleBox = await toggle.boundingBox();
const dragBox = await drag.boundingBox();

expect(toggleBox?.width).toBe(24);
expect(toggleBox?.height).toBe(24);
expect(dragBox?.width).toBe(24);
expect(dragBox?.height).toBe(24);
expect(toggleBox!.x).toBeLessThan(dragBox!.x);
await expect(toggle.locator("svg")).toHaveCSS("width", "15px");
await expect(toggle.locator("svg")).toHaveCSS("height", "15px");
expect(await drag.evaluate((element) => getComputedStyle(element, "::before").width)).toBe("15px");
expect(await drag.evaluate((element) => getComputedStyle(element, "::before").height)).toBe("15px");
```

- [ ] **Step 3: Run focused tests and verify RED**

```bash
npm run test:run -- test/table-interaction.test.tsx
npm run test:e2e -- test/playwright/specs/row-expand.spec.ts --workers=1
```

Expected: current absolute Row drag is left of disclosure, has a `10px × 14px` box, and non-expandable Rows have no disclosure spacer.

- [ ] **Step 4: Render one leading-control group**

```tsx
{columnIndex === 0 && (rowDetailEnabled || rowRuntimeProps.draggable) ? (
  <span className="comins-row-leading-controls">
    {rowDetailEnabled ? (
      rowDetailExpandable ? (
        <CominsRowDetailToggle
          controlsId={rowDetailContentId}
          disabled={!onChangeExpandedRowIds}
          expanded={rowDetailExpanded}
          id={rowDetailToggleId}
          label={`${rowDetailExpanded ? "Collapse" : "Expand"} ${String(entry.rowId)} details`}
          onElement={(element) => {
            if (element) {
              rowDetailToggleElementsRef.current.set(entry.rowId, element);
            } else {
              rowDetailToggleElementsRef.current.delete(entry.rowId);
            }
          }}
          onToggle={() => toggleRowDetail(entry.rowId, rowDetailExpandable)}
          testId={`row-detail-toggle-${String(entry.rowId)}`}
        />
      ) : (
        <span
          aria-hidden="true"
          className="comins-row-detail-expander-spacer"
          data-comins-row-leading-control="disclosure"
        />
      )
    ) : null}
    {rowRuntimeProps.draggable ? (
      <span
        aria-hidden="true"
        className="comins-row-drag-handle"
        data-comins-row-leading-control="drag"
        data-testid={`row-drag-handle-${String(entry.rowId)}`}
        draggable={false}
        onClick={(event) => event.stopPropagation()}
        onMouseDown={(event) => event.stopPropagation()}
        onPointerDown={(event) =>
          beginRowHandlePointerDrag(
            event,
            entry,
            rowRuntimeProps.disabled,
            rowRuntimeProps.draggable,
          )
        }
      />
    ) : null}
  </span>
) : null}
```

Add `data-comins-row-leading-control="disclosure"` directly to the button rendered by `CominsRowDetailToggle`; no new public prop is needed because this component is private.

- [ ] **Step 5: Implement slot and internal-content CSS**

```css
.comins-row-leading-controls {
  align-items: center;
  display: inline-flex;
  gap: 2px;
  margin-right: 4px;
  vertical-align: middle;
}

.comins-row-detail-expander-spacer,
.comins-row-drag-handle {
  flex: 0 0 24px;
  height: 24px;
  width: 24px;
}

.comins-row-drag-handle::before {
  background: radial-gradient(circle, var(--comins-table-accent-strong) 1px, transparent 1.5px) 0 0 / 4px 4px;
  content: "";
  display: block;
  height: 15px;
  width: 15px;
}
```

Center the pseudo-element and remove the legacy absolute positioning and first-Cell left padding. Mirror only the theme-specific dot color in Playground CSS.

- [ ] **Step 6: Run focused tests and verify GREEN**

```bash
npm run test:run -- test/table-interaction.test.tsx
npm run test:e2e -- test/playwright/specs/row-expand.spec.ts --workers=1
```

- [ ] **Step 7: Commit the leading-control layout**

```bash
git add src/index.tsx styles.css example/src/styles.css test/table-interaction.test.tsx test/playwright/specs/row-expand.spec.ts
git commit -m "fix: align Row Expand leading controls"
```

---

### Task 3: Replace triangle sort icons and update license inventory

**Files:**
- Modify: `src/table-icons.tsx:1-26`
- Modify: `THIRD_PARTY_NOTICES.md:17-28`
- Modify: `scripts/check-licenses.mjs:106-120`
- Modify: `test/license-gates.node.mjs:47-58`
- Modify: `test/table-icons.test.tsx`
- Modify: `test/playwright/specs/header-quality.spec.ts:56-86`

**Interfaces:**
- Maps: `sortAscending` to `ArrowUpIcon` and `sortDescending` to `ArrowDownIcon`.
- Preserves: semantic names, `15px` SVG size, and public Header behavior.

- [ ] **Step 1: Change the expected license inventory first**

```ts
const radixCoreExports = [
  "ArrowDownIcon",
  "ArrowUpIcon",
  "CaretSortIcon",
  "ChevronDownIcon",
  "ChevronLeftIcon",
  "ChevronRightIcon",
  "DoubleArrowLeftIcon",
  "DoubleArrowRightIcon",
  "DragHandleDots2Icon",
  "MagnifyingGlassIcon",
];
```

- [ ] **Step 2: Run the license test and verify RED**

```bash
npm run test:licenses
```

Expected: exact source and notice inventory fails because production still imports Triangle icons.

- [ ] **Step 3: Update the semantic mapping and notice**

```tsx
import {
  ArrowDownIcon,
  ArrowUpIcon,
  CaretSortIcon,
  ChevronDownIcon,
  ChevronRightIcon,
  DragHandleDots2Icon,
} from "@radix-ui/react-icons";

const icons = {
  columnMove: DragHandleDots2Icon,
  disclosureCollapsed: ChevronRightIcon,
  disclosureExpanded: ChevronDownIcon,
  sortAscending: ArrowUpIcon,
  sortDescending: ArrowDownIcon,
  sortUnsorted: CaretSortIcon,
} as const;
```

Update the checker and marker-delimited notice inventory in the same alphabetical order. Do not change version, revision, integrity, MIT text, or dependency placement.

- [ ] **Step 4: Preserve semantic and geometry browser assertions**

Keep the browser assertions at the Comins semantic boundary:

```ts
await ageHeader.click();
await expect(indicator.locator("svg[data-comins-icon='sortAscending']")).toHaveCSS("width", "15px");
await expect(indicator.locator("svg[data-comins-icon='sortAscending']")).toHaveCSS("height", "15px");
await ageHeader.click();
await expect(indicator.locator("svg[data-comins-icon='sortDescending']")).toHaveCSS("width", "15px");
await expect(indicator.locator("svg[data-comins-icon='sortDescending']")).toHaveCSS("height", "15px");
```

The fail-closed AST license test proves the concrete `ArrowUpIcon` and `ArrowDownIcon` imports and rejects Triangle inventory drift. Do not add a test-only production attribute.

- [ ] **Step 5: Run focused tests and verify GREEN**

```bash
npm run test:licenses
npm run test:run -- test/table-icons.test.tsx test/table-interaction.test.tsx
npm run test:e2e -- test/playwright/specs/header-quality.spec.ts --workers=1
```

- [ ] **Step 6: Commit arrow and provenance changes**

```bash
git add src/table-icons.tsx THIRD_PARTY_NOTICES.md scripts/check-licenses.mjs test/license-gates.node.mjs test/table-icons.test.tsx test/playwright/specs/header-quality.spec.ts
git commit -m "fix: use directional Header sort arrows"
```

---

### Task 4: Show source names and record deferred Filter guidance

**Files:**
- Modify: `src/index.tsx:3164-3205, 3281-3407`
- Modify: `styles.css:548-558`
- Modify: `test/table-interaction.test.tsx`
- Modify: `test/playwright/specs/header-quality.spec.ts:235-290, 354-385`
- Modify: `docs/user/06-header.md:36-60`
- Modify: `docs/ko/06-header.md:162-182`
- Modify: `test/user-docs.test.ts`

**Interfaces:**
- Produces: `.comins-column-placeholder-label` as presentation-only plain text.
- Preserves: accessible Header content, custom renderer isolation, ghost label, and pointer lifecycle.
- Documents: Column Filter as unavailable future behavior only.

- [ ] **Step 1: Write failing source-label tests**

```ts
const placeholderLabel = ageHeader.locator(".comins-column-placeholder-label");
await expect(placeholderLabel).toBeVisible();
await expect(placeholderLabel).toHaveText("Column2");
await expect(ageHeader.locator(".comins-sort-meta")).toBeHidden();
await expect(ageHeader.locator(".comins-table__header-slot")).toBeHidden();
await expect(ageHeader.getByTestId("resize-age")).toBeHidden();
```

For group movement, use the existing `profileHeader`, `nameHeader`, and `ageGroupHeader` locators:

```ts
await expect(profileHeader.locator(".comins-column-placeholder-label")).toHaveText("Profile");
await expect(nameHeader.locator(".comins-column-placeholder-label")).toHaveText("Name");
await expect(ageGroupHeader.locator(".comins-column-placeholder-label")).toHaveText("Age");
```

- [ ] **Step 2: Write failing documentation assertions**

```ts
expect(englishHeader).toContain("Future Column Filter");
expect(englishHeader).toContain("right edge");
expect(englishHeader).toContain("not shipped");
expect(koreanHeader).toContain("향후 Column Filter");
expect(koreanHeader).toContain("우측");
expect(koreanHeader).toContain("제공하지");
expect(englishHeader).not.toMatch(/filter\??:\s*(true|boolean)/u);
```

- [ ] **Step 3: Run focused tests and verify RED**

```bash
npm run test:run -- test/table-interaction.test.tsx test/user-docs.test.ts
npm run test:e2e -- test/playwright/specs/header-quality.spec.ts --workers=1
```

- [ ] **Step 4: Render dedicated presentation-only labels**

Add this outside `.comins-table__header-content` for group and column cells:

```tsx
<span aria-hidden="true" className="comins-column-placeholder-label">
  {cell.kind === "group" ? cell.group.label : cell.column.label}
</span>
```

Do not reuse a custom Header renderer and do not change the accessible Header name.

- [ ] **Step 5: Update placeholder CSS**

```css
.comins-column-placeholder-label {
  display: none;
}

.comins-table__th[data-column-placeholder="true"] > .comins-column-placeholder-label {
  align-items: center;
  display: flex;
  inset: 0;
  justify-content: center;
  overflow: hidden;
  padding: 0 12px;
  pointer-events: none;
  position: absolute;
  text-overflow: ellipsis;
  white-space: nowrap;
}
```

Keep the existing opacity rule for normal Header content and resize controls.

- [ ] **Step 6: Update English and Korean guidance**

Document the visible source name. Add `Future Column Filter` / `향후 Column Filter` guidance stating that no Filter API is shipped, a future control belongs after sort metadata and before resize, and it must isolate Header events with application-owned controlled state.

- [ ] **Step 7: Run focused tests and verify GREEN**

```bash
npm run test:run -- test/table-interaction.test.tsx test/user-docs.test.ts
npm run test:e2e -- test/playwright/specs/header-quality.spec.ts --workers=1
```

- [ ] **Step 8: Commit placeholder and guidance changes**

```bash
git add src/index.tsx styles.css test/table-interaction.test.tsx test/playwright/specs/header-quality.spec.ts docs/user/06-header.md docs/ko/06-header.md test/user-docs.test.ts
git commit -m "fix: label Column Move placeholders"
```

---

### Task 5: Public docs, performance, package, and browser closure

**Files:**
- Modify: `docs/user/19-row-expand.md`
- Modify: `docs/ko/19-row-expand.md`
- Modify: `CHANGELOG.md`
- Modify: `test/user-docs.test.ts`
- Modify: `reports/2026-08-07.md`

**Interfaces:**
- Documents the exact automatic/fixed contract without adding an icon or Filter API.
- Records only commands and results actually executed.

- [ ] **Step 1: Write failing Row Detail documentation assertions**

```ts
for (const document of [englishRowExpand, koreanRowExpand]) {
  expect(document).toContain("rowHeight");
  expect(document).toContain('"auto"');
  expect(document).not.toContain("default `300px` fixed");
  expect(document).not.toContain("기본 fixed 높이 `300px`");
}
```

- [ ] **Step 2: Run docs test and verify RED**

```bash
npm run test:run -- test/user-docs.test.ts
```

- [ ] **Step 3: Update public docs and changelog**

Use these exact public rules in both languages:

- a positive finite number is fixed;
- missing, invalid, and `"auto"` values are measured automatically;
- a valid explicit estimate is used before measurement;
- otherwise current `rowHeight` is the estimate;
- measurements are cached by owner ID and width;
- width drift returns to the estimate until ResizeObserver reports again.

Add one Unreleased entry covering automatic missing heights, leftmost full-size disclosure, arrow sort icons, visible placeholder labels, and deferred Filter guidance.

- [ ] **Step 4: Run docs and full repository gates**

```bash
npm run test:run -- test/user-docs.test.ts
npm run test:licenses
npm run check:licenses
env npm_config_cache=/tmp/comins-radix-follow-up-npm-cache npm run verify
```

- [ ] **Step 5: Run required performance gate**

```bash
npm run test:perf -- --workers=1
```

Expected: automatic growth, scroll anchoring, bounded Slot updates, and memory counters pass.

- [ ] **Step 6: Run ordinary Chromium E2E**

```bash
npm run test:e2e -- --workers=1
```

- [ ] **Step 7: Verify package and consumer boundary**

```bash
env npm_config_cache=/tmp/comins-radix-follow-up-npm-cache npm run verify:package-artifact
npm run test:consumer -- comins-table-0.1.5.tgz
```

Confirm external Radix, exact updated notice, clean consumer resolution, and no private icon export. Remove only the generated `comins-table-0.1.5.tgz` afterward.

- [ ] **Step 8: Capture actual browser evidence**

Use Chromium at `1280 × 900` and capture:

1. Disclosure left of full-size Row drag with an automatically grown Detail.
2. Header ascending and descending arrow states.
3. Active Column Move with visible source name, ghost icon/name, and drop marker.

Store PNGs outside the user-owned `output/` tree in the current Codex visualization directory.

- [ ] **Step 9: Update the report**

Append `## 2026-08-07 추가 작업: Row Detail 및 Header 후속 보정` with these exact subsections: `작업 일시`, `요약`, `변경 파일`, `로컬 커밋`, `RED/GREEN 근거`, `최종 검증`, `미실행 검증`, and `잔여 리스크`. Populate counts and paths only from command and browser output produced during this execution.

- [ ] **Step 10: Run hygiene and commit docs/report**

```bash
git diff --check
git status --short
git add CHANGELOG.md docs/user/19-row-expand.md docs/ko/19-row-expand.md test/user-docs.test.ts reports/2026-08-07.md
git commit -m "docs: document Row Detail and Header follow-up"
```

- [ ] **Step 11: Verify final tracked state**

```bash
env npm_config_cache=/tmp/comins-radix-follow-up-npm-cache npm run verify
git status --short
git log --oneline -8
```

Expected: the final full gate passes, tracked files are clean, and only pre-existing `?? output/` remains. No remote write is performed.
