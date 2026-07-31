# Row Grouping Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add controlled client-side Row Grouping with deterministic multi-level groups, fixed-height synthetic group rows, built-in aggregation, hierarchy-first sorting, and leaf-only interaction semantics while preserving application-owned `TData`.

**Architecture:** Build grouping as three memoizable layers in a new framework-neutral module: membership and aggregation, hierarchy ordering, and expansion-dependent visible projection. Keep group nodes private and store only metadata plus source indexes at the lowest level. Feed group and data slots into the Row Expand virtual-layout contract, then render group rows through the same effective Column Pinning order without creating fake rows in core state.

**Tech Stack:** React 18-19 peer range, TypeScript 7, Vitest 4 with jsdom, Playwright 1.61, Vite 8, existing Comins fixed/mixed virtualization helpers.

## Global Constraints

- Implement `docs/superpowers/specs/2026-07-31-row-grouping-design.md`.
- Execute only after both
  `docs/superpowers/plans/2026-07-31-row-expand-variable-detail-height.md`
  and `docs/superpowers/plans/2026-07-31-column-pinning.md` pass their
  completion gates.
- Keep every application `TData`, business Row ID, and source data index
  unchanged. Never inject a synthetic group value into `state.rows`.
- Keep grouping controlled through `rowGrouping`. Do not create internal
  expansion state.
- Keep Tree expansion, group expansion, and Row Detail expansion as separate
  namespaces and contracts.
- Keep source grouping Columns visible unless existing Column layout state
  hides them.
- Reject grouping with pagination, infinite scroll, lazy load, Row drag, and
  Tree props at type level, and keep those paths inert for untyped JavaScript
  callers.
- Support only `avg`, `count`, `max`, `min`, and `sum`. Do not add custom
  reducers, aggregate sorting, group selection, Pivot, or group renderers.
- Keep each group slot exactly `rowHeight`. Only an expanded owner data slot
  may make the virtual projection variable-height.
- Keep group rows out of ordinary Row/Cell callbacks, renderers, formatters,
  tooltips, selection, clipboard, Row Detail, and Row movement.
- Preserve dormant selected Row IDs and expanded group/detail IDs when their
  owners are temporarily not projected.
- Preserve the existing Summary Row input over original leaf data only.
- Render one group cell per effective visible Column. Never span across a
  pinned zone.
- Do not claim a `treegrid` role or add a hierarchy keyboard model in V1.
- Do not add dependencies, package subpaths, or package version changes.
- Keep external comparison and benchmark material outside tracked files.
- Do not push, publish, tag, create a Release, or mutate remote settings.

---

## File Map

| File | Responsibility |
| --- | --- |
| `src/grouping.ts` | Public grouping types plus private normalization, typed key encoding, membership, aggregation, ordering, and projection helpers. |
| `src/core.ts` | Optional visible Row traversal for selection/clipboard and sort-model reuse without synthetic rows. |
| `src/index.tsx` | Discriminated flat props, grouping memo layers, virtual slot integration, group rendering, controlled expansion, focus correction, and runtime exclusions. |
| `src/virtual-layout.ts` | Reuse Row Expand mixed/fixed slot lookup and anchor correction for group projection changes. |
| `src/row-detail.tsx` | Reuse leaf Detail eligibility and height ownership without allowing group owners. |
| `src/column-pinning.ts` | Reuse effective order and sticky metadata for one-cell-per-Column group rows. |
| `styles.css` | Module-scoped group-row, indentation, disclosure, pinned, focus, and selected-leaf styles. |
| `tsconfig.json` | Continue compile-time coverage for `test/typecheck`. |
| `test/grouping.test.ts` | Key, ID, criterion, membership, aggregation, ordering, projection, and memory-shape tests. |
| `test/typecheck/row-grouping-api.tsx` | Grouped/ungrouped/Tree prop discrimination and Row Detail compatibility. |
| `test/basic-core.test.ts` | Visible leaf order for selection and clipboard helpers. |
| `test/table-interaction.test.tsx` | Group DOM, callbacks, controlled expansion, selection, Detail, Pinning, drag, Summary, and focus tests. |
| `example/src/features/RowGroupingFeature.tsx` | Controlled single/multi-level, aggregation, Pinning, and Detail examples. |
| `example/src/features/BodyFeature.tsx` | Low/high-cardinality and integration performance fixtures. |
| `example/src/features/featureRegistry.tsx` | Row Grouping feature and public option descriptions. |
| `example/src/features/types.ts` | `row-grouping` feature ID. |
| `example/src/docs/codeSamples.ts` | Row Grouping runnable sample. |
| `example/src/docs/docsRoutes.tsx` | `/examples/row-grouping` documentation route. |
| `example/src/docs/dataTableOptionGuide.ts` | Implemented grouping options and prohibited combinations. |
| `docs/user/21-row-grouping.md`, `docs/ko/21-row-grouping.md` | Matching public grouping guide. |
| `docs/user/07-row.md`, `docs/ko/07-row.md` | Leaf-only Row callback and selection behavior. |
| `docs/user/19-row-expand.md`, `docs/ko/19-row-expand.md` | Grouped leaf Detail compatibility. |
| `docs/user/20-column-pinning.md`, `docs/ko/20-column-pinning.md` | Group-row effective pin alignment. |
| `README.md` | Public capability summary and minimal controlled example. |
| `test/user-docs.test.ts` | Documentation and Playground registration assertions. |
| `test/playwright/specs/row-grouping.spec.ts` | Browser behavior, focus, clipboard, anchoring, Pinning, and Detail acceptance. |
| `test/playwright/specs/virtualization.spec.ts` | Large grouped projection performance. |
| `test/playwright/specs/memory-leak-full-audit.spec.ts` | Grouping route lifecycle and recovery. |
| `reports/2026-07-31.md` | Exact commands, results, performance signals, and residual risks appended to the work record. |

### Task 1: Add the controlled public API and prohibited-prop discrimination

**Files:**
- Create: `test/typecheck/row-grouping-api.tsx`
- Create: `src/grouping.ts`
- Modify: `src/index.tsx:1-283,3165-3285`
- Modify: `tsconfig.json`

**Interfaces:**
- Produces the approved public types:

