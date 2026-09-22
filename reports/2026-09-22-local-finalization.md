# 0.1.11 local verification finalization

- Recorded: 2026-09-22 16:17:12 KST.
- Scope: resolve the outstanding local unit-test discovery blocker and verify the package in a separate consumer.
- Local change: `vite.config.ts` adds `.local/**` to Vitest exclusions alongside existing `.worktrees/**` and `test/playwright/**` exclusions. No public runtime behavior, dependency, or build output configuration changes.

## Root cause and verification

The ignored `.local/ci-diagnostics/memory-audit/memory-leak-full-audit.spec.ts` belongs to Playwright. Vitest's default discovery nevertheless collected it and invoked `test.describe.configure` without a Playwright suite. Before the fix, targeting that file reproduced the error with one failed suite. The file and its diagnostics remain intact; regular unit tests and committed Playwright coverage remain enabled.

| Check | Result |
| --- | --- |
| Targeted pre-fix reproduction | Failed as expected: Playwright suite invoked by Vitest |
| `npm run verify` | Passed with the ordinary command, without additional exclusion flags |
| Unit tests inside verify | 38 files, 468 tests passed |
| Hygiene, documentation, deterministic security/license gates, TypeScript, build | Passed inside verify |
| `npm run verify:package-artifact` | Passed: package paths, external dependency boundary, declarations, notices, license checks |
| Consumer smoke using the exact checked tarball | Passed: root, core, clipboard, selection and stylesheet entry points; private icon exports absent |
| `git diff --check` | Passed |

Artifacts: [verification log](artifacts/local-finalization-2026-09-22/verify.log), [pre-fix reproduction](artifacts/local-finalization-2026-09-22/discovery-before.log), [package check](artifacts/local-finalization-2026-09-22/artifact.log), [consumer check](artifacts/local-finalization-2026-09-22/consumer.log).

Checked local artifact: `reports/artifacts/local-finalization-2026-09-22/comins-table-0.1.11.tgz`.
SHA-256: `17c552e7c6dbe9a5baceef5b164dfb43e75f37c391eb21bbee48ccfcb6202b03`.
This is a local review artifact, not a published release.

## Existing browser evidence and remaining boundary

- Latest full UI evidence: 231 tests passed after the option-toggle change; see [toggle report](2026-09-22-playground-toggles.md). Direct manipulation covered the six changed routes.
- Latest focused drag/scroll evidence: 4 tests passed after the toggle change. Earlier full performance evidence: 38 tests passed, see [human review report](2026-09-22-human-review.md).
- Browser tests were not repeated for the Vitest-only exclusion change. These are recorded earlier results, not fresh executions in this step.
- The previous `npm run verify` blocker recorded in the human review report is resolved by this step.
- Existing uncommitted files and user artifacts were preserved. No commit, push, PR, merge, tag, Release or publication was performed. Human approval and required remote checks remain before release.
