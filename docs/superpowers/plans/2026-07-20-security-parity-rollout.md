# Grid Layout Security Parity Rollout Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Bring Comins Table to the approved Grid Layout repository, CI, release-candidate, and GitHub security posture without publishing npm content.

**Architecture:** Protect `main` first, then build and verify an immutable package tarball in an unprivileged job and pass only that artifact to an environment-gated OIDC stage job. Merge the reviewed local changes through the protected PR path before enabling repository-wide SHA enforcement and CodeQL.

**Tech Stack:** GitHub Actions, GitHub REST API, npm 11 staged publishing, Node.js 24, TypeScript, Vitest, Playwright, Dependabot, CodeQL.

## Global Constraints

- Preserve all Comins Table runtime behavior, public APIs, types, CSS, and browser behavior.
- Add no package dependency and do not update existing dependency versions.
- Prepare package version `0.1.1`; do not stage, publish, unpublish, tag, or create a GitHub Release.
- Keep npm trusted publishing bound to `kim1124/comins-table`, `publish.yml`, and the `npm` environment.
- Never print an npm, GitHub, or provider credential value.
- Do not rewrite historical reports or Git history.
- Configuration and release metadata are the user-approved TDD exception; static policy checks, full package gates, PR checks, and remote-state reads are the acceptance tests.

---

## File map

| File | Responsibility |
| --- | --- |
| `.github/workflows/verify.yml` | Verify with immutable actions and no persisted checkout credentials. |
| `.github/workflows/publish.yml` | Separate unprivileged verification/packing from minimal OIDC staging. |
| `.github/dependabot.yml` | Create weekly review-only npm and Actions update PRs. |
| `.gitignore` | Exclude environment, npm credential, worktree, and private-key files. |
| `package.json` | Declare the unpublished `0.1.1` candidate. |
| `package-lock.json` | Match the root package candidate version. |
| `CHANGELOG.md` | Describe the prepared security-process release accurately. |
| `SECURITY.md` | Keep the supported `0.1.x` line explicit. |
| `reports/2026-07-20.md` | Record local, PR, merge, and remote verification. |

### Task 1: Protect the remote default branch

**Files:**
- Create temporarily: `/tmp/comins-table-main-protection.json`

**Interfaces:**
- Consumes: GitHub repository `kim1124/comins-table` and existing `verify` check integration `15368`.
- Produces: active branch ruleset `main-protection` for `~DEFAULT_BRANCH`.

- [ ] **Step 1: Confirm no conflicting ruleset**

Run:

```bash
gh api repos/kim1124/comins-table/rulesets --jq '[.[] | {id,name,enforcement,target}]'
```

Expected: an empty list before creation.

- [ ] **Step 2: Create the exact ruleset**

Use an active branch ruleset with no bypass actors, `deletion`, `non_fast_forward`, `pull_request` with zero approvals, and `required_status_checks` containing `verify` with integration ID `15368` and strict branch freshness.

- [ ] **Step 3: Read back and verify the ruleset**

Run:

```bash
gh api repos/kim1124/comins-table/rulesets --jq '.[0].id'
gh api repos/kim1124/comins-table/rulesets/$(gh api repos/kim1124/comins-table/rulesets --jq '.[0].id') --jq '{name,enforcement,target,bypass_actors,conditions,rules}'
```

Expected: `main-protection`, `active`, `branch`, no bypass actors, default-branch scope, PR/verify/deletion/non-fast-forward rules.

### Task 2: Split and pin the release workflow

**Files:**
- Modify: `.github/workflows/verify.yml`
- Modify: `.github/workflows/publish.yml`

**Interfaces:**
- Consumes: manual exact version input, GitHub workflow artifacts, `npm` environment, GitHub OIDC.
- Produces: `verify-and-pack` and `stage` jobs with disjoint authority.

- [ ] **Step 1: Disable persisted checkout credentials**

Every checkout must be:

```yaml
- uses: actions/checkout@df4cb1c069e1874edd31b4311f1884172cec0e10 # v6
  with:
    persist-credentials: false
```

- [ ] **Step 2: Move source work to `verify-and-pack`**

The job has only `contents: read` and performs exact-version validation, existing-package validation, `npm ci`, Chromium installation, `npm run verify:full`, `npm run test:consumer`, and `npm pack --dry-run --json`.

- [ ] **Step 3: Create and upload one tarball**

Use:

