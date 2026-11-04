# Memory investigation follow-up after 0.2.3

## Preserved warnings

These are historical numeric FAIL records, not a finding that each case leaks product objects. They have not been rerun on the final 0.2.3 candidate. Percentages are the recorded maximum metric increase under the original return-to-Start and GC contract; do not reinterpret them as a leak rate or as JS heap alone. The original 2.1% boundary and raw evidence remain unchanged.

Source epochs below identify investigation snapshots, not package versions.

| Case | Source epoch | Recorded maximum increase | Numeric verdict |
| --- | --- | ---: | --- |
| `cross-table-drag-gesture-unmount` | v36 | 3.113882% | FAIL |
| `clipboard-permission-error-case2` | v36 | 3.108520% | FAIL |
| `portal-menu-tooltip-teardown-case8` | v36 | 2.917538% | FAIL |
| `loading-pending-unmount` | v36 | 2.710662% | FAIL |
| `clipboard-permission-error-case1` | v36 | 2.572158% | FAIL |
| `transfer-operations` | v41 | 2.570114% | FAIL |
| `ref-all-modes` | v36 | 2.563550% | FAIL |
| `rich-header-interaction-boundary-case2` | v43 | 2.422930% | FAIL |
| `column-groups-open-ui-unmount` | v36 | 2.351896% | FAIL |
| `tree-10000-scroll` | v36 | 2.265528% | FAIL |
| `ref-operations` | v36 | 2.254305% | FAIL |
| `filter-operations` | v36 | 2.241982% | FAIL |
| `row-grouping-movement-gate` | v36 | 2.233942% | FAIL |
| `selection-clipboard-gesture-unmount` | v36 | 2.190335% | FAIL |
| `column-filtering-open-ui-unmount-case2` | v36 | 2.136179% | FAIL |
| `filter-large-100k` | v36 | 2.114962% | FAIL |

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
