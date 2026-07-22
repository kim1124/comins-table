<!-- comins-reference:managed-start contract=v1.2 -->
# Comins Module AGENTS.md

## Scope

- This repository is one independent Comins module and Git change boundary.
- Read this file and only the closer `AGENTS.md` files that apply to the target path. Read Governance policy explicitly only for public API, security, release, licensing, or common-policy work.
- Do not use KMSF workspace commands, source synchronization, or release flows without a migration-history request. Keep `AGENTS.override.md` temporary and uncommitted.

## Work Routing

- **Inspection or research:** inspect relevant sources and report evidence; do not edit, create a work report, or run product gates by default.
- **Documentation, guidance, or configuration:** make the scoped change directly; run diff, reference, instruction, and parse checks without product TDD or browser gates.
- **Clear local behavior:** define acceptance or reproduce the defect, add the smallest regression test first when it materially improves confidence, implement, run focused checks, then run the module baseline once.
- **Complex or high-risk behavior:** research material unknowns, close decisions, use an approved design or plan when needed, test incrementally, and run the applicable broad gate once after the meaningful change.
- **Security, release, external, or destructive work:** follow the canonical Governance policy and obtain the approval required for the affected operation.

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

- Select checks by change type, report failed or unrun required checks, and run the unchanged broad gate only once unless new evidence or changed state justifies a retry.
- Classify failures as product behavior, test contract, or execution environment before changing code or repeating a gate.

## Reporting

- Update the repository's work report only for meaningful behavior, public API, configuration, security, release, or test-contract changes when that repository has a report convention.
<!-- comins-reference:managed-end -->

## Module Guidance

- This repository is the source of truth for the Comins Table controlled React data table library, Playground, public documentation, tests, and releases. Preserve KMSF references under `reports/` as historical evidence.
- Treat the application-owned `data` flow and change callbacks, documented public types, package exports (`comins-table`, `/core`, `/clipboard`, `/selection`, and `/styles.css`), and client-only browser boundary as public API constraints.
- Keep library implementation in `src/`, Playground code in `example/`, English-first public guidance in `docs/user/`, matching Korean guidance in `docs/ko/` when public behavior changes, tests in `test/`, and durable work reports in `reports/YYYY-MM-DD.md`.
- Keep third-party table or grid benchmark research, comparison matrices, copied samples, screenshots, license notes, source snapshots, and raw measurements under the ignored `.local/benchmarks/` tree. Public documentation may describe Comins behavior but must not contain named competitor comparisons; never bypass hygiene or add allowlist exceptions for local-only material.
- Run `npm run setup:hooks` once per clone. Run `npm run verify` as the baseline gate for library, type, or build changes.
- For public documentation changes, run `npm run test:run -- test/user-docs.test.ts`. For Playground or UI changes, run the affected Playwright spec, and use `npm run test:e2e -- --workers=1` when shared interaction or routing can change.
- For virtualization, scrolling, or memory-counter changes, run the focused performance spec first and run `npm run test:perf -- --workers=1` once after a meaningful code or test-contract change. Treat a local `listen EPERM` bind failure as an execution-environment failure unless evidence shows otherwise.
- For release work, follow `SECURITY.md` and the repository publish workflow. Verify the exact artifact selected for publication and report any consumer/publish artifact mismatch instead of claiming complete coverage.
