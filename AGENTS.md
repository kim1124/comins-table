<!-- comins-reference:managed-start contract=v1.7 -->
# Comins Module AGENTS.md

## Common Policy

- Apply the canonical
  [Comins Contract v1.7](https://github.com/kim1124/comins-governance/blob/main/COMINS_CONTRACT.md)
  before the repository-owned `Module Guidance` below. Governance is the only
  common-policy owner; this managed block only routes to it.
- Load the Contract's license, sensitive-data, or release policy only when its
  corresponding stage is triggered.
- Keep module API, implementation, performance, browser, and checker commands
  in `Module Guidance`; the module owns their CI implementation.
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
