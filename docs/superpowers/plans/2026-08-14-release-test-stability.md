# Release Test Stability Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remove the Lazy Load skeleton observation race, merge the deterministic test through protected CI, publish `comins-table@0.1.6`, close the release with public evidence, and then audit broader test guidance without mixing audit recommendations into the release fix.

**Architecture:** The release fix is test-only. A deferred promise in the Playwright route handler holds the first five-row Lazy Load response until the test observes the skeleton state, then the response is released and the existing ready, empty, and stale-response assertions continue. Release publication remains owned by the protected GitHub workflow and npm staged-review approval; the post-release audit is read-only.

**Tech Stack:** TypeScript, Playwright, Vitest, Vite, GitHub Actions, npm trusted publishing, Gitleaks.

## Global Constraints

- Keep package version exactly `0.1.6`.
- Do not modify application code, public API, package dependencies, or package contents for the release fix.
- Preserve the existing out-of-range empty and stale-response behavior assertions.
- Do not bypass required GitHub checks, the `npm` environment, trusted publishing, npm staged review, or maintainer 2FA.
- Preserve user-owned changes in the primary checkout.
- Keep the post-release test-guidance audit read-only unless a separate remediation is approved.

---

### Task 1: Prove And Remove The Skeleton Observation Race

**Files:**
- Modify: `test/playwright/specs/loading-empty-state.spec.ts:78-138`

**Interfaces:**
- Consumes: Playwright `page.route`, the existing `dummyJsonUrl`, and the Lazy Load example controls.
- Produces: one deterministic browser contract with no exported runtime interface.

- [ ] **Step 1: Reconfirm the RED failure mode**

In a disposable, uncommitted diagnostic edit, let the first `limit=5`,
`skip=0` response complete and require `row-dummy-1` before checking the
skeleton count. This forces the same completed-transition state reported by
workflow `31761151164`.

Run:

```bash
npm run test:e2e -- test/playwright/specs/loading-empty-state.spec.ts --workers=1 --grep "lazy load integration"
```

Expected: FAIL at the skeleton count with expected `5`, received `0`.
Restore the diagnostic edit before Step 2.

- [ ] **Step 2: Add the deterministic request gate**

Create one deferred promise inside the Lazy Load test:

```ts
let releaseFirstLazyResponse = () => {};
const firstLazyResponse = new Promise<void>((resolve) => {
  releaseFirstLazyResponse = resolve;
});
```

After recording the offset, gate only the first five-row data response:

```ts
const isFirstLazyDataRequest = limit === 5
  && skip === 0
  && lazyRequestOffsets.length === 1;

if (isFirstLazyDataRequest) {
  await firstLazyResponse;
} else {
  await new Promise((resolve) => {
    setTimeout(resolve, limit === 5 && skip >= 10_000 ? 220 : 80);
  });
}
```

Release the route in a `finally` block so a failed assertion cannot leave a
pending request behind:

```ts
try {
  await expect(lazyViewport.getByTestId("loading-skeleton-row")).toHaveCount(5);
} finally {
  releaseFirstLazyResponse();
}
```

- [ ] **Step 3: Verify GREEN repeatedly**

Run:

```bash
npm run test:e2e -- test/playwright/specs/loading-empty-state.spec.ts --workers=1 --repeat-each=10
```

Expected: 20/20 passed.

- [ ] **Step 4: Run the complete affected gate**

Run:

```bash
npm run verify:full
git diff --check
```

Expected: security 17/17, license 27/27, Vitest 288 total with only the
intentional README metadata skip where applicable, TypeScript/build passed,
Playwright 117/117 passed, and no whitespace errors.

- [ ] **Step 5: Record release-failure evidence**

Append to `reports/2026-08-14.md`:

- failed workflow `31761151164` and exact failing assertion;
- confirmation that `stage` was skipped and npm remained at `0.1.5`;
- RED/GREEN evidence and the test-only change;
- focused and full verification results;
- remaining npm approval and real Safari boundaries.

Run:

```bash
npm run check:hygiene
git diff --check
```

Expected: both commands pass.

- [ ] **Step 6: Commit**