```ts
import type React from "react";

import type {
  CominsRowId,
  CominsTableRuntimeColumn,
} from "./core";

export type CominsRowGroupKey =
  | string
  | number
  | boolean
  | null
  | Date;

export type CominsRowGroupingSourceRow<TData> = {
  data: TData;
  dataIndex: number;
  id: CominsRowId;
};

export type CominsRowGroupingValueParams<TData> = {
  column: CominsTableRuntimeColumn<TData>;
  row: CominsRowGroupingSourceRow<TData>;
  value: unknown;
};

export type CominsRowGroupingLabelParams<TData> = {
  column: CominsTableRuntimeColumn<TData>;
  depth: number;
  firstRow: CominsRowGroupingSourceRow<TData>;
  key: CominsRowGroupKey;
};

export type CominsRowGroupingCriterion<TData> = {
  columnId: string;
  getKey?: (
    params: CominsRowGroupingValueParams<TData>,
  ) => CominsRowGroupKey | undefined;
  getLabel?: (
    params: CominsRowGroupingLabelParams<TData>,
  ) => React.ReactNode;
};

export type CominsRowGroupingCriterionInput<TData> =
  | string
  | CominsRowGroupingCriterion<TData>;

export type CominsRowGroupAggregation =
  | "avg"
  | "count"
  | "max"
  | "min"
  | "sum";

export type CominsRowGroupingConfig<TData> = {
  aggregations?: Readonly<
    Partial<Record<string, CominsRowGroupAggregation>>
  >;
  criteria: readonly CominsRowGroupingCriterionInput<TData>[];
  expandedGroupIds?: readonly string[];
  onChangeExpandedGroupIds?: (groupIds: string[]) => void;
};
```

- `src/index.tsx` re-exports only the approved public grouping types from the
  existing root entry. Do not re-export private helpers and do not add
  `./grouping` to `package.json` exports.
- Split the current flat props into a private common base. The base contains
  all existing ordinary flat props and the Row Expand
  `CominsRowDetailProps<TData>` intersection, then forms these two public
  branches:

```ts
type CominsUngroupedTableProps<TData> =
  CominsFlatTableBaseProps<TData> & {
    rowGrouping?: undefined;
  };

type CominsGroupedTableProps<TData> =
  Omit<
    CominsFlatTableBaseProps<TData>,
    | "hasMoreRows"
    | "infiniteScroll"
    | "infiniteScrollThreshold"
    | "lazyLoad"
    | "lazyLoadBatchSize"
    | "lazyLoadMode"
    | "lazyLoadThreshold"
    | "loadingMore"
    | "onLazyLoad"
    | "onLoadMore"
    | "pagination"
    | "rowProps"
  > & {
    hasMoreRows?: never;
    infiniteScroll?: never;
    infiniteScrollThreshold?: never;
    lazyLoad?: never;
    lazyLoadBatchSize?: never;
    lazyLoadMode?: never;
    lazyLoadThreshold?: never;
    loadingMore?: never;
    onLazyLoad?: never;
    onLoadMore?: never;
    pagination?: never;
    rowGrouping: CominsRowGroupingConfig<TData>;
    rowProps?: Omit<CominsTableRowProps<TData>, "draggable"> & {
      draggable?: never;
    };
  };

export type CominsTableProps<TData> =
  | CominsUngroupedTableProps<TData>
  | CominsGroupedTableProps<TData>;
```

- Refactor `CominsTreeTableProps<TData>` to derive from
  `CominsFlatTableBaseProps<TData>`, not from the new union. Preserve its
  existing omissions and explicit Row Detail `never` fields, then add
  `rowGrouping?: never`.

- [ ] **Step 1: Write compile-time acceptance and rejection fixtures**

Create `test/typecheck/row-grouping-api.tsx`:

```tsx
import {
  CominsTable,
  type CominsRowGroupingConfig,
} from "../../src";

type Row = {
  amount: number | null;
  id: string;
  region: string;
};

const grouping = {
  aggregations: {
    amount: "sum",
    id: "count",
  },
  criteria: [
    "region",
    {
      columnId: "amount",
      getKey: ({ value }) =>
        typeof value === "number" && value >= 100 ? "high" : "low",
    },
  ],
  expandedGroupIds: [],
  onChangeExpandedGroupIds: (_ids) => undefined,
} satisfies CominsRowGroupingConfig<Row>;

const columns = [
  { field: "region", label: "Region", pinned: "left" as const },
  { field: "amount", label: "Amount" },
];

<CominsTable
  columns={columns}
  data={[]}
  getRowId={(row) => row.id}
  isRowExpandable={() => true}
  renderRowDetail={({ row }) => row.data.region}
  rowGrouping={grouping}
/>;

// @ts-expect-error grouped tables do not accept pagination.
<CominsTable columns={columns} data={[]} pagination={{ pageSize: 10 }} rowGrouping={grouping} />;

// @ts-expect-error grouped tables do not accept infinite loading.
<CominsTable columns={columns} data={[]} infiniteScroll onLoadMore={() => undefined} rowGrouping={grouping} />;

// @ts-expect-error grouped tables do not accept draggable row props.
<CominsTable columns={columns} data={[]} rowGrouping={grouping} rowProps={{ draggable: true }} />;

// @ts-expect-error Tree tables do not accept Row Grouping.
<CominsTable columns={columns} data={[]} getRowId={(row) => row.id} rowGrouping={grouping} tree />;

const invalidGrouping: CominsRowGroupingConfig<Row> = {
  // @ts-expect-error custom reducer names are not supported in V1.
  aggregations: { amount: "median" },
  criteria: ["region"],
};

void invalidGrouping;
```

Keep an ordinary ungrouped fixture to prove every existing flat prop remains
assignable.

- [ ] **Step 2: Run the type gate and confirm RED**

Run:

```bash
npm run lint
```

Expected: FAIL because grouping types, flat prop discrimination, and Row
Detail props do not yet exist.

- [ ] **Step 3: Add types and root exports**

Create `src/grouping.ts` with only the public type block first. Add a
type-only named export:

```ts
export type {
  CominsRowGroupAggregation,
  CominsRowGroupKey,
  CominsRowGroupingConfig,
  CominsRowGroupingCriterion,
  CominsRowGroupingCriterionInput,
  CominsRowGroupingLabelParams,
  CominsRowGroupingSourceRow,
  CominsRowGroupingValueParams,
} from "./grouping";
```

to `src/index.tsx`. Refactor the current `CominsTableProps` fields and its Row
Detail intersection into `CominsFlatTableBaseProps` and form the public union
exactly as above.

Change the Tree type's source from `CominsTableProps<TData>` to
`CominsFlatTableBaseProps<TData>`, preserve the Row Expand exclusions, and
expose `rowGrouping?: never`.

