import { expect, type Page, type Request as BrowserRequest } from "@playwright/test";

type Navigation = { enter: () => Promise<void>; leave: () => Promise<void> };
type Deferred = {
  request: BrowserRequest; release: () => void; settled: Promise<void>; done: boolean;
  aborted: boolean; failure: string | null; fulfillError: string | null;
};

/** 실제 Fetch 취소를 관찰하며 초기/재조회/Lazy 세 종류의 보류 요청을 검증한다. */
export async function createLoadingWorkload(page: Page) {
  const remote = /^https:\/\/dummyjson\.com\/users(?:\?|$)/u;
  const active = new Map<BrowserRequest, Deferred>();
  let records: Deferred[] = [];
  let kind: "primary" | "lazy" = "primary";
  const failed = (request: BrowserRequest) => {
    const record = active.get(request);
    if (!record) return;
    record.failure = request.failure()?.errorText ?? "unknown";
    record.aborted = record.failure.includes("ERR_ABORTED");
  };
  page.on("requestfailed", failed);
  await page.route(remote, async route => {
    const request = route.request();
    const url = new URL(request.url());
    const limit = Number(url.searchParams.get("limit") ?? 30), skip = Number(url.searchParams.get("skip") ?? 0);
    let release!: () => void, settle!: () => void;
    const gate = new Promise<void>(resolve => { release = resolve; });
    const settled = new Promise<void>(resolve => { settle = resolve; });
    const record: Deferred = { request, release, settled, done: false, aborted: false, failure: null, fulfillError: null };
    records.push(record); active.set(request, record);
    const responseKind = kind;
    await gate;
    try {
      await route.fulfill({ contentType: "application/json", json: { limit, skip, total: 100,
        users: Array.from({ length: limit === 0 ? 100 : limit }, (_, index) => {
          const id = skip + index + 1;
          return { id, firstName: responseKind === "lazy" ? "Lazy" : "Loading", lastName: String(id), age: 20 + id,
            email: `loading-${id}@example.com`, role: responseKind === "lazy" ? "user" : id % 2 === 0 ? "admin" : "user" };
        }) } });
    } catch (error) { record.fulfillError = String(error); }
    finally { record.done = true; active.delete(request); settle(); }
  });
  const pending = async () => {
    await expect.poll(() => active.size).toBe(1);
    return [...active.values()][0]!;
  };
  const fulfill = async (record: Deferred) => {
    record.release(); await record.settled;
    if (!record.aborted) expect(record.fulfillError).toBeNull();
  };
  const ready = async () => {
    const record = await pending();
    expect(record.done).toBe(false); expect(record.aborted).toBe(false);
    await expect(page.getByTestId("loading-skeleton-row")).toHaveCount(5);
    await expect(page.getByTestId("loading-state-viewport").locator("tr[data-comins-row-data-index]")).toHaveCount(0);
  };
  const afterLeave = async () => {
    if (!active.size) return;
    expect(active.size).toBe(1);
    const record = [...active.values()][0]!;
    // 브라우저의 실제 ERR_ABORTED를 확인한 뒤 늦은 응답을 전달한다.
    await expect.poll(() => record.aborted).toBe(true);
    expect(record.done).toBe(false);
    await fulfill(record);
    expect(record.failure).toContain("ERR_ABORTED");
    await expect(page.getByTestId("row-dummy-1")).toHaveCount(0);
    await expect(page.getByTestId("loading-skeleton-row")).toHaveCount(0);
    await expect(page.getByTestId("data-table-loading-overlay")).toHaveCount(0);
  };
  const exercise = async (navigation: Navigation) => {
    kind = "primary";
    const initial = await pending();
    // baseline 준비의 종료 기록과 섞지 않고 이번 조작의 실제 요청 5개만 보존한다.
    records = [initial];
    const modes: string[] = [];
    const exit = async (mode: string) => {
      const record = await pending();
      expect(record.done).toBe(false); expect(record.aborted).toBe(false);
      await navigation.leave();
      expect(record.done).toBe(true); expect(record.aborted).toBe(true);
      modes.push(mode);
    };
    await exit("initial");
    await navigation.enter();
    await fulfill(await pending());
    const primary = page.getByTestId("loading-state-viewport");
    await expect(primary.locator("tr[data-comins-row-data-index]")).toHaveCount(100);
    await page.getByRole("button", { name: "Refetch loading", exact: true }).click();
    await pending();
    await expect(page.getByTestId("data-table-loading-overlay")).toBeVisible();
    await expect(primary.locator("tr[data-comins-row-data-index]")).toHaveCount(100);
    await exit("refetch");
    await navigation.enter();
    await fulfill(await pending());
    await expect(primary.locator("tr[data-comins-row-data-index]")).toHaveCount(100);
    kind = "lazy";
    await page.getByRole("button", { name: "Load remote data", exact: true }).click();
    await pending();
    const lazy = page.getByTestId("loading-lazy-viewport");
    await expect(lazy.getByTestId("loading-skeleton-row")).toHaveCount(5);
    await expect(lazy.locator("tr[data-comins-row-data-index]")).toHaveCount(0);
    await exit("lazy");
    const proof = { modes, requests: records.length, aborted: records.map(record => record.aborted) };
    expect(records.every(record => record.done)).toBe(true);
    for (const record of records) {
      const url = new URL(record.request.url());
      expect(url.searchParams.get("skip")).toBe("0"); expect(url.searchParams.get("limit")).toBe("0");
    }
    records = []; kind = "primary";
    return proof;
  };
  const dispose = async () => {
    for (const record of active.values()) record.release();
    await Promise.all([...active.values()].map(record => record.settled));
    page.off("requestfailed", failed); await page.unroute(remote);
    active.clear(); records = [];
  };
  return { ready, exercise, afterLeave, dispose };
}
