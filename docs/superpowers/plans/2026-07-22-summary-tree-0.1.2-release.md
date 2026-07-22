# Summary Row and Tree Grid 0.1.2 Release Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Integrate the completed Summary Row and Tree Grid work with Comins Contract v1.2, correct the confirmed Chromium document-counter test contract, and publish `comins-table@0.1.2` through the repository's staged npm workflow.

**Architecture:** Preserve the existing Summary Row and Tree Grid implementation and rebase its isolated branch onto current `main`. Treat the physical-scrollbar failure as a performance test-contract issue: compare the recovered basic page against the target route's post-resource-load document count while keeping the existing DOM node and listener recovery thresholds. Release only the exact verified package artifact through OIDC staged publishing, followed by maintainer 2FA approval.

**Tech Stack:** React 18+, TypeScript, Vite 8, Vitest 4, Playwright, Chrome DevTools Protocol, GitHub Actions, npm 11 staged publishing, Gitleaks 8.30.1.

## Global Constraints

- Adopt Comins Contract v1.2 and the current marker-delimited `AGENTS.md` guidance from `main`.
- Release exactly `comins-table@0.1.2`; do not create a Git tag or GitHub Release.
- Do not add or upgrade dependencies as part of this feature release.
- Do not weaken public-identity, Gitleaks, package allow-list, branch protection, CodeQL, or required CI gates.
- Preserve controlled data flow, documented public types, package exports, and the client-only browser boundary.
- Keep Summary Row aggregate `format`, descriptor `colSpan`, style/class behavior, Tree Grid `defaultExpandAll`, and array-based `expand(nodeIds?)` / `fold(nodeIds?)` contracts unchanged.
- Keep the Tree Grid Playground at 30 regular nodes and exactly 10,000 virtual nodes.
- `npm stage publish` is not a live publication; stop for maintainer review and 2FA approval before verifying the public registry.
- The GitHub public display name has been changed to the approved public handle. Revalidate generated merge metadata before release dispatch.

---

## File Map

| Files | Responsibility |
| --- | --- |
| `src/index.tsx`, `src/summary.ts`, `src/tree.ts` | Summary descriptor output and Tree Grid public/runtime contracts. |
| `example/src/features/SummaryRowFeature.tsx`, `example/src/features/TreeGridFeature.tsx`, `example/src/fixtures/treeGrid.ts` | Runnable Summary Row, 30-node Tree Grid, component/renderer, and 10,000-node virtualization examples. |
| `docs/user/17-tree-grid.md`, `docs/user/18-summary-row.md`, `docs/ko/17-tree-grid.md`, `docs/ko/18-summary-row.md`, `README.md`, `CHANGELOG.md` | English-first and matching Korean public guidance plus release notes. |
| `test/summary-core.test.ts`, `test/tree-table.test.tsx`, `test/table-interaction.test.tsx` | Summary and Tree Grid component contracts. |
| `test/playwright/specs/summary-row.spec.ts`, `test/playwright/specs/tree-grid.spec.ts` | Browser-visible Playground contracts. |
| `test/playwright/specs/physical-scrollbar.spec.ts` | CDP recovery and physical scrollbar performance contract. |
| `package.json`, `package-lock.json` | Exact `0.1.2` package version. |
| `reports/2026-07-21.md`, `reports/2026-07-22.md` | Implementation evidence, failure classification, release gates, and residual risks. |

### Task 1: Preserve the Implemented Feature and Integrate Current Main

