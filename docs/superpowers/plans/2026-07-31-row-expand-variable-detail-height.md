# Row Expand and Variable Detail Height Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add controlled flat Row Expand with fixed and automatic Detail heights while keeping ordinary Rows fixed-height and retaining the existing 100,000-Row virtualization fast path.

**Architecture:** Keep application Rows and expansion IDs controlled by the caller. Represent each business Row as one private virtual data Slot whose height is `rowHeight + detailHeight`, render the Detail as a semantic sibling `<tr>`, and activate a Fenwick height index only when an effective expanded Detail makes at least one Slot taller than `rowHeight`. Keep measurement, cache reconciliation, physical/logical scroll mapping, and anchor correction private to the table.

**Tech Stack:** React 18-19 peer range, TypeScript 7, Vitest 4 with jsdom, Playwright 1.61, Vite 8, ResizeObserver, module-owned CSS.

## Global Constraints

- Implement the approved contract in `docs/superpowers/specs/2026-07-31-row-expand-variable-detail-height-design.md`.
- Ordinary owner Rows always remain fixed at `rowHeight`; do not add general variable-height Rows.
- Render Detail content as `<tr><td colSpan><div role="region">`, never as a free `<div>` under `<tr>`.
- Default fixed and estimated Detail height is exactly `300` CSS pixels.
- Accept only a finite positive numeric Detail height or `"auto"`; invalid numeric values fall back to `300`.
- Keep `expandedRowIds` controlled and preserve dormant IDs across sorting, pagination, and loaded-row projection changes.
- Do not expose Row Detail props on `CominsTreeTableProps<TData>`.
- Keep `getCominsVirtualRows` and `CominsVirtualRowsOptions` source-compatible.
- Preserve the physical Scroll Height cap at exactly `1_500_000` pixels.
- Use one shared ResizeObserver per table instance and observe only mounted `"auto"` Detail content blocks.
- Do not add or upgrade dependencies, add package subpaths, change package version `0.1.5`, or alter existing export keys.
- Keep external comparison and benchmark material outside tracked files.
- Do not push, publish, tag, create a Release, or mutate remote settings.

---

## File Map

| File | Responsibility |
| --- | --- |
| `src/virtual-layout.ts` | Private Slot types, Detail height normalization, Fenwick height index, physical/logical mapping, range lookup, and anchor resolution. |
| `src/row-detail.tsx` | Internal disclosure control and semantic Detail Row rendering with focus-safe unmount behavior. |
| `src/index.tsx` | Public Row Detail props, controlled transitions, Slot projection, virtual window selection, measurement coordination, and owner/Detail rendering. |
| `styles.css` | Detail theme variables, disclosure, Detail Row, content box, and scroll-anchor styles. |
| `tsconfig.json` | Include compile-only API fixtures in `npm run lint`. |
| `test/virtual-layout.test.ts` | Pure height-index, mapping, normalization, cache, and anchor tests. |
| `test/typecheck/row-expand-api.tsx` | Compile-time flat/Tree Row Detail API contract. |
| `test/table-interaction.test.tsx` | Controlled interaction, semantic DOM, event isolation, measurement, compatibility, and focus tests. |
| `test/public-api.test.tsx` | Root public type usage and Tree rejection examples. |
| `example/src/features/RowExpandFeature.tsx` | Controlled fixed and automatic Detail examples. |
| `example/src/features/BodyFeature.tsx` | Query-selected 100,000-Row Detail performance fixture. |
| `example/src/features/featureRegistry.tsx` | Row Expand feature registration and option descriptions. |
| `example/src/features/types.ts` | `row-expand` feature ID. |
| `example/src/docs/codeSamples.ts` | Row Expand example code used by the docs route. |
| `example/src/docs/docsRoutes.tsx` | `/examples/row-expand` runnable documentation route. |
| `example/src/docs/dataTableOptionGuide.ts` | Implemented Row Detail props and removal of the stale roadmap entry. |
| `example/src/features/AdvancedFeature.tsx` | Remove Flat Row Expand and master/detail from the unavailable list. |
| `docs/user/19-row-expand.md`, `docs/ko/19-row-expand.md` | Matching public Row Expand guides. |
| `docs/user/11-virtualization.md`, `docs/ko/11-virtualization.md` | Fixed fast path and mixed Detail virtualization boundary. |
| `README.md` | Root API example and Row Expand capability summary. |
| `test/user-docs.test.ts` | Documentation and Playground discoverability assertions. |
| `test/playwright/specs/row-expand.spec.ts` | Browser behavior, accessibility, measurement, bounded scrolling, and feature-level performance. |
| `test/playwright/specs/virtualization.spec.ts` | Existing fixed-path regression and 100,000-Row mixed-height checks. |
| `test/playwright/specs/memory-leak-full-audit.spec.ts` | Route-away recovery after repeated expand, measure, collapse, and resize cycles. |
| `reports/2026-07-31.md` | Exact commands, outcomes, failure classification, and residual risk. |

### Task 1: Build the private virtual layout primitives

**Files:**
- Create: `src/virtual-layout.ts`
- Create: `test/virtual-layout.test.ts`

**Interfaces:**
- Produces:

```ts
export const COMINS_DEFAULT_DETAIL_HEIGHT = 300;
export const COMINS_MAX_PHYSICAL_TOTAL_HEIGHT = 1_500_000;

export type CominsDataVirtualSlot<TData> = {
  dataIndex: number;
  detail?: {
    estimated: boolean;
    height: number;
    mode: "auto" | "fixed";
  };
  key: string;
  kind: "data";
  row: TData;
  rowId: CominsRowId;
  visibleIndex: number;
};

export type CominsGroupVirtualSlot = {
  groupId: string;
  height: number;
  key: string;
  kind: "group";
};

export type CominsVirtualSlot<TData> =
  | CominsDataVirtualSlot<TData>
  | CominsGroupVirtualSlot;

export class CominsHeightIndex {
  static from(heights: readonly number[]): CominsHeightIndex;
  getHeight(index: number): number;
  getPrefixHeight(endExclusive: number): number;
  getTotalHeight(): number;
  findIndexAtOffset(offset: number): number;
  updateHeight(index: number, height: number): number;
}

export type CominsVirtualRange = {
  endIndex: number;
  logicalScrollTop: number;
  logicalStartOffset: number;
  physicalScrollHeight: number;
  renderOffset: number;
  scrollScale: number;
  startIndex: number;
};

export type CominsScrollAnchor = {
  key: string;
  offsetWithinSlot: number;
  previousIndex: number;
};
```

- Consumes only `CominsRowId` as a type from `src/core.ts`.
- `src/virtual-layout.ts` remains private: do not export it from `src/index.tsx`, `vite.config.ts`, or `package.json`.

- [ ] **Step 1: Write failing normalization and height-index tests**

