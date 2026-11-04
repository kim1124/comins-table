# Memory investigation follow-up after 0.2.3

## Preserved warnings

These are historical numeric FAIL records, not a finding that each case leaks product objects. They have not been rerun on the final 0.2.3 candidate. Percentages are the recorded maximum metric increase under the original return-to-Start and GC contract; do not reinterpret them as a leak rate or as JS heap alone. The original 2.1% boundary and raw evidence remain unchanged.

Source epochs below identify investigation snapshots, not package versions.

| Case | Source epoch | Recorded maximum increase | Numeric verdict | Final attribution |
| --- | --- | ---: | --- | --- |
| `cross-table-drag-gesture-unmount` | v36 | 3.113882% | FAIL | Unconfirmed |
| `clipboard-permission-error-case2` | v36 | 3.108520% | FAIL | Unconfirmed |
| `portal-menu-tooltip-teardown-case8` | v36 | 2.917538% | FAIL | Unconfirmed |
| `loading-pending-unmount` | v36 | 2.710662% | FAIL | Unconfirmed |
| `clipboard-permission-error-case1` | v36 | 2.572158% | FAIL | Unconfirmed |
| `transfer-operations` | v41 | 2.570114% | FAIL | Unconfirmed |
| `ref-all-modes` | v36 | 2.563550% | FAIL | Unconfirmed |
| `rich-header-interaction-boundary-case2` | v43 | 2.422930% | FAIL | Unconfirmed |
| `column-groups-open-ui-unmount` | v36 | 2.351896% | FAIL | Unconfirmed |
| `tree-10000-scroll` | v36 | 2.265528% | FAIL | Unconfirmed |
| `ref-operations` | v36 | 2.254305% | FAIL | Unconfirmed |
| `filter-operations` | v36 | 2.241982% | FAIL | Unconfirmed |
| `row-grouping-movement-gate` | v36 | 2.233942% | FAIL | Unconfirmed |
| `selection-clipboard-gesture-unmount` | v36 | 2.190335% | FAIL | Unconfirmed |
| `column-filtering-open-ui-unmount-case2` | v36 | 2.136179% | FAIL | Unconfirmed |
| `filter-large-100k` | v36 | 2.114962% | FAIL | Unconfirmed |

## Next investigation scope

1. Prioritize cross-table gestures, pending loading, and Portal/menu teardown. Check retired request payloads, callbacks, gesture state, DOM registries, and listener closures against their intended lifetime.
2. Check imperative refs, rich headers, grouped columns, and filtering for application-owned row and callback retention.
3. Treat clipboard/transfer and large tree/filter cases separately from browser-managed permission, code compilation, and runtime caches.

For each selected case:

- Reproduce the actual interaction in the same document; return through SPA navigation, wait for cleanup, then perform GC before comparing equivalent states. Record initial execution cost separately from repeated growth.
- Use a minimal table consumer and a matched React-only control with the same loaded modules to attribute growth. Keep JS heap, DOM, listeners, native memory, and executable-code metadata separate.
- Identify the retained product object, the strong path to a GC root, and the operation that should have ended its lifetime. Aggregate heap growth alone does not establish a product retention defect.
- If that path is confirmed, add a failing focused regression, apply a minimal fix, and verify release after cleanup while the external source remains alive. Cover late completion and rejection when applicable.
- If no new attribution evidence appears within a bounded investigation, preserve the warning and stop repeating the same measurement. Do not relabel it PASS.

## Verified fix to preserve

Viewport abort now stops the library await even if the consumer ignores AbortSignal and leaves its Promise pending. Regression tests cover cancellation without source settlement, synchronous abort, and late rejection. Production before/after evidence observed ten retired payloads and each callback kind retained before the fix and zero after it, while the source Promises remained pending. This does not attribute the sixteen warnings above to that defect.

The final React release preparation does not claim a complete memory sweep or absence of leaks across all features. Vue validation remains outside this scope.

## Final bounded attribution - 2026-11-05

The final check used product source at `5a09137`. All sixteen historical numeric FAILs above remain unchanged. Final attribution is **Unconfirmed for all sixteen**: no new table retention defect was established, and no complete external explanation of the original heap deltas was established either. Memory investigation and speculative optimization are closed for 0.2.3 under the approved bounded scope.

Each case completed three original scenario operations in the production Playground and three in a minimal feature fixture: 32 comparison runs, 96 top-level scenario operations, 128 returned-Start measurement points, and 384 standard GC commands. Each measured return retained the same document, used SPA navigation, waited two animation frames plus one second, and then performed three GCs. No refresh was used within a comparison run.

At each final endpoint, all observed retired table DOM, host/table Fiber, and sampled public callback references were released. Some row and array observations survived. Separate endpoint snapshots and source maps traced selected survivors to module-level example data: CrossTableDragFeature's initial flat/grouped rows, ValueListFilteringSample's sample, ColumnFilteringFeature's filteringRows, RowGroupingFeature's initialGroupingRows, and TreeDragSample/TreeSlotsSample's initial data. Those roots are distinct from retired table instance retention. They do not explain the full historical heap increase.

The minimal fixture reuses actual example feature components, controls, locale, and styles, while excluding DocsShell, React Router, and code highlighting. It is not a bare table-only consumer for every operation. Separate controlled consumer roots required by the scenarios used the current source-qualified React/Table runtime. Origin and permission-origin migration was limited to diagnostic infrastructure.

A React-only control loaded the same minimal module graph while never mounting the table. Its operations do not reproduce all feature work and its results were not subtracted from any case. An initial control used undisposed waitForSelector ElementHandles and was invalidated; the corrected control uses locator.waitFor. Initial module MIME, React-version, font-resource, permission-origin, and container-layout mismatches were classified as diagnostic setup failures, corrected, and preserved separately from valid results.

Limits: three visits are an object-lifetime attribution diagnostic, not a rerun of the original 50 warmup plus 50 regression visits. Captures before and after a scenario can miss intermediate objects; rows and callbacks are sampled. Endpoint snapshots add their own GC and are not acceptance measurements. No historical FAIL is relabelled PASS, no all-feature absence of leaks is claimed, and no new product patch is justified by these diagnostics. Continue with final Playground functionality and release preparation; retain unresolved ownership questions for a separately scoped future investigation.