**Files:**
- Modify: `CHANGELOG.md`, `README.md`
- Modify: `docs/ko/12-playground.md`, `docs/ko/17-tree-grid.md`, `docs/user/12-playground.md`, `docs/user/17-tree-grid.md`
- Create: `docs/ko/18-summary-row.md`, `docs/user/18-summary-row.md`
- Modify: `example/src/docs/codeSamples.ts`, `example/src/docs/dataTableOptionGuide.ts`, `example/src/docs/docsRoutes.tsx`
- Modify: `example/src/features/TreeGridFeature.tsx`, `example/src/features/featureRegistry.tsx`, `example/src/features/types.ts`, `example/src/styles.css`
- Create: `example/src/features/SummaryRowFeature.tsx`, `example/src/fixtures/treeGrid.ts`
- Modify: `src/index.tsx`, `src/summary.ts`, `src/tree.ts`
- Modify: `test/summary-core.test.ts`, `test/table-interaction.test.tsx`, `test/tree-table.test.tsx`, `test/user-docs.test.ts`
- Modify: `test/playwright/specs/playground-content-docs.spec.ts`, `test/playwright/specs/tree-grid.spec.ts`, `test/playwright/specs/user-playground-docs.spec.ts`
- Create: `test/playwright/specs/summary-row.spec.ts`
- Modify: `reports/2026-07-21.md`
- Create: `docs/superpowers/plans/2026-07-22-summary-tree-0.1.2-release.md`

**Interfaces:**
- Consumes: the completed dirty worktree on `codex/summary-tree-playground` and current local `main`.
- Produces: reviewed feature commits rebased onto the Contract v1.2 baseline.

- [ ] **Step 1: Confirm the exact worktree and identity boundary**

Run:

```bash
git status -sb
git diff --check
test "$(git config user.name)" = "kim1124"
test "$(git config user.email)" = "23370390+kim1124@users.noreply.github.com"
git rev-list --left-right --count main...HEAD
```

Expected: only approved Summary Row, Tree Grid, docs, tests, report, and plan files are dirty; diff check and local public identity pass; the feature branch is behind current `main` before integration.

- [ ] **Step 2: Run the feature-focused pre-integration gate**

Run:

```bash
npm run test:run -- test/summary-core.test.ts test/tree-table.test.tsx test/table-interaction.test.tsx test/user-docs.test.ts
npm run test:e2e -- test/playwright/specs/summary-row.spec.ts test/playwright/specs/tree-grid.spec.ts --workers=1
```

Expected: unit/component/documentation tests and both feature Playwright specs pass.

- [ ] **Step 3: Commit the completed feature as one reviewable unit**

Run:

```bash
git add \
  CHANGELOG.md README.md \
  docs/ko/12-playground.md docs/ko/17-tree-grid.md docs/ko/18-summary-row.md \
  docs/user/12-playground.md docs/user/17-tree-grid.md docs/user/18-summary-row.md \
  docs/superpowers/plans/2026-07-22-summary-tree-0.1.2-release.md \
  example/src/docs/codeSamples.ts example/src/docs/dataTableOptionGuide.ts example/src/docs/docsRoutes.tsx \
  example/src/features/SummaryRowFeature.tsx example/src/features/TreeGridFeature.tsx \
  example/src/features/featureRegistry.tsx example/src/features/types.ts example/src/fixtures/treeGrid.ts \
  example/src/styles.css reports/2026-07-21.md \
  src/index.tsx src/summary.ts src/tree.ts \
  test/playwright/specs/playground-content-docs.spec.ts test/playwright/specs/summary-row.spec.ts \
  test/playwright/specs/tree-grid.spec.ts test/playwright/specs/user-playground-docs.spec.ts \
  test/summary-core.test.ts test/table-interaction.test.tsx test/tree-table.test.tsx test/user-docs.test.ts
git diff --cached --check
npm run check:hygiene -- --staged
git commit -m "feat: expand summary row and tree grid playground"
```

Expected: staged hygiene passes and the feature changes are preserved in one commit without package version or release metadata changes.

- [ ] **Step 4: Rebase onto current main and install the locked dependency graph**

Run:

```bash
git rebase main
npm ci
git status -sb
git diff main...HEAD --check
```

Expected: the branch is based on current `main`, the managed Contract v1.2 block is present, and no dependency file is changed by installation.