Create `test/virtual-layout.test.ts` with these initial cases:

```ts
import { describe, expect, it } from "vitest";

import {
  COMINS_DEFAULT_DETAIL_HEIGHT,
  CominsHeightIndex,
  normalizeCominsDetailEstimate,
  normalizeCominsDetailHeight,
} from "../src/virtual-layout";

describe("virtual layout", () => {
  it("normalizes fixed, automatic, and invalid detail heights", () => {
    expect(normalizeCominsDetailHeight(240)).toEqual({ height: 240, mode: "fixed" });
    expect(normalizeCominsDetailHeight("auto")).toEqual({
      height: COMINS_DEFAULT_DETAIL_HEIGHT,
      mode: "auto",
    });
    expect(normalizeCominsDetailHeight(0)).toEqual({
      height: COMINS_DEFAULT_DETAIL_HEIGHT,
      mode: "fixed",
    });
    expect(normalizeCominsDetailHeight(Number.POSITIVE_INFINITY)).toEqual({
      height: COMINS_DEFAULT_DETAIL_HEIGHT,
      mode: "fixed",
    });
    expect(normalizeCominsDetailEstimate(-1)).toBe(COMINS_DEFAULT_DETAIL_HEIGHT);
  });

  it("supports prefix, total, lower-bound, and logarithmic updates", () => {
    const index = CominsHeightIndex.from([36, 336, 72, 36]);

    expect(index.getTotalHeight()).toBe(480);
    expect(index.getPrefixHeight(0)).toBe(0);
    expect(index.getPrefixHeight(2)).toBe(372);
    expect(index.findIndexAtOffset(0)).toBe(0);
    expect(index.findIndexAtOffset(35)).toBe(0);
    expect(index.findIndexAtOffset(36)).toBe(1);
    expect(index.findIndexAtOffset(479)).toBe(3);
    expect(index.updateHeight(1, 436)).toBe(100);
    expect(index.getTotalHeight()).toBe(580);
    expect(index.getPrefixHeight(2)).toBe(472);
  });
});
```

- [ ] **Step 2: Run the focused test and confirm RED**

Run:

```bash
npm run test:run -- test/virtual-layout.test.ts
```

Expected: FAIL because `src/virtual-layout.ts` does not exist.

- [ ] **Step 3: Implement height normalization and the Fenwick index**

Create `src/virtual-layout.ts`. Use finite positive normalization and a 1-based Fenwick array:

```ts
import type { CominsRowId } from "./core";

export const COMINS_DEFAULT_DETAIL_HEIGHT = 300;
export const COMINS_MAX_PHYSICAL_TOTAL_HEIGHT = 1_500_000;

export function normalizeCominsDetailEstimate(value: number | undefined) {
  return typeof value === "number" && Number.isFinite(value) && value > 0
    ? value
    : COMINS_DEFAULT_DETAIL_HEIGHT;
}

export function normalizeCominsDetailHeight(
  value: number | "auto" | undefined,
): { height: number; mode: "auto" | "fixed" } {
  if (value === "auto") {
    return { height: COMINS_DEFAULT_DETAIL_HEIGHT, mode: "auto" };
  }

  return {
    height:
      typeof value === "number" && Number.isFinite(value) && value > 0
        ? value
        : COMINS_DEFAULT_DETAIL_HEIGHT,
    mode: "fixed",
  };
}

export class CominsHeightIndex {
  private readonly heights: Float64Array;
  private readonly tree: Float64Array;
  private totalHeight: number;

  private constructor(heights: readonly number[]) {
    this.heights = Float64Array.from(heights, (height) => Math.max(0, height));
    this.tree = new Float64Array(this.heights.length + 1);
    this.totalHeight = 0;

    for (let index = 0; index < this.heights.length; index += 1) {
      const cursor = index + 1;
      const height = this.heights[index] ?? 0;
      const parent = cursor + (cursor & -cursor);

      this.tree[cursor] = (this.tree[cursor] ?? 0) + height;
      this.totalHeight += height;

      if (parent < this.tree.length) {
        this.tree[parent] =
          (this.tree[parent] ?? 0) + (this.tree[cursor] ?? 0);
      }
    }
  }

  static from(heights: readonly number[]) {
    return new CominsHeightIndex(heights);
  }

  private add(index: number, delta: number) {
    for (let cursor = index + 1; cursor < this.tree.length; cursor += cursor & -cursor) {
      this.tree[cursor] = (this.tree[cursor] ?? 0) + delta;
    }
  }

  getHeight(index: number) {
    return this.heights[index] ?? 0;
  }

  getPrefixHeight(endExclusive: number) {
    let total = 0;

    for (
      let cursor = Math.min(this.heights.length, Math.max(0, endExclusive));
      cursor > 0;
      cursor -= cursor & -cursor
    ) {
      total += this.tree[cursor] ?? 0;
    }

    return total;
  }

  getTotalHeight() {
    return this.totalHeight;
  }

  findIndexAtOffset(offset: number) {
    if (this.heights.length === 0 || this.totalHeight <= 0) {
      return 0;
    }

    const target = Math.min(
      Math.max(0, offset),
      Math.max(0, this.getTotalHeight() - Number.EPSILON),
    );
    let treeIndex = 0;
    let prefix = 0;
    let bit = 1;

    while (bit * 2 < this.tree.length) {
      bit *= 2;
    }

    for (; bit > 0; bit = Math.floor(bit / 2)) {
      const next = treeIndex + bit;
      const nextPrefix = prefix + (this.tree[next] ?? 0);

      if (next < this.tree.length && nextPrefix <= target) {
        treeIndex = next;
        prefix = nextPrefix;
      }
    }

    return Math.min(this.heights.length - 1, treeIndex);
  }

  updateHeight(index: number, height: number) {
    const next = Math.max(0, height);
    const current = this.heights[index];

    if (current === undefined) {
      return 0;
    }

    const delta = next - current;
    this.heights[index] = next;
    this.totalHeight += delta;
    this.add(index, delta);
    return delta;
  }
}
```

Add the Slot types from the Interfaces block after the constants.

- [ ] **Step 4: Run the focused test and confirm GREEN**

Run:

```bash
npm run test:run -- test/virtual-layout.test.ts
```

Expected: PASS for normalization and index behavior.

- [ ] **Step 5: Add failing physical mapping, range, cache, and anchor tests**

Extend `test/virtual-layout.test.ts`:

```ts
it("maps a mixed logical range into the bounded physical scrollbar", () => {
  const index = CominsHeightIndex.from([36, 2_000_000, 36]);
  const range = getCominsMixedVirtualRange({
    heightIndex: index,
    overscan: 1,
    physicalScrollTop: 750_000,
    viewportHeight: 600,
  });

  expect(range.physicalScrollHeight).toBe(COMINS_MAX_PHYSICAL_TOTAL_HEIGHT);
  expect(range.scrollScale).toBeGreaterThan(1);
  expect(range.startIndex).toBe(0);
  expect(range.endIndex).toBe(3);
  expect(Number.isFinite(range.renderOffset)).toBe(true);
});

it("uses a width-matched automatic measurement and evicts removed row ids", () => {
  const cache = new Map([
    ["a", { height: 420, width: 800 }],
    ["stale", { height: 100, width: 800 }],
  ]);

  expect(resolveCominsMeasuredDetailHeight(cache, "a", 800, 300)).toEqual({
    estimated: false,
    height: 420,
  });
  expect(resolveCominsMeasuredDetailHeight(cache, "a", 640, 300)).toEqual({
    estimated: true,
    height: 300,
  });
  reconcileCominsDetailMeasurements(cache, new Set(["a"]));
  expect([...cache.keys()]).toEqual(["a"]);
});

it("falls back to the nearest surviving slot when an anchor disappears", () => {
  const previousKeys = ["data:a", "data:b", "data:c"];
  const nextKeys = ["data:a", "data:c"];
  const anchor = { key: "data:b", offsetWithinSlot: 12, previousIndex: 1 };
  const nextIndex = CominsHeightIndex.from([36, 72]);

  expect(
    resolveCominsAnchorLogicalScrollTop({
      anchor,
      nextHeightIndex: nextIndex,
      nextKeys,
      previousKeys,
    }),
  ).toBe(36);
});
```

- [ ] **Step 6: Implement physical mapping, cache, and anchor helpers**

Add these functions to `src/virtual-layout.ts`:

```ts
export type CominsDetailMeasurement = {
  height: number;
  width: number;
};

export function getCominsSlotHeight<TData>(
  slot: CominsVirtualSlot<TData>,
  rowHeight: number,
) {
  return slot.kind === "group"
    ? slot.height
    : rowHeight + (slot.detail?.height ?? 0);
}

export function getCominsScrollScale(
  logicalTotalHeight: number,
  viewportHeight: number,
) {
  const physicalScrollHeight = Math.min(
    logicalTotalHeight,
    COMINS_MAX_PHYSICAL_TOTAL_HEIGHT,
  );
  const logicalScrollableHeight = Math.max(0, logicalTotalHeight - viewportHeight);
  const physicalScrollableHeight = Math.max(0, physicalScrollHeight - viewportHeight);
  const scrollScale =
    logicalScrollableHeight > 0 && physicalScrollableHeight > 0
      ? logicalScrollableHeight / physicalScrollableHeight
      : 1;

  return {
    logicalScrollableHeight,
    physicalScrollableHeight,
    physicalScrollHeight,
    scrollScale,
  };
}

export function getCominsMixedVirtualRange(input: {
  heightIndex: CominsHeightIndex;
  overscan: number;
  physicalScrollTop: number;
  viewportHeight: number;
}): CominsVirtualRange {
  const metrics = getCominsScrollScale(
    input.heightIndex.getTotalHeight(),
    input.viewportHeight,
  );
  const logicalScrollTop = Math.min(
    metrics.logicalScrollableHeight,
    Math.max(0, input.physicalScrollTop) * metrics.scrollScale,
  );
  const firstVisibleIndex = input.heightIndex.findIndexAtOffset(logicalScrollTop);
  const lastVisibleIndex = input.heightIndex.findIndexAtOffset(
    logicalScrollTop + Math.max(0, input.viewportHeight),
  );
  const startIndex = Math.max(0, firstVisibleIndex - Math.max(0, input.overscan));
  const endIndex = Math.min(
    lastVisibleIndex + Math.max(0, input.overscan) + 1,
    input.heightIndex.findIndexAtOffset(Number.POSITIVE_INFINITY) + 1,
  );
  const logicalStartOffset = input.heightIndex.getPrefixHeight(startIndex);

  return {
    endIndex,
    logicalScrollTop,
    logicalStartOffset,
    physicalScrollHeight: metrics.physicalScrollHeight,
    renderOffset:
      Math.max(0, input.physicalScrollTop) -
      (logicalScrollTop - logicalStartOffset),
    scrollScale: metrics.scrollScale,
    startIndex,
  };
}

export function resolveCominsMeasuredDetailHeight(
  cache: ReadonlyMap<CominsRowId, CominsDetailMeasurement>,
  rowId: CominsRowId,
  width: number,
  estimate: number,
) {
  const measurement = cache.get(rowId);

  return measurement && measurement.width === Math.round(width)
    ? { estimated: false, height: measurement.height }
    : { estimated: true, height: estimate };
}

export function reconcileCominsDetailMeasurements(
  cache: Map<CominsRowId, CominsDetailMeasurement>,
  rowIds: ReadonlySet<CominsRowId>,
) {
  for (const rowId of cache.keys()) {
    if (!rowIds.has(rowId)) {
      cache.delete(rowId);
    }
  }
}
```

Implement `captureCominsScrollAnchor`, `resolveCominsAnchorLogicalScrollTop`, and `getCominsPhysicalScrollTop` with the approved search order: same key, nearest previous surviving key, nearest next surviving key, then zero. Clamp the preserved intra-Slot offset to the next Slot height.

- [ ] **Step 7: Run the full pure test and commit**

Run:

```bash
npm run test:run -- test/virtual-layout.test.ts
```

Expected: PASS.

Commit:

```bash
git add src/virtual-layout.ts test/virtual-layout.test.ts
git commit -m "feat: add mixed virtual layout primitives"
```

### Task 2: Add the controlled public API and non-virtualized semantic Detail Rows

**Files:**
- Create: `src/row-detail.tsx`
- Create: `test/typecheck/row-expand-api.tsx`
- Modify: `tsconfig.json`
- Modify: `src/index.tsx:180-286,1038-1140,2745-3083,3165-3286`
- Modify: `styles.css:1-65,246-280,408-495`
- Modify: `test/public-api.test.tsx`
- Modify: `test/table-interaction.test.tsx`

**Interfaces:**
- Produces the approved public types and props:

```ts
export type CominsRowDetailParams<TData> = {
  row: CominsEventRow<TData>;
};

export type CominsRowDetailHeight = number | "auto";

export type CominsRowDetailProps<TData> = {
  estimatedRowDetailHeight?: number;
  expandedRowIds?: readonly CominsRowId[];
  getRowDetailHeight?: (
    params: CominsRowDetailParams<TData>,
  ) => CominsRowDetailHeight;
  isRowExpandable?: (
    params: CominsRowDetailParams<TData>,
  ) => boolean;
  onChangeExpandedRowIds?: (
    rowIds: CominsRowId[],
  ) => void;
  renderRowDetail?: (
    params: CominsRowDetailParams<TData>,
  ) => React.ReactNode;
};
```

