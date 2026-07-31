# Column Pinning Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add persistent left/right Column Pinning whose configured columns are position-locked, remain aligned across Header, Body, skeleton, and Summary Row surfaces, and temporarily demote into the center when a narrow viewport cannot preserve a usable center.

**Architecture:** Keep canonical `columnOrder` as the serialized logical order and store optional `pinned` intent inside existing column/group runtime records. Build atomic visible blocks from resolved numeric widths, derive effective left/center/right zones and sticky offsets in one pure helper, and render every table surface from the same effective order. Keep responsive demotion transient and pass the effective view order explicitly into selection and clipboard traversal instead of mutating serialized state.

**Tech Stack:** React 18-19 peer range, TypeScript 7, Vitest 4 with jsdom, Playwright 1.61, Vite 8, CSS sticky positioning and color-mix.

## Global Constraints

- Implement `docs/superpowers/specs/2026-07-31-column-pinning-design.md`.
- Execute after `docs/superpowers/plans/2026-07-31-row-expand-variable-detail-height.md` so Row Detail compatibility can be verified.
- Use `"left" | "right"` as the complete public pin-side domain.
- Keep the existing `CominsColumnLayout` object shape; add only optional `pinned` fields inside existing column and group records.
- Keep global `columnOrder` canonical; do not serialize separate left, center, and right arrays.
- Group pinning is atomic and controlled only by group definition/runtime state while a child belongs to a valid group.
- A configured pinned leaf or group is position-locked even when responsive demotion renders it in the center.
- Reserve exactly `48px` for effective center content when the container is at least `48px` wide.
- On overflow, demote from the wider pinned side's inner edge and choose the right side on a width tie.
- Render one copy of every cell; do not build separate left, center, and right tables.
- Keep Row Detail as one non-sticky spanning cell.
- Keep responsive effective changes out of `getColumnLayout()` and `onChangeColumnLayout`.
- Strengthen the existing source Header placeholder using a color darker than the active Header background; do not add a second placeholder structure.
- Derive default Header/Cell/Row separators from the current theme surface with a darker mix; do not use black as the final visible separator token or a fixed `#d6d8dd` across all themes.
- Do not add dependencies, package subpaths, or package version changes.
- Keep external comparison and benchmark material outside tracked files.
- Do not push, publish, tag, create a Release, or mutate remote settings.

---

## File Map

| File | Responsibility |
| --- | --- |
| `src/column-pinning.ts` | Private pin normalization, atomic block zoning, responsive demotion, offsets, boundary metadata, and Summary fragment splitting. |
| `src/core.ts` | Public pin types, definition/runtime persistence, layout normalization/serialization, pinned move guards, and optional view-order traversal. |
| `src/index.tsx` | Numeric width snapshot, effective order, sticky attributes/styles, pointer lock, Header/Body/skeleton/Summary rendering, and Row Detail integration. |
| `styles.css` | Theme-derived separators, darker source placeholder, sticky backgrounds, boundaries, z-index, focus, selection, and summary styles. |
| `test/column-pinning.test.ts` | Pure zone, demotion, offset, block, and Summary split tests. |
| `test/basic-core.test.ts` | Pin defaults, layout round-trip, invalid input, group ownership, and movement locks. |
| `test/typecheck/column-pinning-api.tsx` | Compile-time column/group/layout pin contract. |
| `test/table-interaction.test.tsx` | Effective order, sticky metadata, responsive behavior, skeleton, Summary, selection, clipboard, and Detail DOM tests. |
| `test/public-api-boundary.test.ts` | Theme separator, placeholder, and sticky CSS contract. |
| `example/src/features/ColumnPinningFeature.tsx` | Left/right, grouped, layout restore, responsive demotion, and Summary examples. |
| `example/src/features/BodyFeature.tsx` | Query-selected 100,000-Row pinning fixture. |
| `example/src/features/featureRegistry.tsx` | Column Pinning feature and public option descriptions. |
| `example/src/features/types.ts` | `column-pinning` feature ID. |
| `example/src/docs/codeSamples.ts` | Column Pinning runnable sample. |
| `example/src/docs/docsRoutes.tsx` | `/examples/column-pinning` documentation route. |
| `example/src/docs/dataTableOptionGuide.ts` | Implemented definition and layout pin fields. |
| `docs/user/20-column-pinning.md`, `docs/ko/20-column-pinning.md` | Matching public pinning guide. |
| `docs/user/06-header.md`, `docs/ko/06-header.md` | Reorder lock, group ownership, and layout persistence cross-reference. |
| `docs/user/18-summary-row.md`, `docs/ko/18-summary-row.md` | Internal Summary span splitting behavior. |
| `README.md` | Public capability summary and layout example. |
| `test/user-docs.test.ts` | Documentation and Playground registration assertions. |
| `test/playwright/specs/column-pinning.spec.ts` | Horizontal scroll, resize, reorder lock, responsive restoration, accessibility, Detail, and Summary acceptance. |
| `test/playwright/specs/header-quality.spec.ts` | Source placeholder color and existing drag UI regression. |
| `test/playwright/specs/summary-row.spec.ts` | Summary fragments at pin-zone boundaries. |
| `test/playwright/specs/virtualization.spec.ts` | 100,000-Row pinned rendering and scrolling performance. |
| `test/playwright/specs/memory-leak-full-audit.spec.ts` | Pinned route lifecycle recovery. |
| `reports/2026-07-31.md` | Exact commands, results, and residual risks appended to the existing work record. |

### Task 1: Build the pure configured/effective pin resolver

**Files:**
- Create: `src/column-pinning.ts`
- Create: `test/column-pinning.test.ts`

**Interfaces:**
- Produces:

```ts
export const COMINS_MIN_PINNED_CENTER_WIDTH = 48;

export type CominsColumnPinned = "left" | "right";

export type CominsColumnPinBlock = {
  canonicalIndex: number;
  columnIds: readonly string[];
  columnWidths: readonly number[];
  id: string;
  kind: "column" | "group";
  pinned?: CominsColumnPinned;
  width: number;
};

export type CominsEffectivePinnedColumn = {
  boundary?: CominsColumnPinned;
  columnId: string;
  left?: number;
  pinned?: CominsColumnPinned;
  right?: number;
};

export type CominsColumnPinningResult = {
  byColumnId: ReadonlyMap<string, CominsEffectivePinnedColumn>;
  demotedBlockIds: ReadonlySet<string>;
  orderedColumnIds: string[];
};

export function normalizeCominsColumnPinned(
  value: unknown,
): CominsColumnPinned | undefined;

export function resolveCominsColumnPinning(input: {
  blocks: readonly CominsColumnPinBlock[];
  containerWidth: number;
  minimumCenterWidth?: number;
}): CominsColumnPinningResult;
```

- The helper receives only visible atomic blocks with finite non-negative widths.
- A right zone keeps canonical DOM order; right offsets are accumulated in reverse.

- [ ] **Step 1: Write failing zone and offset tests**

Create `test/column-pinning.test.ts`:

```ts
import { describe, expect, it } from "vitest";

import {
  normalizeCominsColumnPinned,
  resolveCominsColumnPinning,
  type CominsColumnPinBlock,
} from "../src/column-pinning";

const blocks: CominsColumnPinBlock[] = [
  {
    canonicalIndex: 0,
    columnIds: ["name"],
    columnWidths: [120],
    id: "name",
    kind: "column",
    pinned: "left",
    width: 120,
  },
  {
    canonicalIndex: 1,
    columnIds: ["age"],
    columnWidths: [100],
    id: "age",
    kind: "column",
    width: 100,
  },
  {
    canonicalIndex: 2,
    columnIds: ["role", "active"],
    columnWidths: [100, 100],
    id: "status",
    kind: "group",
    pinned: "right",
    width: 200,
  },
];

describe("column pinning", () => {
  it("normalizes only left and right", () => {
    expect(normalizeCominsColumnPinned("left")).toBe("left");
    expect(normalizeCominsColumnPinned("right")).toBe("right");
    expect(normalizeCominsColumnPinned("center")).toBeUndefined();
    expect(normalizeCominsColumnPinned(null)).toBeUndefined();
  });

  it("derives ordered zones, cumulative offsets, and inner boundaries", () => {
    const result = resolveCominsColumnPinning({
      blocks,
      containerWidth: 800,
    });

    expect(result.orderedColumnIds).toEqual([
      "name",
      "age",
      "role",
      "active",
    ]);
    expect(result.byColumnId.get("name")).toEqual({
      boundary: "left",
      columnId: "name",
      left: 0,
      pinned: "left",
    });
    expect(result.byColumnId.get("role")).toEqual({
      boundary: "right",
      columnId: "role",
      pinned: "right",
      right: 100,
    });
    expect(result.byColumnId.get("active")).toEqual({
      columnId: "active",
      pinned: "right",
      right: 0,
    });
  });
});
```

- [ ] **Step 2: Run the pure test and confirm RED**

Run:

```bash
npm run test:run -- test/column-pinning.test.ts
```

Expected: FAIL because the module does not exist.

- [ ] **Step 3: Implement normalization and configured zones**

Create `src/column-pinning.ts`. Normalize input, sort each zone by `canonicalIndex`, and flatten `[left, center, right]`.

Use `columnWidths` for offsets. Require
`columnWidths.length === columnIds.length` in tests. Normalize missing or
invalid entries to an equal share of the block's normalized total width.

Calculate:

```ts
let leftOffset = 0;

for (const block of effectiveLeftBlocks) {
  block.columnIds.forEach((columnId, index) => {
    const width = normalizedColumnWidths[index] ?? 0;
    byColumnId.set(columnId, {
      columnId,
      left: leftOffset,
      pinned: "left",
    });
    leftOffset += width;
  });
}

let rightOffset = 0;

for (const block of [...effectiveRightBlocks].reverse()) {
  for (let index = block.columnIds.length - 1; index >= 0; index -= 1) {
    const columnId = block.columnIds[index];
    const width = normalizedColumnWidths[index] ?? 0;

    if (columnId) {
      byColumnId.set(columnId, {
        columnId,
        pinned: "right",
        right: rightOffset,
      });
      rightOffset += width;
    }
  }
}
```

Mark the last effective-left column with `boundary: "left"` and the first effective-right column with `boundary: "right"`.

- [ ] **Step 4: Add failing responsive demotion tests**

Add:

```ts
it("demotes the wider side inner edge and restores configured intent", () => {
  const narrow = resolveCominsColumnPinning({
    blocks,
    containerWidth: 300,
  });
  const wide = resolveCominsColumnPinning({
    blocks,
    containerWidth: 800,
  });

  expect([...narrow.demotedBlockIds]).toEqual(["status"]);
  expect(narrow.orderedColumnIds).toEqual([
    "name",
    "age",
    "role",
    "active",
  ]);
  expect(narrow.byColumnId.get("role")?.pinned).toBeUndefined();
  expect(wide.byColumnId.get("role")?.pinned).toBe("right");
});

it("uses the right side on a tie and demotes whole groups", () => {
  const tied = [
    {
      canonicalIndex: 0,
      columnIds: ["left"],
      columnWidths: [150],
      id: "left",
      kind: "column" as const,
      pinned: "left" as const,
      width: 150,
    },
    {
      canonicalIndex: 1,
      columnIds: ["center"],
      columnWidths: [100],
      id: "center",
      kind: "column" as const,
      width: 100,
    },
    {
      canonicalIndex: 2,
      columnIds: ["right-a", "right-b"],
      columnWidths: [75, 75],
      id: "right",
      kind: "group" as const,
      pinned: "right" as const,
      width: 150,
    },
  ];
  const result = resolveCominsColumnPinning({
    blocks: tied,
    containerWidth: 320,
  });

  expect([...result.demotedBlockIds]).toEqual(["right"]);
  expect(result.byColumnId.get("right-a")?.pinned).toBeUndefined();
  expect(result.byColumnId.get("right-b")?.pinned).toBeUndefined();
});

it("renders every configured pin in center below 48 pixels", () => {
  const result = resolveCominsColumnPinning({
    blocks,
    containerWidth: 40,
  });

  expect([...result.demotedBlockIds]).toEqual(["name", "status"]);
  expect(
    [...result.byColumnId.values()].every((column) => column.pinned === undefined),
  ).toBe(true);
});
```

