<!-- comins-reference:managed-start contract=v1.5 -->
# Comins Module AGENTS.md

## Scope

- Treat this as an independent Comins Git boundary. Read closer `AGENTS.md`;
  consult [Governance](https://github.com/kim1124/comins-governance) for common
  scope, security, license, and release policy.
- Keep KMSF historical; never commit `AGENTS.override.md`.

## Required Order

- Resolve the Git root and applicable instructions first. Then follow Contract
  v1.5: license compliance; security and sensitive data; Comins common rules;
  module rules; smallest change and affected checks; Git, pull request, and CI;
  release checks only when publishing.

## Work Routing

- **Inspection or research:** report evidence only.
- **Documentation or configuration:** edit directly and run matching checks.
- **Product behavior:** define acceptance, make the smallest change, and run the
  module's affected checks.
- **High-risk or ambiguous work:** close decisions and plan only when needed.

## Common Boundaries

- Preserve public APIs and types unless authorized. Keep CSS and external-engine
  behavior module-scoped.
- Apply Governance `OSS_LICENSE_POLICY.md` and `SENSITIVE_DATA_STANDARD.md`; the
  module owns its checker commands and CI implementation.
- Remote writes, publishing, tags, Releases, policy exceptions, and destructive
  operations require explicit approval.
- Name new Codex development branches `codex-<short-feature-name>`; append `-2`,
  `-3`, and so on for additional work under the same representative feature.
  Existing and provider-managed branches are exempt.

## Verification

- Run only checks required by the affected surface. A required failed or
  unavailable gate blocks that workflow; do not substitute unrelated gates.
- Report meaningful changes, executed checks, omissions, and unresolved
  blockers. Release closure applies only to an actual public release.
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