Update the implementation-only inner props to use
`CominsFlatTableBaseProps<TData>` plus a normalized optional grouping config so
union destructuring does not weaken the public branch.

- [ ] **Step 4: Keep the runtime branch fail-closed**

At the adapter boundary calculate:

```ts
const groupingRequested =
  !props.tree &&
  props.rowGrouping !== undefined &&
  Array.isArray(props.rowGrouping.criteria) &&
  props.rowGrouping.criteria.length > 0;
```

Pass a private `groupingRequested` flag into the flat implementation. When it
is true, force these implementation values before effects or refs see them:

```ts
const effectiveInfiniteScroll = false;
const effectiveLazyLoad = false;
const effectivePagination = {
  pageIndex: 0,
  pageSize: Math.max(1, data.length),
};
const effectiveRowDraggable = false;
```

Do not call `onLoadMore`, `onLazyLoad`, or Row movement from any grouped path
even when an untyped caller supplies them.

- [ ] **Step 5: Run type coverage and commit**

Run:

```bash
npm run lint
```

Expected: PASS, including `test/typecheck/row-grouping-api.tsx`.

Commit:

```bash
git add src/grouping.ts src/index.tsx tsconfig.json test/typecheck/row-grouping-api.tsx
git commit -m "feat: define controlled row grouping contract"
```

### Task 2: Build deterministic membership and one-pass aggregation

**Files:**
- Modify: `src/grouping.ts`
- Create: `test/grouping.test.ts`

**Interfaces:**
- Produces normalized private data:

```ts
export type CominsNormalizedGroupKey =
  | { kind: "boolean"; payload: boolean }
  | { kind: "date"; payload: number }
  | { kind: "empty" }
  | { kind: "number"; payload: number }
  | { kind: "string"; payload: string }
  | { kind: "unsupported" };

export type CominsNormalizedGroupingCriterion<TData> = {
  column: CominsTableRuntimeColumn<TData>;
  getKey?: CominsRowGroupingCriterion<TData>["getKey"];
  getLabel?: CominsRowGroupingCriterion<TData>["getLabel"];
};

export type CominsAggregateState =
  | { count: number; kind: "count" }
  | { count: number; kind: "avg"; sum: number }
  | { hasValue: boolean; kind: "max" | "min"; value: number }
  | { count: number; kind: "sum"; sum: number };

export type CominsGroupNode = {
  aggregationState: ReadonlyMap<string, CominsAggregateState>;
  childGroupIds: readonly string[];
  columnId: string;
  depth: number;
  firstSourceIndex: number;
  groupId: string;
  key: CominsNormalizedGroupKey;
  label: React.ReactNode;
  leafSourceIndexes?: readonly number[];
  parentGroupId: string | null;
};

export type CominsGroupTree<TData> = {
  criteria: readonly CominsNormalizedGroupingCriterion<TData>[];
  nodesById: ReadonlyMap<string, CominsGroupNode>;
  rootGroupIds: readonly string[];
};

export function normalizeCominsRowGrouping<TData>(input: {
  columns: readonly CominsTableRuntimeColumn<TData>[];
  config: CominsRowGroupingConfig<TData>;
}): {
  aggregations: ReadonlyMap<string, CominsRowGroupAggregation>;
  criteria: readonly CominsNormalizedGroupingCriterion<TData>[];
};

export function createCominsGroupTree<TData>(input: {
  aggregations: ReadonlyMap<string, CominsRowGroupAggregation>;
  criteria: readonly CominsNormalizedGroupingCriterion<TData>[];
  rows: readonly CominsRowGroupingSourceRow<TData>[];
}): CominsGroupTree<TData>;

export function getCominsAggregateValue(
  state: CominsAggregateState,
): number | null;
```

- `CominsGroupNode` is private to implementation even if exported from its
  source file for unit tests; do not re-export it as a documented public API.

- [ ] **Step 1: Write failing criterion, key, and ID tests**

Create `test/grouping.test.ts` and cover:

```ts
it("keeps the first valid occurrence and allows hidden criteria", () => {
  const normalized = normalizeCominsRowGrouping({
    columns,
    config: {
      criteria: ["region", "unknown", "region", "hiddenCode"],
    },
  });

  expect(normalized.criteria.map(({ column }) => column.id)).toEqual([
    "region",
    "hiddenCode",
  ]);
});

it("uses typed length-prefixed IDs without label collisions", () => {
  const variants = [
    { expectedKind: "empty", value: null },
    { expectedKind: "empty", value: undefined },
    { expectedKind: "number", value: 0 },
    { expectedKind: "number", value: -0 },
    { expectedKind: "number", value: 1 },
    { expectedKind: "string", value: "1" },
    { expectedKind: "boolean", value: true },
    { expectedKind: "date", value: new Date(1) },
    { expectedKind: "unsupported", value: Number.NaN },
    { expectedKind: "unsupported", value: {} },
  ];

  const encoded = variants.map(({ value }) =>
    encodeCominsGroupPath([
      {
        columnId: "segment:one",
        key: normalizeCominsGroupKey(value),
      },
    ]),
  );

  expect(encoded.every((id) => id.startsWith("comins-group:"))).toBe(true);
  expect(encoded[0]).toBe(encoded[1]);
  expect(encoded[2]).toBe(encoded[3]);
  expect(new Set([encoded[4], encoded[5], encoded[6], encoded[7]]).size).toBe(4);
  expect(encoded[8]).toBe(encoded[9]);
});
```

Also prove:

- finite numbers only;
- invalid Dates become unsupported;
- labels do not participate in IDs;
- `getLabel` receives `null` for empty, is never called for unsupported, and
  its first source Row/depth remain stable after sorting;
- criterion order changes IDs;
- delimiter text inside Column IDs and string keys cannot collide.

- [ ] **Step 2: Run pure tests and confirm RED**

Run:

```bash
npm run test:run -- test/grouping.test.ts
```

Expected: FAIL because normalization and ID helpers are absent.

- [ ] **Step 3: Implement exact normalized-key semantics**

Implement:

```ts
export function normalizeCominsGroupKey(
  value: unknown,
): CominsNormalizedGroupKey {
  if (value === null || value === undefined) {
    return { kind: "empty" };
  }
  if (typeof value === "string") {
    return { kind: "string", payload: value };
  }
  if (typeof value === "number") {
    return Number.isFinite(value)
      ? { kind: "number", payload: Object.is(value, -0) ? 0 : value }
      : { kind: "unsupported" };
  }
  if (typeof value === "boolean") {
    return { kind: "boolean", payload: value };
  }
  if (value instanceof Date) {
    const timestamp = value.getTime();
    return Number.isFinite(timestamp)
      ? { kind: "date", payload: timestamp }
      : { kind: "unsupported" };
  }
  return { kind: "unsupported" };
}
```