Add edge cases showing an empty block list returns an empty result, an initial
zero-width container demotes all configured pins without mutating input
blocks, hidden Columns contribute no block width, and a group with no visible
children contributes no block.

- [ ] **Step 5: Implement deterministic responsive demotion**

Use mutable effective left/right block arrays copied from configured blocks:

```ts
while (
  containerWidth >= minimumCenterWidth &&
  containerWidth - leftWidth - rightWidth < minimumCenterWidth &&
  (effectiveLeft.length > 0 || effectiveRight.length > 0)
) {
  const demoteRight =
    effectiveRight.length > 0 &&
    (effectiveLeft.length === 0 || rightWidth >= leftWidth);
  const block = demoteRight
    ? effectiveRight.shift()
    : effectiveLeft.pop();

  if (!block) {
    break;
  }

  demotedBlockIds.add(block.id);

  if (demoteRight) {
    rightWidth -= block.width;
  } else {
    leftWidth -= block.width;
  }
}
```

When `containerWidth < minimumCenterWidth`, mark every configured pinned block demoted. Merge center and demoted blocks by `canonicalIndex`.

- [ ] **Step 6: Run pure tests and commit**

Run:

```bash
npm run test:run -- test/column-pinning.test.ts
```

Expected: PASS.

Commit:

```bash
git add src/column-pinning.ts test/column-pinning.test.ts
git commit -m "feat: add column pin layout resolver"
```

### Task 2: Persist pin intent and enforce core position locks

**Files:**
- Create: `test/typecheck/column-pinning-api.tsx`
- Modify: `src/core.ts:293-346,525-650,901-930,1040-1297`
- Modify: `test/basic-core.test.ts`

**Interfaces:**
- Consumes `CominsColumnPinned` and `normalizeCominsColumnPinned`.
- Produces additive public fields:

```ts
export type CominsTableColumn<TData, TValue = unknown> = {
  pinned?: CominsColumnPinned;
};

export type CominsTableColumnGroup = {
  pinned?: CominsColumnPinned;
};

export type CominsColumnRuntimeState = {
  hidden?: boolean;
  pinned?: CominsColumnPinned;
  width?: number;
};

export type CominsColumnGroupRuntimeState = {
  hidden?: boolean;
  pinned?: CominsColumnPinned;
};
```

- Produces private core guards:

```ts
function getConfiguredColumnPinned<TData>(
  state: CominsTableState<TData>,
  columnId: string,
): CominsColumnPinned | undefined;

function getConfiguredGroupPinned<TData>(
  state: CominsTableState<TData>,
  groupId: string,
): CominsColumnPinned | undefined;
```

- `moveCominsColumn` and `moveCominsColumnGroup` keep their public signatures.

- [ ] **Step 1: Write failing core state tests**

Extend `test/basic-core.test.ts`:

```ts
it("normalizes and serializes leaf and group pin intent", () => {
  const state = createCominsTableState({
    columnGroups: [
      {
        children: ["name", "age"],
        id: "profile",
        label: "Profile",
        pinned: "left",
      },
    ],
    columns: [
      { field: "name", label: "Name", pinned: "right" },
      { field: "age", label: "Age" },
      { field: "role", label: "Role", pinned: "right" },
    ],
    rows,
  });
  const layout = serializeCominsColumnLayout(state);

  expect(layout.groups?.profile?.pinned).toBe("left");
  expect(layout.columns.name?.pinned).toBeUndefined();
  expect(layout.columns.age?.pinned).toBeUndefined();
  expect(layout.columns.role?.pinned).toBe("right");
});

it("lets runtime layout win and ignores invalid untyped pin values", () => {
  const state = createCominsTableState({
    columnLayout: {
      columns: {
        name: { pinned: "left" },
        age: { pinned: "center" as "left" },
      },
      order: ["name", "age"],
    },
    columns,
    rows,
  });

  expect(state.columnState.name?.pinned).toBe("left");
  expect(state.columnState.age?.pinned).toBeUndefined();
});

it("rejects movement from or across configured pin zones", () => {
  const state = createCominsTableState({
    columns: [
      { field: "name", label: "Name", pinned: "left" },
      { field: "age", label: "Age" },
      { field: "role", label: "Role", pinned: "right" },
    ],
    rows,
  });

  expect(moveCominsColumn(state, "name", 1)).toBe(state);
  expect(moveCominsColumn(state, "age", 0)).toBe(state);
  expect(moveCominsColumn(state, "age", 2)).toBe(state);
});
```

Add old-layout coverage showing `{ hidden, width, order }` restores without a migration.
When a restored layout contains a Column/Group record but omits `pinned`, assert
that record restores as center even when the current definition has a pin
default. Also assert a stale child pin is ignored while grouped and becomes a
normal leaf pin after the group is removed.

- [ ] **Step 2: Write the compile-time public contract**

Create `test/typecheck/column-pinning-api.tsx`:

```tsx
import {
  type CominsColumnLayout,
  type CominsTableColumn,
  type CominsTableColumnGroup,
} from "../../src";

type Row = { id: string; name: string };

const columns = [
  { field: "name", label: "Name", pinned: "left" },
] satisfies Array<CominsTableColumn<Row>>;

const groups = [
  {
    children: ["name"],
    id: "identity",
    label: "Identity",
    pinned: "right",
  },
] satisfies CominsTableColumnGroup[];

const layout: CominsColumnLayout = {
  columns: { name: { pinned: "left", width: 180 } },
  groups: { identity: { pinned: "right" } },
  order: ["name"],
};

const invalidColumns = [
  {
    field: "name",
    label: "Name",
    // @ts-expect-error center is not a supported configured pin side.
    pinned: "center",
  },
] satisfies Array<CominsTableColumn<Row>>;

void columns;
void groups;
void layout;
void invalidColumns;
```

- [ ] **Step 3: Run focused tests and confirm RED**

Run:

```bash
npm run lint
npm run test:run -- test/basic-core.test.ts
```

Expected: FAIL because pin fields and normalization are absent.

- [ ] **Step 4: Add pin fields and group-owned normalization**

Import and re-export the pin type from `src/column-pinning.ts` in `src/core.ts`.

Change normalization signatures:

```ts
function normalizeColumnState<TData>(
  columns: ReadonlyArray<CominsTableRuntimeColumn<TData>>,
  columnGroups: ReadonlyArray<CominsTableRuntimeColumnGroup>,
  layout?: Partial<CominsColumnLayout>,
) {
  const groupedColumnIds = new Set(
    columnGroups.flatMap((group) => group.children),
  );
  const state: Record<string, CominsColumnRuntimeState> = {};

  for (const column of columns) {
    const layoutColumn = layout?.columns?.[column.id];

    state[column.id] = {
      hidden: layoutColumn?.hidden ?? column.hidden,
      ...(!groupedColumnIds.has(column.id)
        ? {
            pinned: normalizeCominsColumnPinned(
              layoutColumn
                ? layoutColumn.pinned
                : column.pinned,
            ),
          }
        : {}),
      width: layoutColumn?.width ?? column.width,
    };
  }

  return state;
}
```

Add group `pinned` normalization with the same record-presence rule: a present
layout group record owns pin state even when its `pinned` field is missing.
Update all creation and layout-application call sites to pass normalized
groups.

- [ ] **Step 5: Enforce atomic movement locks**

Implement private configured-pin helpers. At the start of `moveCominsColumn`:

```ts
if (getConfiguredColumnPinned(state, columnId)) {
  return state;
}
```

Before insertion, resolve the target's configured pin side from canonical `state.columnOrder[targetIndex]`. Reject when that target belongs to a pinned zone. For grouped sources, also reject when their owner group is pinned.

At the start of `moveCominsColumnGroup`, reject configured pinned groups. Reject
a target index whose canonical target column belongs to a pinned block. A center
source may move only before or after another center block, while the existing
within-group and group-splitting guards continue to determine the exact
insertion boundary.

Preserve all existing within-group and group-splitting guards.

- [ ] **Step 6: Run core and type checks**

Run:

```bash
npm run lint
npm run test:run -- test/basic-core.test.ts
```

Expected: PASS.

- [ ] **Step 7: Commit persistence and lock behavior**

```bash
git add src/core.ts test/basic-core.test.ts test/typecheck/column-pinning-api.tsx
git commit -m "feat: persist column pin intent"
```

### Task 3: Render one effective order across Header, Body, skeleton, and interactions

**Files:**
- Modify: `src/core.ts:829-847,1382-1437,1741-1865`
- Modify: `src/index.tsx:1368-1558,2265-2573,2681-3083`
- Modify: `styles.css:1-225,227-244,408-510`
- Modify: `test/table-interaction.test.tsx`
- Modify: `test/public-api-boundary.test.ts`

**Interfaces:**
- Produces optional view traversal:

```ts
export type CominsTableViewOrder = {
  columnIds?: readonly string[];
  rowIds?: readonly CominsRowId[];
};
```

- Add optional `viewOrder` only to traversal-sensitive helpers:

```ts
getCominsVisibleColumns(state, viewOrder?)
getCominsHeaderRows(state, viewOrder?)
getCominsSelectedCellRange(state, range?, viewOrder?)
isCominsCellInSelectedRange(state, cell, viewOrder?)
copyCominsCellRange(state, range?, viewOrder?)
pasteCominsCellRange(state, target, copied, viewOrder?)
```

- Existing calls remain source-compatible because every new argument is optional.

- [ ] **Step 1: Add failing effective-order and sticky metadata tests**

In `test/table-interaction.test.tsx`, render:

```tsx
<CominsTable
  columns={[
    { field: "name", label: "Name" },
    { field: "age", label: "Age", pinned: "left", width: 120 },
    { field: "role", label: "Role" },
    { field: "active", label: "Active", pinned: "right", width: 100 },
  ]}
  data={rows}
  getRowId={(row) => row.id}
/>
```

Assert visual/DOM order `["age", "name", "role", "active"]` in Header and every data Row. Assert:

```ts
expect(headerAge?.dataset.cominsPinned).toBe("left");
expect(headerAge?.style.left).toBe("0px");
expect(cellAge?.dataset.cominsPinned).toBe("left");
expect(cellActive?.dataset.cominsPinned).toBe("right");
expect(cellActive?.style.right).toBe("0px");
expect(headerAge?.dataset.cominsPinnedBoundary).toBe("left");
expect(headerActive?.dataset.cominsPinnedBoundary).toBe("right");
```

Add a range-copy case whose columns follow effective visual order, not canonical layout order.

- [ ] **Step 2: Run focused DOM tests and confirm RED**

Run:

