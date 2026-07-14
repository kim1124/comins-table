# Summary Row and Tree Grid Design

## Goal

Add a release-ready Summary Row first and a controlled Tree Grid second, while preserving the existing flat-table API, virtualization contract, and the Playground's runnable-documentation model.

## Scope and delivery order

The work is split into four independently verifiable deliveries. Each delivery must be complete before the next begins.

1. Operational quality gates and public-documentation consistency.
2. Summary Row for the existing flat controlled-data table.
3. Tree Grid core, rendering, interaction, and accessibility behavior.
4. Tree Grid Playground example and public documentation.

Publishing `comins-table@0.1.0` is explicitly out of scope. It remains a separate user-commanded release operation after Tree Grid verification is complete.

## Confirmed product decisions

### Summary Row

- Summary Row precedes Tree Grid in the implementation order.
- It renders as a fixed footer outside the scrollable body, aligned to the current visible columns and their widths.
- Flat-table aggregates use the complete controlled `data` array, not only the current pagination page. Sorting does not change aggregate values.
- Built-in aggregations are `sum`, `avg`, `min`, `max`, and `count`; a custom aggregator receives the controlled rows and the column value resolver.
- With flat `infiniteScroll` or `lazyLoad`, a summary represents the rows currently loaded in `data`; it never implies a remote total that has not been supplied.

### Tree Grid input and compatibility

Tree Grid is an explicit opt-in mode. The data contract is:

```ts
export type CominsTreeNode<TItem extends Record<string, unknown>> = {
  item: TItem;
  expand?: boolean;
  children?: readonly CominsTreeNode<TItem>[];
};

<CominsTable
  tree
  columns={columns}
  data={treeData}
  getRowId={(item) => item.id}
  onChangeData={setTreeData}
/>
```

- `item` is the business row. Column `field` paths, cell formatters, renderers, row props, event payloads, and `getRowId` receive `item`, not the structural tree node. Therefore an existing column such as `{ field: "name" }` remains unchanged.
- `item` must remain an object because the existing public column model is object-field based. Primitive `item` values are not a Tree Grid V1 input.
- `getRowId(item)` must produce a stable, globally unique id across every level of a tree. Duplicate ids are invalid input.
- `expand` is controlled application state. A parent without `expand: true` is collapsed. Leaves never render an expander.
- Clicking an expander only clones the ancestry path, updates that node's `expand`, and calls `onChangeData` with the next tree. It does not mutate caller-owned data.
- Updating a visible cell clones the node ancestry path and patches its `item`, then calls the same tree-typed `onChangeData` callback.

### Tree Grid row model and interactions

- The renderer derives a pre-order, visible-only list from the nested input. Each entry retains its node path, depth, business `item`, global row id, and visible index.
- Indentation and the accessible expand/collapse button appear in the first displayed data column. No hidden structural column and no column-definition change are introduced.
- Virtualization is supported over this visible flattened list. `rowHeight` and `buffer-size` retain their present meaning.
- Selection, range selection, copy, and paste use visible flattened row indices. Collapsed descendants cannot be selected or copied until they are visible.
- Header sorting recursively sorts siblings using the current column's comparator/value behavior. A parent always stays with its recursively sorted descendants.
- Tree Grid disables row drag/reorder, pagination, `lazyLoad`, and `infiniteScroll` in V1. The public tree-prop type rejects these combinations, and the runtime does not trigger lazy or load-more requests when tree mode is active.
- Tree Grid summary aggregation uses all leaf `item` rows in the supplied tree, regardless of expansion state. Parent nodes are excluded to prevent double counting.

## Implementation design

### Public type surface

`src/tree.ts` will own the tree-specific public types and pure utilities. It will export `CominsTreeNode<TItem>`, a visible-entry type for internal rendering, a tree flattener, a global-id validator, a recursive sibling sorter, and immutable node-update helpers. `src/core.ts` and `src/index.tsx` will re-export only the types required by the package root API; no new package subpath is required for V1.

`src/index.tsx` will expose a discriminated `tree: true` prop branch in addition to the existing flat `CominsTableProps<TData>` branch. The tree branch accepts `readonly CominsTreeNode<TItem>[]`, preserves `CominsTableColumn<TItem>` and `getRowId(item, index)`, and returns `CominsTreeNode<TItem>[]` through `onChangeData`. The flat branch retains its current prop types and behavior unchanged.

### Rendering and state flow

The tree adapter produces the visible row entries before the current row-window calculation. The existing table's column layout, cells, theme, keyboard callbacks, and virtual spacer remain reusable because each rendered entry exposes the original `item` as its row data. The adapter, not the existing flat `state.rows` mutation helpers, owns node-path lookup and immutable tree updates.

