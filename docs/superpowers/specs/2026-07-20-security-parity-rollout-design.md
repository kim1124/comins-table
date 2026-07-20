# Grid Layout Security Parity Rollout Design

## Purpose

Bring `comins-table` to the same repository, CI, release, and GitHub security posture being implemented for `comins-grid-layout`, while preserving Table's runtime and public API. The rollout may write GitHub repository settings, push the existing `codex/security-hardening` branch, create and merge a pull request, and enable post-merge analysis. It must not publish, stage, unpublish, tag, or create a GitHub Release.

## Existing Table Controls

The first local hardening phase already provides:

- full-SHA pins for `actions/checkout@v6` and `actions/setup-node@v6`;
- ignore rules for `.env`, `.env.*`, and `.npmrc`;
- an operational `SECURITY.md` with private reporting and release controls;
- removal of the invalid user-level npm token;
- zero current tracked/reachable privacy findings and zero npm audit findings at the time of that phase.

This rollout extends those controls instead of replacing or weakening them.

## Table-Specific Scope

### Included local changes

- Set `persist-credentials: false` on every source checkout.
- Split `.github/workflows/publish.yml` into an unprivileged `verify-and-pack` job and a minimal environment-gated `stage` job.
- Pin `actions/upload-artifact@v4` and `actions/download-artifact@v4` to their verified full SHAs.
- Add weekly review-only Dependabot update PRs for npm and GitHub Actions.
- Ignore common local private-key containers while allowing sanitized example configuration files.
- Prepare `comins-table@0.1.1` as a privacy-safe metadata release candidate in `package.json`, `package-lock.json`, and `CHANGELOG.md`.
- Extend the existing 2026-07-20 report with local and remote verification evidence.

### Explicitly excluded Grid Layout change

The Grid Layout patch escapes consumer-controlled widget IDs before interpolating them into a CSS selector. Table does not interpolate row, tree, or column IDs into `querySelector()` or `matches()` calls; its dynamic IDs are React attribute values and map keys. No equivalent runtime code change or regression test is required.

## Publication Workflow Architecture

```text
manual workflow_dispatch on main
  -> verify-and-pack (contents: read)
       -> checkout without persisted credentials
       -> exact version and existing package checks
       -> npm ci and Chromium install
       -> verify:full, consumer smoke test, dry-run package inspection
       -> npm pack and one-day immutable workflow artifact
  -> GitHub npm environment approval
  -> stage (contents: read, id-token: write)
       -> no source checkout
       -> download only the verified tarball artifact
       -> npm stage publish <tarball>
  -> stop: this rollout does not invoke the workflow or approve an npm stage
```

Only the `stage` job receives the `npm` environment and OIDC permission. The job does not install project dependencies or rebuild source. Final npm publication remains a separate maintainer-approved operation after account email, 2FA, trusted-publisher identity, staged tarball, metadata, and provenance checks.

## GitHub Rollout

### Default-branch ruleset

Create an active `main-protection` branch ruleset targeting `~DEFAULT_BRANCH` with no bypass actor. Require:

- pull requests with zero mandatory approving reviews;
- the GitHub Actions `verify` status check;
- a branch current with `main` before merge;
- deletion protection;
- non-fast-forward protection.

This matches the active `comins-layout` ruleset and preserves single-maintainer operation while blocking direct, unverified default-branch changes.

### Pull request and merge

After local verification, push `codex/security-hardening`, create a ready pull request to `main`, wait for required checks, review the resulting diff, and merge without publishing. The PR includes the earlier local privacy-hardening commits because they have not yet reached `origin/main`.

### Post-merge Actions policy

After the pinned workflows are present on `main`:

- keep GitHub Actions enabled;
- change `allowed_actions` from `all` to `selected`;
- allow GitHub-owned actions only;
- disallow all verified third-party creators and additional patterns;
- require every action to use a full-length commit SHA.

### CodeQL and malware alerts

Enable CodeQL default setup for `javascript-typescript` using the default query suite. Wait for the first analysis, identify its exact successful check context and GitHub App integration ID, and only then add it to the `main-protection` required checks. Do not guess a check name.

Dependabot alerts and security updates are already enabled. Enable Dependabot malware alerts through the GitHub security settings if the repository-specific UI control is available; the public REST repository object does not expose a dedicated malware-alert flag.

## Release Candidate Contract

`0.1.1` is a metadata and security-process candidate only:

- no runtime, public API, type, CSS, or browser behavior change;
- no claim that the version is already staged or published;
- no `latest` mutation;
- no tag or GitHub Release;
- publication remains blocked until the npm account uses a verified privacy-safe email and its 2FA/trusted-publisher settings are revalidated.

The immutable `0.1.0` registry metadata and provider-retained GitHub objects remain support/removal matters. This rollout does not create a duplicate support request or perform destructive history cleanup.

## Verification

- Parse both workflow files and `.github/dependabot.yml` as YAML.
- Assert that every external action uses the four approved full SHAs and every checkout disables credential persistence.
- Assert that only `stage` has `environment: npm` and `id-token: write`.
- Run `npm run verify:full`, `npm run test:consumer`, and `npm pack --dry-run --json`.
- Run `npm audit --json` and `npm audit --omit=dev --json`.
- Scan the index, package file list, and all reachable commits for known personal identity, non-placeholder email, local absolute path, private-key, provider-token, npm-token, and long secret-assignment patterns without printing secret values.
- Verify package and lockfile root versions are exactly `0.1.1`.
- Verify the remote ruleset, PR checks, merge result, Actions policy, CodeQL analysis, open alerts, public-profile privacy booleans, npm public metadata booleans, and known old-object reachability.

## Residual Boundaries

- No npm stage or publication is executed.
- npm account email, 2FA, trusted-publisher, and publishing-access settings require a fresh authenticated npm session or web confirmation.
- Existing `0.1.0` metadata cannot be rewritten by this repository change.
- GitHub and npm support communications remain separate representational actions and require confirmation of the exact submitted content.
- Local reflog cleanup remains excluded because it is destructive and local retention was previously accepted.