### Task 2: Correct the Physical Scrollbar Document-Counter Contract

**Files:**
- Modify: `test/playwright/specs/physical-scrollbar.spec.ts`
- Modify: `reports/2026-07-22.md`

**Interfaces:**
- Consumes: `readDevtoolsMemorySnapshot(page)` and the already loaded virtualization route.
- Produces: a target-route resource baseline that still detects additional leaked documents after return to Basic.

- [ ] **Step 1: Reproduce the confirmed RED state**

Run:

```bash
npm run test:perf -- test/playwright/specs/physical-scrollbar.spec.ts --workers=1
```

Expected: the recovery test fails only at `afterBasic.documents === basicBaseline.documents`, with the cold Basic count at `1` and the recovered count at `2`; the responsiveness test passes.

- [ ] **Step 2: Capture the post-resource-load baseline**

After the existing `scrollHeight > 100_000` assertion and before physical scrolling, add:

```ts
  const postLoad = await readDevtoolsMemorySnapshot(page);
```

Include the new snapshot in the failure context:

```ts
  const failureContext = JSON.stringify({ afterBasic, basicBaseline, postLoad }, null, 2);
```

- [ ] **Step 3: Replace only the invalid cold-baseline assertion**

Replace:

```ts
  expect(afterBasic.documents, failureContext).toBe(basicBaseline.documents);
```

with:

```ts
  expect(afterBasic.documents, failureContext).toBeLessThanOrEqual(postLoad.documents);
```

Keep the existing Basic-relative node and listener thresholds unchanged. This matches `virtualization.spec.ts`: the route may warm one cached SVG image document, but an additional page/document leak still exceeds the post-load baseline.

- [ ] **Step 4: Verify GREEN and record the classification**

Run:

```bash
npm run test:perf -- test/playwright/specs/physical-scrollbar.spec.ts --workers=1
git diff --check
```

Expected: both physical-scrollbar tests pass. Record that the checked component checkbox loads a `data:image/svg+xml` resource, CDP `documents` stabilizes at `2`, frames remain `1`, and Basic live-element count returns to its original value.

- [ ] **Step 5: Commit the test-contract correction**

```bash
git add test/playwright/specs/physical-scrollbar.spec.ts reports/2026-07-22.md
git diff --cached --check
git commit -m "test: align scrollbar document recovery baseline"
```

### Task 3: Prepare the 0.1.2 Release Metadata

**Files:**
- Modify: `package.json`
- Modify: `package-lock.json`
- Modify: `CHANGELOG.md`
- Modify: `reports/2026-07-22.md`

**Interfaces:**
- Consumes: the verified feature and performance test-contract commits.
- Produces: an exact `0.1.2` release candidate with no Git tag.

- [ ] **Step 1: Update only the package version fields**

Run:

```bash
npm version 0.1.2 --no-git-tag-version
```

Expected: only `package.json`, `package-lock.json#version`, and `package-lock.json#packages[""]#version` change to `0.1.2`.

- [ ] **Step 2: Promote the changelog entries**

Keep an empty `## Unreleased` section and move the existing Summary Row and Tree Grid bullets under:

```markdown
## 0.1.2 - 2026-07-22
```

Do not claim a Git tag or GitHub Release.

- [ ] **Step 3: Verify version consistency and commit**

Run:

```bash
node -e 'const p=require("./package.json"); const l=require("./package-lock.json"); if (p.version !== "0.1.2" || l.version !== "0.1.2" || l.packages[""].version !== "0.1.2") process.exit(1)'
git diff --check
git add package.json package-lock.json CHANGELOG.md reports/2026-07-22.md
git commit -m "chore: prepare comins-table 0.1.2"
```

Expected: exact version consistency passes and no tag is created.

### Task 4: Execute the Complete Local Release Gate

**Files:**
- Modify: `reports/2026-07-22.md`
- Generated and removed: `comins-table-0.1.2.tgz`
- Generated under ignored path: `.local/bin/gitleaks`

