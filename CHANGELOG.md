# Comins Table

## 0.1.11 - Unreleased

### Added

- Opt-in external plain-text TSV paste through `clipboardPaste`, typed `cell.parseClipboard`, `onClipboardError`, and `parseCominsClipboardText` / `pasteCominsText` Core helpers. Parsing is bounded and batch errors are atomic; native editors keep their clipboard behavior.
- Opt-in `fillHandle` with typed value/pattern repetition, preview, edge scrolling, cancellation, and click/Ref `fillSelection` alternatives. Both editing options require Cell selection and a controlled data callback.
- Optional `cell.validateFill` validates typed destination values before a Fill commits. Returning `false` or throwing rejects the entire operation without changing data; React reports the error through `onClipboardError`.
- A 1,000-Row Playground editing example with automatic height, pinned Columns, numeric conversion and protected Rows/Cells, plus matching English/Korean guides.
- A Clipboard/Fill README animation and refreshed 0.1.11 overview and feature GIFs captured from live demos.

### Changed

- **Migration:** Row Drag is now disabled by default. Set `rowProps={{ draggable: true }}` to retain handle-based movement. `onChangeData` remains optional for local Row reordering; a new `data` array replaces internal Rows, while option-only rerenders preserve local order. Tree and cross-Group/transfer ownership contracts remain unchanged.
- Header Sort uses the same Chevron family and 24px icon-button primitive as Row Group disclosure, retaining sorting, keyboard activation, multi-sort and resize/drag isolation.
- Header and Row Group drag feedback uses accent/danger tokens, neutral source placeholders and a readable light/dark drag preview. Filled ranges, focus, disabled controls and reduced motion follow `DESIGN.md`.

### Fixed

- Completed Playground option toggle styling, including automatic-height content length, width, renderer expansion, Tree policies, Group visibility, and Viewport request options. Pressed states are visible and support native Enter/Space activation.
- Excluded ignored local diagnostic files from Vitest discovery so the normal verification command does not execute Playwright-only diagnostics.
- Removed duplicated perimeter borders at the final Body/Header/Summary Cell and unified Row, Tree and Group drop feedback with the Header target tokens.
- Enabled local Row/Group edge auto-scroll with refreshed virtual drop targets and viewport-clipped bounds. Tree pointer drops preserve the scrolled viewport instead of following a moved anchor Row.
- Connected CRUD reordering to controlled data and replaced position-based IDs and labels in both Virtualization examples with stable Row identities. Clarified the Viewport Datasource Row Drag exclusion.
- Kept the top border stationary when Headers are hidden, and removed Row drag placeholder layout shifts. Local virtual Row drops preserve the viewport position; fixed-height virtual rendering uses the same logical/physical offset convention as variable-height rendering.
- Made Component example labels follow stable Row data, aligned example text/numeric/control values, clarified empty filtered Groups and disabled Rows, and connected Context Create/Delete to actual example data changes.
- Added a two-value TSV sample and explained trailing empty fields without changing intentional empty-cell paste behavior.
- Separated the CRUD Playground's internal Row identity from editable `column4`, so all six displayed fields can be updated while selection and deletion keep targeting the same Row.
- Clamped logical scroll anchors to the final viewport after sorting variable-height Rows, preventing blank space below the last Row.
- Preserved keyboard focus when clearing Header sort and opening the first or closing the last virtual Row Detail.
- Kept incomplete filter drafts independent from applied conditions and repositioned filter popovers after layout changes, above sibling Headers while inheriting Table theme tokens.
- Connected controlled expansion in the 10,000-node Tree Playground and rejected non-numeric Fill values in its numeric editing example.

### Compatibility notes

- `clipboard`, `clipboardPaste` and `fillHandle` remain independent opt-in features. Existing internal paste remains the default. OS paste imports strings unless a Column parser converts them, and intentional empty TSV Cells overwrite editable destinations.
- Fill repeats existing values; automatic series and source clearing on shrink are not included. Viewport edits require contiguous loaded data and do not fetch or persist it.

## 0.1.10 - 2026-09-11

### Added

- Controlled Tree Row drag at every depth through `treeRowDrag`, with opt-in `allowReparent`, immutable `moveCominsTreeNode` subtree moves, drop validation, drag lifecycle callbacks, and pointer/keyboard navigation through virtualized Rows.
- Numeric per-Row and automatic business Row heights through `getRowHeight` and `estimatedRowHeight`, shared mounted-row measurement, variable-height virtualization, and scroll-anchor preservation. Flat, Grouped business, and Tree Rows are supported; expanded Row Details are measured independently.
- Known-count Viewport Datasource loading through `useCominsViewport`, with controlled snapshot/reducer APIs, bounded data and height caches, cancellable range requests, stale-response protection, explicit retry, absolute-index callbacks, and loaded Cell editing. Automatic heights, distant scrolling, and cache eviction/remeasurement are supported; server queries and edit persistence remain application-owned.
- Independent Row/Cell selection through `rowSelectionOnClick={false}`, plus `getSelectedRows()`, `getSelectedCells()`, and `getSelection()` Ref APIs. Reads return available data without requesting unloaded Viewport Rows.
- Opt-in OS keyboard copy through `clipboard` and explicit `copySelection("auto" | "cells" | "rows")`. Automatic copy prioritizes multiple Cells, selected Rows, then a single Cell. Discontiguous selection produces a TSV rectangle with empty unselected positions; internal paste skips those positions.
- Matching English/Korean guides and Playground routes for automatic height and Viewport loading, with public type checks, browser geometry coverage, and focused performance budgets.