Encode every path segment as:

```text
<column-id-length>:<column-id><kind-length>:<kind><payload-length>:<payload>
```

Prefix the concatenated path with `comins-group:`. Use the normalized numeric
and boolean string form as payload. Empty and unsupported payloads are empty
strings but remain distinct by kind.

- [ ] **Step 4: Write failing membership, reducer, and memory-shape tests**

Add tests that ingest two grouping levels and assert:

1. root IDs preserve first source occurrence;
2. only lowest-level nodes own `leafSourceIndexes`;
3. parent nodes own only child IDs;
4. no node field refers to a source `TData` object;
5. `firstSourceIndex` remains source-order stable;
6. aggregation sees all descendants while collapsed state is absent from the
   membership input;
7. changing only expanded IDs can reuse the same tree reference.

Reducer table:

| Reducer | Input | Result |
| --- | --- | --- |
| `count` | `[1, null, "x", NaN]` | `4` |
| `sum` | `[1, 2, null, NaN]` | `3` |
| `avg` | `[1, 2, null, NaN]` | `1.5` |
| `min` | `[3, -1, "0"]` | `-1` |
| `max` | `[3, -1, Infinity]` | `3` |
| numeric reducer | `[null, "x", NaN]` | `null` |

Add untyped configuration coverage showing unknown output Columns and invalid
reducers are ignored.

- [ ] **Step 5: Implement one-pass membership and aggregation**

For every source Row:

1. walk normalized criteria in order;
2. resolve raw value through the criterion Column;
3. call `getKey` when present and allow callback exceptions to propagate;
4. normalize the key and extend the typed path ID;
5. create or reuse the node at that path;
6. update the node's aggregate reducer states immediately;
7. link a newly created child ID once to its parent;
8. append the source index only to the lowest-level node.

Do not create descendant arrays on parent nodes. Retain one immutable
`aggregationState` map per node and resolve its display value through
`getCominsAggregateValue` without re-walking source rows.

Resolve default labels as `(empty)` and `(unsupported)`. Invoke `getLabel` for
supported and empty keys using `null` for empty, but never invoke it for an
unsupported key. Store the resolved label once on the node when the group is
created; sorting and expansion must not invoke the label callback again.

- [ ] **Step 6: Run pure tests and commit**

Run:

```bash
npm run test:run -- test/grouping.test.ts
```

Expected: PASS.

Commit:

```bash
git add src/grouping.ts test/grouping.test.ts
git commit -m "feat: build row group membership"
```

### Task 3: Add hierarchy-first ordering and expansion projection

**Files:**
- Modify: `src/grouping.ts`
- Modify: `src/core.ts:1382-1524`
- Modify: `test/grouping.test.ts`
- Modify: `test/basic-core.test.ts`

**Interfaces:**
- Produces ordered metadata and visible entries:

```ts
export type CominsOrderedGroupTree<TData> = CominsGroupTree<TData> & {
  orderedChildGroupIdsById: ReadonlyMap<string, readonly string[]>;
  orderedLeafSourceIndexesById: ReadonlyMap<string, readonly number[]>;
  orderedRootGroupIds: readonly string[];
};

export type CominsGroupingProjectionEntry =
  | {
      groupId: string;
      key: string;
      kind: "group";
    }
  | {
      dataIndex: number;
      key: string;
      kind: "data";
      rowId: CominsRowId;
      visibleLeafIndex: number;
    };

export function orderCominsGroupTree<TData>(input: {
  columns: readonly CominsTableRuntimeColumn<TData>[];
  rows: readonly TData[];
  sortModel: CominsSortModel;
  tree: CominsGroupTree<TData>;
}): CominsOrderedGroupTree<TData>;

export function projectCominsGroupTree<TData>(input: {
  expandedGroupIds: readonly string[];
  rowIds: readonly CominsRowId[];
  tree: CominsOrderedGroupTree<TData>;
}): {
  entries: readonly CominsGroupingProjectionEntry[];
  visibleLeafRowIds: readonly CominsRowId[];
};
```

- Extend only traversal-sensitive core helpers to accept the optional
  `CominsTableViewOrder` introduced by Column Pinning. Grouping supplies
  `rowIds`; Pinning supplies `columnIds`; integration supplies both.

- [ ] **Step 1: Write failing hierarchy ordering tests**

Add fixtures with two criteria and a three-rule sort model. Assert:

- a grouping-Column rule sorts only sibling groups at its matching depth;
- same-type keys follow natural built-in ordering;
- mixed keys follow `empty`, `unsupported`, `boolean`, `number`, `date`,
  `string`;
- descending reverses the complete total order;
- the custom Column leaf comparator is not called for group keys;
- a grouping rule is consumed and does not sort lowest-level leaves;
- remaining rules sort leaves using existing stable comparator behavior;
- without a grouping rule, sibling order remains first source occurrence;
- sorting does not modify group IDs.

- [ ] **Step 2: Run ordering tests and confirm RED**

Run:

```bash
npm run test:run -- test/grouping.test.ts
```

Expected: FAIL because ordered maps and hierarchy-specific sort consumption
are absent.

- [ ] **Step 3: Implement built-in group ordering and leaf reuse**

Add:

```ts
const COMINS_GROUP_KEY_RANK = {
  empty: 0,
  unsupported: 1,
  boolean: 2,
  number: 3,
  date: 4,
  string: 5,
} as const;
```

Compare keys without application comparators. Preserve `firstSourceIndex` as
the stable tie-break.

Extract the current leaf sort comparison into a reusable core helper that
accepts an explicit subset of source indexes and sort rules:

```ts
export function getCominsSortedRowIndexes<TData>(
  state: CominsTableState<TData>,
  input?: {
    rowIndexes?: readonly number[];
    sortModel?: CominsSortModel;
  },
): number[];
```

Keep an omitted input behavior-identical for all existing callers. Pass only
non-grouping sort rules for each lowest-level leaf index array.

- [ ] **Step 4: Write failing projection and expansion tests**

Cover:

```ts
it("projects groups and visible leaves without counting groups as leaves", () => {
  const projection = projectCominsGroupTree({
    expandedGroupIds: [rootId, childId],
    rowIds,
    tree: ordered,
  });

  expect(projection.entries.map((entry) => entry.kind)).toEqual([
    "group",
    "group",
    "data",
    "data",
    "group",
  ]);
  expect(
    projection.entries
      .filter((entry) => entry.kind === "data")
      .map((entry) => entry.visibleLeafIndex),
  ).toEqual([0, 1]);
});
```

Also assert:

- roots always project;
- descendants project only while each ancestor is expanded;
- duplicate expanded IDs preserve first occurrence;
- unknown and dormant IDs are ignored without mutating caller input;
- a data entry key and group key cannot collide;
- collapsed branches are not traversed into entries;
- projection changes reuse the membership and ordered-tree references.

- [ ] **Step 5: Implement controlled visible projection**

Normalize expanded IDs into a `Set` for lookup while retain the caller's
deduplicated ordered array for callbacks. Depth-first project each root group.
Emit the group before its children. Increment `visibleLeafIndex` only for data
entries and append only those Row IDs to `visibleLeafRowIds`.

Use stable keys:

```ts
const groupSlotKey = `group:${encodeURIComponent(groupId)}`;
const dataSlotKey = getCominsDataSlotKey(rowId);
```

Import the existing private `getCominsDataSlotKey` from `virtual-layout.ts`.
Pass projection `entry.key` unchanged into the final group Slot and verify the
data Slot creator returns the same key. The distinct prefixes keep internal
namespaces separate even when a business Row ID text resembles a group ID.

- [ ] **Step 6: Route selection and clipboard through visible leaves**

Use `viewOrder?.rowIds ?? state.rowIds` in:

- row range selection;
- Cell range Row bounds;
- copy Row/Cell range traversal;
- paste Cell range traversal;
- keyboard Row/Cell navigation.

Keep lookup of a business Row ID against `state.rowIds` so the data index still
means source index. Add `test/basic-core.test.ts` coverage where visible Row
order excludes collapsed leaves and includes a different sort order.

- [ ] **Step 7: Run pure/core gates and commit**

Run:

```bash
npm run lint
npm run test:run -- test/grouping.test.ts test/basic-core.test.ts
```

Expected: PASS.

Commit:

```bash
git add src/grouping.ts src/core.ts test/grouping.test.ts test/basic-core.test.ts
git commit -m "feat: project ordered row groups"
```

### Task 4: Render fixed group slots and controlled disclosure

**Files:**
- Modify: `src/index.tsx:267-330,1038-1645,2590-3149`
- Modify: `src/virtual-layout.ts`
- Modify: `styles.css`
- Modify: `test/table-interaction.test.tsx`

**Interfaces:**
- Consumes `CominsGroupingProjectionEntry`, Row Expand slot heights, and
  Column Pinning's effective order.
- Reuses the Row Expand Slot union without introducing a second Slot shape:

```ts
type CominsGroupingVirtualSlot<TData> = CominsVirtualSlot<TData>;
```

- Every `CominsGroupVirtualSlot` uses `height: safeRowHeight`.
- Every projected leaf becomes the existing `CominsDataVirtualSlot<TData>`:
  `visibleLeafIndex` maps to its `visibleIndex`, and its optional `detail`
  descriptor comes from the Row Expand controlled-height resolver.
- `getCominsSlotHeight(slot, safeRowHeight)` remains the only final Slot-height
  calculation.

- [ ] **Step 1: Write failing controlled disclosure and semantic DOM tests**

In `test/table-interaction.test.tsx`, render two-level controlled grouping.
Assert:

1. initially only root group Rows exist;
2. each group Row has exactly one cell per visible Column;
3. the label cell is `<th scope="row">`;
4. its button has `aria-expanded`, depth in its accessible name, and native
   `disabled` when no callback exists;
5. clicking an enabled disclosure emits one complete next ID array but does
   not visually expand until props change;
6. duplicate and dormant IDs remain preserved once in callback output;
7. unknown or fully invalid criteria render the ordinary flat projection;
8. source grouping Columns remain visible;
9. hidden grouping Columns still produce labels in the first visible cell;
10. empty data uses the existing empty state and loading uses ordinary
    skeleton Rows.

Use test IDs only on the built-in disclosure:

```text
row-group-disclosure-<group-id>
```

- [ ] **Step 2: Run component tests and confirm RED**

Run:

```bash
npm run test:run -- test/table-interaction.test.tsx
```

Expected: FAIL because group projection and disclosure rendering are absent.

- [ ] **Step 3: Memoize the three grouping layers**

In `CominsTableInner` derive:

```ts
const normalizedGrouping = useMemo(
  () => rowGrouping
    ? normalizeCominsRowGrouping({
        columns: state.columns,
        config: rowGrouping,
      })
    : null,
  [rowGrouping?.aggregations, rowGrouping?.criteria, state.columns],
);

const groupTree = useMemo(
  () => normalizedGrouping && normalizedGrouping.criteria.length > 0
    ? createCominsGroupTree({
        aggregations: normalizedGrouping.aggregations,
        criteria: normalizedGrouping.criteria,
        rows: state.rows.map((data, dataIndex) => ({
          data,
          dataIndex,
          id: state.rowIds[dataIndex]!,
        })),
      })
    : null,
  [normalizedGrouping, state.rowIds, state.rows],
);

const orderedGroupTree = useMemo(
  () => groupTree
    ? orderCominsGroupTree({
        columns: state.columns,
        rows: state.rows,
        sortModel: state.sortModel,
        tree: groupTree,
      })
    : null,
  [groupTree, state.columns, state.rows, state.sortModel],
);

const groupingProjection = useMemo(
  () => orderedGroupTree
    ? projectCominsGroupTree({
        expandedGroupIds: rowGrouping?.expandedGroupIds ?? [],
        rowIds: state.rowIds,
        tree: orderedGroupTree,
      })
    : null,
  [orderedGroupTree, rowGrouping?.expandedGroupIds, state.rowIds],
);
```

The expansion memo must not rebuild `groupTree` or `orderedGroupTree`.

- [ ] **Step 4: Feed grouping into the shared virtual slot contract**

Map projection entries to the existing virtual slots. For each data entry,
call `createCominsDataVirtualSlot` with the source `row`, `rowId`,
`dataIndex`, `visibleIndex: entry.visibleLeafIndex`, and the same fixed/auto
Detail descriptor used by the ungrouped Row Expand path. For a group entry,
create `CominsGroupVirtualSlot` with `height: safeRowHeight`.

