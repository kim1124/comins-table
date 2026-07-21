<!-- comins-reference:managed-start contract=v1.2 -->
# Comins Module AGENTS.md

## Scope

- This repository is one independent Comins npm frontend module.
- Read this file and any closer `AGENTS.md`; record the adopted `COMINS_CONTRACT` version and read the governance source explicitly for policy, security, release, or public API work.
- Do not use KMSF workspace commands, source synchronization, or release flows without a migration-history request; keep `AGENTS.override.md` uncommitted and temporary.
- Use `gpt-5.6-sol` with `xhigh` reasoning as the default for all Comins work.
- For vulnerability investigation, runtime memory leaks, retention, out-of-memory failures, or security work, use `gpt-5.6-sol` with at least `xhigh`.
- For instruction planning, Plan mode, or authoring or updating an implementation plan, use `gpt-5.6-sol` with at least `max`.

## Change Boundaries

- Preserve documented APIs, types, and package-local conventions unless the request explicitly expands them.
- Namespace CSS and custom properties, avoid global resets, and keep external engines behind module-owned adapters.
- Do not publish, tag, create a GitHub Release, or push a remote branch without an explicit maintainer command.

## Sensitive Data

- Adopt Comins Contract v1.2 and the governance `SENSITIVE_DATA_STANDARD.md`.
- Never track personal names, personal email addresses, local account paths, credentials, tokens, secrets, or value-derived fingerprints.
- Use only an approved public handle, GitHub noreply identity, service identity, explicit placeholder, or repository-relative path; run the required local Gitleaks hook and security CI, and when a package boundary exists run the exact package-artifact gate.
- Redact detector output, fail closed when a required scanner is unavailable, and handle legacy remediation through a separate audit.

## Verification

- Define and run the baseline verification command for meaningful changes, plus focused browser verification for interaction, layout, rendering, or keyboard behavior.
- Classify failures as product behavior, test contract, or execution environment before changing code or repeating broad gates.

## Reporting

- For behavior, public API, configuration, security, release, or test-contract changes, update the report with changed files, commands, results, and residual risks; do not create one for inspection-only work without a maintainer request.
<!-- comins-reference:managed-end -->

## Module Guidance

- This repository is the source of truth for the Comins Table controlled React data table library, Playground, public documentation, tests, and releases. Run commands from the repository root, and preserve KMSF references under `reports/` as historical evidence.
- Treat the application-owned `data` flow and change callbacks, documented public types, package exports (`comins-table`, `/core`, `/clipboard`, `/selection`, and `/styles.css`), and client-only browser boundary as public API constraints.
- Keep library implementation in `src/`, Playground code in `example/`, English-first public guidance in `docs/user/`, matching Korean guidance in `docs/ko/` when public behavior changes, tests in `test/`, and durable work reports in `reports/YYYY-MM-DD.md`.
- Keep third-party table or grid benchmark research, comparison matrices, copied samples, screenshots, license notes, source snapshots, and raw measurements under the ignored `.local/benchmarks/` tree. Public documentation may describe Comins behavior but must not contain named competitor comparisons; never bypass hygiene or add allowlist exceptions for local-only material.
- Run `npm run verify` as the baseline gate for library, type, or build changes; it includes repository hygiene, security, lint, unit, and build checks. Enable repository hooks once per clone with `npm run setup:hooks`; pre-commit validates staged content and the local Git identity, while pre-push validates each new commit range. Use `npm run check:hygiene -- --staged` to validate the exact index snapshot independently, and report every failed or unrun check.
- For public documentation changes, run `npm run test:run -- test/user-docs.test.ts`. For Playground or UI changes, run the affected Playwright spec, and use `npm run test:e2e -- --workers=1` when shared interaction or routing can change.
- For virtualization, scrolling, or memory-counter changes, run the focused performance spec first and run `npm run test:perf -- --workers=1` once after a meaningful code or test-contract change. Treat a local `listen EPERM` bind failure as an execution-environment failure unless evidence shows otherwise.
- Before a release request, also run `npm run test:consumer` and `npm run verify:package-artifact`, then extract and Gitleaks-scan that exact artifact before publication.
