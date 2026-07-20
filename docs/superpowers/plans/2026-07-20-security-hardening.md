# Repository Security and Privacy Hardening Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Apply the locally actionable repository and credential protections defined by the approved security-hardening design.

**Architecture:** Harden repository entry points without changing library behavior: immutable GitHub Action references protect CI execution, ignore rules prevent common secret files from being staged, and `SECURITY.md` defines the operational reporting contract. Remove only the confirmed-invalid npm token from the user configuration, then record fresh verification and unresolved provider-side risks.

**Tech Stack:** GitHub Actions YAML, Git ignore rules, Markdown, npm 11, Node.js 24, Vitest, TypeScript, Vite.

## Global Constraints

- Do not add or upgrade dependencies.
- Do not change the Comins Table runtime, public API, package version, or package contents.
- Do not push, publish, tag, create a release, or mutate remote GitHub settings.
- Do not rewrite historical reports or Git history.
- Do not print authentication-token values.
- Use only the official action SHAs resolved from the `v6` refs on 2026-07-20.

---

## File map

| File | Responsibility |
| --- | --- |
| `.github/workflows/verify.yml` | Run immutable verification dependencies. |
| `.github/workflows/publish.yml` | Run immutable stage-publishing dependencies. |
| `.gitignore` | Block accidental staging of local environment and npm credential files. |
| `SECURITY.md` | Define supported versions, private intake, response expectations, and release controls. |
| `reports/2026-07-20.md` | Record executed security changes, evidence, and residual risks. |

### Task 1: Harden repository configuration

**Files:**
- Modify: `.github/workflows/verify.yml`
- Modify: `.github/workflows/publish.yml`
- Modify: `.gitignore`
- Modify: `SECURITY.md`

**Interfaces:**
- Consumes: official `actions/checkout` and `actions/setup-node` `v6` tag refs resolved through the GitHub API.
- Produces: immutable CI action references, local secret-file exclusions, and the public vulnerability-reporting contract.

- [ ] **Step 1: Preserve the pre-change evidence**

Run:

```bash
rg -n 'uses:\s+actions/(checkout|setup-node)@v[0-9]+' .github/workflows
git check-ignore .env .env.local .npmrc
rg -n 'security/advisories/new' SECURITY.md
```

Expected: four mutable `@v6` references; the three secret-file candidates are not ignored; the advisory link is absent.

- [ ] **Step 2: Pin GitHub Actions**

Replace both workflow references with:

```yaml
- uses: actions/checkout@df4cb1c069e1874edd31b4311f1884172cec0e10 # v6
- uses: actions/setup-node@249970729cb0ef3589644e2896645e5dc5ba9c38 # v6
```

Do not change workflow permissions, triggers, environment, or commands.

- [ ] **Step 3: Add local secret-file exclusions**

Append this block to `.gitignore`:

```gitignore

# Local credentials and environment overrides
.env
.env.*
!.env.example
.npmrc
```

- [ ] **Step 4: Replace bootstrap security guidance**

Update `SECURITY.md` to contain:

- a `0.1.x` supported-version row;
- the private intake URL `https://github.com/kim1124/comins-table/security/advisories/new`;
- a three-business-day initial acknowledgement target;
- updates at least every seven days while active;
- severity-dependent remediation and coordinated disclosure language;
- PVR, scanning, 2FA, trusted-publishing, exact-workflow, and no-token release controls.

- [ ] **Step 5: Verify and commit repository controls**

Run:

```bash
if rg -n 'uses:\s+actions/(checkout|setup-node)@v[0-9]+' .github/workflows; then exit 1; fi
rg -n 'actions/checkout@df4cb1c069e1874edd31b4311f1884172cec0e10|actions/setup-node@249970729cb0ef3589644e2896645e5dc5ba9c38' .github/workflows
git check-ignore .env .env.local .npmrc
git check-ignore -q .env.example && exit 1 || true
ruby -e 'require "yaml"; ARGV.each { |file| YAML.parse_file(file) }' .github/workflows/verify.yml .github/workflows/publish.yml
git diff --check
```

Expected: no mutable references; two occurrences of each approved SHA; the three secret files are ignored; `.env.example` is not ignored; both YAML files parse; the diff check passes.

Commit:

```bash
git add .github/workflows/verify.yml .github/workflows/publish.yml .gitignore SECURITY.md
git commit -m "chore: harden repository security controls"
```

### Task 2: Remove the invalid user-level npm token

**Files:**
- Modify outside repository: `~/.npmrc`

**Interfaces:**
- Consumes: the confirmed-invalid `//registry.npmjs.org/:_authToken` user setting.
- Produces: a user npm configuration with no registry authentication-token key.

- [ ] **Step 1: Inspect key names without exposing values**

Run:

```bash
awk -F= '{ print $1 }' ~/.npmrc
```

Expected: the registry `_authToken` key is present; no value is printed.

- [ ] **Step 2: Delete only the invalid token setting**

Run:

```bash
npm config delete '//registry.npmjs.org/:_authToken'
```

Expected: command exits successfully and does not create a replacement credential.

- [ ] **Step 3: Verify key removal**

Run:

```bash
if test -f ~/.npmrc; then
  awk -F= '$1 == "//registry.npmjs.org/:_authToken" { found=1 } END { exit found ? 1 : 0 }' ~/.npmrc
fi
```

Expected: exit code 0; the token key is absent.

### Task 3: Run security verification and record the result

**Files:**
- Create: `reports/2026-07-20.md`

**Interfaces:**
- Consumes: Task 1 repository controls and Task 2 credential state.
- Produces: a durable, evidence-based security work record.

- [ ] **Step 1: Scan tracked and reachable repository data**

Run the existing privacy-audit patterns against current tracked files and reachable commit text. Include personal-email, real-name, identifying local-path, npm-token, GitHub-token, private-key, and non-placeholder email patterns. Do not scan ignored dependency or build-output directories.

Expected: zero matching tracked files and zero matching reachable commits.

- [ ] **Step 2: Run dependency and package verification**

Run:

```bash
npm audit --json
npm run verify
npm --cache /tmp/comins-table-security-npm-cache pack --dry-run --json
```

Expected: zero audit vulnerabilities; 13 Vitest files and 105 tests pass; production build exits 0; the dry-run package excludes `.npmrc`, `.env*`, workflows, reports, and source files.

- [ ] **Step 3: Write the security work record**

Create `reports/2026-07-20.md` with work time, summary, changed files, exact verification outcomes, and residual risks. Keep historical GitHub object retention, npm `0.1.0` metadata, account 2FA checks, CodeQL, Actions policy, and branch rulesets visible as unresolved external work.

- [ ] **Step 4: Run the final gate and commit**

Run:

```bash
git diff --check
git status -sb
git log -5 --oneline --decorate
```

Expected: only the report and plan remain uncommitted before the final commit; no whitespace errors.

Commit:

```bash
git add reports/2026-07-20.md docs/superpowers/plans/2026-07-20-security-hardening.md
git commit -m "docs: record security hardening verification"
```