- `CominsTableProps<TData>` intersects the flat base with `CominsRowDetailProps<TData>`.
- `CominsTreeTableProps<TData>` omits every key in `CominsRowDetailProps<TData>` and redeclares each as `never`.
- `src/row-detail.tsx` is private and consumes resolved IDs, height, content, toggle callback, and a Detail content ref callback.

- [ ] **Step 1: Activate compile-only fixtures and write the failing API contract**

Change `tsconfig.json`:

```json
"include": ["src", "test/typecheck", "vite.config.ts"]
```

Create `test/typecheck/row-expand-api.tsx`:

```tsx
import {
  CominsTable,
  type CominsTableProps,
  type CominsTreeNode,
  type CominsTreeTableProps,
} from "../../src";

type Row = { id: string; name: string };

const flatProps = {
  columns: [{ field: "name", label: "Name" }],
  data: [{ id: "a", name: "Alpha" }],
  estimatedRowDetailHeight: 180,
  expandedRowIds: ["a"],
  getRowDetailHeight: ({ row }) => (row.id === "a" ? "auto" : 240),
  getRowId: (row) => row.id,
  isRowExpandable: ({ row }) => row.data.name.length > 0,
  onChangeExpandedRowIds: (_rowIds) => undefined,
  renderRowDetail: ({ row }) => <div>{row.data.name}</div>,
} satisfies CominsTableProps<Row>;

const treeData: CominsTreeNode<Row>[] = [{ item: { id: "root", name: "Root" } }];

const treeProps: CominsTreeTableProps<Row> = {
  columns: [{ field: "name", label: "Name" }],
  data: treeData,
  getRowId: (row) => row.id,
  tree: true,
  // @ts-expect-error Tree Grid does not accept flat Row Detail rendering.
  renderRowDetail: ({ row }) => <div>{row.data.name}</div>,
};

void <CominsTable {...flatProps} />;
void treeProps;
```

- [ ] **Step 2: Run lint and confirm RED**

Run:

```bash
npm run lint
```

Expected: FAIL because Row Detail props and types are absent and the `@ts-expect-error` is not yet attached to a rejected property.

- [ ] **Step 3: Add the public types and Tree exclusions**

In `src/index.tsx`, add the Interfaces types immediately after Row event payload types. Add the six props to the flat base. Extend the `CominsTreeTableProps<TData>` `Omit` key union and explicit `never` properties with:

```ts
estimatedRowDetailHeight?: never;
expandedRowIds?: never;
getRowDetailHeight?: never;
isRowExpandable?: never;
onChangeExpandedRowIds?: never;
renderRowDetail?: never;
```

In `CominsTreeTableInner`, destructure these six runtime properties to private underscore names before spreading `props`, ensuring untyped JavaScript callers cannot forward them into `CominsTableInner`.

- [ ] **Step 4: Add failing controlled DOM tests**

Add focused cases to `test/table-interaction.test.tsx`:

```tsx
it("renders controlled fixed details as a semantic sibling row", () => {
  const onChangeExpandedRowIds = vi.fn();
  const element = renderTableElement(
    <CominsTable
      columns={columns}
      data={rows}
      expandedRowIds={["a", "missing", "a"]}
      getRowDetailHeight={() => 180}
      getRowId={(row) => row.id}
      onChangeExpandedRowIds={onChangeExpandedRowIds}
      renderRowDetail={({ row }) => <button>{`Detail ${row.id}`}</button>}
    />,
  );

  const owner = element.querySelector("[data-testid='row-a']");
  const detail = element.querySelector("[data-detail-for='a']");

  expect(owner?.nextElementSibling).toBe(detail);
  expect(detail?.tagName).toBe("TR");
  expect(detail?.querySelector("td")?.colSpan).toBe(2);
  expect(detail?.querySelector("[role='region']")).not.toBeNull();
  expect(
    element.querySelector("[data-testid='row-detail-content-a']")?.getAttribute("style"),
  ).toContain("height: 180px");

  act(() => {
    element
      .querySelector<HTMLButtonElement>("[data-testid='row-detail-toggle-a']")
      ?.click();
  });

  expect(onChangeExpandedRowIds).toHaveBeenLastCalledWith(["missing"]);
});

it("keeps a controlled disclosure read-only without its change callback", () => {
  const element = renderTableElement(
    <CominsTable
      columns={columns}
      data={rows}
      expandedRowIds={["a"]}
      getRowId={(row) => row.id}
      renderRowDetail={({ row }) => <span>{row.data.name}</span>}
    />,
  );

  expect(
    element.querySelector<HTMLButtonElement>("[data-testid='row-detail-toggle-a']")
      ?.disabled,
  ).toBe(true);
});
```

Add cases for `isRowExpandable=false`, disclosure click event isolation, no Detail for missing IDs, and a `null` renderer retaining fixed height.

- [ ] **Step 5: Implement normalized controlled transitions**

Inside `CominsTableInner`, destructure all six props and derive:

```ts
const rowDetailEnabled = typeof renderRowDetail === "function" && !treeContext;
const normalizedExpandedRowIds = useMemo(() => {
  const seen = new Set<CominsRowId>();

  return (expandedRowIds ?? []).filter((rowId) => {
    if (seen.has(rowId)) {
      return false;
    }

    seen.add(rowId);
    return true;
  });
}, [expandedRowIds]);
const expandedRowIdSet = useMemo(
  () => new Set(normalizedExpandedRowIds),
  [normalizedExpandedRowIds],
);

const toggleRowDetail = (
  rowId: CominsRowId,
  expandable: boolean,
) => {
  if (!rowDetailEnabled || !expandable || !onChangeExpandedRowIds) {
    return;
  }

  onChangeExpandedRowIds(
    expandedRowIdSet.has(rowId)
      ? normalizedExpandedRowIds.filter((current) => current !== rowId)
      : [...normalizedExpandedRowIds, rowId],
  );
};
```

Use `createEventRow(entry)` once per owner to build `CominsRowDetailParams<TData>`. Do not write expansion state into `CominsTableState` or `TData`.

- [ ] **Step 6: Implement the internal disclosure and Detail Row**

Create `src/row-detail.tsx` with:

