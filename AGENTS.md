# @kmsf/data-table Agent Map

## Scope

- SCOPE: `@kmsf/data-table` package, `src`, `src/index.tsx`, `test`, `packages/data-table/reports`, `GUIDE.md`.
- CONTEXT: Root `AGENTS.md`의 공통 process, skill, completion, reporting rule을 상속한다.
- MUST: 세부 지식, 계획, 히스토리는 `docs/agents/README.md`를 따른다.
- MUST: 하위 규칙은 `src/AGENTS.md`, `test/AGENTS.md`, `docs/agents/example/`를 따른다.

## Implementation Rules

- MUST: Review `docs/agents/src/2026-05-28-data-table-feature-design-draft.md` before changing table behavior or public API.
- DO NOT: introduce Next.js-only APIs.
- MUST: Keep React and React DOM as peer dependencies.
- MUST: Keep public exports discoverable from `src/index.tsx`.
- MUST: Define data, sorting, selection, pagination, virtualization, and accessibility contracts before adding table behavior.
- MUST: Treat large row counts and keyboard accessibility as baseline requirements.
- MUST: TDD is mandatory for behavior, public API, state model, rendering, accessibility, performance, and verification changes.
- DO NOT: Do not complete work with failing required tests or failing package verification.
- MUST: High-risk interaction work passes the Interaction Work Gate before completion.

## Forbidden

- DO NOT: No external grid wrapper: do not use AG Grid, MUI X, TanStack Table, or another table/grid as the internal implementation.
- DO NOT: bypass accessibility, virtualization, keyboard, or browser verification gates for rendered interaction work.
- DO NOT: hide core features behind a paid-tier architecture.
- DO NOT: expand scope through broad refactors, dependency changes, or unrelated cleanup.

## Verification Commands

- RUN: `npm --workspace=@kmsf/data-table run verify` for package baseline: lint, Vitest, build.
- RUN: `npm --workspace=@kmsf/data-table run verify:full` for package browser gate: baseline plus Playwright.
- MUST: Add focused tests before production behavior changes.
- VERIFY: rendered table UI, keyboard navigation, layout, virtualization, resize, and context menu behavior.
- MUST: Cover resize, move, drag/drop, selection, keyboard, virtualization, and context menu work.
- REPORT: Plans and reports for high-risk interactions include a Requirement-to-test matrix, Expected RED reason, Browser proof, and No checkbox without evidence.
- MUST: Playground/docs examples follow the charts-style Vite playground contract: 20% feature aside, 80% recreated content area.
- RUN: `npm run verify:packages` from repo root only when aggregate package verification is explicitly requested.

## Reporting

REPORT: Before closing substantial work, update `packages/data-table/reports/YYYY-MM-DD.md` with timestamp, summary, changed files, commands actually run, pass/fail result, and residual risks.