```bash
npm run test:run -- test/table-interaction.test.tsx
```

Expected: FAIL because render order and sticky metadata remain canonical/unpinned.

- [ ] **Step 3: Add optional view-order traversal**

Implement one private resolver in `src/core.ts`:

```ts
function resolveViewColumnIds<TData>(
  state: CominsTableState<TData>,
  viewOrder?: CominsTableViewOrder,
) {
  return viewOrder?.columnIds ?? state.columnOrder;
}
```

Use it in visible-column, Header-row, range-bound, selected-range, copy-range, and paste-range calculations. For pinning, `rowIds` remains absent and source Row order is unchanged.

In `src/index.tsx`, build:

```ts
const canonicalVisibleColumns = useMemo(
  () => getCominsVisibleColumns(state),
  [state],
);
const resolvedWidthByColumnId = useMemo(
  () => new Map(
    canonicalVisibleColumns.map((column, index) => [
      column.id,
      resolveNumericColumnWidth(column, index),
    ]),
  ),
  [canonicalVisibleColumns, containerWidth, state.columnState],
);
const pinBlocks = useMemo(
  () => createVisibleCominsPinBlocks({
    columnGroups: state.columnGroups,
    columnGroupState: state.columnGroupState,
    columns: canonicalVisibleColumns,
    columnState: state.columnState,
    widths: resolvedWidthByColumnId,
  }),
  [
    canonicalVisibleColumns,
    resolvedWidthByColumnId,
    state.columnGroups,
    state.columnGroupState,
    state.columnState,
  ],
);
const effectivePinning = useMemo(
  () =>
    resolveCominsColumnPinning({
      blocks: pinBlocks,
      containerWidth,
    }),
  [containerWidth, pinBlocks],
);
const effectiveViewOrder = useMemo<CominsTableViewOrder>(
  () => ({ columnIds: effectivePinning.orderedColumnIds }),
  [effectivePinning.orderedColumnIds],
);
const visibleColumns = useMemo(
  () => getCominsVisibleColumns(state, effectiveViewOrder),
  [effectiveViewOrder, state],
);
```

Implement `createVisibleCominsPinBlocks` in `src/column-pinning.ts` with structural inputs so it does not import React or `CominsTableState`.

- [ ] **Step 4: Render widths and sticky presentation by Column ID**

Replace positional width lookup with `resolvedWidthByColumnId.get(column.id)`. Use the same effective `visibleColumns` for:

- Header rows;
- Header `<colgroup>`;
- Body `<colgroup>`;
- Summary `<colgroup>`;
- skeleton cells;
- owner data cells;
- event `column.index`;
- selection and clipboard `viewOrder`.

Add:

```ts
const getPinnedCellPresentation = (columnId: string) => {
  const pin = effectivePinning.byColumnId.get(columnId);

  return {
    boundary: pin?.boundary,
    pinned: pin?.pinned,
    style:
      pin?.pinned === "left"
        ? { left: pin.left, position: "sticky" as const }
        : pin?.pinned === "right"
          ? { position: "sticky" as const, right: pin.right }
          : undefined,
  };
};
```

Apply the returned data attributes and merge sticky style before consumer styles so explicit width/style behavior remains intact while `position`, `left`, and `right` remain table-owned.

- [ ] **Step 5: Add theme-derived separators and placeholder contrast**

Change default tokens:

```css
--comins-table-header-border:
  color-mix(in srgb, var(--comins-table-header-background) 84%, #000000);
--comins-table-header-split-border:
  color-mix(in srgb, var(--comins-table-header-background) 84%, #000000);
--comins-table-cell-border:
  color-mix(in srgb, var(--comins-table-surface) 84%, #000000);
--comins-table-row-border:
  color-mix(in srgb, var(--comins-table-surface) 84%, #000000);
```

Replace each theme class's hard-coded Header, Cell, and Row separator overrides with the same background-derived formulas after that theme sets its background variables.

Change only the existing source placeholder rule:

```css
.comins-table__th[data-column-placeholder="true"] {
  background:
    color-mix(
      in srgb,
      var(--comins-table-header-background) 82%,
      #000000
    );
  outline: 1px dashed var(--comins-table-drop-marker);
  outline-offset: -2px;
}
```

Keep its content opacity and pointer isolation rules unchanged.

- [ ] **Step 6: Add sticky background and stacking rules**

Add:

```css
.comins-table__th[data-comins-pinned],
.comins-table__td[data-comins-pinned],
.comins-table__summary-cell[data-comins-pinned] {
  background: var(--comins-table-pinned-background);
}

.comins-table__thead .comins-table__th[data-comins-pinned] {
  --comins-table-pinned-background: var(--comins-table-header-background);
  z-index: 5;
}

.comins-table__tr[data-comins-row-parity="even"]
  > .comins-table__td[data-comins-pinned] {
  --comins-table-pinned-background: var(--comins-table-row-even-background);
  z-index: 2;
}

.comins-table__tr[data-comins-row-parity="odd"]
  > .comins-table__td[data-comins-pinned] {
  --comins-table-pinned-background: var(--comins-table-row-odd-background);
  z-index: 2;
}

.comins-row-selected > .comins-table__td[data-comins-pinned] {
  --comins-table-pinned-background:
    var(--comins-table-row-selected-background);
}

.comins-table__summary-cell[data-comins-pinned] {
  --comins-table-pinned-background: var(--comins-table-surface-muted);
  z-index: 2;
}

[data-comins-pinned-boundary="left"] {
  box-shadow:
    1px 0
    color-mix(
      in srgb,
      var(--comins-table-pinned-background) 76%,
      #000000
    );
}

[data-comins-pinned-boundary="right"] {
  box-shadow:
    -1px 0
    color-mix(
      in srgb,
      var(--comins-table-pinned-background) 76%,
      #000000
    );
}
```