```tsx
import { useLayoutEffect, useRef } from "react";
import type * as React from "react";

export function CominsRowDetailToggle(props: {
  controlsId?: string;
  disabled: boolean;
  expanded: boolean;
  label: string;
  onToggle: () => void;
  testId: string;
}) {
  return (
    <button
      aria-controls={props.expanded ? props.controlsId : undefined}
      aria-expanded={props.expanded}
      aria-label={props.label}
      className="comins-row-detail-expander"
      data-testid={props.testId}
      disabled={props.disabled}
      onClick={(event) => {
        event.preventDefault();
        event.stopPropagation();
        props.onToggle();
      }}
      onMouseDown={(event) => event.stopPropagation()}
      onPointerDown={(event) => event.stopPropagation()}
      type="button"
    >
      {props.expanded ? "▾" : "▸"}
    </button>
  );
}

export function CominsRowDetailRow(props: {
  children: React.ReactNode;
  colSpan: number;
  contentId: string;
  fixedHeight?: number;
  labelId: string;
  onContentElement: (element: HTMLDivElement | null) => void;
  ownerId: string;
  testId: string;
  toggleElement: HTMLButtonElement | null;
}) {
  const contentRef = useRef<HTMLDivElement | null>(null);

  useLayoutEffect(
    () => () => {
      if (
        contentRef.current &&
        contentRef.current.contains(document.activeElement)
      ) {
        props.toggleElement?.focus();
      }
    },
    [props.toggleElement],
  );

  return (
    <tr
      className="comins-table__detail-row"
      data-detail-for={props.ownerId}
    >
      <td
        className="comins-table__detail-cell"
        colSpan={Math.max(1, props.colSpan)}
      >
        <div
          aria-labelledby={props.labelId}
          className="comins-table__detail-content"
          data-testid={props.testId}
          id={props.contentId}
          ref={(element) => {
            contentRef.current = element;
            props.onContentElement(element);
          }}
          role="region"
          style={
            props.fixedHeight === undefined
              ? undefined
              : { height: props.fixedHeight }
          }
        >
          {props.children}
        </div>
      </td>
    </tr>
  );
}
```

Generate DOM-safe IDs from `useId()` plus a typed, percent-encoded Row ID token. Keep button element refs by Row ID so collapse cleanup can restore focus.

In the first visible owner Cell, render `CominsRowDetailToggle` before the existing row drag handle. After the owner `<tr>`, render `CominsRowDetailRow` only for effective expanded owners.

- [ ] **Step 7: Add Detail CSS**

Add root variables:

```css
--comins-table-detail-background: var(--comins-table-surface);
--comins-table-detail-border: var(--comins-table-row-border);
--comins-table-detail-padding: 12px;
```

Add module-scoped rules:

```css
.comins-row-detail-expander {
  align-items: center;
  background: transparent;
  border: 0;
  color: var(--comins-table-accent-strong);
  cursor: pointer;
  display: inline-flex;
  flex: 0 0 18px;
  font: inherit;
  height: 18px;
  justify-content: center;
  margin-right: 4px;
  padding: 0;
  width: 18px;
}

.comins-row-detail-expander:focus-visible {
  box-shadow: 0 0 0 3px var(--comins-table-focus);
  outline: none;
}

.comins-table__detail-cell {
  border: 0;
  height: auto;
  overflow: visible;
  padding: 0;
}

.comins-table__detail-content {
  background: var(--comins-table-detail-background);
  border-bottom: 1px solid var(--comins-table-detail-border);
  border-right: 1px solid var(--comins-table-detail-border);
  box-sizing: border-box;
  overflow: auto;
  padding: var(--comins-table-detail-padding);
}
```

- [ ] **Step 8: Run focused API and DOM checks**

Run:

```bash
npm run lint
npm run test:run -- test/public-api.test.tsx test/table-interaction.test.tsx
```

Expected: PASS.

- [ ] **Step 9: Commit the controlled fixed Detail slice**

```bash
git add tsconfig.json src/index.tsx src/row-detail.tsx styles.css test/typecheck/row-expand-api.tsx test/public-api.test.tsx test/table-interaction.test.tsx
git commit -m "feat: add controlled row detail rendering"
```

### Task 3: Integrate fixed Details with mixed-height virtualization

**Files:**
- Modify: `src/virtual-layout.ts`
- Modify: `src/index.tsx:267-315,1420-1472,1540-1596,2681-3113`
- Modify: `styles.css:282-302,413-428`
- Modify: `test/virtual-layout.test.ts`
- Modify: `test/table-interaction.test.tsx`

**Interfaces:**
- Consumes `CominsDataVirtualSlot`, `CominsGroupVirtualSlot`, `CominsHeightIndex`, `getCominsMixedVirtualRange`, and the existing fixed arithmetic.
- Produces one `rowWindow` shape for both paths:

```ts
type CominsVirtualWindow<TData> = {
  mixed: boolean;
  renderOffset: number;
  scrollHeight: number;
  slots: Array<CominsVirtualSlot<TData>>;
};
```

- The fixed path creates only the rendered data Slots.
- The mixed path creates the full Slot projection and one height index.

- [ ] **Step 1: Write failing fixed/mixed window tests**

Add pure Slot construction coverage to `test/virtual-layout.test.ts`:

```ts
it("keeps collapsed data slots at rowHeight and adds fixed detail height", () => {
  const collapsed = createCominsDataVirtualSlot({
    dataIndex: 0,
    detail: null,
    row: { id: "a" },
    rowHeight: 36,
    rowId: "a",
    visibleIndex: 0,
  });
  const expanded = createCominsDataVirtualSlot({
    dataIndex: 1,
    detail: { estimated: false, height: 300, mode: "fixed" },
    row: { id: "b" },
    rowHeight: 36,
    rowId: "b",
    visibleIndex: 1,
  });

  expect(getCominsSlotHeight(collapsed, 36)).toBe(36);
  expect(getCominsSlotHeight(expanded, 36)).toBe(336);
  expect(collapsed.key).not.toBe(expanded.key);
});
```

Add a jsdom case to `test/table-interaction.test.tsx` that renders 100 Rows with `virtualized`, expands one fixed Detail, sets viewport geometry, dispatches scroll, and asserts:

- the Detail owner remains mounted when the viewport starts inside the Detail;
- the virtual sizer height includes the Detail;
- rendered business Row count stays bounded;
- collapsing restores fixed arithmetic height.

- [ ] **Step 2: Run focused tests and confirm RED**

Run:

```bash
npm run test:run -- test/virtual-layout.test.ts test/table-interaction.test.tsx
```

Expected: FAIL because Slot construction and the mixed `rowWindow` are absent.

- [ ] **Step 3: Add exact Slot construction**

Add to `src/virtual-layout.ts`:

```ts
export function getCominsDataSlotKey(rowId: CominsRowId) {
  return `data:${typeof rowId}:${encodeURIComponent(String(rowId))}`;
}

export function createCominsDataVirtualSlot<TData>(input: {
  dataIndex: number;
  detail: CominsDataVirtualSlot<TData>["detail"] | null;
  row: TData;
  rowHeight: number;
  rowId: CominsRowId;
  visibleIndex: number;
}): CominsDataVirtualSlot<TData> {
  return {
    dataIndex: input.dataIndex,
    ...(input.detail ? { detail: input.detail } : {}),
    key: getCominsDataSlotKey(input.rowId),
    kind: "data",
    row: input.row,
    rowId: input.rowId,
    visibleIndex: input.visibleIndex,
  };
}
```

