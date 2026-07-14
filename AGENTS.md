# Comins Table AGENTS.md

## Scope

- This repository is the standalone source of truth for Comins Table library code, Playground, public documentation, tests, and releases.
- Run commands from `<repo-root>`. Do not use KMSF paths or `npm --workspace` commands unless the user explicitly asks to inspect migration history.
- Treat KMSF references in `reports/` as historical evidence. Do not rewrite historical records to remove them.

## Change Boundaries

- Preserve the controlled React API, existing public types, and package-local conventions unless the requested change explicitly expands them.
- Keep public documentation English-first under `docs/user/`; maintain matching Korean guidance under `docs/ko/` when public behavior changes.
- Do not publish, tag, create a GitHub Release, or push a remote branch without an explicit user command. Publishing `comins-table@0.1.0` is an explicit release operation.

## Verification

- For library, type, or build changes, run `npm run verify` before reporting completion.
- For public documentation changes, run the focused user-documentation test when applicable: `npm run test:run -- test/user-docs.test.ts`.
- For Playground behavior or UI changes, run the affected Playwright spec; run `npm run test:e2e -- --workers=1` when the change can affect shared interaction or routing behavior.
- For virtualization, scrolling, or memory-counter changes, run the focused performance spec first. Run `npm run test:perf -- --workers=1` once after a meaningful code or test-contract change.
- Classify a failed gate as product behavior, test contract, or execution environment before changing code or repeating the full suite. `listen EPERM` during local binding is an environment failure until evidence shows otherwise.
- Before a release request, also run `npm run test:consumer` and `npm pack --dry-run --json`.

## Reporting

- For meaningful committed code, documentation, configuration, or test changes, update `reports/YYYY-MM-DD.md` with summary, files, verification, and residual risks.
- Do not create or update a worklog for inspection-only work unless the user requests a durable report.
- Keep unrun or failed validation visible in the final report.
