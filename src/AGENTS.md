# @kmsf/data-table Source Rules

## Scope

This file applies to `packages/data-table/src`.

## Role

The source workspace owns public exports and the React data table implementation.

## Rules

- MUST: the design draft in `docs/agents/src/2026-05-28-data-table-feature-design-draft.md` as the product contract before changing behavior.
- MUST: public exports explicit in `src/index.tsx`.
- DO NOT: introduce Next.js-only APIs.
- MUST: React and React DOM as peer dependencies, not bundled runtime dependencies.
- Define data shape, sorting, pagination, selection, and accessibility behavior before implementation.
- MUST: TDD before adding table behavior, state logic, rendering behavior, performance paths, or public API.
- Start with a focused failing test, confirm the failure reason, then implement the minimum passing change.
- AVOID: large abstractions until the first concrete table behavior requires them.
- DO NOT: wrap external grid/table libraries or import framework-specific runtime APIs.
- DO NOT: mark interactive UI behavior complete without browser-capable verification.

## Verification

- RUN: `npm --workspace=@kmsf/data-table run verify` for package baseline verification.
- MUST: For behavior changes, add the focused test command in the plan before implementation.
- BLOCK: Required focused or baseline tests must pass before completion.