**Interfaces:**
- Consumes: the exact `0.1.2` worktree.
- Produces: unit, browser, performance, consumer, artifact, and extracted-artifact security evidence.

- [ ] **Step 1: Run focused library and documentation tests**

```bash
npm run test:run -- test/summary-core.test.ts test/tree-table.test.tsx test/table-interaction.test.tsx test/user-docs.test.ts
npm run test:run -- test/user-docs.test.ts
```

Expected: every focused test passes.

- [ ] **Step 2: Run focused browser tests**

```bash
npm run test:e2e -- test/playwright/specs/summary-row.spec.ts test/playwright/specs/tree-grid.spec.ts test/playwright/specs/playground-content-docs.spec.ts test/playwright/specs/user-playground-docs.spec.ts --workers=1
npm run test:perf -- test/playwright/specs/physical-scrollbar.spec.ts --workers=1
```

Expected: feature, route/documentation, and corrected physical-scrollbar tests pass.

- [ ] **Step 3: Run the full repository gates once**

```bash
npm run verify
npm run test:e2e -- --workers=1
npm run test:perf -- --workers=1
npm run test:consumer
```

Expected: security, hygiene, TypeScript, Vitest, build, all non-performance E2E, all performance tests including the 10,000-node Tree Grid, and isolated consumer imports pass.

- [ ] **Step 4: Create and Gitleaks-scan the exact package artifact**

Run on Darwin arm64 using the same pinned Gitleaks version as CI:

```bash
release_root=$(mktemp -d /tmp/comins-table-0.1.2-release.XXXXXX)
gitleaks_archive="$release_root/gitleaks.tar.gz"
extract_root="$release_root/extracted"
package_file=""
cleanup_release_artifacts() {
  if test -n "$package_file"; then
    rm -f "$package_file"
  fi
  rm -rf "$release_root"
}
trap cleanup_release_artifacts EXIT
mkdir -p "$extract_root" .local/bin
curl --fail --silent --show-error --location \
  --output "$gitleaks_archive" \
  https://github.com/gitleaks/gitleaks/releases/download/v8.30.1/gitleaks_8.30.1_darwin_arm64.tar.gz
printf '%s  %s\n' b40ab0ae55c505963e365f271a8d3846efbc170aa17f2607f13df610a9aeb6a5 "$gitleaks_archive" \
  | shasum -a 256 -c -
tar -xzf "$gitleaks_archive" -C .local/bin gitleaks
test "$(.local/bin/gitleaks version)" = "8.30.1"
package_file=$(NPM_CONFIG_CACHE="$release_root/npm-cache" node scripts/verify-package-artifact.mjs)
test "$package_file" = "comins-table-0.1.2.tgz"
tar -xzf "$package_file" -C "$extract_root"
.local/bin/gitleaks dir "$extract_root/package" \
  --config .gitleaks.toml \
  --redact \
  --ignore-gitleaks-allow \
  --no-banner \
  --no-color \
  --log-level error
```

Expected: checksum, version, package allow-list, exact filename, and extracted artifact scan pass without disclosing findings.

- [ ] **Step 5: Record results and remove generated material**

Update `reports/2026-07-22.md` with exact counts, commands, results, and any residual risks, then run:

```bash
test ! -e comins-table-0.1.2.tgz
git diff --check
git add reports/2026-07-22.md
git commit -m "docs: record 0.1.2 release verification"
```

Expected: no package archive or raw scanner output remains.

### Task 5: Merge Through Protected Main and Revalidate Identity

**Files:**
- No new runtime files.
- Remote changes: feature branch, pull request, protected `main`.

**Interfaces:**
- Consumes: locally verified release commits and the approved GitHub public handle.
- Produces: a reviewed `main` commit with passing required checks.

- [ ] **Step 1: Validate outbound branch content and identity**