Add matching custom-background, disabled, and skeleton selectors. Keep focus outlines and resize/drop markers above sticky cells.

- [ ] **Step 7: Update CSS boundary tests and run focused checks**

In `test/public-api-boundary.test.ts`, assert:

- separator variables use `color-mix`;
- the placeholder uses `--comins-table-header-background` and `#000000`;
- pinned selectors use theme backgrounds;
- no new package export exists.

Run:

```bash
npm run test:run -- test/table-interaction.test.tsx test/public-api-boundary.test.ts
```

Expected: PASS.

- [ ] **Step 8: Commit effective rendering and visual polish**

```bash
git add src/core.ts src/column-pinning.ts src/index.tsx styles.css test/table-interaction.test.tsx test/public-api-boundary.test.ts
git commit -m "feat: render pinned column zones"
```

### Task 4: Complete grouped headers, responsive demotion, Summary splitting, and reorder UI locks

**Files:**
- Modify: `src/column-pinning.ts`
- Modify: `src/index.tsx:1376-1413,1675-1991,2265-2564,3126-3149`
- Modify: `src/core.ts:1201-1297,1437-1524`
- Modify: `test/column-pinning.test.ts`
- Modify: `test/basic-core.test.ts`
- Modify: `test/table-interaction.test.tsx`

**Interfaces:**
- Produces Summary splitting:

```ts
type CominsSummaryStyle = Readonly<
  Record<string, string | number | undefined>
>;

export type CominsSummaryCellInput<TValue> = {
  className?: string;
  columnIds: readonly string[];
  sourceColumnId: string;
  style?: CominsSummaryStyle;
  value: TValue;
};

export type CominsSummaryCellFragment<TValue> =
  Omit<CominsSummaryCellInput<TValue>, "value"> & {
    ariaHidden: boolean;
    boundary?: CominsColumnPinned;
    colSpan: number;
    left?: number;
    pinned?: CominsColumnPinned;
    primary: boolean;
    right?: number;
    value: TValue | null;
  };

export function splitCominsSummaryCellsByPinZone<TValue>(input: {
  cells: readonly CominsSummaryCellInput<TValue>[];
  pinning: CominsColumnPinningResult;
}): Array<CominsSummaryCellFragment<TValue>>;
```

`src/index.tsx` adapts `React.CSSProperties` to the framework-neutral
`CominsSummaryStyle` at the boundary.

- [ ] **Step 1: Write failing Summary split tests**

Add to `test/column-pinning.test.ts`:

```ts
it("splits a summary span at effective zone boundaries", () => {
  const pinning = resolveCominsColumnPinning({
    blocks,
    containerWidth: 800,
  });
  const fragments = splitCominsSummaryCellsByPinZone({
    cells: [
      {
        columnIds: ["name", "age", "role", "active"],
        sourceColumnId: "name",
        value: "Rows 2",
      },
    ],
    pinning,
  });

  expect(
    fragments.map(({ ariaHidden, colSpan, pinned, primary, value }) => ({
      ariaHidden,
      colSpan,
      pinned,
      primary,
      value,
    })),
  ).toEqual([
    {
      ariaHidden: false,
      colSpan: 1,
      pinned: "left",
      primary: true,
      value: "Rows 2",
    },
    {
      ariaHidden: true,
      colSpan: 1,
      pinned: undefined,
      primary: false,
      value: null,
    },
    {
      ariaHidden: true,
      colSpan: 2,
      pinned: "right",
      primary: false,
      value: null,
    },
  ]);
});
```

- [ ] **Step 2: Implement contiguous zone fragmentation**

For every logical Summary cell, walk its `columnIds` in effective order and
open a new fragment whenever the effective `pinned` value changes. Copy
class/style metadata to every fragment. Only the first fragment keeps the
original value; continuation values are `null`. Retain `sourceColumnId`
internally for stable keys, but expose the public Summary test identifier only
on the primary fragment.

For a left fragment, copy `left` from its first Column and `boundary` when its
last Column owns the left boundary. For a right fragment, copy `right` from
its last Column and `boundary` when its first Column owns the right boundary.
Center fragments omit all sticky metadata.

- [ ] **Step 3: Render Header groups atomically**

Build each group block from visible children and group runtime `pinned`. Pass `effectiveViewOrder` into `getCominsHeaderRows`.

For a group `<th>`:

- use the first child left offset for left pinning;
- use the last child right offset for right pinning;
- add a boundary marker only when its center-facing child owns that boundary;
- set `data-comins-pinned` and sticky style;
- never read child pin state.

Add grouped-header DOM tests showing all visible children share the group's effective zone and responsive demotion moves the complete block.

- [ ] **Step 4: Render Summary fragments**

Change `summaryCells` to retain all covered Column IDs. Pass the logical cells through `splitCominsSummaryCellsByPinZone`.

Render:

```tsx
<td
  aria-hidden={fragment.ariaHidden || undefined}
  className={[
    "comins-table__summary-cell px-3 py-2",
    fragment.className,
  ].filter(Boolean).join(" ")}
  colSpan={fragment.colSpan}
  data-comins-pinned={fragment.pinned}
  data-comins-pinned-boundary={fragment.boundary}
  data-testid={
    fragment.primary
      ? `summary-cell-${fragment.sourceColumnId}`
      : undefined
  }
  key={`${fragment.sourceColumnId}-${fragmentIndex}`}
  style={{
    ...fragment.style,
    ...(fragment.pinned === "left"
      ? { left: fragment.left, position: "sticky" }
      : fragment.pinned === "right"
        ? { position: "sticky", right: fragment.right }
        : {}),
  }}
>
  {fragment.primary ? fragment.value : null}
</td>
```

Keep the Detail `<td colSpan>` and whole-table empty/loading cells free of sticky attributes. Apply pin metadata to per-column skeleton cells.