Keep `rowHeight` in the input only for call-site symmetry; Slot height remains derived by `getCominsSlotHeight`.

- [ ] **Step 4: Refactor the virtual window with an explicit fast-path branch**

In `src/index.tsx`, derive full sorted owner indexes once:

```ts
const projectedDataIndexes = useMemo(
  () => sortedRowIndexes ?? state.rows.map((_row, index) => index),
  [sortedRowIndexes, state.rows],
);
```

Resolve effective expanded owners without pruning controlled IDs:

```ts
const effectiveExpandedRowIdSet = useMemo(() => {
  if (!rowDetailEnabled) {
    return new Set<CominsRowId>();
  }

  const next = new Set<CominsRowId>();

  projectedDataIndexes.forEach((dataIndex, visibleIndex) => {
    const row = state.rows[dataIndex];
    const rowId = state.rowIds[dataIndex];

    if (row === undefined || rowId === undefined || !expandedRowIdSet.has(rowId)) {
      return;
    }

    const entry = { dataIndex, row, rowId, visibleIndex };
    const params = { row: createEventRow(entry) };

    if (isRowExpandable?.(params) !== false) {
      next.add(rowId);
    }
  });

  return next;
}, [
  expandedRowIdSet,
  isRowExpandable,
  projectedDataIndexes,
  rowDetailEnabled,
  state.rowIds,
  state.rows,
]);
```

Use the current arithmetic branch when `effectiveExpandedRowIdSet.size === 0`. Do not allocate a full height array or `CominsHeightIndex` on that branch.

For the mixed branch:

1. Build one `CominsDataVirtualSlot` per projected owner.
2. Resolve fixed height or estimated automatic height.
3. Build `CominsHeightIndex.from(slots.map(getCominsSlotHeight))`.
4. Call `getCominsMixedVirtualRange`.
5. Slice Slots from `startIndex` through `endIndex`.
6. Render owner and Detail `<tr>` elements from each sliced data Slot.
7. Use `slot.key` as the mixed Fragment key.

Keep non-virtualized pagination slicing before Detail rendering and do not create a height index there.

- [ ] **Step 5: Own virtual scroll anchoring**

Add:

```css
.comins-table__body-viewport[data-virtualized="true"] {
  overflow-anchor: none;
}
```

Before rebuilding a mixed projection, capture the first visible Slot key and logical intra-Slot offset. In `useLayoutEffect`, compare the prior and next projection and set:

```ts
const nextPhysicalScrollTop = getCominsPhysicalScrollTop(
  nextLogicalScrollTop,
  nextHeightIndex.getTotalHeight(),
  viewport.clientHeight,
);

viewport.scrollTop = nextPhysicalScrollTop;
pendingScrollTopRef.current = nextPhysicalScrollTop;
setScrollTop(nextPhysicalScrollTop);
```

Coalesce this correction with the current scroll animation-frame scheduling and clamp to the legal physical range.

- [ ] **Step 6: Run focused mixed-height tests**

Run:

```bash
npm run test:run -- test/virtual-layout.test.ts test/table-interaction.test.tsx
```

Expected: PASS, including the unchanged default virtual buffer test.

- [ ] **Step 7: Commit the fixed mixed-height path**

```bash
git add src/virtual-layout.ts src/index.tsx styles.css test/virtual-layout.test.ts test/table-interaction.test.tsx
git commit -m "feat: virtualize fixed row details"
```

### Task 4: Add automatic measurement, width-aware cache, and correction

**Files:**
- Modify: `src/index.tsx:1086-1340,1420-1472,2681-3113`
- Modify: `src/row-detail.tsx`
- Modify: `src/virtual-layout.ts`
- Modify: `test/table-interaction.test.tsx`
- Modify: `test/virtual-layout.test.ts`

**Interfaces:**
- Consumes `CominsDetailMeasurement`, `resolveCominsMeasuredDetailHeight`, and anchor helpers.
- Produces one observer coordinator:

```ts
type CominsObservedDetail = {
  element: HTMLDivElement;
  rowId: CominsRowId;
};
```

- A measurement batch updates only changed Slot heights and bumps one layout version.

- [ ] **Step 1: Add a controllable ResizeObserver test double**

In `test/table-interaction.test.tsx`, add a local test observer that records observed elements and exposes `emit(element, blockSize)`. Write failing tests for:

- fixed Details register zero observed elements;
- `"auto"` Details register only mounted content blocks;
- a `420px` observation replaces the `300px` estimate;
- a change smaller than `0.5px` is ignored;
- width change invalidates the cached height until a new observation;
- unmount disconnects the observer and releases element mappings;
- environments without ResizeObserver take one initial `getBoundingClientRect()` measurement.

- [ ] **Step 2: Run the measurement tests and confirm RED**

Run:

```bash
npm run test:run -- test/table-interaction.test.tsx
```

Expected: FAIL because no Detail observer exists.

- [ ] **Step 3: Add one observer and one private cache**

In `CominsTableInner`, add:

```ts
const detailMeasurementsRef = useRef(
  new Map<CominsRowId, CominsDetailMeasurement>(),
);
const detailElementsRef = useRef(
  new Map<Element, CominsObservedDetail>(),
);
const detailObserverRef = useRef<ResizeObserver | null>(null);
const [detailLayoutVersion, setDetailLayoutVersion] = useState(0);
```

Create the observer once in an effect. Batch entries:

```ts
const updates: Array<{
  height: number;
  rowId: CominsRowId;
  width: number;
}> = [];

for (const entry of entries) {
  const observed = detailElementsRef.current.get(entry.target);

  if (!observed) {
    continue;
  }

  const borderBox = Array.isArray(entry.borderBoxSize)
    ? entry.borderBoxSize[0]
    : entry.borderBoxSize;
  const height =
    borderBox?.blockSize ??
    (entry.target as HTMLElement).getBoundingClientRect().height;
  const width = Math.round(
    (entry.target as HTMLElement).getBoundingClientRect().width,
  );

  if (Number.isFinite(height) && height > 0) {
    updates.push({ height, rowId: observed.rowId, width });
  }
}
```

Apply the batch once. Ignore absolute height deltas below `0.5`. Update the active `CominsHeightIndex` through `updateHeight` and bump `detailLayoutVersion` once when any accepted value changes.

- [ ] **Step 4: Connect content ref registration and fallback measurement**

Pass this exact callback to `CominsRowDetailRow` for `"auto"` Details:

