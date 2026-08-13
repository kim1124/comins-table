# Loading and Empty Remote API Example Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [x]`) syntax for tracking.

**Goal:** Make the Loading / Empty Playground route demonstrate real DummyJSON-backed initial, refetch, empty, ready, and Lazy Load states using the Infinite Scroll example's endpoint and row mapping contract.

**Architecture:** Add one example-only DummyJSON adapter that builds `/users` URLs and maps complete remote responses into `PersonRow`. Keep request lifecycle inside each feature: Infinite Scroll retains append semantics, while Loading / Empty owns replace-mode requests, presentation state, cancellation, and stale-response protection.

**Tech Stack:** React 19, TypeScript, Fetch API, AbortController, Vite Playground, Playwright, Vitest

## Global Constraints

- Use `https://dummyjson.com/users` with selected fields `id,firstName,lastName,age,email,role`.
- Empty is demonstrated by an out-of-range remote request, not direct local array clearing.
- Initial requests clear rows and show five skeleton Rows; refetch requests retain rows and show the overlay.
- Aborted or stale responses cannot replace newer controlled rows or loading state.
- Preserve public Comins Table APIs and Infinite Scroll append semantics.
- Add no dependency, request library, built-in retry UI, release, push, or Pull Request.
- Existing unrelated and previously approved worktree changes remain untouched.

---

### Task 1: Shared DummyJSON user adapter

**Files:**
- Create: `example/src/data/dummyUsers.ts`
- Modify: `example/src/features/InfiniteScrollFeature.tsx`
- Test: `test/playwright/specs/infinite-scroll.spec.ts`

**Interfaces:**
- Produces: `buildDummyUsersUrl(offset: number, limit: number, delay?: number): string`
- Produces: `toPersonRows(response: DummyUsersResponse): PersonRow[]`
- Consumes: `PersonRow` from `example/src/fixtures/people.ts`

- [x] **Step 1: Strengthen the existing Infinite Scroll boundary test**

In `infinite-scroll.spec.ts`, record the first request URL and assert its pathname and selected field query. This test must catch a helper extraction that changes the endpoint, `skip`, `limit`, or `select` contract.

```ts
const requestUrls: URL[] = [];
requestUrls.push(new URL(route.request().url()));

expect(requestUrls[0]?.pathname).toBe("/users");
expect(requestUrls[0]?.searchParams.get("skip")).toBe("0");
expect(requestUrls[0]?.searchParams.get("limit")).toBe("40");
expect(requestUrls[0]?.searchParams.get("select")).toBe(
  "id,firstName,lastName,age,email,role",
);
```

- [x] **Step 2: Run the focused test before extraction**

Run: `npm run test:e2e -- test/playwright/specs/infinite-scroll.spec.ts --workers=1`

Expected: PASS as a characterization of the currently shipped Infinite Scroll request boundary.

- [x] **Step 3: Create the shared adapter and migrate Infinite Scroll**

Create `dummyUsers.ts` with complete remote types and pure helpers:

```ts
export type DummyUser = {
  age: number;
  email: string;
  firstName: string;
  id: number;
  lastName: string;
  role?: string;
};

export type DummyUsersResponse = {
  limit: number;
  skip: number;
  total: number;
  users: DummyUser[];
};

export function buildDummyUsersUrl(offset: number, limit: number, delay = 500) {
  const params = new URLSearchParams({
    delay: String(delay),
    limit: String(limit),
    select: "id,firstName,lastName,age,email,role",
    skip: String(offset),
  });
  return `https://dummyjson.com/users?${params.toString()}`;
}

