# Comins Table AGENTS.md

## Scope

- This repository is the standalone source of truth for Comins Table library code, Playground, public documentation, tests, and releases.
- Run commands from `<repo-root>`. Do not use KMSF paths or `npm --workspace` commands unless the user explicitly asks to inspect migration history.
- Treat KMSF references in `reports/` as historical evidence. Do not rewrite historical records to remove them.

## Shared Contract

- This repository adopts Comins Contract v1.2.
- For policy, security, public API, or release work, read `COMINS_CONTRACT.md` in the Comins governance repository explicitly. Keep `AGENTS.override.md` uncommitted and temporary.
- Use `gpt-5.6-sol` with `xhigh` reasoning as the default for all Comins work.
- For vulnerability investigation, runtime memory leaks, retention, out-of-memory failures, or security work, use `gpt-5.6-sol` with at least `xhigh`.
- For instruction planning, Plan mode, or authoring or updating an implementation plan, use `gpt-5.6-sol` with at least `max`.

## Change Boundaries

- Preserve the controlled React API, existing public types, and package-local conventions unless the requested change explicitly expands them.
- Keep public documentation English-first under `docs/user/`; maintain matching Korean guidance under `docs/ko/` when public behavior changes.
- Do not publish, tag, create a GitHub Release, or push a remote branch without an explicit user command. Publishing `comins-table@0.1.0` is an explicit release operation.

## Repository Hygiene

- Never track personal names, personal email addresses, local account paths, credentials, tokens, secrets, or value-derived fingerprints.
- Use only an approved public handle, GitHub noreply identity, service identity, explicit placeholder, or repository-relative path. Run the required Gitleaks hook, security CI, and exact package-artifact gate; redact scanner output and fail closed when a required gate is unavailable.
- Keep third-party table or grid benchmark research, comparison matrices, copied samples, screenshots, license notes, source snapshots, and raw measurements under the ignored `.local/benchmarks/` tree only. Public documentation may describe Comins behavior but must not contain named competitor comparisons.
- Run `npm run check:hygiene` before committing. Enable the repository hooks once per clone with `npm run setup:hooks`; pre-commit validates staged content and local Git identity, while pre-push validates each new commit range.
- Do not bypass the hygiene check. Move intentional local-only material under `.local/` instead of adding an allowlist exception.

## Verification

- For every change, `npm run verify` includes the repository hygiene check. Use `npm run check:hygiene -- --staged` when validating the exact index snapshot independently.
- For library, type, or build changes, run `npm run verify` before reporting completion.
- For public documentation changes, run the focused user-documentation test when applicable: `npm run test:run -- test/user-docs.test.ts`.
- For Playground behavior or UI changes, run the affected Playwright spec; run `npm run test:e2e -- --workers=1` when the change can affect shared interaction or routing behavior.
- For virtualization, scrolling, or memory-counter changes, run the focused performance spec first. Run `npm run test:perf -- --workers=1` once after a meaningful code or test-contract change.
- Classify a failed gate as product behavior, test contract, or execution environment before changing code or repeating the full suite. `listen EPERM` during local binding is an environment failure until evidence shows otherwise.
- Before a release request, also run `npm run test:consumer` and `npm run verify:package-artifact`; extract and Gitleaks-scan that exact artifact before publication.

## Reporting

- For behavior, public API, configuration, security, release, or test-contract changes, update `reports/YYYY-MM-DD.md` with summary, files, verification, and residual risks.
- Do not create or update a worklog for inspection-only work unless the user requests a durable report.
- Keep unrun or failed validation visible in the final report.