```bash
git status -sb
git diff main...HEAD --check
node scripts/check-public-identities.mjs "$(git rev-parse main)" "$(git rev-parse HEAD)"
npm run check:hygiene -- --staged
```

Expected: the worktree is clean, the outbound range uses approved public identities, and no staged content remains.

- [ ] **Step 2: Push and open the feature PR**

```bash
git push -u origin codex/summary-tree-playground
gh pr create --base main --head codex/summary-tree-playground \
  --title "feat: expand summary row and tree grid playground" \
  --body "Adds Summary Row formatting, colSpan and styling; expands Tree Grid refs, initial expansion, component/renderer cells and 10,000-node virtualization; prepares comins-table 0.1.2 after full local verification."
```

- [ ] **Step 3: Require all protected checks and merge**

Run:

```bash
gh pr checks codex/summary-tree-playground --watch
gh pr merge codex/summary-tree-playground --merge
```

Expected: Sensitive data, Verify, and CodeQL pass before the protected merge. Do not create a tag or GitHub Release.

- [ ] **Step 4: Verify the generated main range**

Run:

```bash
previous_main=$(git rev-parse origin/main)
git fetch origin main
next_main=$(git rev-parse origin/main)
node scripts/check-public-identities.mjs "$previous_main" "$next_main"
gh run list --branch main --limit 4 --json databaseId,status,conclusion,workflowName,url
```

Watch the Verify and CodeQL run IDs returned for `next_main` and require both to pass. If the public-identity check fails again, stop before release dispatch and investigate the generated commit metadata without weakening the checker.

### Task 6: Stage, Approve, and Verify the npm Release

**Files:**
- Remote workflow: `.github/workflows/publish.yml`
- Public registry: `comins-table@0.1.2`
- No Git tag or GitHub Release.

**Interfaces:**
- Consumes: verified `origin/main` at package version `0.1.2`.
- Produces: a staged artifact, maintainer-approved live package, and public registry verification.

- [ ] **Step 1: Dispatch the exact-version staged workflow**

```bash
gh workflow run publish.yml --ref main -f version=0.1.2
release_run=$(gh run list --workflow publish.yml --branch main --event workflow_dispatch --limit 1 --json databaseId --jq '.[0].databaseId')
gh run watch "$release_run" --exit-status
```

Watch the resulting workflow. Require `verify-and-pack` to run `npm ci`, `verify:full`, consumer smoke, exact packaging, and extracted Gitleaks before `stage` receives the artifact.

- [ ] **Step 2: Stop for maintainer staged-package review and 2FA**

Confirm the workflow staged `comins-table@0.1.2`. The maintainer reviews the staged package on npmjs.com and approves it with 2FA. Do not attempt to bypass or automate the 2FA proof-of-presence step.

- [ ] **Step 3: Verify public publication**

After maintainer approval, run:

```bash
npm view comins-table@0.1.2 version --json
npm view comins-table versions dist-tags --json
```

Expected: `0.1.2` is public and `latest` resolves to `0.1.2`.

- [ ] **Step 4: Record final release evidence**

Append the workflow URL, staged approval result, public registry checks, final commit SHA, and residual risks to `reports/2026-07-22.md`. Submit the report-only change through a protected PR if `main` already contains the published source commit.

## Plan Self-Review

- Spec coverage: Contract v1.2 integration, existing Summary Row and Tree Grid behavior, test-failure correction, exact `0.1.2` version, full browser/performance gates, consumer smoke, package artifact security, protected PR integration, staged publishing, 2FA, and registry verification are mapped to Tasks 1–6.
- Placeholder scan: no TBD/TODO, unspecified error handling, or unnamed test command remains.
- Type consistency: existing `format`, `defaultExpandAll`, `CominsTableRef.expand(nodeIds?)`, and `fold(nodeIds?)` names remain unchanged throughout the plan.
- Release boundary: npm publication is in scope; Git tags and GitHub Releases are explicitly excluded.