export function toPersonRows(response: DummyUsersResponse): PersonRow[] {
  return response.users.map((user) => ({
    active: user.id % 2 === 0,
    age: user.age,
    id: `dummy-${user.id}`,
    locked: user.email,
    name: `${user.firstName} ${user.lastName}`,
    role: user.role ?? (user.id % 2 === 0 ? "Owner" : "Viewer"),
  }));
}
```

Remove the duplicated response types, URL builder, and mapper from `InfiniteScrollFeature.tsx`. Import these helpers and keep all request guards and append state unchanged.

- [x] **Step 4: Run the Infinite Scroll regression**

Run: `npm run test:e2e -- test/playwright/specs/infinite-scroll.spec.ts --workers=1`

Expected: PASS with `[0, 40, 0]` request offsets, mapped `dummy-*` Rows, and unchanged exhaustion behavior.

---

### Task 2: Remote Loading / Empty primary sample

**Files:**
- Modify: `test/playwright/specs/loading-empty-state.spec.ts`
- Modify: `example/src/features/LoadingStateFeature.tsx`

**Interfaces:**
- Consumes: `buildDummyUsersUrl` and `toPersonRows` from Task 1
- Produces: user-triggered modes `initial`, `refetch`, `empty`, and `ready` backed by controlled remote rows

- [x] **Step 1: Replace the local-fixture Playwright setup with a remote boundary fixture**

Intercept `https://dummyjson.com/users*`. Return 30 complete users for `skip=0` and `users: []` for out-of-range `skip`. Delay refetch responses long enough to observe the overlay. Assert behavior, not request-mock existence:

```ts
await expect(page.getByTestId("loading-skeleton-row")).toHaveCount(5);
await expect(page.getByTestId("row-dummy-1")).toBeVisible();

await page.getByRole("button", { exact: true, name: "재조회 로딩" }).click();
await expect(page.getByTestId("row-dummy-1")).toBeVisible();
await expect(page.getByTestId("data-table-loading-overlay")).toBeVisible();

await page.getByRole("button", { exact: true, name: "빈 데이터" }).click();
await expect(page.getByTestId("data-table-empty-state")).toContainText("표시할 데이터가 없습니다.");

await page.getByRole("button", { exact: true, name: "데이터 표시" }).click();
await expect(page.getByTestId("row-dummy-1")).toBeVisible();
```

Also assert recorded offsets begin with `0`, include an out-of-range value, and return to `0`. This catches direct local Empty simulation or fixture restoration.

- [x] **Step 2: Run the primary sample test to verify RED**

Run: `npm run test:e2e -- test/playwright/specs/loading-empty-state.spec.ts --workers=1`

Expected: FAIL because current primary controls directly switch local fixture arrays and do not render `row-dummy-1`.

- [x] **Step 3: Implement replace-mode remote request lifecycle**

In `LoadingStateFeature.tsx`:

- Remove `createExampleRows`, `createRows`, `rows`, and `tableRows` local fixture derivation.
- Add controlled `rows`, `mode`, `activeRequestRef`, and `requestVersionRef`.
- Implement one `loadPrimaryRows(nextMode)` callback.
- `initial` clears rows before fetch; `refetch` retains rows; `empty` requests a safe out-of-range offset such as `10_000`; `ready` requests offset `0`.
- Set `mode` before fetch so `loading={mode === "initial" || mode === "refetch"}` drives the correct Table presentation.
- Commit only a current, non-aborted response. In `finally`, current `initial`/`refetch` requests settle to `ready`; Empty settles to `empty`.
- Mount calls `loadPrimaryRows("initial")`; cleanup aborts and increments the request version.
- Buttons call the same loader rather than mutating rows directly.

- [x] **Step 4: Run the primary sample test to verify GREEN**

Run: `npm run test:e2e -- test/playwright/specs/loading-empty-state.spec.ts --workers=1`

Expected: PASS with remote `dummy-*` Rows, observable overlay, remote Empty, and Header persistence.

---

### Task 3: Remote Lazy Load integration sample and stale-response safety

**Files:**
- Modify: `test/playwright/specs/loading-empty-state.spec.ts`
- Modify: `example/src/features/LoadingStateFeature.tsx`

**Interfaces:**
- Consumes: shared DummyJSON adapter and `CominsLazyLoadRequest`
- Produces: lower sample Data/Empty actions that remount Lazy Load with normal or out-of-range remote offset policy

- [x] **Step 1: Add failing Lazy Load and race behavior tests**

Extend the focused spec to click `원격 데이터 로드`, observe five skeleton Rows, then assert mapped `row-dummy-1`. Click `원격 빈 결과` and assert the empty state after a recorded out-of-range request.

Add a race sequence where the out-of-range response is delayed, the Data action is selected immediately afterward, and the final visible state remains remote data. This catches stale Empty overwriting a newer Data response.

- [x] **Step 2: Run the focused test to verify RED**

