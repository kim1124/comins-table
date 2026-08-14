<!-- comins-reference:managed-start contract=v1.6 -->
# Comins Module AGENTS.md

## Scope

- Keep the module Git boundary; use
  [Governance](https://github.com/kim1124/comins-governance) for common rules.

## Required Order

- Resolve the Git root and instructions. Follow Contract v1.6: license compliance; security and sensitive data; Comins common rules;
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
- Run final review or a broad gate only when the selected route requires it.
- On failure, preserve same-commit evidence and successful checks; classify and
  rerun only affected jobs or tests. A retry does not restart prior work.

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
