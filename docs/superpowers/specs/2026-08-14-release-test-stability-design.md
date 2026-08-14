# Release Test Stability Design

## Goal

Make the Loading/Lazy Load browser contract deterministic so the protected
`0.1.6` release workflow can distinguish a real product regression from a
missed transient loading frame. After the release closes, audit the broader
test guidance and suite for the same timing-dependent pattern.

## Confirmed Failure

Publish workflow run `31761151164` used `main` commit
`c04acb83bde83815b0730e68135261ed7fc47f57`. Security, license, unit, type,
and build gates passed. The browser suite finished 116/117 because the Lazy
Load test released its first mocked response after a fixed 80 ms and then
required Playwright to observe five skeleton rows. The response could finish
before Playwright's first observation, leaving zero skeleton rows for the
entire assertion timeout.

The same test passed in PR CI and in five focused local repetitions. That
combination demonstrates an observation race in the test contract rather than
a source-tree difference between PR and release validation.

## Considered Approaches

### A. Re-run the failed workflow unchanged

This may pass but leaves the release gate nondeterministic and can mask the
same defect in later releases. Reject.

### B. Increase the fixed mock delay

A longer delay reduces the failure probability but remains dependent on CI
scheduling and machine load. Reject.

### C. Gate the first mocked response on the skeleton assertion

Hold only the first Lazy Load success response until the test has observed the
five skeleton rows, then release it and continue the existing data, empty, and
stale-response assertions. This directly models the state transition under
test and removes wall-clock scheduling from the contract. Adopt.

## Design

- Modify only `test/playwright/specs/loading-empty-state.spec.ts` for the
  release unblock. Do not change application code, public APIs, package
  contents, dependencies, or package version.
- Add a test-local deferred gate for the first `limit=5`, `skip=0` Lazy Load
  response. The route handler records the request and waits on the gate.
- After clicking `Load remote data`, assert that five skeleton rows are
  rendered while the request is pending. Release the response only after this
  assertion, then require the mapped row to become visible.
- Preserve the existing out-of-range empty response and stale-response
  protection assertions. Their controlled ordering remains unchanged.
- Prove the former contract is vulnerable by running a temporary RED variant
  that releases the first response immediately and observing the skeleton
  assertion fail. Restore the deterministic gate and verify GREEN.

## Verification And Release Flow

1. Run the focused Loading/Lazy Load spec repeatedly with one worker.
2. Run `npm run verify:full` once on the completed test change.
3. Commit with a public noreply identity, push a dedicated branch, create a PR,
   and merge only after required CI succeeds.
4. Re-dispatch `.github/workflows/publish.yml` for exact version `0.1.6` from
   the updated `main`.
5. Track verification, exact artifact scanning, consumer installation, and npm
   staging. Maintainer npm 2FA remains required for public publication.
6. After publication, verify registry version/dist-tag, integrity, provenance,
   public consumer imports, source/workflow SHAs, and release state before
   declaring closure.

## Follow-up Test Guidance Audit

The post-release audit is read-only unless a separate remediation is approved.
It will inspect project guidance, Playwright specs, workflow gates, and helper
patterns for:

- fixed sleeps used to observe transient UI states;
- assertions that can miss an already-completed transition;
- tests coupled to external timing instead of route-controlled state;
- retries or timeouts that hide nondeterminism;
- no-op or weak assertions that do not prove the intended interaction;
- inconsistent focused/full/performance gate selection.

The audit report will separate confirmed defects, improvement recommendations,
and acceptable timing waits, with file-level evidence and proposed guidance
wording. It will not modify test policy or product code automatically.

## Acceptance Criteria

- The first Lazy Load response cannot complete before the skeleton assertion.
- The existing row mapping, empty response, and stale-response behavior remains
  covered.
- Focused repetitions and the full gate pass with no product-code change.
- The protected release workflow reaches npm staging from the reviewed `main`.
- Public release closure is reported only after registry and consumer evidence
  succeeds.
- The subsequent test-guidance audit is delivered separately from the release
  fix.