- [ ] **Step 5: Lock pointer reorder at source and target**

Before `beginHeaderPointerInteraction` or `beginGroupPointerInteraction`, return when configured pin state exists.

Filter `getColumnMoveTargetId` so pinned targets and targets in another configured zone return `null`. Convert a valid target ID to canonical insertion index:

```ts
const targetIndex = stateRef.current.columnOrder.indexOf(targetId);
```

Do not pass an effective visual index into `moveCominsColumn` or `moveCominsColumnGroup`.

Pinned Headers keep sort, resize, and focus behavior but use `cursor: default` and do not show a drag ghost, source placeholder, or drop marker.

- [ ] **Step 6: Add responsive and layout serialization tests**

In `test/table-interaction.test.tsx`:

1. Mock container width `800`, verify configured pins.
2. Resize to `260`, verify deterministic demotion and effective order.
3. Call `getColumnLayout`, verify all configured `pinned` values remain.
4. Resize to `800`, verify automatic restoration.
5. Verify `onChangeColumnLayout` was not called for either resize.
6. Verify a temporarily demoted Header cannot start a move.
7. Resize a pinned Column, verify Header/Body/Summary offsets update.
8. Hide a pinned Column, verify offsets close the gap.

- [ ] **Step 7: Run all pin-focused unit and DOM checks**

Run:

```bash
npm run lint
npm run test:run -- test/column-pinning.test.ts test/basic-core.test.ts test/table-interaction.test.tsx
```

Expected: PASS.

- [ ] **Step 8: Commit group, Summary, and interaction completion**

```bash
git add src/column-pinning.ts src/core.ts src/index.tsx test/column-pinning.test.ts test/basic-core.test.ts test/table-interaction.test.tsx
git commit -m "feat: complete responsive column pinning"
```

### Task 5: Add the runnable Playground, public guides, and browser acceptance

**Files:**
- Create: `example/src/features/ColumnPinningFeature.tsx`
- Create: `docs/user/20-column-pinning.md`
- Create: `docs/ko/20-column-pinning.md`
- Create: `test/playwright/specs/column-pinning.spec.ts`
- Modify: `example/src/features/featureRegistry.tsx`
- Modify: `example/src/features/types.ts`
- Modify: `example/src/docs/codeSamples.ts`
- Modify: `example/src/docs/docsRoutes.tsx`
- Modify: `example/src/docs/dataTableOptionGuide.ts`
- Modify: `docs/user/06-header.md`
- Modify: `docs/ko/06-header.md`
- Modify: `docs/user/18-summary-row.md`
- Modify: `docs/ko/18-summary-row.md`
- Modify: `README.md`
- Modify: `test/user-docs.test.ts`
- Modify: `test/playwright/specs/header-quality.spec.ts`
- Modify: `test/playwright/specs/summary-row.spec.ts`

**Interfaces:**
- Route: `/examples/column-pinning`
- Feature ID: `column-pinning`
- Primary selectors: `column-pinning-example-basic`, `column-pinning-example-group`, `column-pinning-example-responsive`, `column-pinning-layout-json`.

- [ ] **Step 1: Build a controlled pinning Playground**

Create `ColumnPinningFeature.tsx` with:

- left-pinned `name`;
- center `age` and `role`;
- right-pinned `active`;
- a group-pinned example whose child definitions contain no pin values;
- a Summary cell with a span crossing all three zones;
- a Row Detail example showing the Detail cell is not sticky;
- buttons that read, update, and restore `CominsColumnLayout` through the table ref;
- a width toggle between `900px` and `280px`;
- visible serialized layout JSON.

Register:

```ts
{
  Component: ColumnPinningFeature,
  description: "Persistent left/right Column Pinning and responsive demotion examples.",
  id: "column-pinning",
  label: "Column Pinning",
  options: [
    {
      description: "Pins an ungrouped leaf Column to the left or right.",
      example: 'pinned: "left"',
      name: "columns[].pinned",
    },
    {
      description: "Pins every visible child as one atomic Header group.",
      example: 'pinned: "right"',
      name: "columnGroups[].pinned",
    },
    {
      description: "Persists configured pin intent with width and order.",
      example: "getColumnLayout() / setColumnLayout(layout)",
      name: "CominsColumnLayout",
    },
  ],
  summary: "Left/right pinned Columns, grouped Headers, responsive demotion, and layout persistence.",
}
```

- [ ] **Step 2: Write the public documentation**

In both `20-column-pinning.md` files document:

- definition and layout fields;
- group ownership and ignored child pins;
- configured versus effective state;
- `48px` center reserve;
- wider-side/tie-right demotion;
- reorder lock and resize support;
- no built-in pin UI;
- Summary fragmentation;
- non-sticky Detail content;
- old layout compatibility;
- accessibility and DOM-order behavior.

Cross-link from Header and Summary guides. Add the layout JSON example to README. Add option-guide entries.

- [ ] **Step 3: Add documentation assertions**

In `test/user-docs.test.ts`:

```ts
for (const document of [englishPinning, koreanPinning]) {
  expect(document).toContain('pinned?: "left" | "right"');
  expect(document).toContain("getColumnLayout");
  expect(document).toContain("setColumnLayout");
  expect(document).toContain("48");
  expect(document).toContain("Summary");
  expect(document).toContain("Row Detail");
}

expect(playground).toContain(
  'data-testid="column-pinning-example-responsive"',
);
expect(playground).toContain(
  'data-testid="column-pinning-layout-json"',
);
```

Run:

```bash
npm run test:run -- test/user-docs.test.ts
```

Expected: PASS.

- [ ] **Step 4: Add browser pinning acceptance**

Create `test/playwright/specs/column-pinning.spec.ts` covering:

1. Left/right Header and Body cells retain viewport-edge `getBoundingClientRect()` positions during horizontal scroll.
2. Header, Body, skeleton, and Summary offsets match.
3. Configured pinned source Headers never create a ghost or source placeholder.
4. Center reorder cannot target either pinned zone.
5. Pinned resize updates all surfaces without drift.
6. Group pinning never splits children.
7. `900px → 280px → 900px` performs deterministic demotion and restoration while layout JSON stays unchanged.
8. Summary spans split into legal zone fragments with only one public test ID and continuation `aria-hidden`.
9. Row Detail remains one non-sticky full-span cell.
10. DOM order equals left/center/right visual order and keyboard focus follows it.
11. No browser warning or page error is emitted.

- [ ] **Step 5: Lock placeholder and border visuals**

Extend `header-quality.spec.ts`:

- activate an ordinary center Header drag;
- compare computed source placeholder background against the Header background;
- assert the placeholder color is not transparent and differs from the source Header color;
- preserve the existing ghost and marker assertions.

Extend `column-pinning.spec.ts` to read computed separator colors and assert they are neither `rgb(0, 0, 0)` nor transparent.

Extend `summary-row.spec.ts` with a pinned-span example.

Run:

```bash
npm run test:e2e -- test/playwright/specs/column-pinning.spec.ts test/playwright/specs/header-quality.spec.ts test/playwright/specs/summary-row.spec.ts --workers=1
```

Expected: PASS.

- [ ] **Step 6: Commit public pinning coverage**

```bash
git add example/src/features/ColumnPinningFeature.tsx example/src/features/featureRegistry.tsx example/src/features/types.ts example/src/docs/codeSamples.ts example/src/docs/docsRoutes.tsx example/src/docs/dataTableOptionGuide.ts docs/user/20-column-pinning.md docs/ko/20-column-pinning.md docs/user/06-header.md docs/ko/06-header.md docs/user/18-summary-row.md docs/ko/18-summary-row.md README.md test/user-docs.test.ts test/playwright/specs/column-pinning.spec.ts test/playwright/specs/header-quality.spec.ts test/playwright/specs/summary-row.spec.ts
git commit -m "feat: document and demonstrate column pinning"
```

### Task 6: Verify 100,000-Row pinning performance and complete gates

**Files:**
- Modify: `example/src/features/BodyFeature.tsx`
- Modify: `test/playwright/specs/virtualization.spec.ts`
- Modify: `test/playwright/specs/memory-leak-full-audit.spec.ts`
- Modify: `reports/2026-07-31.md`

**Interfaces:**
- Query fixture: `/performance/virtualization?fixture=column-pinning`.
- The fixture pins the first two Columns left and the final Column right; the default route remains unchanged.

- [ ] **Step 1: Add the query-selected pinning fixture**

Reuse the `fixture` query value introduced by the Row Expand plan:

```ts
const useColumnPinning = fixture === "column-pinning";
```

When true, add `pinned: "left"` to the first two column definitions and `pinned: "right"` to the last definition. Keep widths numeric and preserve the existing ten-Column data set.

- [ ] **Step 2: Add focused pinning performance tests**

Add an `@perf` test that:

1. opens the pinning fixture;
2. scrolls horizontally through the full center width;
3. scrolls vertically to the middle and bottom;
4. asserts rendered owner Rows remain `<= 45`;
5. asserts physical Scroll Height remains `< 2_000_000`;
6. asserts left/right cells remain aligned;
7. resizes one pinned Column;
8. instruments body-cell `getBoundingClientRect` and asserts offset recomputation does not scan rendered body cells;
9. returns to the top and verifies no sticky gap or duplicate cell.

Run:

```bash
npm run test:perf -- test/playwright/specs/virtualization.spec.ts --workers=1
```

Expected: PASS.

- [ ] **Step 3: Add route lifecycle recovery**

Extend the full memory audit:

- open Column Pinning;
- scroll horizontally in every example;
- toggle narrow/wide ten times;
- resize and restore layout;
- return to Getting Started;
- require nodes, listeners, heap, and documents within the existing `10 percent` recovery policy.

Run:

```bash
npm run test:perf -- test/playwright/specs/memory-leak-full-audit.spec.ts --workers=1
```

Expected: PASS.

- [ ] **Step 4: Run complete gates**

Run:

```bash
npm run verify
npm run test:e2e -- --workers=1
npm run test:perf -- --workers=1
```

Expected: all exit `0`. Do not rerun the full gate until a product, test-contract, or execution-environment failure has been classified.

- [ ] **Step 5: Append results and residual risks**

Update `reports/2026-07-31.md` with:

- pinning implementation summary;
- focused commands and results;
- computed-style separator and placeholder verification;
- narrow/wide configured-layout stability;
- 100,000-Row rendered count and geometry-read result;
- full gate results;
- residual browser risk for sticky table-cell behavior not covered by the project browser matrix.

- [ ] **Step 6: Commit performance coverage and report**

```bash
git add example/src/features/BodyFeature.tsx test/playwright/specs/virtualization.spec.ts test/playwright/specs/memory-leak-full-audit.spec.ts reports/2026-07-31.md
git commit -m "test: verify column pinning performance"
```

## Column Pinning Completion Gate

Do not begin Row Grouping integration until:

- old and new layouts normalize and serialize correctly;
- grouped child pin fields are omitted and group state is authoritative;
- configured pinned blocks cannot move in core or pointer UI;
- every table surface uses the same effective order, width, offsets, and boundary markers;
- narrow viewport demotion preserves configured layout and restores automatically;
- selection and clipboard traverse effective visual Column order;
- Summary spans never cross effective zones;
- Row Detail remains one non-sticky spanning cell;
- source placeholder and separators use approved background-derived darker colors;
- focused, full E2E, full verify, and full performance gates pass.
