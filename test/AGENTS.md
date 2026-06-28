# @kmsf/data-table Test Rules

## Scope

This file applies to `packages/data-table/test`.

## Role

The test workspace owns package-local Vitest tests and future browser, accessibility, and report routing.

## Rules

- MUST: focused Vitest or browser tests before production behavior changes.
- Table rendering, keyboard navigation, selection, sorting, and responsive behavior need browser-capable verification when implemented.
- BLOCK: Required tests are completion gates. Failing required tests mean the task is not complete.
- MUST: new package work reports under `packages/data-table/reports/YYYY-MM-DD.md`.
- REPORT: skipped checks as residual risk.
- Instruction-only changes are TDD exceptions but still require structural verification.
- DO NOT: weaken, skip, or delete tests to make a change pass.
- DO NOT: replace browser-required interaction checks with jsdom-only assertions.
- MUST: High-risk interaction tests must verify user-visible DOM, CSS, geometry, and event isolation where relevant.
- Passing `verify:full` is not enough when a Requirement-to-test matrix identifies missing Browser proof.

## Verification Routing

- RUN: `npm --workspace=@kmsf/data-table run test:run` for focused package tests.
- RUN: `npm --workspace=@kmsf/data-table run verify` for package baseline.
- RUN: `npm --workspace=@kmsf/data-table run verify:full` for package browser gate.
- MUST: browser-capable verification before shipping interactive table behavior.
- MUST: Expected RED reason and GREEN evidence explicit for each high-risk interaction requirement.