```yaml
- name: Pack verified artifact
  id: pack
  run: >-
    npm pack --json |
    node -e 'const fs = require("node:fs");
    const [pack] = JSON.parse(fs.readFileSync(0, "utf8"));
    if (!pack?.filename) process.exit(1);
    process.stdout.write(`package-file=${pack.filename}\n`);' >> "$GITHUB_OUTPUT"
- uses: actions/upload-artifact@ea165f8d65b6e75b540449e92b4886f43607fa02 # v4
  with:
    name: npm-package-${{ inputs.version }}
    path: ${{ steps.pack.outputs.package-file }}
    if-no-files-found: error
    retention-days: 1
```

- [ ] **Step 4: Minimize `stage`**

The `stage` job depends on `verify-and-pack`, owns the `npm` environment and `id-token: write`, does not check out source, installs exact npm `11.15.0`, downloads with `actions/download-artifact@d3f86a106a0bac45b974a628896c90dbdf5c8093`, and runs `npm stage publish ./package-artifact/*.tgz --access public`.

- [ ] **Step 5: Assert the workflow boundary**

Run a static check that proves:

- no mutable action reference remains;
- the four approved action SHAs are the only `uses:` values;
- every checkout has `persist-credentials: false`;
- only `stage` has `environment: npm` and `id-token: write`;
- `stage` has no checkout, `npm ci`, build, test, or consumer command.

### Task 3: Add repository update and secret-file guardrails

**Files:**
- Create: `.github/dependabot.yml`
- Modify: `.gitignore`
- Modify: `SECURITY.md`

**Interfaces:**
- Consumes: npm and GitHub Actions ecosystems.
- Produces: weekly review-only PRs and local secret-file protection.

- [ ] **Step 1: Add weekly Dependabot groups**

Configure Monday `09:00 Asia/Seoul` updates, five open PRs per ecosystem, separate production/development npm minor-and-patch groups, and one GitHub Actions group. Do not add auto-merge or release automation.

- [ ] **Step 2: Extend ignore protection**

Keep current environment/npm rules and add:

```gitignore
!.npmrc.example
.worktrees/
*.pem
*.key
*.p12
*.pfx
```

- [ ] **Step 3: Make unsupported historical lines explicit**

Keep the operational policy and add a supported-version row showing versions below `0.1.0` are unsupported.

### Task 4: Prepare the unpublished privacy-safe release candidate

**Files:**
- Modify: `package.json`
- Modify: `package-lock.json`
- Modify: `CHANGELOG.md`

**Interfaces:**
- Consumes: current public `comins-table@0.1.0` and the privacy-remediation requirement.
- Produces: local candidate version `0.1.1` with no runtime/API change claim.

- [ ] **Step 1: Change only root package versions**

Set `package.json.version`, `package-lock.json.version`, and `package-lock.json.packages[""].version` to `0.1.1`. Do not alter dependency versions or integrity values.

- [ ] **Step 2: Add accurate changelog notes**

Add:

```markdown
## 0.1.1

- Prepared a privacy-safe metadata release candidate pending npm account email verification.
- Hardened GitHub verification and staged-publishing workflows and added Dependabot update checks.
- No runtime or public API changes.
```

- [ ] **Step 3: Verify metadata-only scope**

Run:

```bash
node -e 'const p=require("./package.json"); const l=require("./package-lock.json"); if (p.version!=="0.1.1" || l.version!=="0.1.1" || l.packages[""].version!=="0.1.1") process.exit(1)'
git diff -- package.json package-lock.json
```

Expected: only the three version fields change.

### Task 5: Verify, scan, report, and commit

**Files:**
- Modify: `reports/2026-07-20.md`
- Create: `docs/superpowers/plans/2026-07-20-security-parity-rollout.md`

**Interfaces:**
- Consumes: Tasks 1-4 and fresh local/remote checks.
- Produces: verified local commits ready for PR.

- [ ] **Step 1: Parse repository YAML**

Run Ruby Psych parsing for `.github/workflows/verify.yml`, `.github/workflows/publish.yml`, and `.github/dependabot.yml`.

- [ ] **Step 2: Run package gates**

Run:

```bash
npm run verify:full
npm run test:consumer
npm --cache /tmp/comins-table-parity-npm-cache pack --dry-run --json
npm audit --json
npm audit --omit=dev --json
```

Expected: all project tests/build/browser checks pass; consumer install passes; the package has no forbidden file; both audits report zero vulnerabilities.

- [ ] **Step 3: Run privacy and secret scans**

Scan the index, package list, and all reachable commits for known personal identity, unexpected email, identifying local path, private-key, npm/GitHub/provider token, auth-token assignment, and long secret-assignment patterns. Print counts only, never matched values.

- [ ] **Step 4: Extend the security report**

