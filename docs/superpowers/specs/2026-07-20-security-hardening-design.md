# Repository Security and Privacy Hardening Design

## Goal

Reduce the remaining locally actionable security and privacy risks without changing the Comins Table runtime API, publishing a package, or mutating the remote GitHub repository.

## Confirmed scope

This delivery contains four local changes:

1. Pin every first-party GitHub Action used by the repository to the full commit SHA currently referenced by its approved `v6` tag.
2. Prevent common local secret files from being accidentally committed.
3. Replace the bootstrap-era security policy with an operational vulnerability-reporting and release-control policy.
4. Remove the invalid npm authentication token from the maintainer's user-level npm configuration.

The work records the current privacy state but does not rewrite historical reports. Old GitHub commit objects and the published `comins-table@0.1.0` registry metadata cannot be removed by a local repository change.

## Repository changes

### GitHub Actions supply-chain protection

Both `.github/workflows/verify.yml` and `.github/workflows/publish.yml` will use these immutable references:

- `actions/checkout@df4cb1c069e1874edd31b4311f1884172cec0e10` with a `# v6` maintenance comment.
- `actions/setup-node@249970729cb0ef3589644e2896645e5dc5ba9c38` with a `# v6` maintenance comment.

The SHAs were resolved from the official `actions/checkout` and `actions/setup-node` GitHub tag refs on 2026-07-20. Workflow permissions, triggers, commands, npm trusted-publishing flow, and package behavior remain unchanged.

### Accidental-secret prevention

`.gitignore` will ignore `.env`, `.env.*`, and `.npmrc`. `!.env.example` remains available for an intentionally sanitized template. This is a preventive control only; it does not replace secret scanning or review of staged changes.

### Vulnerability reporting policy

`SECURITY.md` will:

- declare `0.1.x` as the supported release line;
- link directly to GitHub's private advisory intake page;
- target initial acknowledgement within three business days and status updates at least every seven days while a report is active;
- retain severity-dependent remediation timing rather than promise a fixed patch deadline;
- state the required trusted-publishing, PVR, scanning, and maintainer-2FA controls as ongoing release policy.

No public email address or maintainer real name will be introduced.

### User-level npm credential cleanup

The invalid `//registry.npmjs.org/:_authToken` entry will be removed with `npm config delete`. No replacement token will be created. The file will be checked afterward by key name only so its value is never printed.

## Verification design

The delivery is accepted only when all of the following hold:

- no workflow contains `actions/checkout@v*` or `actions/setup-node@v*`;
- every workflow action SHA matches the two resolved official refs;
- Git ignores `.env`, `.env.local`, and `.npmrc`, but not `.env.example`;
- workflow YAML parses successfully;
- tracked files and reachable commit text contain none of the known personal email, real-name, local-path, npm-token, GitHub-token, or private-key patterns used in the privacy audit;
- `npm audit --json` reports zero vulnerabilities;
- `npm run verify` passes;
- `npm pack --dry-run --json` excludes secret/config files and includes only the intended public package contents;
- `git diff --check` passes.

The security work record will be written to `reports/2026-07-20.md` with executed results and residual risks.

## Explicit exclusions and residual risks

- No push, repository setting mutation, CodeQL enablement, ruleset creation, publication, tag, or GitHub Release.
- No history rewrite or local reflog garbage collection.
- No duplicate npm Support request and no npm package mutation.
- GitHub account 2FA/recovery settings and npm account 2FA remain account-level checks.
- Old GitHub objects and already-published npm metadata remain subject to provider support and retention policies.
- Remote Actions SHA enforcement, CodeQL, and protected-branch rules remain the next approval-gated phase.