The first visible cell renders an expander button before its normal cell content. The button uses `aria-expanded`, an explicit accessible name, and a depth-derived CSS custom property/class for indentation. It stops row-selection pointer propagation only for the expander action; the surrounding cell keeps existing click and keyboard behavior.

### Summary Row rendering

The summary adapter computes values from controlled rows before pagination. The table renders a footer grid with the same resolved column layout as the header/body, so hidden columns, reordered columns, and resized columns remain aligned. The footer is outside the body scroll viewport and does not change virtualized scroll height.

In Tree Grid mode, the adapter passes only leaf `item` rows into the same aggregate calculation. This keeps the Summary Row API shared between flat and tree tables while making the inclusion rule explicit.

### Playground and documentation

The Playground adds a feature with the label `Tree Grid` and the route `/examples/tree-grid`.

- The live example uses nested department/team-style rows, existing `PersonRow` column definitions, a stable item-level id, controlled expand state, sibling sorting, and virtualization.
- Its explanatory sections state the exact `item`/`expand`/`children` shape, that existing columns target `item`, and that pagination, lazy loading, infinite scrolling, and row drag are intentionally unavailable in Tree Grid V1.
- The docs-route page contains runnable code for the controlled tree state and explains global id uniqueness, visible-row semantics, leaf-only summary aggregation, and the V1 exclusions.
- Add English public documentation at `docs/user/17-tree-grid.md` and the matching Korean reference at `docs/ko/17-tree-grid.md`. Update README feature, props, Playground, and current-scope text only after the feature exists.

## Quality gates

### Operational gates

- Add `reports/artifacts/` to `.gitignore` without deleting the currently untracked screenshots.
- Add a GitHub Actions workflow that runs `npm run verify` and `npm run test:e2e` for pull requests and pushes to `main`.
- Add a consumer-install smoke check driven by `npm pack --dry-run --json` and a temporary consumer project. It verifies the root import, `comins-table/core`, `comins-table/clipboard`, `comins-table/selection`, and `comins-table/styles.css` exports.
- Correct the Playground feature-guide roadmap so it does not list CSV/JSON export as unavailable while the implemented Export Helper remains documented.

### Automated feature coverage

- Summary core tests: numeric aggregation, non-numeric values, custom aggregation, hidden/reordered columns, pagination independence, and loaded-row-only behavior for append data.
- Tree utility tests: pre-order flattening, collapsed-parent exclusion, depth and path retention, global-id validation, immutable expand update, immutable nested-cell update, and recursive sibling sorting.
- Table interaction tests: the original columns render values from `item`; the first column expander updates controlled data; collapsed descendants leave the DOM; selection/copy/paste operates on visible rows; and prohibited Tree Grid props do not activate loading or row movement.
- Playwright tests: direct route loading, sidebar/search discovery, expand/collapse behavior, `aria-expanded`, sorting without losing hierarchy, virtualized scroll stability, no browser diagnostics, and documentation text for the V1 limitations.
- Regression gates after each delivery: `npm run lint`, focused Vitest and Playwright specs, then `npm run verify` and `npm run test:e2e -- --workers=1`. Run the existing performance suite and manual DevTools monitor check before any later release decision.

## Files expected to change

| Area | Files |
| --- | --- |
| Operational gates | `.gitignore`, `.github/workflows/verify.yml`, consumer smoke script and its focused test, `example/src/docs/dataTableOptionGuide.ts` |
| Summary Row | `src/core.ts`, `src/index.tsx`, `styles.css`, Summary unit/interaction/Playwright tests |
| Tree Grid | `src/tree.ts`, `src/index.tsx`, `styles.css`, `test/tree-core.test.ts`, `test/tree-table.test.tsx`, `test/playwright/specs/tree-grid.spec.ts` |
| Playground | `example/src/features/TreeGridFeature.tsx`, `example/src/features/types.ts`, `example/src/features/featureRegistry.tsx`, `example/src/docs/codeSamples.ts`, `example/src/docs/docsRoutes.tsx` |
| Public docs | `README.md`, `docs/user/17-tree-grid.md`, `docs/ko/17-tree-grid.md` |
| Work record | `reports/2026-07-14.md` |

## Explicit exclusions

- No server-side tree model, remote child loading, group/pivot model, arbitrary-depth row drag, or parent/child pagination in this release track.
- No automatic `0.1.0` package publication, tag, GitHub Release, or registry mutation.
- No broad refactor of the existing flat row core beyond the adapter boundaries required for Summary Row and Tree Grid.