Choose virtualization:

```ts
const usesMixedSlotHeights = slots.some(
  (slot) => getCominsSlotHeight(slot, safeRowHeight) !== safeRowHeight,
);
```

When false, retain direct arithmetic over slot count. When true, pass the same
slot list to `createCominsVariableVirtualLayout`. Keep physical Scroll Height
capped at `1_500_000px`.

For a grouping projection change, capture the first fully visible slot key and
offset. If collapse removes that key, replace it with the collapsing group's
slot key. Queue one animation-frame correction through the Row Expand anchor
helper and clamp it to the new legal range. Do not correct during active user
scroll.

- [ ] **Step 5: Render one cell per effective Column**

For group slots:

- render a native `<tr data-comins-row-kind="group">`;
- choose the first effective left-pinned Column as label owner, otherwise the
  first visible Column;
- render the label owner as `<th scope="row">`;
- render all remaining group cells as `<td>`;
- apply Column Pinning sticky metadata and width by Column ID;
- render the grouping Column label, resolved group label, indentation, and
  disclosure button only in the label cell;
- render configured aggregate values as plain text in their own Columns;
- leave other cells empty;
- let the label take precedence if it is also an aggregate output.

Do not call normal cell renderers, formatters, component placements, tooltips,
Row props, or event builders for this branch.

Use an accessible disclosure label that does not stringify an arbitrary
`ReactNode`:

```ts
const disclosureLabel =
  `${expanded ? "Collapse" : "Expand"} group at level ${node.depth + 1}`;
```

- [ ] **Step 6: Add controlled expansion update behavior**

Normalize caller IDs by first occurrence. Disclosure action:

```ts
const nextExpandedGroupIds = expanded
  ? normalizedExpandedIds.filter((id) => id !== groupId)
  : [...normalizedExpandedIds, groupId];

rowGrouping.onChangeExpandedGroupIds?.(nextExpandedGroupIds);
```

Unknown/dormant IDs remain in the normalized callback list. Disable the button
when `onChangeExpandedGroupIds` is absent.

- [ ] **Step 7: Add module-scoped group styles**

Add tokens and selectors for:

- group background derived from the active table surface;
- separator derived through the Column Pinning darker-border tokens;
- logical indentation `padding-inline-start`;
- disclosure hover, focus-visible, disabled, and expanded states;
- pinned group cell backgrounds;
- no selected, draggable, or drop-target visual state on group Rows.

Keep all selectors under `.comins-table`/`.comins-table__*` and use the
existing theme variables.

- [ ] **Step 8: Run component and virtualization unit gates**

Run:

```bash
npm run lint
npm run test:run -- test/grouping.test.ts test/table-interaction.test.tsx
```

Expected: PASS.

- [ ] **Step 9: Commit group rendering**

```bash
git add src/grouping.ts src/index.tsx src/virtual-layout.ts styles.css test/table-interaction.test.tsx
git commit -m "feat: render virtualized row groups"
```

### Task 5: Enforce leaf-only interactions, selection, focus, Detail, and Pinning

**Files:**
- Modify: `src/index.tsx:1558-2170,2590-3149`
- Modify: `src/core.ts:1300-1885`
- Modify: `src/row-detail.tsx`
- Modify: `src/column-pinning.ts`
- Modify: `test/table-interaction.test.tsx`
- Modify: `test/basic-core.test.ts`

**Interfaces:**
- Integration passes:

```ts
const effectiveViewOrder: CominsTableViewOrder = {
  columnIds: effectivePinning.orderedColumnIds,
  rowIds: groupingProjection?.visibleLeafRowIds,
};
```

- Group slots never receive `CominsEventRow`, `CominsCellAddress`,
  `VisibleRowEntry`, or `CominsRowDetailParams`.

- [ ] **Step 1: Write failing leaf-only interaction tests**

Add component tests proving:

- pointer, double-click, context-menu, and keyboard activity on a group Row
  calls none of the ordinary Row/Cell callbacks;
- renderers, formatters, component placements, tooltips, and Row prop
  callbacks receive only leaf `TData`;
- group Rows cannot become Row, Cell, or range selection endpoints;
- Shift/range selection crosses only visible leaves;
- copy/paste skips group Rows and collapsed leaves;
- hidden selected Row IDs remain selected and restore on expansion;
- collapsing a group clears hidden Cell/range state and emits
  `onChangeSelection` exactly once;
- Summary callbacks receive the original flat data array;
- `setMoveTargetRow` is a no-op while grouped;
- untyped `rowProps.draggable`, infinite loading, lazy loading, and pagination
  inputs remain inert;
- group Rows and grouped leaves do not expose Row drag attributes or drop
  targets.

- [ ] **Step 2: Run interaction tests and confirm RED**

Run:

```bash
npm run test:run -- test/basic-core.test.ts test/table-interaction.test.tsx
```

Expected: FAIL because current interaction paths assume every rendered Row is
application data.

- [ ] **Step 3: Route every leaf interaction through projection mappings**

Create maps once per projection:

```ts
const dataEntryByRowId = new Map(
  groupingProjection.entries.flatMap((entry) =>
    entry.kind === "data" ? [[entry.rowId, entry] as const] : [],
  ),
);
```

Build `CominsEventRow` only from data entries:

```ts
{
  data: state.rows[entry.dataIndex]!,
  dataIndex: entry.dataIndex,
  id: entry.rowId,
  index: entry.visibleLeafIndex,
}
```

Do not attach ordinary Row/Cell handlers, selection classes, draggable
attributes, Row references, or Detail disclosure to group entries.

Pass `effectiveViewOrder` to every selection, range, keyboard, copy, and paste
helper. Hidden Row IDs stay in `state.selection.rowIds`; visible-only
operations intersect against `effectiveViewOrder.rowIds`.

- [ ] **Step 4: Clear hidden Cell/range selection exactly once**

After a controlled grouping projection change:

1. build `visibleLeafRowIdSet`;
2. detect whether current Cell or either range endpoint is absent;
3. produce one next selection that preserves `rowIds` but clears `cell` and
   `range`;
4. commit once through the existing state/callback path;
5. guard against repeating the same no-op on the next render.

Do not clear dormant Row selection.

- [ ] **Step 5: Correct focus on external and user collapse**

Before projection changes, retain:

- focused leaf Row ID when focus is inside the table;
- its ancestor group IDs from deepest to root;
- the disclosure group ID that initiated a user collapse.