```ts
const registerDetailElement = (
  rowId: CominsRowId,
  mode: "auto" | "fixed",
  element: HTMLDivElement | null,
) => {
  for (const [currentElement, observed] of detailElementsRef.current) {
    if (observed.rowId === rowId && currentElement !== element) {
      detailObserverRef.current?.unobserve(currentElement);
      detailElementsRef.current.delete(currentElement);
    }
  }

  if (!element || mode === "fixed") {
    return;
  }

  detailElementsRef.current.set(element, { element, rowId });

  if (detailObserverRef.current) {
    detailObserverRef.current.observe(element);
    return;
  }

  const rect = element.getBoundingClientRect();

  if (Number.isFinite(rect.height) && rect.height > 0) {
    detailMeasurementsRef.current.set(rowId, {
      height: rect.height,
      width: Math.round(rect.width),
    });
    setDetailLayoutVersion((current) => current + 1);
  }
};
```

On data reference change, call `reconcileCominsDetailMeasurements` with the complete current `state.rowIds` set.

- [ ] **Step 5: Preserve anchors during measurement and width changes**

Before committing a batch:

1. Capture the current first visible Slot anchor.
2. Apply all accepted index deltas.
3. Recalculate physical metrics.
4. Correct `scrollTop` once.
5. Update `pendingScrollTopRef`, `scrollTop` state, and the current layout snapshot together.

Use the resolved Detail content border-box width derived from the current
`tableWidth`/visible Column widths as the cache lookup input, not the outer
viewport `containerWidth`. The observer stores the mounted element's rounded
border-box width. A Column visibility, resize, or table-width change therefore
causes a width mismatch and returns the normalized estimate until the observer
reports a matching measurement.

- [ ] **Step 6: Run focused measurement and layout tests**

Run:

```bash
npm run test:run -- test/virtual-layout.test.ts test/table-interaction.test.tsx
```

Expected: PASS with no act warnings or observer-loop diagnostics.

- [ ] **Step 7: Commit automatic Detail measurement**

```bash
git add src/index.tsx src/row-detail.tsx src/virtual-layout.ts test/table-interaction.test.tsx test/virtual-layout.test.ts
git commit -m "feat: measure automatic row details"
```

### Task 5: Lock compatibility, Playground behavior, and public documentation

**Files:**
- Create: `example/src/features/RowExpandFeature.tsx`
- Create: `docs/user/19-row-expand.md`
- Create: `docs/ko/19-row-expand.md`
- Create: `test/playwright/specs/row-expand.spec.ts`
- Modify: `test/table-interaction.test.tsx`
- Modify: `test/public-api.test.tsx`
- Modify: `example/src/features/featureRegistry.tsx`
- Modify: `example/src/features/types.ts`
- Modify: `example/src/docs/codeSamples.ts`
- Modify: `example/src/docs/docsRoutes.tsx`
- Modify: `example/src/docs/dataTableOptionGuide.ts`
- Modify: `example/src/features/AdvancedFeature.tsx`
- Modify: `docs/user/11-virtualization.md`
- Modify: `docs/ko/11-virtualization.md`
- Modify: `README.md`
- Modify: `test/user-docs.test.ts`

**Interfaces:**
- The Playground owns `expandedRowIds` through `useState`.
- The route is `/examples/row-expand`, feature ID is `row-expand`, and browser selectors use `row-expand-example-fixed` and `row-expand-example-auto`.
- Public docs state that Tree Grid, general owner auto-height, and nested managed Details remain unsupported.

- [ ] **Step 1: Add failing compatibility tests**

Extend `test/table-interaction.test.tsx` with exact assertions for:

- sorting moves owner and Detail together without changing controlled IDs;
- pagination hides Details on other pages but preserves callback input IDs;
- lazy and infinite load offsets/counts exclude Detail Rows;
- owner Row movement carries its Detail and never targets the Detail `<tr>`;
- Row, Cell, range selection, copy, paste, context menu, and double-click ignore Detail content;
- skeleton, empty, loading, filler, Summary, and infinite-loading Rows have no disclosure;
- collapsing while focus is inside Detail restores focus to the owner disclosure;
- horizontal column reorder/hide changes the Detail `colSpan`;
- the Tree runtime wrapper strips untyped Row Detail properties.

Run:

```bash
npm run test:run -- test/public-api.test.tsx test/table-interaction.test.tsx
```

Expected: at least one new assertion fails until all integration branches use owner-only mappings.

- [ ] **Step 2: Complete owner-only interaction routing**

Use `data-comins-row-data-index` only on owner Rows. Do not add selection or clipboard handlers to the Detail `<tr>` or `<td>`. Stop propagation only in the disclosure; application Detail content otherwise behaves normally inside its region.

When row movement renders a placeholder, keep the placeholder before the owner Slot block. A successful move uses the owner business data index and the Detail follows because it is rendered from the same Slot.

Run the focused tests again and require PASS.

- [ ] **Step 3: Build the controlled Playground feature**

Create `RowExpandFeature.tsx` with:

- one fixed `240px` Detail example;
- one `"auto"` example whose content grows after a button click;
- one Detail taller than the viewport with inner interactive controls;
- visible JSON for `expandedRowIds`;
- stable Row IDs and `onChangeExpandedRowIds={setExpandedRowIds}`;
- no nested table or list large enough to distort the outer benchmark.

Register:

```ts
{
  Component: RowExpandFeature,
  description: "Controlled fixed and automatic Row Detail examples.",
  id: "row-expand",
  label: "Row Expand",
  options: [
    {
      description: "Controlled business Row IDs whose Detail regions are open.",
      example: "expandedRowIds={expandedRowIds}",
      name: "expandedRowIds",
    },
    {
      description: "Returns a positive pixel height or auto for an owner Row.",
      example: 'getRowDetailHeight={() => "auto"}',
      name: "getRowDetailHeight",
    },
    {
      description: "Renders the semantic Detail region for an owner Row.",
      example: "renderRowDetail={({ row }) => <Detail row={row.data} />",
      name: "renderRowDetail",
    },
  ],
  summary: "Controlled Row Expand with fixed and measured automatic Detail height.",
}
```

Add `"row-expand"` to `FeatureId`, add `rowExpandSamples`, and register the docs route under `Row / Context`.

- [ ] **Step 4: Write matching public documentation**

Document the exact public types, controlled callback behavior, dormant IDs, default `300px`, `"auto"` measurement, semantic DOM, focus behavior, compatibility matrix, and performance guidance in both `19-row-expand.md` files.

Update both virtualization guides with:

```text
Data Rows and collapsed Detail owners keep the arithmetic fixed-height path.
The private height index is activated only when an effective expanded Detail
makes a data Slot taller than rowHeight.
```

Remove `"Flat Row Expand"` and `"master/detail"` from `AdvancedFeature.unavailable`. Add implemented option-guide entries. Add a concise README example using controlled IDs.

- [ ] **Step 5: Add documentation assertions**

In `test/user-docs.test.ts`, read both new guides and assert all of:

