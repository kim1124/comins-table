<!-- comins-reference:managed-start contract=v1.5 -->
# Comins Module AGENTS.md

## Scope

- Comins Git boundary. Read `AGENTS.md`; use
  [Governance](https://github.com/kim1124/comins-governance) for rules.
- Keep KMSF historical; never commit `AGENTS.override.md`.

## Required Order

- Resolve the Git root and instructions. Follow Contract v1.5: license compliance; security and sensitive data; Comins common rules;
  module rules; smallest change and affected checks; Git, pull request, and CI; release checks only when publishing.

## Work Routing

- **Inspection or research:** report evidence only.
- **Documentation or configuration:** direct edit and matching checks.
- **Product behavior:** acceptance, smallest change, affected checks.
- Plan only for high-risk ambiguity.
- General-purpose skills and historical plans must not expand the selected route
  or trigger unrelated checks.
- Subagents require explicit maintainer delegation or approved independent
  parallel work. Never pass full history; use bounded briefs and paths.
- Default: one final review and one required broad gate after the final change.
  Recheck affected failures; reuse unchanged evidence.

## Common Boundaries

- Preserve public APIs and types; keep CSS and external engines module-scoped.
- Apply Governance `OSS_LICENSE_POLICY.md` and `SENSITIVE_DATA_STANDARD.md`; the
  module owns its checker commands and CI implementation.
- Remote writes, publishing, tags, Releases, policy exceptions, and destructive
  operations require explicit approval.
- Name new Codex development branches `codex-<short-feature-name>`; append `-2`,
  `-3`, and so on for additional work under the same feature.
  Existing and provider-managed branches are exempt.

## Verification

- Run affected checks only. A failed required gate blocks the workflow;
  unrelated gates are not substitutes.
- Report changes, checks, omissions, and blockers. Release closure applies only
  to publication.
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