Run: `npm run test:e2e -- test/playwright/specs/loading-empty-state.spec.ts --workers=1`

Expected: FAIL because the lower sample currently waits on `setTimeout` and maps local fixtures without a network request.

- [x] **Step 3: Replace the timer-backed callback**

Update `loadRemoteRows` to call `fetch(buildDummyUsersUrl(remoteOffset, request.limit, 500), { signal: request.signal })`, parse `DummyUsersResponse`, and map through `toPersonRows`. Use `10_000` for Empty and `request.offset` for Data. Keep `remoteKey` remounting so the Lazy Load callback is emitted for each selected scenario.

Use a ref for the selected remote intent so the callback reads the current scenario without capturing an obsolete value. Check `request.signal.aborted` and an intent version before committing rows or loading state.

- [x] **Step 4: Run the focused test to verify GREEN**

Run: `npm run test:e2e -- test/playwright/specs/loading-empty-state.spec.ts --workers=1`

Expected: PASS for primary and lower samples, including stale-response protection.

---

### Task 4: Playground copy, documentation, and localization state

**Files:**
- Modify: `example/src/docs/codeSamples.ts`
- Modify: `example/src/docs/docsRoutes.tsx`
- Modify: `example/src/features/featureRegistry.tsx`
- Modify: `docs/user/13-loading-empty.md`
- Modify: `docs/ko/13-loading-empty.md`
- Modify: `docs/user/12-playground.md`
- Modify: `docs/ko/12-playground.md`
- Modify: `test/playwright/specs/playground-localization.spec.ts`
- Test: `test/user-docs.test.ts`

**Interfaces:**
- Consumes: final Loading / Empty behavior from Tasks 2 and 3
- Produces: public English/Korean guidance that describes consumer-owned fetch state without naming competitor behavior

- [x] **Step 1: Update localization Playwright interception before production copy**

Move the Loading route into the existing remote-loading localization test or add the same complete DummyJSON route there. Assert loaded `row-dummy-1` remains visible and the feature mount ID remains stable after switching Korean to English.

- [x] **Step 2: Run localization to verify RED**

Run: `npm run test:e2e -- test/playwright/specs/playground-localization.spec.ts --workers=1`

Expected: FAIL until the test's old local `row-a` assumption and route interception are aligned with remote behavior.

- [x] **Step 3: Update user-facing examples and copy**

- Change the Loading code sample to show application-owned `fetch`, controlled rows, and `loading` selection.
- State that the Playground uses the same remote `/users` datasource as Infinite Scroll for initial/refetch/empty demonstration.
- Keep the public API explanation generic: consumers may use their own endpoint.
- Update English and Korean route summaries and feature metadata from local “30 Row data” wording to remote mapped Row wording.

- [x] **Step 4: Run documentation and localization checks**

Run: `npm run test:run -- test/user-docs.test.ts`

Expected: PASS.

Run: `npm run test:e2e -- test/playwright/specs/playground-localization.spec.ts --workers=1`

Expected: PASS with stable mount ID and retained remote row.

---

### Task 5: Integrated verification and report

**Files:**
- Modify: `reports/2026-08-12.md`

**Interfaces:**
- Consumes: completed implementation and focused evidence from Tasks 1–4
- Produces: current local verification record; no remote publication

- [x] **Step 1: Run affected browser specs together**

Run:

```bash
npm run test:e2e -- \
  test/playwright/specs/loading-empty-state.spec.ts \
  test/playwright/specs/infinite-scroll.spec.ts \
  test/playwright/specs/playground-localization.spec.ts \
  --workers=1
```

Expected: PASS.

- [x] **Step 2: Run the repository verification gate**

Run: `npm run verify`

Expected: hygiene, security, license, lint, typecheck, Vitest, and build all PASS.

- [x] **Step 3: Run the full Playground E2E gate once**

Run: `npm run test:e2e -- --workers=1`

Expected: all tests PASS.

- [x] **Step 4: Record evidence and inspect the final diff**

Append the request, changed files, RED/GREEN evidence, executed checks, and residual external-network risk to `reports/2026-08-12.md`.

Run: `git diff --check`

Expected: exit code `0`.

Run: `git status --short --branch`

Expected: only the current approved worktree changes plus the Loading / Empty API example changes; `output/` remains preserved and untracked.