```ts
for (const document of [englishRowExpand, koreanRowExpand]) {
  expect(document).toContain("expandedRowIds");
  expect(document).toContain("onChangeExpandedRowIds");
  expect(document).toContain("getRowDetailHeight");
  expect(document).toContain("estimatedRowDetailHeight");
  expect(document).toContain("renderRowDetail");
  expect(document).toContain('"auto"');
  expect(document).toContain("300");
}

expect(playground).toContain('data-testid="row-expand-example-fixed"');
expect(playground).toContain('data-testid="row-expand-example-auto"');
expect(advanced).not.toContain('"Flat Row Expand"');
expect(advanced).not.toContain('"master/detail"');
```

Run:

```bash
npm run test:run -- test/user-docs.test.ts
```

Expected: PASS.

- [ ] **Step 6: Add browser acceptance tests**

Create `test/playwright/specs/row-expand.spec.ts` covering:

1. Controlled fixed expand/collapse and JSON state.
2. Button `aria-expanded`, mounted-only `aria-controls`, region labelling, and disabled read-only control.
3. Automatic asynchronous growth with owner top drift no greater than `1px`.
4. Width resize causing remeasurement without browser warning or ResizeObserver loop errors.
5. Focus restoration from an interactive Detail button.
6. A Detail taller than the viewport with continuous outer scroll and no blank gap.
7. Horizontal scrolling and column reorder with one non-sticky full-span Detail cell.
8. Sorting and pagination preserving dormant controlled IDs.

Run:

```bash
npm run test:e2e -- test/playwright/specs/row-expand.spec.ts --workers=1
```

Expected: PASS with an empty diagnostics collection.

- [ ] **Step 7: Commit the public feature surface**

```bash
git add src/index.tsx test/table-interaction.test.tsx test/public-api.test.tsx example/src/features/RowExpandFeature.tsx example/src/features/featureRegistry.tsx example/src/features/types.ts example/src/docs/codeSamples.ts example/src/docs/docsRoutes.tsx example/src/docs/dataTableOptionGuide.ts example/src/features/AdvancedFeature.tsx docs/user/19-row-expand.md docs/ko/19-row-expand.md docs/user/11-virtualization.md docs/ko/11-virtualization.md README.md test/user-docs.test.ts test/playwright/specs/row-expand.spec.ts
git commit -m "feat: document and demonstrate row expand"
```

### Task 6: Prove fixed-path, mixed-height, and memory performance

**Files:**
- Modify: `example/src/features/BodyFeature.tsx`
- Modify: `test/playwright/specs/row-expand.spec.ts`
- Modify: `test/playwright/specs/virtualization.spec.ts`
- Modify: `test/playwright/specs/physical-scrollbar.spec.ts`
- Modify: `test/playwright/specs/memory-leak-full-audit.spec.ts`
- Create or update: `reports/2026-07-31.md`

**Interfaces:**
- Query fixture `?fixture=row-detail-fixed` expands one fixed Detail in 100,000 Rows.
- Query fixture `?fixture=row-detail-auto` expands one measured Detail whose content can grow.
- The ordinary `/performance/virtualization` route remains Detail-disabled and exercises the unchanged fast path.

- [ ] **Step 1: Add query-selected performance fixtures**

In `BodyFeature`, read `fixture` once and add controlled Detail props only for the two Row Detail fixtures:

```ts
const fixture = useMemo(
  () =>
    typeof window === "undefined"
      ? ""
      : new URLSearchParams(window.location.search).get("fixture") ?? "",
  [],
);
const detailEnabled =
  fixture === "row-detail-fixed" || fixture === "row-detail-auto";
const [expandedRowIds, setExpandedRowIds] = useState<CominsRowId[]>(
  detailEnabled ? [50_000] : [],
);
```

For the fixed fixture return `360`; for the automatic fixture return `"auto"`. Render a bounded content block and expose a growth button only in automatic mode.

- [ ] **Step 2: Add focused performance assertions**

Add `@perf` tests that assert:

- ordinary fixed-path rendered owner Rows remain `<= 45` at top, middle, and bottom;
- fixed Detail renders no observed marker and owner Rows remain `< 90`;
- automatic Detail growth preserves its anchor within `1px`;
- physical `scrollHeight` remains `< 2_000_000`;
- scrollbar drag reaches data indexes above `99_900`;
- follow-up wheel latency stays inside the existing test's comparative budget;
- repeated expand/collapse does not accumulate Detail DOM nodes.

Run the Row Expand performance cases first:

```bash
npm run test:perf -- test/playwright/specs/row-expand.spec.ts test/playwright/specs/virtualization.spec.ts test/playwright/specs/physical-scrollbar.spec.ts --workers=1
```

Expected: PASS.

- [ ] **Step 3: Add route-away memory recovery**

Extend `memory-leak-full-audit.spec.ts` with one scenario:

1. Open `Row Expand`.
2. Expand fixed and automatic examples.
3. Grow automatic content and resize its table.
4. Collapse both.
5. Repeat ten times.
6. Return to Getting Started.
7. Require nodes, listeners, heap, and document counters within the existing `10 percent` recovery policy.

Run:

```bash
npm run test:perf -- test/playwright/specs/memory-leak-full-audit.spec.ts --workers=1
```

Expected: PASS and a generated ignored audit artifact.

- [ ] **Step 4: Run the complete required gates**

Run in this order:

```bash
npm run verify
npm run test:e2e -- --workers=1
npm run test:perf -- --workers=1
```

Expected: all commands exit `0`. Classify any failure as product, test-contract, or execution-environment before changing code or rerunning a full gate.

- [ ] **Step 5: Record exact results and residual risk**

Create or update `reports/2026-07-31.md` with:

- implementation summary;
- changed files;
- focused Vitest commands;
- focused browser and performance commands;
- full gate commands and exit results;
- browser diagnostics result;
- observer cleanup result;
- fixed-path and mixed-path rendered Row counts;
- any execution-environment failure;
- residual risks around application-provided unbounded Detail content.

- [ ] **Step 6: Commit performance coverage and work record**

```bash
git add example/src/features/BodyFeature.tsx test/playwright/specs/row-expand.spec.ts test/playwright/specs/virtualization.spec.ts test/playwright/specs/physical-scrollbar.spec.ts test/playwright/specs/memory-leak-full-audit.spec.ts reports/2026-07-31.md
git commit -m "test: verify row detail virtualization"
```

## Row Expand Completion Gate

Do not start the Row Grouping implementation until all of these are true:

- The no-Detail route still uses fixed arithmetic and allocates no height index.
- Fixed and automatic Details share the same controlled public API.
- The semantic owner/Detail Row structure passes DOM and accessibility tests.
- Mixed-height scrollbar drag reaches the beginning, middle, and end without blank gaps.
- Measurement correction preserves the current anchor and does not loop.
- Tree Grid rejects and strips Row Detail props.
- Focus, selection, clipboard, sorting, pagination, loading, movement, Summary, and horizontal layout behavior pass.
- `npm run verify`, the full E2E gate, and the full performance gate pass.