Append a parity-rollout section with exact local changes, commands, results, remote ruleset evidence, and unperformed npm/provider actions.

- [ ] **Step 5: Review and commit**

Run `git diff --check`, inspect the complete diff, stage only the approved files, and commit the workflow/release changes separately from the report/plan when practical.

### Task 6: Push, create the PR, verify, and merge

**Files:**
- Create temporarily: `/tmp/comins-table-security-pr.md`

**Interfaces:**
- Consumes: clean local `codex/security-hardening` and active `main-protection` ruleset.
- Produces: merged security changes on remote `main`.

- [ ] **Step 1: Reconfirm authenticated publication scope**

Run `gh auth status`, `git status -sb`, `git diff main...HEAD --stat`, and `git log main..HEAD --oneline`.

- [ ] **Step 2: Push the existing branch**

Run:

```bash
git push -u origin codex/security-hardening
```

- [ ] **Step 3: Create a ready PR**

Create a PR from `codex/security-hardening` to `main` titled `chore: harden repository security and release controls`. Its body must summarize privacy controls, workflow authority separation, Dependabot, the unpublished `0.1.1` candidate, verification, and explicit no-publish scope.

- [ ] **Step 4: Wait for required checks**

Read PR checks until `verify` succeeds. If a check fails, inspect its logs, classify the failure, fix only the cause, rerun local gates, commit, and push the correction.

- [ ] **Step 5: Merge through the protected path**

Merge the ready PR with a merge commit after checks pass. Confirm `origin/main` contains every approved commit and the package remains unpublished.

### Task 7: Apply post-merge GitHub security settings

**Files:**
- Create temporarily: `/tmp/comins-table-actions-permissions.json`
- Create temporarily: `/tmp/comins-table-selected-actions.json`
- Create temporarily: `/tmp/comins-table-codeql.json`
- Create temporarily: `/tmp/comins-table-ruleset-codeql.json`

**Interfaces:**
- Consumes: pinned workflows on remote `main` and active ruleset.
- Produces: GitHub-owned-only Actions, full-SHA enforcement, CodeQL default analysis, and CodeQL-required merges.

- [ ] **Step 1: Restrict Actions after the merge**

Set repository Actions to `enabled=true`, `allowed_actions=selected`, and `sha_pinning_required=true`. Set selected actions to `github_owned_allowed=true`, `verified_allowed=false`, and an empty `patterns_allowed` list. Read both endpoints back and verify exact equality.

- [ ] **Step 2: Enable CodeQL default setup**

PATCH `repos/kim1124/comins-table/code-scanning/default-setup` with:

```json
{
  "state": "configured",
  "query_suite": "default",
  "languages": ["javascript-typescript"]
}
```

- [ ] **Step 3: Wait for an actual successful CodeQL check**

Read CodeQL analyses, Actions runs, and `main` check runs. Select only a successful check whose GitHub App is the CodeQL/code-scanning app. Capture its exact `name` and `app.id`; do not infer them.

- [ ] **Step 4: Add the observed CodeQL check to the ruleset**

Update `main-protection` without changing its existing conditions or rules, adding the captured CodeQL context and integration ID beside `verify`. Read back and verify both required checks.

- [ ] **Step 5: Enable and verify malware alerts**

Use the authenticated GitHub repository `Settings > Advanced Security` control to enable Dependabot malware alerts if it is not already enabled. Verify the control shows enabled; do not treat ordinary Dependabot alerts as proof of this distinct feature.

### Task 8: Run the final remote and privacy audit

**Files:**
- No source changes expected.

**Interfaces:**
- Consumes: merged `main` and all post-merge settings.
- Produces: final evidence and a precise residual-risk handoff.

- [ ] **Step 1: Re-read remote controls**

Verify the ruleset, Actions permissions and selected-actions policy, CodeQL default setup, latest analysis/check conclusion, PVR/scanning statuses, open secret and Dependabot alerts, and npm environment branch policy.

- [ ] **Step 2: Re-read public privacy state**

Verify without printing values that the GitHub profile email is absent, the display name does not match the local real name, npm `0.1.0` metadata remains privacy-unsafe, and known old GitHub commit objects have the observed accessible/inaccessible status.

- [ ] **Step 3: Prove npm was not published**

Run `npm view comins-table versions dist-tags --json` and verify that only `0.1.0` is public and `latest` remains `0.1.0`.

- [ ] **Step 4: Report residual work**

Keep npm account email/2FA/trusted-publisher verification, actual `0.1.1` staging/publication, provider support removal, and local reflog cleanup visible as separate approval-gated work.
