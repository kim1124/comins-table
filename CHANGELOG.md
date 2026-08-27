# Comins Table

## Unreleased

## 0.1.7 - 2026-08-27

- Added controlled client-side Column Filtering with text, number, UTC calendar-day date, and boolean operators; application-owned Filter/open-popover state; semantic Header controls; filtered sorting, pagination, virtualization, Summary, and Row Grouping projection; explicit Group preservation; Row Drag and remote/Tree exclusions; and matching Korean/English Playground documentation.
- Added controlled client-side single-depth Row Grouping with application-owned ordered Groups and persistent empty Groups, Group CRUD ownership, Group/Row Drag including cross-Group Row moves, full-width custom-renderable Group Rows, typed per-Group Row `className`/`style`, neutral-gray theme tokens, expand/fold Ref methods, per-Group Row sorting, built-in aggregation, fixed/mixed virtualization, leaf-only selection and Clipboard semantics, grouped Row Detail, runtime/type exclusions, and matching Korean/English Playground documentation.
- Corrected the Row Grouping Playground layout so every Table fills its example container without clipping or unused fixed-height space, and demonstrated custom Group content and Group Row styling together.
- Added a fail-closed, value-free npm maintainer identity gate immediately before trusted staged publishing.

## 0.1.6 - 2026-08-14

- Updated automatic Row Detail measurement to apply each accepted Detail delta through the virtual height index in O(log N), preserving coalesced scroll-anchor correction; observer reads now use one atomically committed `{ projection, contentWidth, viewportHeight }` snapshot, including concurrent Suspense and StrictMode coverage.
- Added a capped-height concurrent Row Detail regression with 50,000 Rows, a 1,800,300px logical projection, a 1,500,000px physical cap, and a viewport-only suspended candidate that preserves the committed 749,950px physical anchor.
- Completed deterministic Korean/English Playground localization with explicit pairs for 21 Features, 85 Feature options, 46 Option Guide descriptions, and 4 group titles; canonical `FeatureId`, AST/runtime completeness, duplicate/generic/allowlist gates, Tree Grid copy, and the live `/api/props` route share the same contract.
- Corrected the README and Playground Row Expand auto/fixed-height guidance and directly test the exported option-guide contract. Column Move now derives stable plain label/id fallbacks for rich ReactNode labels, makes active source content inert with ARIA and event barriers, and verifies actual content-target pointer lifecycle and drops.
- Normalized active Column Move source `<th>` labeling through `aria-label`/`aria-labelledby` while preserving side-effect-free plain string/id fallbacks, inertness, event barriers, and pointer cleanup without relying on visually hidden placeholder copy.
- Made unspecified, invalid, and `"auto"` Row Detail heights auto-measured while preserving finite fixed heights; placed full-size disclosure controls before Row drag, replaced Header sort triangles with directional arrows, kept Column Move source labels visible, and documented Column Filter as deferred guidance without a public API.
- Standardized Core and Playground interaction icons on the exact external `@radix-ui/react-icons` version `1.3.2` runtime dependency, with private semantic wrappers, preserved accessibility behavior, and fail-closed provenance, notice, import-inventory, and package-artifact gates.
- Added the Contract v1.4 lean license gate for lockfile metadata, scoped maintainer approvals, repository-only Spoqa asset evidence, and exact npm artifact verification.
- Updated Playwright, React type definitions, and the Vite React plugin while retaining Vite `8.1.5` and Lightning CSS `1.32.0` under the existing exact scoped license approval.
- Updated Undici to `7.29.0`, PostCSS to `8.5.26`, and Nano ID to `3.3.18` to clear the current npm audit findings without changing the distributed runtime boundary.

## 0.1.5 - 2026-07-29

- Added controlled Infinite Scroll, Selection & Clipboard, and live Ref API Playground examples with matching React consumer documentation and browser acceptance.
- Fixed Infinite Scroll refresh state, active pointer-listener cleanup, and post-drag compatibility events while preserving the existing public API and application-owned data flow.
- Removed Lucide from the library, Playground, generated bundles, package dependency tree, and component scaffold while preserving the public sorting and accessibility contracts with module-owned CSS and text glyphs.
- Added package-artifact regression gates and retained the Lucide/Feather notices required for immutable `0.1.0` through `0.1.4` artifacts.
- Regenerated the README product demo for the dependency-free UI and upgraded the Playground's React Router development dependency to the security-fixed `8.3.0` line.

## 0.1.4 - 2026-07-23

- Added opt-in priority-based multi-column sorting for flat and Tree Grid data, including Shift-assisted Header input, sort-model callbacks and Ref methods, accessibility metadata, documentation, and a runnable Playground example.

## 0.1.3 - 2026-07-22

- Added 6-pixel mouse Header reorder activation with source placeholder, ghost, target marker, vertical-intent cancellation, and preserved non-mouse long-press compatibility.
- Connected Virtual List Item and More activation to owning Row selection, preserved More keyboard focus, and suppressed invalid column-layout callback emissions.
- Added a consumer-first README and real-product animated preview covering sorting, column reorder, Virtual List selection, Summary Row, and Tree Grid interaction.
- Expanded focused browser and documentation regression coverage for the shipped interaction and README contracts.

## 0.1.2 - 2026-07-22

- Extended Summary Row with descriptor-based `colSpan`, aggregate output `format`, and row or cell `className` and `style`.
- Added Tree Grid `defaultExpandAll` and array-based `CominsTableRef.expand(nodeIds?)` / `fold(nodeIds?)` controls.
- Added dedicated Summary Row and expanded Tree Grid Playground examples, including component and renderer cells plus exactly 10000 virtualized nodes.

## 0.1.1

- Prepared a privacy-safe metadata release candidate pending npm account email verification.
- Hardened GitHub verification and staged-publishing workflows and added Dependabot update checks.
- No runtime or public API changes.

## 0.1.0

- Initial public release of Comins Table.