For a user disclosure collapse, preserve focus on that same button.

For an external controlled collapse hiding the focused leaf, choose the
nearest now-visible collapsed ancestor, then focus its disclosure in a queued
layout-safe frame. Do nothing when focus was outside the table.

- [ ] **Step 6: Integrate Row Detail**

Only data slots call Row Detail predicates, renderers, and height callbacks.
Render the Detail `<tr>` immediately after the owner leaf `<tr>` within the
same virtual slot.

Verify:

- controlled `expandedRowIds` remain dormant through group collapse;
- re-expansion restores eligible Detail;
- group slots are always `rowHeight`;
- fixed Detail height and `"auto"` measurement both affect only their owner
  data slot;
- Detail cells remain full-span and non-sticky.

- [ ] **Step 7: Integrate Column Pinning and aggregation cells**

Use the same `effectivePinning` result as Header, leaf Body, skeleton, and
Summary. Group Row DOM order must equal effective Column order.

The label cell follows effective demotion: first effective left pin when one
exists, otherwise the first visible Column. Aggregate values remain attached
to their configured Column IDs and do not move with the label.

Add responsive-width tests showing no group cell duplicates, spans, or sticky
offset drift.

- [ ] **Step 8: Run the full integration-focused unit gates**

Run:

```bash
npm run lint
npm run test:run -- test/grouping.test.ts test/basic-core.test.ts test/table-interaction.test.tsx
```

Expected: PASS.

- [ ] **Step 9: Commit interaction integration**

```bash
git add src/core.ts src/grouping.ts src/index.tsx src/row-detail.tsx src/column-pinning.ts test/basic-core.test.ts test/table-interaction.test.tsx
git commit -m "feat: integrate grouped leaf interactions"
```

### Task 6: Add the Playground, public guides, and browser acceptance

**Files:**
- Create: `example/src/features/RowGroupingFeature.tsx`
- Create: `docs/user/21-row-grouping.md`
- Create: `docs/ko/21-row-grouping.md`
- Create: `test/playwright/specs/row-grouping.spec.ts`
- Modify: `example/src/features/featureRegistry.tsx`
- Modify: `example/src/features/types.ts`
- Modify: `example/src/docs/codeSamples.ts`
- Modify: `example/src/docs/docsRoutes.tsx`
- Modify: `example/src/docs/dataTableOptionGuide.ts`
- Modify: `docs/user/07-row.md`
- Modify: `docs/ko/07-row.md`
- Modify: `docs/user/19-row-expand.md`
- Modify: `docs/ko/19-row-expand.md`
- Modify: `docs/user/20-column-pinning.md`
- Modify: `docs/ko/20-column-pinning.md`
- Modify: `README.md`
- Modify: `test/user-docs.test.ts`

**Interfaces:**
- Route: `/examples/row-grouping`
- Feature ID: `row-grouping`
- Primary selectors:
  `row-grouping-example-basic`, `row-grouping-example-nested`,
  `row-grouping-example-integration`, `row-grouping-expanded-json`.

- [ ] **Step 1: Build controlled runnable examples**

Create `RowGroupingFeature.tsx` with:

1. a single `region` criterion and controlled expansion;
2. a nested `region → status` example;
3. `count`, `sum`, `avg`, `min`, and `max` outputs including empty numeric
   values;
4. a hidden grouping Column that still labels groups;
5. Pinning plus fixed/`"auto"` Row Detail on leaves;
6. a read-only grouping whose disclosures are disabled;
7. visible expansion ID JSON proving dormant IDs are retained.

Register:

```ts
{
  Component: RowGroupingFeature,
  description: "Controlled client-side Row Grouping with built-in aggregation.",
  id: "row-grouping",
  label: "Row Grouping",
  options: [
    {
      description: "Defines ordered grouping criteria.",
      example: 'criteria: ["region", "status"]',
      name: "rowGrouping.criteria",
    },
    {
      description: "Controls expanded group IDs.",
      example: "expandedGroupIds / onChangeExpandedGroupIds",
      name: "rowGrouping expansion",
    },
    {
      description: "Computes built-in numeric and count aggregates.",
      example: 'aggregations: { amount: "sum" }',
      name: "rowGrouping.aggregations",
    },
  ],
  summary: "Nested groups, controlled disclosure, aggregation, Pinning, and Row Detail.",
}
```

Remove any roadmap wording that lists Row Grouping as unimplemented. Keep
Column Pivot explicitly deferred.

- [ ] **Step 2: Write matching English and Korean guides**

Document:

- key and criterion callback semantics;
- supported, empty, and unsupported keys;
- opaque deterministic group IDs;
- controlled expansion and read-only disclosure;
- all built-in reducer input/empty rules;
- hierarchy-first sorting;
- visible leaf `index` versus source `dataIndex`;
- leaf-only callbacks, selection, clipboard, drag, and Detail;
- Pinning label-cell behavior;
- grouping Columns remain visible;
- prohibited pagination/infinite/lazy/Tree/Row drag combinations;
- fixed group height and variable owner Detail height;
- client-side and accessibility limits;
- Pivot, group selection, custom aggregate, and server grouping deferrals.

Cross-link Row, Row Detail, and Column Pinning guides. Add a minimal controlled
example to README and complete option-guide entries.

- [ ] **Step 3: Add documentation assertions**

In `test/user-docs.test.ts`, assert both guides contain:

```text
rowGrouping
expandedGroupIds
onChangeExpandedGroupIds
count
sum
avg
min
max
Row Detail
Column Pinning
pagination
```

Assert the feature registry, route, selectors, and code sample are registered.
Assert the public roadmap no longer labels Row Grouping unimplemented and still
labels Column Pivot deferred.

Run:

```bash
npm run test:run -- test/user-docs.test.ts
```

Expected: PASS.

- [ ] **Step 4: Add browser grouping acceptance**

Create `test/playwright/specs/row-grouping.spec.ts` covering:

1. nested disclosure expands/collapses in controlled order;
2. user collapse retains focus on its button;
3. external collapse focuses the nearest visible collapsed ancestor only when
   focus began inside the table;
4. keyboard Cell navigation skips group Rows;
5. copy/paste excludes group Rows and collapsed leaves;
6. Row and Cell callbacks log only real leaf data;
7. all reducers render approved values;
8. grouping sort changes sibling/leaf order without resetting expansion IDs;
9. grouped source Columns remain present;
10. Pinning aligns group/Header/leaf/Summary cells during horizontal scroll;
11. responsive pin demotion moves the label cell without changing group IDs;
12. fixed and `"auto"` Detail Rows open only under leaves;
13. collapsing above the viewport preserves a stable slot anchor;
14. no `treegrid` role, console warning, or page error appears.

