# Final closure 2: public documentation and final gates

## Scope and tracked commit

- Tracked public-documentation commit: `cd3a048` (`docs: close localization and viewport follow-ups`).
- Changed only `CHANGELOG.md` and `reports/2026-08-07.md` before the fresh gates.
- Recorded Final Fix 5's explicit localization contract and Final Fix 6's capped concurrent snapshot contract. No runtime, public API/type, dependency, release, or remote state changed.

## Public documentation corrections

- Playground localization records 21/21 Features, 85/85 Feature options, 46/46 Option Guide descriptions, and 4/4 Option Guide group titles as explicit Korean/English pairs.
- The report records canonical `FeatureId`, AST/runtime completeness, duplicate/generic/allowlist gates, deterministic Tree Grid/docs copy, and the live `/api/props` route.
- The capped concurrent Detail regression records 50,000 Rows, logical `1,800,300px`, physical `1,500,000px` cap, a viewport-only suspended candidate, and committed physical `scrollTop` `749,950`.
- Obsolete visually-hidden placeholder accessible-name wording was replaced with the shipped side-effect-free plain string/id fallback, active `<th>` `aria-label`/`aria-labelledby` normalization, inert/event barrier, and pointer lifecycle contract.

## Fresh final-HEAD gates

| Command | Exit | Count and time |
| --- | ---: | --- |
| isolated-cache `npm run verify` | 0 | hygiene; security 17/17; license 27/27; TypeScript lint; Vitest 20 files, 275/275; production build; about 15s |
| `npm run test:perf -- --workers=1` | 0 | 27/27; about 31s; automatic Detail anchor delta 0 |
| `npm run test:e2e -- --workers=1` | 0 | ordinary Chromium 111/111; 1.1m |
| isolated-cache `npm run verify:package-artifact` | 0 | exact `comins-table-0.1.5.tgz` |
| isolated-cache `npm run test:consumer -- comins-table-0.1.5.tgz` | 0 | final tarball consumer smoke; about 28s |
| `git diff --check` | 0 | final diff clean |

## Environment and session notes

- The first sandbox performance command exited 1 because Vite could not bind `127.0.0.1:4002` (`listen EPERM`). The unchanged command was then run in the permitted environment and passed.
- Early non-PTY E2E tool calls returned partial runner output without a final summary; their results were not used for closure. After the existing Vite server exited, one PTY session ran the unchanged command to exit 0 with 111/111.
- No duplicate Playwright/Vite server was started while an existing server was listening.

## Artifact, privacy, visual evidence, and cleanup

- The exact artifact gate and final tarball consumer smoke both passed with one closure-owned isolated npm cache.
- The generated `comins-table-0.1.5.tgz` and that isolated cache were removed after consumer verification.
- Tracked absolute-user-path and sensitive-pattern scans found no matching user path or credential pattern.
- The existing four controller-owned PNGs were checked for existence and dimensions only: `followup-row-expand.png`, `followup-row-expand-fixed.png`, `followup-header-sort.png`, and `followup-column-placeholder.png` are each 1280x900.
- The pre-existing untracked `output/` tree was not read, modified, deleted, or staged.

## Residual risk

- Firefox and actual Safari remain unverified for inert behavior, accessibility-tree behavior, and ResizeObserver notification ordering. Chromium and Playwright WebKit evidence are not Safari certification.
- No push, PR, merge, tag, Release, publish, or other remote write occurred.

## Local report commit

- `docs: record final closure gate evidence` (this report change set; see local Git history for the immutable commit ID).
