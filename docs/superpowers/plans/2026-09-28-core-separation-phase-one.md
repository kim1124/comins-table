# Core separation phase one

**Approved scope:** the maintainer approved the review's first three items:
separate shared and React types, remove UI back-references, and extract pure
calculations. Implement in `codex-0.2.0-core-separation` without changing public
behavior, package version, dependencies, or exports.

## Design

- `src/model.ts`: framework-independent identities, selection, sorting, layout,
  clipboard and data types. Row event data also belongs here.
- `src/react-types.ts`: existing React-facing contracts, unchanged structurally.
  `src/core.ts` remains the compatibility entrypoint and re-exports exactly its
  existing public names; it is not yet the final framework-independent API.
- Existing height, tree and viewport model modules reference shared types
  directly instead of the React facade or root UI module.
- `src/column-layout.ts`: numeric width distribution and immutable group resize.
- `src/table-state.ts`: sort transitions, column-order reconciliation and
  selection-preservation checks, accepting minimal model shapes.
- `src/row-value.ts`: existing immutable nested input update behavior.
- React retains renderers, hooks, browser measurement, pointer handling,
  clipboard I/O, and scroll restoration. No generic browser engine in this phase.

## Tasks and evidence

- [x] Compile a consumer of the shared height/tree/viewport modules in an isolated
  directory without React or its type packages; observe failure before extraction.
- [x] Move shared and React-specific type declarations without widening existing
  signatures, and rewire shared model imports. Existing public type fixtures must pass.
- [x] Add independent fixtures for bounded group widths, sort cycling, hidden
  column-order preservation, selection identity and immutable nested edits.
- [x] Extract the existing calculations, wire React to them, and verify the focused
  tests. Keep calculations equivalent; do not fix unrelated behavior in this pass.
- [x] Run `npm run verify`, affected browser specs and the full UI suite since
  shared table interaction changes. Run focused performance coverage first and the
  full performance suite once for the height/virtual module boundary changes.
- [x] Review the whole patch and record results in `reports/2026-09-28.md`.

## Review focus

Preserve generic renderer/event types and the export inventory. Hidden columns
must keep their place in saved order, bounded resizing must preserve group width,
and selection must reset when its IDs or columns are no longer valid. Pure model
imports must not bring React types back transitively. Middle-scroll drag, automatic
edge scrolling, and subsequent parent rerenders remain mandatory browser checks.

## Deliberately deferred

Public `/core` type migration, full state reconciliation extraction, filter/group
renderer contracts, DOM transfer registrations, request scheduling, Vue, and npm
packaging changes remain subsequent work. Local implementation does not authorize
commit, push, PR, merge, or release.