### Changed

- Aligned Playground Column labels with data keys. CRUD uses `column1` through `column6` and preserves its `column4` Row ID when editing.
- Expanded the Lazy Load example to 1,000 deterministic Rows in batches of 100, with simulated asynchronous delay and cancellation.
- Equalized initial sibling Header Group widths, enabled movement in the Column Pinning Group example, moved movement restrictions into Row Grouping controls, and aligned Summary label/value spans with visible Columns and pin boundaries.
- Enabled parent changes and automatic height by default in the Tree drag Playground example. Package defaults remain opt-in: `treeRowDrag` is omitted, `allowReparent` is false, automatic height requires `getRowHeight`, `rowSelectionOnClick` is true, and `clipboard` is false.

### Fixed

- Kept populated-table loading overlays visible when reloading after scrolling.
- Restored Tree drag focus after controlled data and virtual-window updates, and Header Menu Escape handling from menu items. Connected Playground Group disclosure state and added Context Menu keyboard navigation and focus recovery.
- Corrected Boolean Cell formatting and kept fixed-height Viewport Renderer content within its chosen height.
- Fixed Cell pointer and Shift-range focus so keyboard copy uses selected values instead of page text, while preserving native interaction with Renderer controls. Keyboard copy refreshes the internal paste buffer for the latest selection.

### Compatibility notes

- Existing fixed-height rendering, Row-click selection, and internal clipboard behavior remain the defaults. OS clipboard import/paste is not included; Ctrl/Cmd+V continues to use the Table's internal buffer.
- Viewport requires a known count, stable globally unique Row IDs, and arbitrary index-range access. It does not combine with Tree, Row Grouping, Row Detail, Row Drag, append loading, pagination, built-in sorting/filtering, or automatic Summary aggregation.
- Tree parent changes remain explicit, active sorting disables manual Tree movement, and cross-table Tree movement and Tree Row copy/paste remain unsupported.

## 0.1.9 - 2026-08-31

- Added the packaged `DESIGN.md`, componentization guidance, a canonical Feature Manifest, full public-export and CSS-token classification, structured feature restrictions, and annotated/typechecked documentation examples.
- Added Ctrl/Cmd discontiguous Cell selection while preserving the active Cell and rectangular range contracts, plus Row Drag lifecycle callbacks for before-start cancellation, semantic target changes, and final moved/cancelled/rejected results.
- Preserved the last known Column order when dynamic Header Group Columns are hidden and restored, kept Row Group content visible during horizontally pinned scrolling, and connected Header Group and Rows Playground drag examples to controlled data and lifecycle feedback.
- Standardized Playground toggle contrast, added deterministic collapse-all-Details coverage, and retained the existing Summary Row visible-column `colSpan` contract and example.
- Added localized event and method reference tables above related Playground examples.
- Clarified the browser compatibility contract versus Chromium-only automated evidence and expanded documentation/package gates so unclassified exports, tokens, examples, restrictions, or missing packaged design guidance fail closed.

## 0.1.8 - 2026-08-28

- Added responsive left/right Column Pinning for leaf Columns and atomic Header Groups, including persisted pin intent, position locking, resize-aware sticky offsets, wider-side inner-block demotion with a 48px center budget, opaque Header/Body/Skeleton/Summary surfaces, and Summary `colSpan` zone splitting while keeping full-width structural Rows non-sticky.
- Added application-created Cross-Table Drag Coordinators for flat and grouped Rows and complete Group bundles, target-owned permission and reject/overwrite conflict callbacks, persistent empty Groups, immutable atomic source/target results, destination focus recovery, duplicate registration fail-closed behavior, and target-only vertical edge auto-scroll.
- Added matching Korean/English Playground routes and public guides for Column Pinning and Cross-Table Row/Group Drag, including model ownership, supported combinations, destructive overwrite semantics, layout persistence, and responsive behavior.
- Added non-blocking pointer-adjacent `Duplicate ID` rejection feedback with a reusable internal Tooltip Surface, restrained target outline, viewport collision handling, accessible live status, renderer/duration/disable controls, CSS theme tokens, and structured `onTransferRejected` notifications.
- Corrected the Column Pinning Playground to guarantee observable horizontal overflow, and capped direct resize of effective pinned Columns and Header Groups at the 48px center budget so the active pinned surface no longer demotes beneath scrolling content.
- Moved the single native horizontal scrollbar to the bottom of the complete Table, after Summary when configured, while preserving Body wheel input, vertical virtualization, synchronized Header/Body/Summary scrolling, and a visible final Row boundary when native scrollbar chrome auto-hides.
- Corrected the bottom scrollbar range to use the Body's actual horizontal viewport width across native scrollbar layouts, so direct rail input reaches the final horizontal content without desynchronizing Header, Body, or Summary.

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