- [ ] **Step 5: Run docs and focused browser checks**

Run:

```bash
npm run test:run -- test/user-docs.test.ts
npm run test:e2e -- test/playwright/specs/row-grouping.spec.ts --workers=1
```

Expected: PASS.

- [ ] **Step 6: Commit public grouping coverage**

```bash
git add example/src/features/RowGroupingFeature.tsx example/src/features/featureRegistry.tsx example/src/features/types.ts example/src/docs/codeSamples.ts example/src/docs/docsRoutes.tsx example/src/docs/dataTableOptionGuide.ts docs/user/21-row-grouping.md docs/ko/21-row-grouping.md docs/user/07-row.md docs/ko/07-row.md docs/user/19-row-expand.md docs/ko/19-row-expand.md docs/user/20-column-pinning.md docs/ko/20-column-pinning.md README.md test/user-docs.test.ts test/playwright/specs/row-grouping.spec.ts
git commit -m "feat: document and demonstrate row grouping"
```

### Task 7: Verify high-cardinality memory, virtualization, and complete gates

**Files:**
- Modify: `example/src/features/BodyFeature.tsx`
- Modify: `test/playwright/specs/virtualization.spec.ts`
- Modify: `test/playwright/specs/memory-leak-full-audit.spec.ts`
- Modify: `reports/2026-07-31.md`

**Interfaces:**
- Query fixtures:
  - `/performance/virtualization?fixture=row-grouping-low`
  - `/performance/virtualization?fixture=row-grouping-high`
  - `/performance/virtualization?fixture=row-grouping-integration`
- The default performance route remains unchanged.

- [ ] **Step 1: Add deterministic large fixtures**

Reuse the query fixture switch introduced by Row Expand and Pinning:

- `row-grouping-low`: 100,000 Rows, one low-cardinality criterion, all roots
  expanded;
- `row-grouping-high`: 100,000 Rows, lowest-level group count approaches Row
  count, all groups collapsed;
- `row-grouping-integration`: two levels, one deeply expanded path, first two
  Columns pinned left, final Column pinned right, alternating fixed and
  `"auto"` expanded leaf Details.

Expose read-only diagnostics under test-only selectors:

```text
group-node-count
group-parent-descendant-array-count
group-copied-row-count
group-projection-size
rendered-group-row-count
rendered-data-row-count
```

Production behavior must not depend on those selectors.

- [ ] **Step 2: Add focused performance and memory-shape tests**

In `virtualization.spec.ts`, record through existing timing helpers:

1. membership construction and first projection time;
2. expansion-only projection time;
3. projection size;
4. rendered group/data Row counts;
5. physical Scroll Height;
6. collapse/expand anchor drift;
7. grouped Pinning horizontal alignment;
8. mixed Detail virtual-window bounds.

Require:

- the repository's existing performance budgets without a grouping exception;
- rendered DOM stays within the existing virtual window allowance;
- physical Scroll Height remains `< 2_000_000`;
- parent descendant-array count is `0`;
- copied Row count is `0`;
- expansion-only interaction does not increment the membership build counter;
- all-collapsed high-cardinality projection traverses roots only.

Run focused first:

```bash
npm run test:perf -- test/playwright/specs/virtualization.spec.ts --workers=1
```

Expected: PASS.

- [ ] **Step 3: Add lifecycle recovery coverage**

Extend the full memory audit:

- open Row Grouping;
- expand and collapse nested branches repeatedly;
- sort grouped and leaf Columns;
- open and close fixed/`"auto"` Details;
- resize across Pinning demotion;
- return to Getting Started;
- require nodes, listeners, heap, and documents within the existing
  `10 percent` recovery policy.

Run:

```bash
npm run test:perf -- test/playwright/specs/memory-leak-full-audit.spec.ts --workers=1
```

Expected: PASS.

- [ ] **Step 4: Run complete gates once**

After the final meaningful product or test-contract change, run:

```bash
npm run verify
npm run test:e2e -- --workers=1
npm run test:perf -- --workers=1
```

Expected: all exit `0`. Classify a failure as product, test-contract, or
execution-environment before rerunning the complete gate. A local
`listen EPERM` remains an environment failure only when the same focused
behavior passes in an appropriately permitted environment.

- [ ] **Step 5: Append evidence and residual risks**

Update `reports/2026-07-31.md` with:

- implementation and public API summary;
- focused and full command results;
- low/high-cardinality node and projection counts;
- membership versus expansion counter evidence;
- rendered Row and physical Scroll Height signals;
- anchor, focus, clipboard, Pinning, and Detail results;
- memory recovery results;
- residual risk for application key callbacks that are computationally
  expensive or intentionally unstable.

- [ ] **Step 6: Commit performance coverage and report**

```bash
git add example/src/features/BodyFeature.tsx test/playwright/specs/virtualization.spec.ts test/playwright/specs/memory-leak-full-audit.spec.ts reports/2026-07-31.md
git commit -m "test: verify row grouping performance"
```

## Row Grouping Completion Gate

Do not mark Row Grouping complete until:

- public grouped props reject every prohibited combination while existing
  ungrouped props remain assignable;
- runtime defenses keep loading, pagination, Tree, drag, and movement paths
  inert for untyped callers;
- deterministic typed group IDs, empty/unsupported keys, and labels follow the
  approved rules;
- membership is one-pass, parent groups do not retain descendant arrays, and
  no group metadata copies `TData`;
- hierarchy-first sorting consumes grouping rules and reuses existing stable
  leaf comparators for remaining rules;
- controlled expansion rebuilds projection only and preserves dormant IDs;
- group slots never increment leaf indexes or receive application Row/Cell
  payloads;
- group Rows are excluded from selection, clipboard, callbacks, rendering
  hooks, Detail, drag, and Row movement;
- hidden Row selection persists while hidden Cell/range state clears exactly
  once;
- focus and scroll anchors remain stable across user and external collapse;
- group Rows and aggregates align with effective Column Pinning order;
- owner leaf Details work with both fixed and `"auto"` heights while group
  slots stay fixed;
- Summary Row continues to receive original leaf data only;
- focused unit, type, browser, and performance checks pass;
- full `verify`, full E2E, and full performance gates pass once after the last
  meaningful code or test-contract change.
