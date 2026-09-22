# 0.1.11 integration preparation

- Date: 2026-09-22 KST.
- Branch: `codex/0.1.11-clipboard-fill-design`.
- Verified base: local and remote `main` both at `17de2b5f205b6c47d2eb34b675fd8e52524db301`; remote main is protected.
- No 0.1.11 pull request exists at preparation time. Unrelated dependency PRs remain untouched.

## Final scope

External TSV paste and Fill Handle, explicit Row Drag enablement, local reorder state preservation, scrolled/virtual Row and Tree movement, edge auto-scroll, border and drag feedback corrections, filter/focus/Detail fixes, Playground options and CRUD behavior, approved Playground brand assets, bilingual documentation and nine updated GIFs. Local-only diagnostics remain preserved and are excluded from unit-test discovery.

The public compatibility change is explicit: ordinary Row Drag defaults to false. Tree, Cross-Table and Clipboard/Fill ownership requirements remain separate. Viewport Row Drag is unavailable. See README and the Unreleased 0.1.11 changelog.

## Fresh verification

| Check | Result |
| --- | --- |
| `npm run verify` | Passed: 38 unit-test files, 468 tests, hygiene, documentation, deterministic security/license checks, TypeScript, build |
| Full Chromium UI suite | Passed: 231 tests (3.7 minutes) |
| Full performance suite | Passed: final run 38 tests (1.6 minutes); initial failure and synchronization follow-up below |
| `npm run verify:package-artifact` | Passed |
| Gitleaks 8.30.1 on extracted checked package | Passed; detector output discarded |
| Consumer smoke using that same package | Passed |
| Local public Git identity check | Passed |
| Staged hygiene/Gitleaks commit hook | Passed on the 129 reviewed staged files; normal commit also enforces the hook |
| TypeScript and test-reliability contract after scrollbar test synchronization | Passed: TypeScript and 7 contract tests |

### Native scrollbar test investigation

The first complete performance run passed 37 tests and failed the Viewport native-thumb test: the viewport remained at its first rows after mouse drag. Its trace showed an outer-page scroll immediately before the native scrollbar input. The unchanged test passed three isolated runs, so this was intermittent; no library defect was established. The test now waits for two animation frames after bringing the viewport into view, allowing the native scrollbar position to be painted before hit-testing. The amended test passed five consecutive isolated runs. This addresses the suspected paint/input timing race without changing library code or weakening the final-row assertion. The initial failure trace and both focused runs are preserved with the final full-suite results.

Artifact: `reports/artifacts/integration-0.1.11-2026-09-22/comins-table-0.1.11.tgz`.
SHA-256: `ed7103efd4dc54d01a1cdabd8b08c74ce493c0f8b25a631fe5d0466b92b6f089`.
The artifact is local, not a staged or published npm release. Logs and the proposed PR body are in the same ignored artifact directory.

## Evidence boundaries

- The maintainer completed the Playground human review before documentation finalization. The prior reports preserve actual pointer/keyboard/wheel evidence separately from automated results.
- The earlier Codex Security diff scan recorded on 2026-09-14 belongs to its historical snapshot. It is not represented as a new scan of this final tree. This documentation/GIF follow-up did not rerun an AI scan; deterministic current-change and package checks are recorded independently.
- Chromium browser/performance results do not establish native Safari or Firefox support.
- Remote push, PR creation, merge, tags, GitHub Release and package publication are separate steps requiring explicit authorization. None is performed in this preparation step.
