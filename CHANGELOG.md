# Comins Table

## Unreleased

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