```bash
git add test/playwright/specs/loading-empty-state.spec.ts reports/2026-08-14.md docs/superpowers/plans/2026-08-14-release-test-stability.md
git commit -m "test: stabilize lazy loading release gate"
```

Expected: public identity hooks and staged-content checks pass.

### Task 2: Protected Integration

**Files:**
- No additional source files.

**Interfaces:**
- Consumes: branch `codex/release-test-stability` and the Task 1 commit.
- Produces: a protected merge commit on `main`.

- [ ] **Step 1: Push the dedicated branch**

```bash
git push -u origin codex/release-test-stability
```

- [ ] **Step 2: Open a ready PR**

Create a PR targeting `main` that records the failed release run, root cause,
test-only diff, and exact local evidence.

- [ ] **Step 3: Wait for required CI**

Require all jobs, including sensitive-data and `verify:full`, to conclude
success. Do not re-run or merge around a real failure.

- [ ] **Step 4: Merge and reconcile main**

Merge with the expected head SHA, fetch `origin/main`, assert the merge tree,
and fast-forward the primary local `main` only if it preserves its unrelated
working changes.

### Task 3: Protected `0.1.6` Publication And Closure

**Files:**
- Modify after public publication: `reports/2026-08-14.md`

**Interfaces:**
- Consumes: merged `main`, `.github/workflows/publish.yml`, GitHub `npm`
  environment, npm trusted publisher, and maintainer staged-review approval.
- Produces: public `comins-table@0.1.6` plus recorded closure evidence.

- [ ] **Step 1: Reconfirm pre-publication state**

Verify `main` SHA, package version `0.1.6`, npm `latest=0.1.5`, and absence of
public `0.1.6`.

- [ ] **Step 2: Dispatch the protected workflow**

```bash
gh workflow run publish.yml --ref main -f version=0.1.6
```

- [ ] **Step 3: Track verify, artifact, consumer, and staging jobs**

Require `verify-and-pack` success and `stage` success. If an environment or npm
staged-review approval is pending, report the exact trusted provider URL and
wait for the maintainer; do not request an OTP in chat.

- [ ] **Step 4: Verify public registry evidence**

After approval, verify:

- exact version and `latest` dist-tag equal `0.1.6`;
- registry shasum and integrity;
- provenance and registry signature metadata;
- exact public tarball matches the workflow artifact where evidence is
  available;
- isolated consumer imports root, `/core`, `/clipboard`, `/selection`, and
  `styles.css`;
- source merge SHA and publish workflow head SHA match;
- no unintended Git tag or GitHub Release was created.

- [ ] **Step 5: Record and integrate closure evidence**

Append closure time and evidence to `reports/2026-08-14.md`, run focused hygiene
and documentation checks, then commit, push, PR, wait for CI, and merge the
evidence-only change. Reconcile local and remote `main` without overwriting
unrelated work.

### Task 4: Read-only Test Guidance Audit

**Files:**
- Inspect: `AGENTS.md`, `.github/workflows/*.yml`, `playwright.config.ts`,
  `test/playwright/**/*.ts`, package scripts, and directly referenced testing
  guidance.
- Produce locally: an evidence-backed report in the user response; do not
  modify policy or tests in this task.

**Interfaces:**
- Consumes: current repository guidance and test suite.
- Produces: categorized findings and a separately approvable remediation scope.

- [ ] **Step 1: Inventory timing and retry patterns**

Use `rg` to locate `waitForTimeout`, `setTimeout`, explicit timeouts, retries,
external network use, fixed worker assumptions, and weak/no-op assertions.

- [ ] **Step 2: Inspect each candidate in context**

Classify each occurrence as deterministic control, acceptable stabilization,
confirmed race, or unverified risk. Do not treat every fixed wait as defective.

- [ ] **Step 3: Compare guidance with executable gates**

Check whether focused/full/performance selection, external API isolation,
condition-based waiting, retry policy, and release fail-closed requirements are
stated consistently across instructions and workflows.

- [ ] **Step 4: Report findings**

Report confirmed issues first, then recommendations, residual risks, and a
minimal remediation proposal. Keep release evidence and future policy changes
separate.
