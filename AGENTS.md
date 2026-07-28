<!-- comins-reference:managed-start contract=v1.2 -->
# Comins Module AGENTS.md

## Scope

- Treat this as an independent Comins Git boundary. Read only applicable closer `AGENTS.md` files; load [Governance policy](https://github.com/kim1124/comins-governance) only for API, security, release, license, or shared-policy work.
- Do not use KMSF workflows except for migration-history work; keep `AGENTS.override.md` temporary and uncommitted.

## Work Routing

- **Inspection or research:** report evidence; no edits, reports, or product gates.
- **Documentation, guidance, or configuration:** edit directly; run applicable diff, reference, instruction, and parse checks only.
- **Clear local behavior:** define acceptance or reproduce, add a regression test first when it materially improves confidence, implement, run focused checks, then the baseline once.
- **Complex or high-risk:** close material unknowns/decisions, plan when needed, test incrementally, then run the applicable broad gate once.
- **Security, release, external, or destructive:** follow Governance and obtain approval.

## Change Boundaries

- Preserve public APIs, types, and local conventions unless scope expands; namespace CSS/custom properties, avoid global resets, and isolate external engines behind module adapters.
- Do not push, publish, tag, or create a GitHub Release without an explicit maintainer command.

## Sensitive Data

- Adopt Comins Contract v1.2 and the governance `SENSITIVE_DATA_STANDARD.md`. Never track personal names, personal email addresses, local account paths, credentials, tokens, secrets, or value-derived fingerprints.
- Use only an approved public handle, GitHub noreply identity, service identity, explicit placeholder, or repository-relative path; run required Gitleaks/security CI and, when a package boundary exists, the exact package-artifact gate.
- Redact detector output, fail closed when unavailable, and audit legacy exposure separately.

## Verification

- Select checks by change type, report failed/unrun required checks, and classify failures as product, test-contract, or environment before changing code or retrying.

## Reporting

- Update reports only for meaningful behavior, public API, configuration, security, release, or test-contract changes when that convention exists.
- For a public release only, closure requires Governance post-publication closure evidence, local/remote default-branch reconciliation, and remaining release branches/worktrees; deletion needs separate maintainer approval.
<!-- comins-reference:managed-end -->

## Module Guidance

- This repository owns the Comins Table React library, Playground, public docs, tests, and releases; KMSF references under `reports/` are historical only.
- Preserve the application-owned `data`/callback flow, documented types, exports (`comins-table`, `/core`, `/clipboard`, `/selection`, `/styles.css`), and client-only boundary as public API.
- Keep implementation in `src/`, Playground in `example/`, English docs in `docs/user/`, matching Korean docs in `docs/ko/` for public behavior changes, tests in `test/`, and reports in `reports/YYYY-MM-DD.md`.
- Keep all third-party benchmark research, artifacts, and license notes under the ignored `.local/benchmarks/` tree. Public documentation may describe Comins behavior but must not contain named competitor comparisons; never bypass hygiene or add allowlist exceptions for local-only material.
- Run `npm run setup:hooks` once per clone and `npm run verify` for library, type, or build changes.
- For public documentation changes, run `npm run test:run -- test/user-docs.test.ts`. For Playground or UI changes, run the affected Playwright spec, and use `npm run test:e2e -- --workers=1` when shared interaction or routing can change.
- For virtualization, scrolling, or memory-counter changes, run the focused performance spec first and run `npm run test:perf -- --workers=1` once after a meaningful code or test-contract change. Treat a local `listen EPERM` bind failure as an execution-environment failure unless evidence shows otherwise.
- For releases, follow Governance, `SECURITY.md`, and `.github/workflows/publish.yml`; do not claim closure when consumer and publish artifacts differ.
